/**
 * Mensaje de WhatsApp para un socio en riesgo. Plantillas (sin IA, sin inventar datos), español neutro con tuteo.
 * Siempre uno a uno y enviado a mano por una persona: aquí solo se prepara el texto y el enlace wa.me.
 */
import { gimnasio } from "./config";
import { fechaLarga } from "./fechas";
import type { Evaluacion } from "./riesgo";
import type { Socio } from "./tipos";

export type Mensaje = { texto: string; enlace: string; motivo: string };

const BAJA = "Si prefieres que no te escribamos, responde BAJA y no volveremos a hacerlo.";

export function redactarMensaje(socio: Socio, ev: Evaluacion, opciones: { remitente?: string; conNumero: boolean }): Mensaje {
  const nombre = socio.nombre.split(" ")[0];
  const firma = opciones.remitente?.trim() || gimnasio.remitente;
  const principal = ev.senales[0]?.id;
  let cuerpo: string;
  switch (principal) {
    case "sin_arranque":
      cuerpo = `Vimos que te apuntaste a ${gimnasio.nombre}, pero aún no has podido venir. ¿Te ayudamos a empezar? Te ofrecemos una sesión de orientación sin costo para armar tu primera rutina.`;
      break;
    case "cuota_vencida":
      cuerpo = `Tu cuota venció el ${fechaLarga(socio.vencimiento)}. Si quieres renovarla, puedes hacerlo en recepción o por este mismo chat. Y si algo te frenó, cuéntanos: queremos que sigas entrenando con comodidad.`;
      break;
    case "renovacion_cercana":
      cuerpo = `Tu cuota vence el ${fechaLarga(socio.vencimiento)}. Antes de renovar, ¿quieres que revisemos tu rutina y tus horarios? A veces un pequeño ajuste hace que volver sea mucho más fácil.`;
      break;
    case "caida_ritmo":
      cuerpo = `Notamos que últimamente vienes menos que antes. ¿Todo bien? Si el problema son los horarios, una lesión o que la rutina te aburrió, cuéntanos y lo resolvemos juntos.`;
      break;
    default:
      cuerpo = `Hace ${ev.diasSinVenir ?? "unos"} días que no te vemos por aquí y queríamos saber cómo estás. Si algo te frena (horarios, rutina, una lesión), cuéntanos y lo resolvemos juntos. Te esperamos cuando quieras volver.`;
  }
  const texto = `Hola ${nombre}, te escribe ${firma}. ${cuerpo} ${BAJA}`;
  const numero = opciones.conNumero ? socio.telefono.replace(/\D/g, "") : "";
  return { texto, enlace: `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`, motivo: ev.senales[0]?.texto ?? "Sin señales de riesgo" };
}
