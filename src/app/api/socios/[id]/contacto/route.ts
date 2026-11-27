import { almacen } from "@/gimnasio/almacen";
import { rechazo } from "@/gimnasio/seguridad";
import { panel } from "@/gimnasio/vista";

/** Marca que una persona envió a mano el mensaje de WhatsApp a este socio. Aplica las reglas de contacto. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const no = rechazo(req);
  if (no) return no;
  const { id } = await params;
  const socio = id.length <= 64 ? almacen.socio(id) : undefined;
  if (!socio) return Response.json({ error: "Socio no encontrado." }, { status: 404 });
  const r = almacen.registrarContacto(socio);
  if (!r.ok) return Response.json({ error: r.motivo }, { status: 409 });
  return Response.json(panel());
}
