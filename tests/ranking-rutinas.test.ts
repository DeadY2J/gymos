import { describe, expect, it } from "vitest";
import { buscarModismos } from "@/gimnasio/neutro";
import { rankingDelMes } from "@/gimnasio/ranking";
import { catalogo, EntradaRutina, generarRutina, RutinaIa } from "@/gimnasio/rutinas";
import { socio } from "./ayudas";

describe("Ranking mensual por constancia", () => {
  const socios = [
    socio({ id: "a", apodo: "Lu" }),
    socio({ id: "b", apodo: "Toro" }),
    socio({ id: "c", apodo: "Oculto", rankingVisible: false }),
    socio({ id: "d", apodo: undefined }),
    socio({ id: "e", apodo: "Nadie" }),
  ];
  // Noviembre 2026: semanas que empiezan el lunes 2, 9, 16 y 23.
  const mapa = new Map([
    ["a", ["2026-11-02", "2026-11-04", "2026-11-06", "2026-11-09", "2026-11-11", "2026-11-13", "2026-11-13", "2026-10-30"]],
    ["b", ["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06", "2026-11-20"]],
    ["c", ["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05"]],
    ["d", ["2026-11-02"]],
  ]);
  const filas = rankingDelMes(socios, mapa, "2026-11");

  it("solo muestra a quien aceptó salir, con su apodo, y a quien vino", () => {
    expect(filas.map((f) => f.apodo)).toEqual(["Lu", "Toro"]);
  });
  it("cuenta un día una vez, solo el mes pedido, y premia semanas y racha", () => {
    expect(filas[0]).toMatchObject({ visitas: 6, semanasCumplidas: 2, mejorRacha: 2, puntos: 60 + 40 + 5, posicion: 1 });
    expect(filas[1]).toMatchObject({ visitas: 6, semanasCumplidas: 1, mejorRacha: 1, puntos: 60 + 20, posicion: 2 });
  });
});

describe("Rutinas", () => {
  const base = EntradaRutina.parse({ objetivo: "ganar_musculo", nivel: "principiante", diasPorSemana: 3 });

  it("genera tantos días como se piden, sin repetir ejercicio en un día", () => {
    for (let dias = 2; dias <= 6; dias++) {
      const r = generarRutina({ ...base, diasPorSemana: dias });
      expect(r.dias).toHaveLength(dias);
      for (const d of r.dias) {
        expect(d.ejercicios.length).toBeGreaterThan(0);
        expect(new Set(d.ejercicios.map((e) => e.id)).size).toBe(d.ejercicios.length);
      }
    }
  });

  it("respeta el nivel y las zonas a cuidar", () => {
    const r = generarRutina({ ...base, diasPorSemana: 5, cuidar: ["rodilla", "hombro"] });
    const ids = r.dias.flatMap((d) => d.ejercicios.map((e) => e.id));
    for (const id of ids) {
      const ej = catalogo.find((c) => c.id === id)!;
      expect(ej.nivelMin).toBe(0);
      expect(ej.carga).not.toContain("rodilla");
      expect(ej.carga).not.toContain("hombro");
    }
    expect(r.notas.join(" ")).toContain("rodilla, hombro");
  });

  it("es determinista y sus textos están en español neutro", () => {
    const a = generarRutina({ ...base, objetivo: "perder_grasa", nivel: "avanzado", diasPorSemana: 4, minutos: 90 });
    expect(generarRutina({ ...base, objetivo: "perder_grasa", nivel: "avanzado", diasPorSemana: 4, minutos: 90 })).toEqual(a);
    expect(a.dias[0].cardioMin).toBe(30);
    expect(buscarModismos(JSON.stringify(a))).toEqual([]);
    expect(buscarModismos(catalogo.map((c) => c.nombre).join(" "))).toEqual([]);
  });

  it("valida la entrada y la salida de la IA", () => {
    expect(EntradaRutina.safeParse({ objetivo: "volar", nivel: "principiante", diasPorSemana: 3 }).success).toBe(false);
    expect(EntradaRutina.safeParse({ objetivo: "salud_general", nivel: "principiante", diasPorSemana: 7 }).success).toBe(false);
    const inventado = { titulo: "Rutina", notas: [], dias: [1, 2].map(() => ({ titulo: "Día", cardioMin: 10, ejercicios: [{ id: "salto-mortal", series: 3, repeticiones: "10", descansoSeg: 60 }] })) };
    expect(RutinaIa.safeParse(inventado).success).toBe(false);
    inventado.dias.forEach((d) => (d.ejercicios[0].id = "plancha"));
    expect(RutinaIa.safeParse(inventado).success).toBe(true);
  });
});
