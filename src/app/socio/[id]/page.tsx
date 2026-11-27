import { gimnasio } from "@/gimnasio/config";
import { VistaSocio } from "./vista-socio";

export default async function PaginaSocio({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <VistaSocio id={id} gimnasio={gimnasio.nombre} />;
}
