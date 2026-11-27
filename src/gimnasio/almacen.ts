/**
 * Almacén en memoria para la demo (como en Recepción 24/7 y Radar Pyme). Guarda lo que cambia
 * sobre los datos generados: el desplazamiento de la máquina del tiempo, los escaneos, las
 * renovaciones y los mensajes enviados. Para producción se sustituye por Supabase sin tocar el motor.
 */
import { planes } from "./config";
import { puedeContactar, type PermisoContacto } from "./contacto";
import { renovar } from "./cuotas";
import { datosDemo, DIA_BASE_DEMO } from "./demo";
import { type Dia, sumarDias } from "./fechas";
import type { Pago, Socio } from "./tipos";

export const MAX_DESPLAZAMIENTO_DIAS = 42;

class Almacen {
  private desplazamiento = 0;
  private escaneos = new Map<string, Set<Dia>>();
  private renovados = new Map<string, Socio>();
  private contactos = new Map<string, Dia>();
  private enviadosPorDia = new Map<Dia, number>();
  pagos: Pago[] = [];

  hoy(): Dia {
    return sumarDias(DIA_BASE_DEMO, this.desplazamiento);
  }

  get dias() {
    return this.desplazamiento;
  }

  viajar(dias: number) {
    if (!Number.isInteger(dias) || dias < 0 || dias > MAX_DESPLAZAMIENTO_DIAS) throw new Error("Desplazamiento fuera de rango.");
    this.desplazamiento = dias;
  }

  /** Socios y visitas a día de hoy: datos generados + lo registrado en esta sesión. */
  estado(): { hoy: Dia; socios: Socio[]; visitas: Map<string, Dia[]> } {
    const hoy = this.hoy();
    const { socios, visitas } = datosDemo(hoy);
    const resultado = socios.map((s) => {
      const r = this.renovados.get(s.id);
      return r && r.vencimiento > s.vencimiento ? { ...s, vencimiento: r.vencimiento, planId: r.planId, congeladoHasta: undefined } : s;
    });
    for (const [id, dias] of this.escaneos) {
      const lista = visitas.get(id);
      if (!lista) continue;
      const extra = [...dias].filter((d) => d <= hoy && !lista.includes(d));
      visitas.set(id, [...lista, ...extra].sort());
    }
    return { hoy, socios: resultado, visitas };
  }

  socio(id: string): Socio | undefined {
    return this.estado().socios.find((s) => s.id === id);
  }

  registrarVisita(socioId: string) {
    const dias = this.escaneos.get(socioId) ?? new Set<Dia>();
    dias.add(this.hoy());
    this.escaneos.set(socioId, dias);
  }

  renovar(socioId: string, planId: string): Socio | undefined {
    const socio = this.socio(socioId);
    const plan = planes.find((p) => p.id === planId);
    if (!socio || !plan) return undefined;
    const nuevo = renovar(socio, plan, this.hoy());
    this.renovados.set(socioId, nuevo);
    this.pagos.push({ socioId, dia: this.hoy(), importe: plan.precio, medio: "efectivo" });
    return nuevo;
  }

  permisoContacto(socio: Socio): PermisoContacto {
    const hoy = this.hoy();
    const ultimo = this.contactos.get(socio.id);
    // Un contacto registrado "en el futuro" (tras volver atrás en el tiempo) no cuenta.
    return puedeContactar(socio, { enviadosHoy: this.enviadosPorDia.get(hoy) ?? 0, ultimoContacto: ultimo && ultimo <= hoy ? ultimo : undefined }, hoy);
  }

  registrarContacto(socio: Socio): PermisoContacto {
    const permiso = this.permisoContacto(socio);
    if (!permiso.ok) return permiso;
    const hoy = this.hoy();
    this.contactos.set(socio.id, hoy);
    this.enviadosPorDia.set(hoy, (this.enviadosPorDia.get(hoy) ?? 0) + 1);
    return permiso;
  }

  ultimoContacto(socioId: string): Dia | undefined {
    return this.contactos.get(socioId);
  }

  reiniciar() {
    this.desplazamiento = 0;
    this.escaneos.clear();
    this.renovados.clear();
    this.contactos.clear();
    this.enviadosPorDia.clear();
    this.pagos = [];
  }
}

// Una sola instancia por proceso (también entre recargas en desarrollo).
const global = globalThis as unknown as { __almacenGymos?: Almacen };
export const almacen = (global.__almacenGymos ??= new Almacen());
