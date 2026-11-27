/**
 * Ranking mensual por constancia, no por fuerza: puntos por visita (un día cuenta una vez),
 * bonus por semanas cumplidas y por racha. Solo aparecen los socios que aceptaron salir, con su apodo.
 */
import { ranking as cfg } from "./config";
import { type Dia, lunesDe, mesDe, sumarDias } from "./fechas";
import type { Socio } from "./tipos";

export type FilaRanking = { posicion: number; socioId: string; apodo: string; visitas: number; semanasCumplidas: number; mejorRacha: number; puntos: number };

export function rankingDelMes(socios: Socio[], visitasPorSocio: Map<string, Dia[]>, mes: string): FilaRanking[] {
  const filas = socios
    .filter((s) => s.rankingVisible && s.apodo)
    .map((s) => {
      const dias = new Set((visitasPorSocio.get(s.id) ?? []).filter((d) => mesDe(d) === mes));
      const porSemana = new Map<Dia, number>();
      for (const d of dias) porSemana.set(lunesDe(d), (porSemana.get(lunesDe(d)) ?? 0) + 1);
      const cumplidas = [...porSemana.entries()].filter(([, n]) => n >= cfg.metaSemanal).map(([l]) => l).sort();
      // Racha: semanas cumplidas consecutivas dentro del mes.
      let mejorRacha = 0;
      let actual = 0;
      for (let i = 0; i < cumplidas.length; i++) {
        actual = i > 0 && cumplidas[i] === sumarDias(cumplidas[i - 1], 7) ? actual + 1 : 1;
        mejorRacha = Math.max(mejorRacha, actual);
      }
      const bonusRacha = Math.min(cfg.maxBonusRacha, Math.max(0, mejorRacha - 1) * cfg.bonusPorSemanaDeRacha);
      const puntos = dias.size * cfg.puntosPorVisita + cumplidas.length * cfg.bonusSemanaCumplida + bonusRacha;
      return { socioId: s.id, apodo: s.apodo as string, visitas: dias.size, semanasCumplidas: cumplidas.length, mejorRacha, puntos };
    })
    .filter((f) => f.visitas > 0)
    .sort((a, b) => b.puntos - a.puntos || b.visitas - a.visitas || a.apodo.localeCompare(b.apodo));
  return filas.map((f, i) => ({ ...f, posicion: i + 1 }));
}
