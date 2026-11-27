import { describe, expect, it } from "vitest";
import { puedeContactar } from "@/gimnasio/contacto";
import { redactarMensaje } from "@/gimnasio/mensaje";
import { buscarModismos } from "@/gimnasio/neutro";
import { evaluarSocio, type Evaluacion, type IdSenal } from "@/gimnasio/riesgo";
import { HOY, socio, visitas } from "./ayudas";

const conSenal = (id: IdSenal | null): Evaluacion => ({
  socioId: "s1",
  score: 50,
  nivel: "medio",
  senales: id ? [{ id, texto: "x", puntos: 50 }] : [],
  diasSinVenir: 20,
  ritmoHabitual: 3,
  ritmoReciente: 0,
});

describe("Mensaje de WhatsApp para el socio", () => {
  it("todas las plantillas están en español neutro, con tuteo y frase de baja", () => {
    for (const id of ["ausencia", "caida_ritmo", "cuota_vencida", "renovacion_cercana", "sin_arranque", null] as const) {
      const m = redactarMensaje(socio(), conSenal(id), { conNumero: true });
      expect(buscarModismos(m.texto), m.texto).toEqual([]);
      expect(m.texto).toMatch(/^Hola Lucía, te escribe el equipo de Forja Gym\./);
      expect(m.texto).toContain("responde BAJA");
    }
  });

  it("adapta el texto a la señal principal con datos reales", () => {
    const ev = evaluarSocio(socio(), visitas("2026-06-02", "2026-11-03", 2), HOY);
    expect(redactarMensaje(socio(), ev, { conNumero: true }).texto).toContain("Hace 24 días que no te vemos");
    expect(redactarMensaje(socio({ vencimiento: "2026-11-10" }), conSenal("cuota_vencida"), { conNumero: true }).texto).toContain("venció el 10 de noviembre");
  });

  it("el enlace abre WhatsApp con el texto y solo lleva número si se permite", () => {
    const con = redactarMensaje(socio(), conSenal("ausencia"), { conNumero: true, remitente: "Ana, de recepción" });
    expect(con.enlace).toMatch(/^https:\/\/wa\.me\/525500000001\?text=Hola%20Luc%C3%ADa%2C%20te%20escribe%20Ana/);
    expect(redactarMensaje(socio(), conSenal("ausencia"), { conNumero: false }).enlace).toMatch(/^https:\/\/wa\.me\/\?text=/);
  });
});

describe("Reglas de contacto", () => {
  it("respeta 'no contactar', el intervalo mínimo y el tope diario", () => {
    expect(puedeContactar(socio(), { enviadosHoy: 0 }, HOY)).toEqual({ ok: true });
    expect(puedeContactar(socio({ noContactar: true }), { enviadosHoy: 0 }, HOY).ok).toBe(false);
    expect(puedeContactar(socio(), { enviadosHoy: 0, ultimoContacto: "2026-11-20" }, HOY).ok).toBe(false);
    expect(puedeContactar(socio(), { enviadosHoy: 0, ultimoContacto: "2026-11-13" }, HOY).ok).toBe(true);
    expect(puedeContactar(socio(), { enviadosHoy: 10 }, HOY).ok).toBe(false);
  });
});

describe("Detector de español neutro", () => {
  it("detecta voseo y modismos", () => {
    expect(buscarModismos("Che, ¿vos tenés tiempo?").length).toBeGreaterThan(0);
    expect(buscarModismos("Reserva tu turno")).not.toEqual([]);
    expect(buscarModismos("¿Tienes tiempo para una cita?")).toEqual([]);
  });
});
