/** Reglas para escribir a un socio: respeto absoluto a "no contactar", un mensaje cada cierto tiempo y tope diario. */
import { contacto as cfg } from "./config";
import { type Dia, diasEntre } from "./fechas";
import type { Socio } from "./tipos";

export type EstadoContactos = { enviadosHoy: number; ultimoContacto?: Dia };
export type PermisoContacto = { ok: true } | { ok: false; motivo: string };

export function puedeContactar(socio: Pick<Socio, "noContactar">, estado: EstadoContactos, hoy: Dia): PermisoContacto {
  if (socio.noContactar) return { ok: false, motivo: "Este socio pidió no recibir mensajes." };
  if (estado.ultimoContacto && diasEntre(estado.ultimoContacto, hoy) < cfg.diasEntreMensajes) {
    return { ok: false, motivo: `Ya se le escribió hace menos de ${cfg.diasEntreMensajes} días.` };
  }
  if (estado.enviadosHoy >= cfg.maxMensajesPorDia) return { ok: false, motivo: `Se alcanzó el tope de ${cfg.maxMensajesPorDia} mensajes por día.` };
  return { ok: true };
}
