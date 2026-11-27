import { describe, expect, it } from "vitest";
import { evaluarSocio, radarDeBajas } from "@/gimnasio/riesgo";
import { HOY, socio, visitas } from "./ayudas";

describe("Radar de bajas", () => {
  it("un socio constante no tiene riesgo", () => {
    const ev = evaluarSocio(socio(), visitas("2026-06-02", "2026-11-26", 2), HOY);
    expect(ev).toMatchObject({ score: 0, nivel: "bajo", senales: [] });
    expect(ev.ritmoHabitual).toBeCloseTo(3.5, 1);
  });

  it("detecta a quien dejó de venir de golpe y lo explica", () => {
    const ev = evaluarSocio(socio(), visitas("2026-06-02", "2026-11-03", 2), HOY);
    expect(ev.nivel).toBe("alto");
    expect(ev.diasSinVenir).toBe(24);
    expect(ev.senales.map((s) => s.id)).toEqual(["ausencia", "caida_ritmo"]);
    expect(ev.senales[0].texto).toMatch(/^Hace 24 días que no viene; lo habitual era venir cada 2(,\d)? días\.$/);
  });

  it("lo habitual no se diluye cuanto más tiempo lleva sin venir", () => {
    const dias = visitas("2026-06-02", "2026-10-01", 2);
    const ev = evaluarSocio(socio(), dias, HOY);
    expect(ev.ritmoHabitual).toBeCloseTo(3.5, 0);
    expect(ev.senales.find((s) => s.id === "ausencia")?.puntos).toBe(40);
  });

  it("detecta una caída gradual aunque siga viniendo", () => {
    const dias = [...visitas("2026-06-02", "2026-10-26", 2), ...visitas("2026-11-05", "2026-11-26", 9)];
    const ev = evaluarSocio(socio(), dias, HOY);
    expect(ev.senales.map((s) => s.id)).toContain("caida_ritmo");
    expect(ev.senales.map((s) => s.id)).not.toContain("ausencia");
    expect(ev.score).toBeGreaterThan(0);
  });

  it("a quien viene poco por costumbre no lo marca como fuga", () => {
    const ev = evaluarSocio(socio(), visitas("2026-06-02", "2026-11-10", 12), HOY);
    expect(ev.ritmoHabitual).toBeLessThan(1);
    expect(ev.senales).toEqual([]);
  });

  it("señala a quien se apuntó y nunca vino", () => {
    const ev = evaluarSocio(socio({ alta: "2026-11-01" }), [], HOY);
    expect(ev).toMatchObject({ nivel: "medio", diasSinVenir: null });
    expect(ev.senales[0]).toMatchObject({ id: "sin_arranque", texto: "Se apuntó hace 26 días y todavía no ha venido ninguna vez." });
  });

  it("no inventa: sin historial suficiente dice 'sin datos'", () => {
    expect(evaluarSocio(socio({ alta: "2026-11-20" }), [], HOY).nivel).toBe("sin_datos");
    expect(evaluarSocio(socio({ alta: "2026-11-01" }), ["2026-11-02", "2026-11-05"], HOY).nivel).toBe("sin_datos");
  });

  it("la cuota vencida suma, y el total nunca pasa de 100", () => {
    const ev = evaluarSocio(socio({ vencimiento: "2026-11-10" }), visitas("2026-06-02", "2026-11-03", 2), HOY);
    expect(ev.senales.map((s) => s.id)).toContain("cuota_vencida");
    expect(ev.score).toBeLessThanOrEqual(100);
    expect(ev.score).toBe(95);
  });

  it("avisa de la renovación cercana si viene menos que antes", () => {
    const dias = [...visitas("2026-06-02", "2026-11-04", 2), ...visitas("2026-11-08", "2026-11-26", 4)];
    const ev = evaluarSocio(socio({ vencimiento: "2026-11-30" }), dias, HOY);
    expect(ev.senales.map((s) => s.id)).toContain("renovacion_cercana");
    // Con la asistencia de siempre, la renovación cercana no es una señal.
    expect(evaluarSocio(socio({ vencimiento: "2026-11-30" }), visitas("2026-06-02", "2026-11-26", 2), HOY).senales).toEqual([]);
  });

  it("los congelados no cuentan como riesgo", () => {
    expect(evaluarSocio(socio({ congeladoHasta: "2026-12-10" }), visitas("2026-06-02", "2026-10-01", 2), HOY)).toMatchObject({ nivel: "congelado", score: 0 });
  });

  it("ignora visitas futuras y anteriores al alta", () => {
    const ev = evaluarSocio(socio(), [...visitas("2026-06-02", "2026-11-03", 2), "2026-11-28", "2026-12-01", "2026-01-01"], HOY);
    expect(ev.diasSinVenir).toBe(24);
  });

  it("ordena a todos de más a menos riesgo", () => {
    const socios = [socio({ id: "constante" }), socio({ id: "fuga" }), socio({ id: "nuevo", alta: "2026-11-01" })];
    const mapa = new Map([
      ["constante", visitas("2026-06-02", "2026-11-26", 2)],
      ["fuga", visitas("2026-06-02", "2026-11-03", 2)],
    ]);
    expect(radarDeBajas(socios, mapa, HOY).map((e) => e.socioId)).toEqual(["fuga", "nuevo", "constante"]);
  });
});
