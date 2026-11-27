import { acceso } from "@/gimnasio/config";
import { generarCodigoQr, qrComoSvg } from "@/gimnasio/acceso";
import { almacen } from "@/gimnasio/almacen";
import { rechazo, secretoQr } from "@/gimnasio/seguridad";

export const dynamic = "force-dynamic";

/**
 * QR del socio. En la demo cualquiera puede ver el de un socio ficticio; en producción esta ruta
 * va detrás del inicio de sesión del socio y solo devuelve el suyo (fase 2, Supabase).
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const no = rechazo(req, 120);
  if (no) return no;
  const { id } = await params;
  const socio = id.length <= 64 ? almacen.socio(id) : undefined;
  if (!socio) return Response.json({ error: "Socio no encontrado." }, { status: 404 });
  const secreto = secretoQr();
  if (!secreto.ok) return Response.json({ error: secreto.error }, { status: 503 });
  const ahora = Date.now();
  const codigo = generarCodigoQr(socio.id, ahora, secreto.secreto);
  const periodo = acceso.qrValidezSegundos * 1000;
  return Response.json(
    { codigo, svg: await qrComoSvg(codigo), caducaEnSeg: Math.ceil((periodo - (ahora % periodo)) / 1000), nombre: socio.nombre, vencimiento: socio.vencimiento },
    { headers: { "Cache-Control": "no-store" } },
  );
}
