/** Reglas de cuotas: renovar, congelar y qué socios toca cobrar. Funciones puras: devuelven un socio nuevo. */
import { acceso } from "./config";
import { type Dia, diasEntre, sumarDias } from "./fechas";
import type { Plan, Socio } from "./tipos";

/**
 * Renovar suma la duración del plan. Si la cuota sigue vigente, se encadena tras el vencimiento
 * (no se pierden días); si ya venció, cuenta desde el día del pago.
 */
export function renovar(socio: Socio, plan: Plan, diaPago: Dia): Socio {
  const base = diasEntre(diaPago, socio.vencimiento) >= 0 ? socio.vencimiento : sumarDias(diaPago, -1);
  return { ...socio, planId: plan.id, vencimiento: sumarDias(base, plan.duracionDias), congeladoHasta: undefined };
}

export type ResultadoCongelar = { ok: true; socio: Socio } | { ok: false; error: string };

/** Congelar pausa la cuota: el vencimiento se desplaza los mismos días. Máximo configurable. */
export function congelar(socio: Socio, desde: Dia, dias: number): ResultadoCongelar {
  if (!Number.isInteger(dias) || dias < 1) return { ok: false, error: "Indica un número de días válido." };
  if (dias > acceso.maxDiasCongelacion) return { ok: false, error: `Se puede congelar como máximo ${acceso.maxDiasCongelacion} días.` };
  if (socio.congeladoHasta && diasEntre(desde, socio.congeladoHasta) >= 0) return { ok: false, error: "La membresía ya está congelada." };
  if (diasEntre(desde, socio.vencimiento) < 0) return { ok: false, error: "No se puede congelar una cuota vencida: primero renuévala." };
  return { ok: true, socio: { ...socio, congeladoHasta: sumarDias(desde, dias - 1), vencimiento: sumarDias(socio.vencimiento, dias) } };
}

/** Socios cuya cuota vence en `dias` días o menos (o ya venció) y no están congelados: los que toca cobrar. */
export function cuotasPorCobrar(socios: Socio[], hoy: Dia, dias = acceso.diasAvisoVencimiento): Socio[] {
  return socios
    .filter((s) => !(s.congeladoHasta && diasEntre(hoy, s.congeladoHasta) >= 0) && diasEntre(hoy, s.vencimiento) <= dias)
    .sort((a, b) => a.vencimiento.localeCompare(b.vencimiento));
}
