import { EntradaRutina, generarRutina } from "@/gimnasio/rutinas";
import { rechazo } from "@/gimnasio/seguridad";

export async function POST(req: Request) {
  const no = rechazo(req, 30);
  if (no) return no;
  const datos = EntradaRutina.safeParse(await req.json().catch(() => null));
  if (!datos.success) return Response.json({ error: "Revisa los datos de la rutina." }, { status: 400 });
  return Response.json(generarRutina(datos.data));
}
