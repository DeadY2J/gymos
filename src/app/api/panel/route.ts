import { rechazo } from "@/gimnasio/seguridad";
import { panel } from "@/gimnasio/vista";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const no = rechazo(req, 120);
  if (no) return no;
  return Response.json(panel());
}
