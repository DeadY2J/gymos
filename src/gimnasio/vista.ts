/** Arma lo que necesita el panel a partir del almacén y el motor. Sin lógica de negocio propia. */
import { estadoCuota } from "./acceso";
import { almacen } from "./almacen";
import { gimnasio, planes } from "./config";
import { cuotasPorCobrar } from "./cuotas";
import { fechaLarga, mesDe } from "./fechas";
import { redactarMensaje } from "./mensaje";
import { rankingDelMes } from "./ranking";
import { radarDeBajas } from "./riesgo";
import { modoDemo } from "./seguridad";
import { iaActiva } from "@/integraciones/ia";
import { mercadoPagoActivo } from "@/integraciones/mercadopago";
import { whatsappActivo } from "@/integraciones/whatsapp";

export function panel() {
  const { hoy, socios, visitas } = almacen.estado();
  const porId = new Map(socios.map((s) => [s.id, s]));
  const remitente = process.env.GYMOS_REMITENTE_NOMBRE?.trim() || undefined;
  const radar = radarDeBajas(socios, visitas, hoy).map((ev) => {
    const s = porId.get(ev.socioId)!;
    const permiso = almacen.permisoContacto(s);
    const conRiesgo = ev.nivel === "alto" || ev.nivel === "medio";
    return {
      ...ev,
      nombre: s.nombre,
      plan: planes.find((p) => p.id === s.planId)?.nombre ?? s.planId,
      estadoCuota: estadoCuota(s, hoy),
      vencimiento: s.vencimiento,
      ultimoContacto: almacen.ultimoContacto(s.id) ?? null,
      permiso,
      // En modo demo el enlace no lleva número: así nunca se escribe a un teléfono real por error.
      mensaje: conRiesgo && permiso.ok ? redactarMensaje(s, ev, { remitente, conNumero: !modoDemo() }) : null,
    };
  });
  const hoyVisitas = socios.filter((s) => visitas.get(s.id)?.includes(hoy)).length;
  return {
    hoy,
    hoyTexto: fechaLarga(hoy),
    desplazamiento: almacen.dias,
    modoDemo: modoDemo(),
    integraciones: { mercadoPago: mercadoPagoActivo(), whatsapp: whatsappActivo(), ia: iaActiva() },
    gimnasio,
    planes,
    resumen: {
      socios: socios.length,
      riesgoAlto: radar.filter((r) => r.nivel === "alto").length,
      riesgoMedio: radar.filter((r) => r.nivel === "medio").length,
      visitasHoy: hoyVisitas,
    },
    radar,
    porCobrar: cuotasPorCobrar(socios, hoy).map((s) => ({ id: s.id, nombre: s.nombre, vencimiento: s.vencimiento, estado: estadoCuota(s, hoy), planId: s.planId })),
    ranking: rankingDelMes(socios, visitas, mesDe(hoy)).slice(0, 10),
    socios: socios.map((s) => ({ id: s.id, nombre: s.nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre)),
  };
}

export type Panel = ReturnType<typeof panel>;
