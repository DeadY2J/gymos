/**
 * Rutinas personalizadas. En modo demo las arma un generador por reglas (determinista, gratis y sin
 * inventar ejercicios fuera del catálogo). Un modelo de IA opcional puede proponer la rutina, pero su
 * salida se valida con el mismo esquema y solo con ejercicios de este catálogo.
 */
import { z } from "zod";

export const EntradaRutina = z.object({
  objetivo: z.enum(["perder_grasa", "ganar_musculo", "salud_general"]),
  nivel: z.enum(["principiante", "intermedio", "avanzado"]),
  diasPorSemana: z.number().int().min(2).max(6),
  minutos: z.number().int().min(30).max(120).default(60),
  /** Zonas que hay que cuidar: se excluyen los ejercicios que las cargan. */
  cuidar: z.array(z.enum(["rodilla", "hombro", "espalda_baja"])).max(3).default([]),
});
export type EntradaRutina = z.infer<typeof EntradaRutina>;

type Grupo = "pierna" | "empuje" | "tiron" | "core" | "cardio";
type Ejercicio = { id: string; nombre: string; grupo: Grupo; carga: ("rodilla" | "hombro" | "espalda_baja")[]; nivelMin: 0 | 1 | 2 };

export const catalogo: Ejercicio[] = [
  { id: "sentadilla", nombre: "Sentadilla con barra", grupo: "pierna", carga: ["rodilla", "espalda_baja"], nivelMin: 1 },
  { id: "sentadilla-copa", nombre: "Sentadilla copa con mancuerna", grupo: "pierna", carga: ["rodilla"], nivelMin: 0 },
  { id: "prensa", nombre: "Prensa de piernas", grupo: "pierna", carga: ["rodilla"], nivelMin: 0 },
  { id: "peso-muerto-rumano", nombre: "Peso muerto rumano", grupo: "pierna", carga: ["espalda_baja"], nivelMin: 1 },
  { id: "puente-gluteo", nombre: "Puente de glúteo", grupo: "pierna", carga: [], nivelMin: 0 },
  { id: "curl-femoral", nombre: "Curl femoral en máquina", grupo: "pierna", carga: [], nivelMin: 0 },
  { id: "zancadas", nombre: "Zancadas caminando", grupo: "pierna", carga: ["rodilla"], nivelMin: 1 },
  { id: "elevacion-talones", nombre: "Elevación de talones", grupo: "pierna", carga: [], nivelMin: 0 },
  { id: "press-banca", nombre: "Press de banca", grupo: "empuje", carga: ["hombro"], nivelMin: 1 },
  { id: "press-mancuernas", nombre: "Press con mancuernas en banco inclinado", grupo: "empuje", carga: ["hombro"], nivelMin: 0 },
  { id: "flexiones", nombre: "Flexiones (con apoyo si hace falta)", grupo: "empuje", carga: [], nivelMin: 0 },
  { id: "press-militar", nombre: "Press militar con mancuernas", grupo: "empuje", carga: ["hombro"], nivelMin: 1 },
  { id: "fondos", nombre: "Fondos en paralelas", grupo: "empuje", carga: ["hombro"], nivelMin: 2 },
  { id: "extension-triceps", nombre: "Extensión de tríceps en polea", grupo: "empuje", carga: [], nivelMin: 0 },
  { id: "jalon", nombre: "Jalón al pecho", grupo: "tiron", carga: [], nivelMin: 0 },
  { id: "remo-sentado", nombre: "Remo sentado en polea", grupo: "tiron", carga: [], nivelMin: 0 },
  { id: "remo-barra", nombre: "Remo con barra", grupo: "tiron", carga: ["espalda_baja"], nivelMin: 1 },
  { id: "dominadas", nombre: "Dominadas", grupo: "tiron", carga: ["hombro"], nivelMin: 2 },
  { id: "face-pull", nombre: "Face pull en polea", grupo: "tiron", carga: [], nivelMin: 0 },
  { id: "curl-biceps", nombre: "Curl de bíceps con mancuernas", grupo: "tiron", carga: [], nivelMin: 0 },
  { id: "plancha", nombre: "Plancha frontal", grupo: "core", carga: [], nivelMin: 0 },
  { id: "dead-bug", nombre: "Bicho muerto (dead bug)", grupo: "core", carga: [], nivelMin: 0 },
  { id: "pallof", nombre: "Press Pallof", grupo: "core", carga: [], nivelMin: 0 },
  { id: "rueda", nombre: "Rueda abdominal", grupo: "core", carga: ["espalda_baja"], nivelMin: 2 },
  { id: "bici", nombre: "Bicicleta estática por intervalos", grupo: "cardio", carga: [], nivelMin: 0 },
  { id: "eliptica", nombre: "Elíptica a ritmo constante", grupo: "cardio", carga: [], nivelMin: 0 },
  { id: "remo-ergometro", nombre: "Remo ergómetro", grupo: "cardio", carga: ["espalda_baja"], nivelMin: 1 },
  { id: "caminata-inclinada", nombre: "Caminata en cinta inclinada", grupo: "cardio", carga: [], nivelMin: 0 },
];

export type EjercicioRutina = { id: string; nombre: string; series: number; repeticiones: string; descansoSeg: number };
export type DiaRutina = { titulo: string; ejercicios: EjercicioRutina[]; cardioMin: number };
export type Rutina = { titulo: string; dias: DiaRutina[]; notas: string[]; origen: "reglas" | "ia" };

const plantillaDias: Record<number, { titulo: string; grupos: Grupo[] }[]> = {
  2: [{ titulo: "Cuerpo completo A", grupos: ["pierna", "empuje", "tiron", "core"] }, { titulo: "Cuerpo completo B", grupos: ["pierna", "tiron", "empuje", "core"] }],
  3: [
    { titulo: "Cuerpo completo A", grupos: ["pierna", "empuje", "tiron", "core"] },
    { titulo: "Cuerpo completo B", grupos: ["pierna", "tiron", "empuje", "core"] },
    { titulo: "Cuerpo completo C", grupos: ["pierna", "empuje", "tiron", "core"] },
  ],
  4: [
    { titulo: "Tren superior A", grupos: ["empuje", "tiron", "empuje", "tiron"] },
    { titulo: "Tren inferior A", grupos: ["pierna", "pierna", "pierna", "core"] },
    { titulo: "Tren superior B", grupos: ["tiron", "empuje", "tiron", "empuje"] },
    { titulo: "Tren inferior B", grupos: ["pierna", "pierna", "core", "core"] },
  ],
};
const empujeTironPierna = (n: number) =>
  Array.from({ length: n }, (_, i) =>
    [
      { titulo: "Empuje", grupos: ["empuje", "empuje", "empuje", "core"] as Grupo[] },
      { titulo: "Tirón", grupos: ["tiron", "tiron", "tiron", "core"] as Grupo[] },
      { titulo: "Pierna", grupos: ["pierna", "pierna", "pierna", "pierna"] as Grupo[] },
    ][i % 3],
  ).map((d, i) => ({ ...d, titulo: `${d.titulo} ${i < 3 ? "A" : "B"}` }));

const nivelNum = { principiante: 0, intermedio: 1, avanzado: 2 } as const;
const objetivos = {
  ganar_musculo: { series: [3, 4, 4], reps: "8-12", descanso: 90, cardio: 10 },
  perder_grasa: { series: [3, 3, 4], reps: "12-15", descanso: 60, cardio: 20 },
  salud_general: { series: [2, 3, 3], reps: "10-12", descanso: 75, cardio: 15 },
};
const nombresObjetivo = { ganar_musculo: "ganar músculo", perder_grasa: "perder grasa", salud_general: "salud general" };

export function generarRutina(entrada: EntradaRutina): Rutina {
  const e = EntradaRutina.parse(entrada);
  const nivel = nivelNum[e.nivel];
  const o = objetivos[e.objetivo];
  const disponibles = catalogo.filter((ej) => ej.nivelMin <= nivel && !ej.carga.some((c) => e.cuidar.includes(c)));
  const dias = (plantillaDias[e.diasPorSemana] ?? empujeTironPierna(e.diasPorSemana)).map((plantilla, iDia) => {
    const usados = new Set<string>();
    const ejercicios: EjercicioRutina[] = [];
    plantilla.grupos.forEach((grupo, iGrupo) => {
      const opciones = disponibles.filter((ej) => ej.grupo === grupo && !usados.has(ej.id));
      if (opciones.length === 0) return;
      // Rotación determinista: cada día y cada hueco eligen un ejercicio distinto.
      const ej = opciones[(iDia + iGrupo) % opciones.length];
      usados.add(ej.id);
      ejercicios.push({ id: ej.id, nombre: ej.nombre, series: grupo === "core" ? 3 : o.series[nivel], repeticiones: grupo === "core" ? "30-45 s" : o.reps, descansoSeg: o.descanso });
    });
    // Con poco tiempo, menos ejercicios; con más tiempo, más cardio.
    const recortados = e.minutos < 45 ? ejercicios.slice(0, 3) : ejercicios;
    return { titulo: plantilla.titulo, ejercicios: recortados, cardioMin: e.minutos >= 75 ? o.cardio + 10 : o.cardio };
  });
  const notas = [
    "Calienta de 5 a 10 minutos antes de empezar.",
    "Sube el peso cuando completes todas las series con buena técnica.",
    ...(e.cuidar.length ? [`Se evitaron ejercicios que cargan: ${e.cuidar.map((c) => c.replace("_", " ")).join(", ")}.`] : []),
    "Esta rutina es orientativa y no sustituye la valoración de un profesional de la salud.",
  ];
  return { titulo: `${e.diasPorSemana} días por semana para ${nombresObjetivo[e.objetivo]} (${e.nivel})`, dias, notas, origen: "reglas" };
}

/** Valida una rutina propuesta por un modelo de IA: mismo formato y solo ejercicios del catálogo. */
export const RutinaIa = z.object({
  titulo: z.string().min(3).max(120),
  dias: z
    .array(
      z.object({
        titulo: z.string().min(2).max(60),
        ejercicios: z
          .array(z.object({ id: z.enum(catalogo.map((c) => c.id) as [string, ...string[]]), series: z.number().int().min(1).max(6), repeticiones: z.string().min(1).max(20), descansoSeg: z.number().int().min(15).max(300) }))
          .min(1)
          .max(10),
        cardioMin: z.number().int().min(0).max(60),
      }),
    )
    .min(2)
    .max(6),
  notas: z.array(z.string().max(200)).max(6),
});
