/**
 * Seguridad de las rutas API.
 *  - Modo demo (ninguna integración configurada): datos ficticios, rutas abiertas.
 *  - Con alguna integración real (Mercado Pago, WhatsApp, IA) hay dinero o mensajes reales en juego:
 *    las rutas exigen GYMOS_TOKEN en la cabecera x-gymos-token y, sin él configurado, se niegan.
 *  - Secreto del QR: GYMOS_SECRETO_QR (32+ caracteres). En modo demo hay uno fijo de demostración.
 *  - limitar(): límite de peticiones por clave (IP) en ventana deslizante, en memoria.
 */
import { createHash, timingSafeEqual } from "node:crypto";

const VARIABLES_INTEGRACIONES = ["MERCADOPAGO_ACCESS_TOKEN", "WHATSAPP_TOKEN", "IA_API_KEY"];

export function modoDemo(): boolean {
  return !VARIABLES_INTEGRACIONES.some((v) => process.env[v]?.trim());
}

export type Acceso = { ok: true } | { ok: false; estado: 401 | 503; error: string };

const resumen = (t: string) => createHash("sha256").update(t).digest();

export function comprobarAcceso(req: Request): Acceso {
  if (modoDemo()) return { ok: true };
  const esperado = process.env.GYMOS_TOKEN?.trim();
  if (!esperado || esperado.length < 16) return { ok: false, estado: 503, error: "Configura GYMOS_TOKEN (16 caracteres o más) para usar las integraciones." };
  const recibido = req.headers.get("x-gymos-token") ?? "";
  if (!timingSafeEqual(resumen(recibido), resumen(esperado))) return { ok: false, estado: 401, error: "Clave de acceso incorrecta." };
  return { ok: true };
}

const SECRETO_DEMO = "gymos-demo-secreto-solo-para-datos-ficticios";

export type Secreto = { ok: true; secreto: string } | { ok: false; error: string };

export function secretoQr(): Secreto {
  const propio = process.env.GYMOS_SECRETO_QR?.trim();
  if (propio && propio.length >= 32) return { ok: true, secreto: propio };
  if (modoDemo()) return { ok: true, secreto: SECRETO_DEMO };
  return { ok: false, error: "Configura GYMOS_SECRETO_QR (32 caracteres o más)." };
}

const ventanas = new Map<string, number[]>();

/** Devuelve true si la petición cabe en el límite; false si hay que rechazarla (429). */
export function limitar(clave: string, max: number, ventanaMs: number, ahora: number = Date.now()): boolean {
  const recientes = (ventanas.get(clave) ?? []).filter((t) => ahora - t < ventanaMs);
  if (recientes.length >= max) {
    ventanas.set(clave, recientes);
    return false;
  }
  recientes.push(ahora);
  ventanas.set(clave, recientes);
  if (ventanas.size > 5000) for (const [k, v] of ventanas) if (!v.some((t) => ahora - t < ventanaMs)) ventanas.delete(k);
  return true;
}

export function ipDe(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

export function reiniciarLimites() {
  ventanas.clear();
}

/** Respuesta de error común si la petición no puede pasar. */
export function rechazo(req: Request, max = 60): Response | null {
  const acceso = comprobarAcceso(req);
  if (!acceso.ok) return Response.json({ error: acceso.error }, { status: acceso.estado });
  if (!limitar(`${new URL(req.url).pathname}:${ipDe(req)}`, max, 60_000)) return Response.json({ error: "Demasiadas peticiones, espera un momento." }, { status: 429 });
  return null;
}

/** Origen público para los enlaces (webhooks, vuelta de Mercado Pago): GYMOS_URL_PUBLICA o el de la petición. */
export function origenPublico(req: Request): string {
  const configurado = process.env.GYMOS_URL_PUBLICA?.trim().replace(/\/$/, "");
  if (configurado && /^https:\/\//.test(configurado)) return configurado;
  return new URL(req.url).origin;
}
