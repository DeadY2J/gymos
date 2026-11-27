import { describe, expect, it } from "vitest";
import { decidirAcceso, estadoCuota, generarCodigoQr, leerCodigoQr, qrComoSvg } from "@/gimnasio/acceso";
import { HOY, socio } from "./ayudas";

const SECRETO = "x".repeat(32);
const T = Date.parse("2026-11-27T10:00:30Z");

describe("QR de acceso firmado y rotativo", () => {
  it("un código recién generado se lee y devuelve el socio", () => {
    const codigo = generarCodigoQr("s1", T, SECRETO);
    expect(leerCodigoQr(codigo, T, SECRETO)).toEqual({ ok: true, socioId: "s1" });
  });
  it("tolera el desfase de una ventana y caduca después", () => {
    const codigo = generarCodigoQr("s1", T, SECRETO);
    expect(leerCodigoQr(codigo, T + 60_000, SECRETO).ok).toBe(true);
    expect(leerCodigoQr(codigo, T + 120_000, SECRETO)).toEqual({ ok: false, motivo: "caducado" });
    expect(leerCodigoQr(codigo, T - 60_000, SECRETO)).toEqual({ ok: false, motivo: "caducado" });
  });
  it("rechaza códigos manipulados, de otro socio o con otro secreto", () => {
    const codigo = generarCodigoQr("s1", T, SECRETO);
    const [, v, f] = codigo.split(".");
    expect(leerCodigoQr(`s2.${v}.${f}`, T, SECRETO)).toEqual({ ok: false, motivo: "firma" });
    expect(leerCodigoQr(codigo, T, "y".repeat(32))).toEqual({ ok: false, motivo: "firma" });
    expect(leerCodigoQr(`${codigo}x`, T, SECRETO).ok).toBe(false);
    for (const basura of ["", "a.b", "s1.abc.def", "..", "s1.1.2.3"]) expect(leerCodigoQr(basura, T, SECRETO)).toEqual({ ok: false, motivo: "formato" });
  });
  it("exige un secreto largo", () => {
    expect(() => generarCodigoQr("s1", T, "corto")).toThrow();
    expect(() => leerCodigoQr("s1.1.a", T, "corto")).toThrow();
  });
  it("genera el QR en SVG", async () => {
    expect(await qrComoSvg(generarCodigoQr("s1", T, SECRETO))).toMatch(/^<svg/);
  });
});

describe("Decisión de acceso según la cuota", () => {
  it("clasifica el estado de la cuota", () => {
    expect(estadoCuota(socio({ vencimiento: "2026-12-20" }), HOY)).toBe("al_dia");
    expect(estadoCuota(socio({ vencimiento: "2026-12-02" }), HOY)).toBe("por_vencer");
    expect(estadoCuota(socio({ vencimiento: "2026-11-27" }), HOY)).toBe("por_vencer");
    expect(estadoCuota(socio({ vencimiento: "2026-11-24" }), HOY)).toBe("en_gracia");
    expect(estadoCuota(socio({ vencimiento: "2026-11-23" }), HOY)).toBe("vencida");
    expect(estadoCuota(socio({ congeladoHasta: "2026-11-30" }), HOY)).toBe("congelada");
    expect(estadoCuota(socio({ congeladoHasta: "2026-11-26" }), HOY)).toBe("al_dia");
  });
  it("deja pasar al día, avisa si vence pronto o está en gracia y bloquea vencida o congelada", () => {
    expect(decidirAcceso(socio(), HOY)).toMatchObject({ permitido: true, mensaje: "Bienvenido, Lucía." });
    expect(decidirAcceso(socio({ vencimiento: "2026-11-28" }), HOY).mensaje).toContain("vence en 1 día");
    expect(decidirAcceso(socio({ vencimiento: "2026-11-27" }), HOY).mensaje).toContain("vence hoy");
    expect(decidirAcceso(socio({ vencimiento: "2026-11-25" }), HOY)).toMatchObject({ permitido: true, estado: "en_gracia" });
    expect(decidirAcceso(socio({ vencimiento: "2026-11-01" }), HOY)).toMatchObject({ permitido: false, estado: "vencida" });
    expect(decidirAcceso(socio({ congeladoHasta: "2026-12-05" }), HOY)).toMatchObject({ permitido: false, estado: "congelada" });
  });
});
