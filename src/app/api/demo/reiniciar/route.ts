import { almacen } from "@/gimnasio/almacen";
import { modoDemo, rechazo } from "@/gimnasio/seguridad";
import { panel } from "@/gimnasio/vista";

export async function POST(req: Request) {
  const no = rechazo(req);
  if (no) return no;
  if (!modoDemo()) return Response.json({ error: "Solo en modo demo." }, { status: 403 });
  almacen.reiniciar();
  return Response.json(panel());
}
