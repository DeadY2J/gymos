/**
 * Guion del modo presentación: el vídeo de 60 s de PROSPECCION.md, paso a paso y con datos de la demo.
 * Datos puros (sin UI): el panel los ejecuta en orden según el segundo en que toca cada uno.
 */
export type AccionGuion =
  | { tipo: "ir"; destino: "inicio" | "t-tiempo" | "t-radar" | "t-ranking" | "t-rutinas" }
  | { tipo: "socio"; id: string }
  | { tipo: "escanear" }
  | { tipo: "limpiar" }
  | { tipo: "semana"; n: number }
  | { tipo: "mensaje"; id: string }
  | { tipo: "rutina" };

export type PasoGuion = { seg: number; accion: AccionGuion; texto?: string };

export const DURACION_GUION = 60;

export const guion: readonly PasoGuion[] = [
  { seg: 0, accion: { tipo: "ir", destino: "inicio" }, texto: "La mayoría de los socios de un gimnasio se van en silencio." },
  { seg: 5, accion: { tipo: "socio", id: "martina-rojas" }, texto: "Entran con un QR que cambia cada minuto: una captura no sirve." },
  { seg: 8, accion: { tipo: "escanear" } },
  { seg: 13, accion: { tipo: "limpiar" } },
  { seg: 15, accion: { tipo: "socio", id: "lucia-herrera" }, texto: "Si la cuota venció, no pasa." },
  { seg: 17, accion: { tipo: "escanear" } },
  { seg: 20, accion: { tipo: "ir", destino: "t-tiempo" }, texto: "GymOS compara cuánto venía cada socio y detecta al que empieza a faltar, semanas antes de que se dé de baja." },
  { seg: 22, accion: { tipo: "semana", n: 1 } },
  { seg: 25, accion: { tipo: "semana", n: 2 } },
  { seg: 28, accion: { tipo: "semana", n: 3 } },
  { seg: 30, accion: { tipo: "ir", destino: "t-radar" } },
  { seg: 31, accion: { tipo: "semana", n: 4 } },
  { seg: 34, accion: { tipo: "semana", n: 5 } },
  { seg: 37, accion: { tipo: "semana", n: 6 } },
  { seg: 40, accion: { tipo: "mensaje", id: "valentina-rios" }, texto: "Y te deja el mensaje listo para escribirle, uno a uno, con el motivo real." },
  { seg: 50, accion: { tipo: "ir", destino: "t-ranking" }, texto: "Ranking por constancia y rutinas en un segundo. GymOS, de la Fábrica." },
  { seg: 54, accion: { tipo: "rutina" } },
  { seg: 54.5, accion: { tipo: "ir", destino: "t-rutinas" } },
];

/** Texto en pantalla en el segundo `seg`: el del último paso con texto que ya empezó. */
export function textoEn(seg: number): string {
  let texto = "";
  for (const p of guion) if (p.seg <= seg && p.texto) texto = p.texto;
  return texto;
}
