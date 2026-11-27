/**
 * Fechas a nivel de día ("2026-11-27"), siempre en UTC y sin horas: el motor nunca
 * llama a Date.now(), recibe "hoy" por parámetro. Así todo es determinista y testeable.
 */
export type Dia = string;

const MS_DIA = 86_400_000;
const aMs = (d: Dia) => Date.parse(`${d}T00:00:00Z`);

export function esDia(valor: unknown): valor is Dia {
  if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const ms = aMs(valor);
  return !Number.isNaN(ms) && new Date(ms).toISOString().slice(0, 10) === valor;
}

export const sumarDias = (d: Dia, n: number): Dia => new Date(aMs(d) + n * MS_DIA).toISOString().slice(0, 10);

/** Días de `a` a `b` (positivo si b es posterior). */
export const diasEntre = (a: Dia, b: Dia): number => Math.round((aMs(b) - aMs(a)) / MS_DIA);

/** Lunes de la semana de `d` (semana ISO). */
export function lunesDe(d: Dia): Dia {
  const dia = new Date(aMs(d)).getUTCDay(); // 0 = domingo
  return sumarDias(d, -((dia + 6) % 7));
}

export const mesDe = (d: Dia): string => d.slice(0, 7);

const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
/** "27 de noviembre" */
export function fechaLarga(d: Dia): string {
  const [, m, dd] = d.split("-").map(Number);
  return `${dd} de ${meses[m - 1]}`;
}
