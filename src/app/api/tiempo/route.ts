import { z } from "zod";
import { almacen, MAX_DESPLAZAMIENTO_DIAS } from "@/gimnasio/almacen";
import { modoDemo, rechazo } from "@/gimnasio/seguridad";
import { panel } from "@/gimnasio/vista";

const Entrada = z.object({ dias: z.number().int().min(0).max(MAX_DESPLAZAMIENTO_DIAS) });

/** Máquina del tiempo: solo existe en modo demo. */
export async function POST(req: Request) {
  const no = rechazo(req);
  if (no) return no;
  if (!modoDemo()) return Response.json({ error: "La máquina del tiempo solo existe en modo demo." }, { status: 403 });
  const datos = Entrada.safeParse(await req.json().catch(() => null));
  if (!datos.success) return Response.json({ error: `Indica un número de días entre 0 y ${MAX_DESPLAZAMIENTO_DIAS}.` }, { status: 400 });
  almacen.viajar(datos.data.dias);
  return Response.json(panel());
}
