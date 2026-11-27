import { z } from "zod";
import { decidirAcceso, leerCodigoQr } from "@/gimnasio/acceso";
import { almacen } from "@/gimnasio/almacen";
import { rechazo, secretoQr } from "@/gimnasio/seguridad";

const Entrada = z.object({ codigo: z.string().min(1).max(120) });

const motivos = { formato: "Código QR no válido.", firma: "Código QR no reconocido.", caducado: "Código QR caducado: pide al socio que lo actualice." };

/** Recepción escanea el QR del socio: se valida la firma, se decide el acceso y se registra la visita. */
export async function POST(req: Request) {
  const no = rechazo(req, 120);
  if (no) return no;
  const secreto = secretoQr();
  if (!secreto.ok) return Response.json({ error: secreto.error }, { status: 503 });
  const datos = Entrada.safeParse(await req.json().catch(() => null));
  if (!datos.success) return Response.json({ error: "Falta el código QR." }, { status: 400 });
  const lectura = leerCodigoQr(datos.data.codigo.trim(), Date.now(), secreto.secreto);
  if (!lectura.ok) return Response.json({ permitido: false, mensaje: motivos[lectura.motivo] });
  const socio = almacen.socio(lectura.socioId);
  if (!socio) return Response.json({ permitido: false, mensaje: "Socio no encontrado." });
  const decision = decidirAcceso(socio, almacen.hoy());
  if (decision.permitido) almacen.registrarVisita(socio.id);
  return Response.json({ ...decision, socio: { id: socio.id, nombre: socio.nombre } });
}
