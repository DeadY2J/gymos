import { almacen } from "@/gimnasio/almacen";
import { planes } from "@/gimnasio/config";
import { ipDe, limitar } from "@/gimnasio/seguridad";
import { consultarPago, mercadoPagoActivo, verificarFirmaWebhook } from "@/integraciones/mercadopago";

/**
 * Webhook de Mercado Pago. No usa GYMOS_TOKEN (lo llama Mercado Pago), pero exige la firma x-signature,
 * consulta el pago a la API (no se fía del cuerpo), comprueba el importe y es idempotente.
 * Responde 200 a lo que no le interesa para que Mercado Pago no reintente sin fin.
 */
export async function POST(req: Request) {
  if (!mercadoPagoActivo()) return Response.json({ error: "Mercado Pago no está configurado." }, { status: 404 });
  if (!limitar(`webhook:${ipDe(req)}`, 120, 60_000)) return Response.json({ error: "Demasiadas peticiones." }, { status: 429 });
  const url = new URL(req.url);
  const cuerpo = (await req.json().catch(() => null)) as { type?: string; data?: { id?: string | number } } | null;
  const idDato = String(url.searchParams.get("data.id") ?? cuerpo?.data?.id ?? "");
  if (!verificarFirmaWebhook(req.headers.get("x-signature"), req.headers.get("x-request-id"), idDato)) {
    return Response.json({ error: "Firma no válida." }, { status: 401 });
  }
  const tipo = url.searchParams.get("type") ?? cuerpo?.type;
  if (tipo !== "payment") return Response.json({ ok: true, ignorado: true });
  try {
    const pago = await consultarPago(idDato);
    if (!pago) return Response.json({ ok: true, ignorado: true });
    const plan = planes.find((p) => p.id === pago.planId);
    if (!plan || pago.importe < plan.precio) return Response.json({ ok: true, ignorado: true });
    if (!almacen.marcarPagoProcesado(idDato)) return Response.json({ ok: true, repetido: true });
    if (!almacen.renovar(pago.socioId, pago.planId, "mercadopago")) return Response.json({ ok: true, ignorado: true });
    return Response.json({ ok: true, renovado: pago.socioId });
  } catch {
    // 500 para que Mercado Pago reintente más tarde.
    return Response.json({ error: "No se pudo consultar el pago." }, { status: 500 });
  }
}
