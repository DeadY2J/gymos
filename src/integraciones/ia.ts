/**
 * Rutina con IA (opcional). Funciona con cualquier API compatible con OpenAI (OmniRoute, OpenAI, la capa
 * compatible de Anthropic para usar Claude…): IA_API_KEY, IA_BASE_URL y IA_MODELO.
 * La IA solo puede elegir ejercicios del catálogo: su respuesta se valida con el mismo esquema, se comprueba
 * que respeta nivel y zonas a cuidar, y si algo falla se usa el generador por reglas. Nunca rompe la demo.
 */
import { buscarModismos } from "@/gimnasio/neutro";
import { catalogo, type EntradaRutina, generarRutina, type Rutina, RutinaIa } from "@/gimnasio/rutinas";

const nivelNum = { principiante: 0, intermedio: 1, avanzado: 2 } as const;

export function iaActiva(): boolean {
  return Boolean(process.env.IA_API_KEY?.trim() && process.env.IA_MODELO?.trim());
}

function instrucciones(e: EntradaRutina): string {
  const permitidos = catalogo.filter((c) => c.nivelMin <= nivelNum[e.nivel] && !c.carga.some((z) => e.cuidar.includes(z)));
  return [
    "Eres entrenador de un gimnasio. Responde SOLO con JSON válido, sin texto adicional.",
    'Formato: {"titulo": string, "dias": [{"titulo": string, "cardioMin": number, "ejercicios": [{"id": string, "series": number, "repeticiones": string, "descansoSeg": number}]}], "notas": [string]}',
    `Usa únicamente estos ids de ejercicio: ${permitidos.map((c) => `${c.id} (${c.nombre}, ${c.grupo})`).join("; ")}.`,
    `Objetivo: ${e.objetivo}. Nivel: ${e.nivel}. Días: exactamente ${e.diasPorSemana}. Minutos por sesión: ${e.minutos}.`,
    e.cuidar.length ? `Cuida estas zonas: ${e.cuidar.join(", ")}.` : "",
    "Escribe en español latinoamericano neutro con tuteo, sin voseo ni modismos regionales. Notas breves (máximo 4).",
  ].join("\n");
}

/** Comprueba la propuesta de la IA y la convierte al formato de la app; null si no es aceptable. */
export function aceptarPropuesta(bruto: unknown, e: EntradaRutina): Rutina | null {
  const r = RutinaIa.safeParse(bruto);
  if (!r.success || r.data.dias.length !== e.diasPorSemana) return null;
  const porId = new Map(catalogo.map((c) => [c.id, c]));
  for (const d of r.data.dias) {
    for (const ej of d.ejercicios) {
      const c = porId.get(ej.id)!;
      if (c.nivelMin > nivelNum[e.nivel] || c.carga.some((z) => e.cuidar.includes(z))) return null;
    }
  }
  const textos = [r.data.titulo, ...r.data.dias.map((d) => d.titulo)];
  if (textos.some((t) => buscarModismos(t).length > 0)) return null;
  return {
    titulo: r.data.titulo,
    dias: r.data.dias.map((d) => ({
      titulo: d.titulo,
      cardioMin: d.cardioMin,
      ejercicios: d.ejercicios.map((ej) => ({ ...ej, nombre: porId.get(ej.id)!.nombre })),
    })),
    notas: [...r.data.notas.filter((n) => buscarModismos(n).length === 0), "Esta rutina es orientativa y no sustituye la valoración de un profesional de la salud."],
    origen: "ia",
  };
}

export async function rutinaConIa(e: EntradaRutina): Promise<Rutina> {
  const respaldo = () => {
    const r = generarRutina(e);
    return { ...r, notas: [...r.notas, "La IA no estaba disponible: rutina preparada con las reglas del gimnasio."] };
  };
  if (!iaActiva()) return generarRutina(e);
  const base = (process.env.IA_BASE_URL?.trim() || "https://api.openai.com/v1").replace(/\/$/, "");
  try {
    const r = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.IA_API_KEY!.trim()}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.IA_MODELO!.trim(),
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: instrucciones(e) },
          { role: "user", content: "Prepara la rutina." },
        ],
      }),
      signal: AbortSignal.timeout(25_000),
    });
    if (!r.ok) return respaldo();
    const datos = (await r.json()) as { choices?: { message?: { content?: string } }[] };
    const contenido = datos.choices?.[0]?.message?.content ?? "";
    const json = JSON.parse(contenido.replace(/^```(?:json)?\s*|\s*```$/g, ""));
    return aceptarPropuesta(json, e) ?? respaldo();
  } catch {
    return respaldo();
  }
}
