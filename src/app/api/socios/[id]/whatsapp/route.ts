import { almacen } from "@/gimnasio/almacen";
import { rechazo } from "@/gimnasio/seguridad";
import { panel } from "@/gimnasio/vista";
import { enviarPlantillaRetencion, ErrorWhatsapp, whatsappActivo } from "@/integraciones/whatsapp";

/**
 * Envía la plantilla de retención por WhatsApp Cloud API a UN socio, tras pulsar una persona el botón.
 * Aplica las mismas reglas que el envío a mano (no contactar, 14 días, tope diario).
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const no = rechazo(req, 20);
  if (no) return no;
  if (!whatsappActivo()) return Response.json({ error: "WhatsApp no está configurado." }, { status: 404 });
  const { id } = await params;
  const socio = id.length <= 64 ? almacen.socio(id) : undefined;
  if (!socio) return Response.json({ error: "Socio no encontrado." }, { status: 404 });
  const permiso = almacen.permisoContacto(socio);
  if (!permiso.ok) return Response.json({ error: permiso.motivo }, { status: 409 });
  try {
    await enviarPlantillaRetencion(socio.telefono, socio.nombre.split(" ")[0]);
  } catch (e) {
    return Response.json({ error: e instanceof ErrorWhatsapp ? e.message : "No se pudo enviar." }, { status: 502 });
  }
  almacen.registrarContacto(socio);
  return Response.json(panel());
}
