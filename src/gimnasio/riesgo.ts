/**
 * Radar de bajas: estima, con los datos reales de asistencia y cuota, qué socios están a punto de irse.
 * Nunca inventa: si no hay historial suficiente para saber qué es "lo habitual" de un socio, lo dice
 * ("sin datos") en lugar de adivinar. Cada punto del resultado se explica con una señal legible.
 */
import { estadoCuota } from "./acceso";
import { riesgo as cfg } from "./config";
import { type Dia, diasEntre, sumarDias } from "./fechas";
import type { Socio } from "./tipos";

export type IdSenal = "ausencia" | "caida_ritmo" | "cuota_vencida" | "renovacion_cercana" | "sin_arranque";
export type Senal = { id: IdSenal; texto: string; puntos: number };
export type NivelRiesgo = "alto" | "medio" | "bajo" | "sin_datos" | "congelado";

export type Evaluacion = {
  socioId: string;
  score: number;
  nivel: NivelRiesgo;
  senales: Senal[];
  /** Días desde la última visita (null si nunca vino). */
  diasSinVenir: number | null;
  /** Visitas por semana: lo habitual y lo reciente (null si no hay datos). */
  ritmoHabitual: number | null;
  ritmoReciente: number | null;
};

const limitar = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const decimal = (n: number) => String(Math.round(n * 10) / 10).replace(".", ",");

/** Cuenta visitas (días distintos) en el intervalo [desde, hasta] ambos inclusive. */
function contar(dias: Set<Dia>, desde: Dia, hasta: Dia): number {
  let n = 0;
  for (const d of dias) if (d >= desde && d <= hasta) n++;
  return n;
}

export function evaluarSocio(socio: Socio, diasVisita: Dia[], hoy: Dia): Evaluacion {
  const visitas = new Set(diasVisita.filter((d) => d <= hoy && d >= socio.alta));
  const ultima = [...visitas].sort().at(-1);
  const base: Evaluacion = {
    socioId: socio.id,
    score: 0,
    nivel: "bajo",
    senales: [],
    diasSinVenir: ultima ? diasEntre(ultima, hoy) : null,
    ritmoHabitual: null,
    ritmoReciente: null,
  };
  const estado = estadoCuota(socio, hoy);
  if (estado === "congelada") return { ...base, nivel: "congelado" };

  const senales: Senal[] = [];
  const antiguedad = diasEntre(socio.alta, hoy);

  // 1) Nunca arrancó: dato real, no hace falta historial.
  if (visitas.size === 0 && antiguedad >= cfg.diasSinArranque) {
    senales.push({ id: "sin_arranque", texto: `Se apuntó hace ${antiguedad} días y todavía no ha venido ninguna vez.`, puntos: cfg.pesos.sinArranque });
  }

  // 2) Comportamiento: solo si hay historial suficiente para saber qué es "lo habitual".
  const hayPerfil = antiguedad >= cfg.minAntiguedadDias && visitas.size >= cfg.minVisitas;
  let habitual: number | null = null;
  if (hayPerfil) {
    const finBase = sumarDias(hoy, -cfg.ventanaRecienteDias - 1);
    const iniBase = sumarDias(finBase, -(cfg.ventanaBaseDias - 1));
    const iniReciente = sumarDias(hoy, -(cfg.ventanaRecienteDias - 1));
    // La ventana base solo cuenta desde el alta, para no penalizar a los socios recientes.
    const iniBaseReal = iniBase < socio.alta ? socio.alta : iniBase;
    const diasBase = diasEntre(iniBaseReal, finBase) + 1;
    if (diasBase >= 14) {
      habitual = (contar(visitas, iniBaseReal, finBase) / diasBase) * 7;
      const reciente = (contar(visitas, iniReciente, hoy) / cfg.ventanaRecienteDias) * 7;
      base.ritmoHabitual = habitual;
      base.ritmoReciente = reciente;
      if (habitual >= cfg.minRitmoHabitual) {
        const intervalo = 7 / habitual;
        const ratio = (base.diasSinVenir ?? antiguedad) / intervalo;
        if (ratio >= 2) {
          senales.push({
            id: "ausencia",
            texto: `Hace ${base.diasSinVenir} días que no viene; lo habitual era venir cada ${decimal(intervalo)} días.`,
            puntos: Math.round(cfg.pesos.ausencia * limitar(0.5 + (ratio - 2) / 4, 0.5, 1)),
          });
        }
        const relativo = reciente / habitual;
        if (relativo < 0.5) {
          senales.push({
            id: "caida_ritmo",
            texto: `Ha pasado de ${decimal(habitual)} a ${decimal(reciente)} visitas por semana.`,
            puntos: Math.round(cfg.pesos.caidaRitmo * limitar(1 - relativo, 0.5, 1)),
          });
        }
      }
    }
  }

  // 3) Cuota: vencida es un hecho; una renovación cercana con menos asistencia es el momento de decidir.
  if (estado === "vencida" || estado === "en_gracia") {
    senales.push({ id: "cuota_vencida", texto: `La cuota venció hace ${-diasEntre(hoy, socio.vencimiento)} días y no la ha renovado.`, puntos: cfg.pesos.cuotaVencida });
  } else if (estado === "por_vencer" && base.ritmoReciente !== null && habitual !== null && habitual >= cfg.minRitmoHabitual && base.ritmoReciente < habitual * 0.8) {
    senales.push({ id: "renovacion_cercana", texto: "La cuota vence pronto y últimamente viene menos: es el momento en que decide si renueva.", puntos: cfg.pesos.renovacionCercana });
  }

  const score = Math.min(100, senales.reduce((t, s) => t + s.puntos, 0));
  const sinDatos = !hayPerfil && senales.length === 0;
  const nivel: NivelRiesgo = sinDatos ? "sin_datos" : score >= cfg.umbrales.alto ? "alto" : score >= cfg.umbrales.medio ? "medio" : "bajo";
  return { ...base, score, nivel, senales: senales.sort((a, b) => b.puntos - a.puntos) };
}

/** Evalúa a todos y ordena: primero los de más riesgo. */
export function radarDeBajas(socios: Socio[], visitasPorSocio: Map<string, Dia[]>, hoy: Dia): Evaluacion[] {
  return socios.map((s) => evaluarSocio(s, visitasPorSocio.get(s.id) ?? [], hoy)).sort((a, b) => b.score - a.score || a.socioId.localeCompare(b.socioId));
}
