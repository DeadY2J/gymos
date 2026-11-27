import { z } from "zod";
import { planes } from "@/gimnasio/config";
import { almacen } from "@/gimnasio/almacen";
import { rechazo } from "@/gimnasio/seguridad";
import { panel } from "@/gimnasio/vista";

const Entrada = z.object({ planId: z.enum(planes.map((p) => p.id) as [string, ...string[]]) });

/** Renovación con cobro en recepción (efectivo). Mercado Pago es opcional y va aparte. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const no = rechazo(req);
  if (no) return no;
  const { id } = await params;
  const datos = Entrada.safeParse(await req.json().catch(() => null));
  if (!datos.success) return Response.json({ error: "Plan no válido." }, { status: 400 });
  if (id.length > 64 || !almacen.renovar(id, datos.data.planId)) return Response.json({ error: "Socio no encontrado." }, { status: 404 });
  return Response.json(panel());
}
