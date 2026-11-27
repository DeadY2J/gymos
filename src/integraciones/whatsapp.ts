/**
 * WhatsApp Cloud API (opcional). Solo se activa con WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID y
 * WHATSAPP_PLANTILLA_RETENCION.
 *
 * Importante: WhatsApp solo permite texto libre dentro de las 24 h siguientes a un mensaje del socio.
 * Para escribir a alguien que lleva semanas sin venir hace falta una PLANTILLA aprobada por Meta
 * (categoría "marketing" o "utility"), con el nombre como parámetro {{1}}. Por eso el envío por API usa
 * la plantilla, y el texto personalizado se sigue enviando a mano con el enlace wa.me.
 * Siempre un socio cada vez y tras confirmarlo una persona: nunca envíos masivos.
 */
const GRAPH = "https://graph.facebook.com/v21.0";

export class ErrorWhatsapp extends Error {}

export function whatsappActivo(): boolean {
  return Boolean(process.env.WHATSAPP_TOKEN?.trim() && process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() && process.env.WHATSAPP_PLANTILLA_RETENCION?.trim());
}

export async function enviarPlantillaRetencion(telefono: string, nombre: string): Promise<string> {
  const para = telefono.replace(/\D/g, "");
  if (para.length < 8 || para.length > 15) throw new ErrorWhatsapp("Teléfono no válido.");
  let r: Response;
  try {
    r = await fetch(`${GRAPH}/${encodeURIComponent(process.env.WHATSAPP_PHONE_NUMBER_ID!.trim())}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN!.trim()}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: para,
        type: "template",
        template: {
          name: process.env.WHATSAPP_PLANTILLA_RETENCION!.trim(),
          language: { code: process.env.WHATSAPP_PLANTILLA_IDIOMA?.trim() || "es" },
          components: [{ type: "body", parameters: [{ type: "text", text: nombre.slice(0, 60) }] }],
        },
      }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new ErrorWhatsapp("No se pudo conectar con WhatsApp.");
  }
  if (!r.ok) throw new ErrorWhatsapp(`WhatsApp respondió ${r.status}.`);
  const datos = (await r.json().catch(() => ({}))) as { messages?: { id: string }[] };
  return datos.messages?.[0]?.id ?? "";
}
