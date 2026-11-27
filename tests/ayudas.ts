import { sumarDias, type Dia } from "@/gimnasio/fechas";
import type { Socio } from "@/gimnasio/tipos";

export const HOY: Dia = "2026-11-27";

export function socio(extra: Partial<Socio> = {}): Socio {
  return {
    id: "s1",
    nombre: "Lucía Herrera",
    telefono: "+52 55 0000 0001",
    planId: "mensual",
    alta: "2026-06-01",
    vencimiento: "2026-12-20",
    noContactar: false,
    rankingVisible: true,
    apodo: "Lu",
    ...extra,
  };
}

/** Días de visita: cada `cada` días entre `desde` y `hasta` (inclusive). */
export function visitas(desde: Dia, hasta: Dia, cada: number): Dia[] {
  const dias: Dia[] = [];
  for (let d = desde; d <= hasta; d = sumarDias(d, cada)) dias.push(d);
  return dias;
}
