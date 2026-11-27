/**
 * Acceso por QR. El QR del socio lleva un código firmado (HMAC-SHA256) que cambia cada
 * `qrValidezSegundos`: sirve para entrar, pero una captura de pantalla caduca en un minuto.
 * El código no contiene datos personales, solo el id del socio y la ventana de tiempo.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import QRCode from "qrcode";
import { acceso } from "./config";
import { type Dia, diasEntre } from "./fechas";
import type { Socio } from "./tipos";

const MIN_SECRETO = 32;

function firma(socioId: string, ventana: number, secreto: string): string {
  return createHmac("sha256", secreto).update(`${socioId}.${ventana}`).digest("base64url").slice(0, 22);
}

export function generarCodigoQr(socioId: string, ahoraMs: number, secreto: string, validezSeg = acceso.qrValidezSegundos): string {
  if (secreto.length < MIN_SECRETO) throw new Error("El secreto del QR debe tener 32 caracteres o más.");
  const ventana = Math.floor(ahoraMs / (validezSeg * 1000));
  return `${socioId}.${ventana}.${firma(socioId, ventana, secreto)}`;
}

export type LecturaQr = { ok: true; socioId: string } | { ok: false; motivo: "formato" | "firma" | "caducado" };

/** Acepta la ventana actual y la anterior (por el desfase del reloj del móvil). */
export function leerCodigoQr(codigo: string, ahoraMs: number, secreto: string, validezSeg = acceso.qrValidezSegundos): LecturaQr {
  if (secreto.length < MIN_SECRETO) throw new Error("El secreto del QR debe tener 32 caracteres o más.");
  const partes = codigo.split(".");
  if (partes.length !== 3 || partes[0].length === 0 || partes[0].length > 64 || !/^\d{1,12}$/.test(partes[1])) return { ok: false, motivo: "formato" };
  const [socioId, v, recibida] = partes;
  const ventana = Number(v);
  const esperada = firma(socioId, ventana, secreto);
  const a = Buffer.from(recibida);
  const b = Buffer.from(esperada);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, motivo: "firma" };
  const actual = Math.floor(ahoraMs / (validezSeg * 1000));
  if (ventana > actual || actual - ventana > 1) return { ok: false, motivo: "caducado" };
  return { ok: true, socioId };
}

export async function qrComoSvg(codigo: string): Promise<string> {
  return QRCode.toString(codigo, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
}

// ───────── Decisión de acceso ─────────

export type EstadoCuota = "al_dia" | "por_vencer" | "en_gracia" | "vencida" | "congelada";

export function estadoCuota(socio: Pick<Socio, "vencimiento" | "congeladoHasta">, hoy: Dia): EstadoCuota {
  if (socio.congeladoHasta && diasEntre(hoy, socio.congeladoHasta) >= 0) return "congelada";
  const restantes = diasEntre(hoy, socio.vencimiento);
  if (restantes < 0) return -restantes <= acceso.diasGracia ? "en_gracia" : "vencida";
  return restantes <= acceso.diasAvisoVencimiento ? "por_vencer" : "al_dia";
}

export type DecisionAcceso = { permitido: boolean; estado: EstadoCuota; mensaje: string; diasRestantes: number };

export function decidirAcceso(socio: Pick<Socio, "nombre" | "vencimiento" | "congeladoHasta">, hoy: Dia): DecisionAcceso {
  const estado = estadoCuota(socio, hoy);
  const diasRestantes = diasEntre(hoy, socio.vencimiento);
  const primero = socio.nombre.split(" ")[0];
  switch (estado) {
    case "al_dia":
      return { permitido: true, estado, diasRestantes, mensaje: `Bienvenido, ${primero}.` };
    case "por_vencer":
      return { permitido: true, estado, diasRestantes, mensaje: `Bienvenido, ${primero}. Tu cuota vence ${diasRestantes === 0 ? "hoy" : `en ${diasRestantes} ${diasRestantes === 1 ? "día" : "días"}`}.` };
    case "en_gracia":
      return { permitido: true, estado, diasRestantes, mensaje: `Pasa, ${primero}. Tu cuota está vencida: renuévala en recepción.` };
    case "vencida":
      return { permitido: false, estado, diasRestantes, mensaje: `${primero}, tu cuota está vencida. Renuévala en recepción para entrar.` };
    case "congelada":
      return { permitido: false, estado, diasRestantes, mensaje: `${primero}, tu membresía está congelada. Pide en recepción que la reactiven.` };
  }
}
