/**
 * Mercado Pago (opcional). Solo se activa con MERCADOPAGO_ACCESS_TOKEN.
 *  - crearLinkRenovacion: preferencia de Checkout Pro para pagar una cuota.
 *  - crearSuscripcion: suscripción mensual (preapproval) para la cuota recurrente.
 *  - verificarFirmaWebhook: valida la cabecera x-signature con MERCADOPAGO_WEBHOOK_SECRET.
 *  - consultarPago: confirma con la API que el pago está aprobado (nunca se confía en el cuerpo del webhook).
 * La referencia externa es "socioId:planId" y no lleva datos personales.
 * Docs: https://www.mercadopago.com/developers/es/reference
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { gimnasio } from "@/gimnasio/config";
import type { Plan, Socio } from "@/gimnasio/tipos";

const API = "https://api.mercadopago.com";

export class ErrorPago extends Error {}

export function mercadoPagoActivo(): boolean {
  return Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN?.trim());
}

const cabeceras = (idempotencia?: string): HeadersInit => ({
  Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN?.trim()}`,
  "Content-Type": "application/json",
  ...(idempotencia ? { "X-Idempotency-Key": idempotencia } : {}),
});

export const referencia = (socioId: string, planId: string) => `${socioId}:${planId}`;

export function leerReferencia(ref: unknown): { socioId: string; planId: string } | null {
  if (typeof ref !== "string" || ref.length > 140) return null;
  const [socioId, planId, ...resto] = ref.split(":");
  return socioId && planId && resto.length === 0 ? { socioId, planId } : null;
}

async function llamar<T>(ruta: string, init: RequestInit): Promise<T> {
  let r: Response;
  try {
    r = await fetch(`${API}${ruta}`, { ...init, signal: AbortSignal.timeout(15_000) });
  } catch {
    throw new ErrorPago("No se pudo conectar con Mercado Pago.");
  }
  // No se propaga el cuerpo de la respuesta: puede traer datos internos.
  if (!r.ok) throw new ErrorPago(`Mercado Pago respondió ${r.status}.`);
  return (await r.json()) as T;
}

export async function crearLinkRenovacion(socio: Socio, plan: Plan, urlBase: string, clave: string): Promise<string> {
  const datos = await llamar<{ init_point?: string }>("/checkout/preferences", {
    method: "POST",
    headers: cabeceras(clave),
    body: JSON.stringify({
      items: [{ title: `Cuota ${plan.nombre} · ${gimnasio.nombre}`, quantity: 1, unit_price: plan.precio, currency_id: gimnasio.moneda.codigo }],
      external_reference: referencia(socio.id, plan.id),
      notification_url: `${urlBase}/api/pagos/webhook`,
    }),
  });
  if (!datos.init_point) throw new ErrorPago("Mercado Pago no devolvió el enlace de pago.");
  return datos.init_point;
}

export async function crearSuscripcion(socio: Socio, plan: Plan, email: string, urlBase: string): Promise<string> {
  const datos = await llamar<{ init_point?: string }>("/preapproval", {
    method: "POST",
    headers: cabeceras(),
    body: JSON.stringify({
      reason: `Cuota ${plan.nombre} · ${gimnasio.nombre}`,
      external_reference: referencia(socio.id, plan.id),
      payer_email: email,
      back_url: `${urlBase}/socio/${encodeURIComponent(socio.id)}`,
      auto_recurring: { frequency: 1, frequency_type: "months", transaction_amount: plan.precio, currency_id: gimnasio.moneda.codigo },
      status: "pending",
    }),
  });
  if (!datos.init_point) throw new ErrorPago("Mercado Pago no devolvió el enlace de la suscripción.");
  return datos.init_point;
}

/**
 * Firma del webhook: x-signature = "ts=...,v1=..." y el manifiesto
 * "id:<data.id>;request-id:<x-request-id>;ts:<ts>;" firmado con HMAC-SHA256.
 */
export function verificarFirmaWebhook(firma: string | null, idPeticion: string | null, idDato: string, ahoraMs = Date.now()): boolean {
  const secreto = process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim();
  if (!secreto || !firma || !idPeticion || !idDato) return false;
  const partes = Object.fromEntries(firma.split(",").map((p) => p.trim().split("=", 2) as [string, string]));
  const ts = partes.ts;
  const v1 = partes.v1;
  if (!ts || !v1 || !/^\d+$/.test(ts) || !/^[0-9a-f]{64}$/.test(v1)) return false;
  // Rechaza notificaciones viejas (repetición). La documentación muestra ts en segundos; se aceptan también milisegundos.
  const tsMs = ts.length <= 11 ? Number(ts) * 1000 : Number(ts);
  if (Math.abs(ahoraMs - tsMs) > 10 * 60_000) return false;
  const manifiesto = `id:${idDato.toLowerCase()};request-id:${idPeticion};ts:${ts};`;
  const esperada = createHmac("sha256", secreto).update(manifiesto).digest();
  return timingSafeEqual(Buffer.from(v1, "hex"), esperada);
}

export type PagoAprobado = { socioId: string; planId: string; importe: number };

export async function consultarPago(id: string): Promise<PagoAprobado | null> {
  if (!/^\d{1,20}$/.test(id)) return null;
  const datos = await llamar<{ status?: string; external_reference?: string; transaction_amount?: number }>(`/v1/payments/${id}`, { headers: cabeceras() });
  const ref = leerReferencia(datos.external_reference);
  if (datos.status !== "approved" || !ref || typeof datos.transaction_amount !== "number") return null;
  return { ...ref, importe: datos.transaction_amount };
}
