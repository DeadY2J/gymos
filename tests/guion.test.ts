import { describe, expect, it } from "vitest";
import { fichasDemo } from "@/gimnasio/demo";
import { DURACION_GUION, guion, textoEn } from "@/gimnasio/guion";
import { esNeutro } from "@/gimnasio/neutro";

describe("Guion del modo presentación", () => {
  it("va en orden y cabe en 60 segundos", () => {
    const segundos = guion.map((p) => p.seg);
    expect(segundos).toEqual([...segundos].sort((a, b) => a - b));
    expect(segundos.at(-1)!).toBeLessThan(DURACION_GUION);
  });

  it("solo usa socios que existen en la demo", () => {
    const ids = new Set(fichasDemo.map((f) => f.id));
    for (const p of guion) if ("id" in p.accion) expect(ids.has(p.accion.id)).toBe(true);
  });

  it("recorre las semanas de la máquina del tiempo de una en una hasta la sexta", () => {
    const semanas = guion.flatMap((p) => (p.accion.tipo === "semana" ? [p.accion.n] : []));
    expect(semanas).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("los textos en pantalla están en español neutro", () => {
    for (const p of guion) if (p.texto) expect(esNeutro(p.texto), p.texto).toBe(true);
  });

  it("muestra el texto del paso en curso", () => {
    expect(textoEn(0)).toMatch(/en silencio/);
    expect(textoEn(16)).toBe("Si la cuota venció, no pasa.");
    expect(textoEn(45)).toMatch(/uno a uno/);
  });
});
