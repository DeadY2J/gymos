import { z } from "zod";
import { almacen } from "@/gimnasio/almacen";
import { planes } from "@/gimnasio/config";
import { origenPublico, rechazo } from "@/gimnasio/seguridad";
import { crearSuscripcion, ErrorPago, mercadoPagoActivo } from "@/integraciones/mercadopago";

const Entrada = z.object({
  socioId: z.string().min(1).max(64),
  planId: z.enum(planes.map((p) => p.id) as [string, ...string[]]),
  email: z.email().max(200),
});

/** Suscripción mensual (cuota recurrente) con Mercado Pago. El correo lo exige Mercado Pago para suscripciones. */
export async function POST(req: Request) {
  const no = rechazo(req, 20);
  if (no) return no;
  if (!mercadoPagoActivo()) return Response.json({ error: "Mercado Pago no está configurado." }, { status: 404 });
  const datos = Entrada.safeParse(await req.json().catch(() => null));
  if (!datos.success) return Response.json({ error: "Revisa el socio, el plan y el correo." }, { status: 400 });
  const socio = almacen.socio(datos.data.socioId);
  const plan = planes.find((p) => p.id === datos.data.planId)!;
  if (!socio) return Response.json({ error: "Socio no encontrado." }, { status: 404 });
  try {
    return Response.json({ url: await crearSuscripcion(socio, plan, datos.data.email, origenPublico(req)) });
  } catch (e) {
    return Response.json({ error: e instanceof ErrorPago ? e.message : "No se pudo crear la suscripción." }, { status: 502 });
  }
}
