import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST as acceso } from "@/app/api/acceso/route";
import { GET as panelGet } from "@/app/api/panel/route";
import { POST as rutina } from "@/app/api/rutina/route";
import { POST as contacto } from "@/app/api/socios/[id]/contacto/route";
import { GET as qr } from "@/app/api/socios/[id]/qr/route";
import { POST as renovarRuta } from "@/app/api/socios/[id]/renovar/route";
import { POST as tiempo } from "@/app/api/tiempo/route";
import { almacen } from "@/gimnasio/almacen";
import { generarCodigoQr } from "@/gimnasio/acceso";
import { datosDemo, DIA_BASE_DEMO } from "@/gimnasio/demo";
import { buscarModismos } from "@/gimnasio/neutro";
import { radarDeBajas } from "@/gimnasio/riesgo";
import { comprobarAcceso, reiniciarLimites, secretoQr } from "@/gimnasio/seguridad";
import type { Panel } from "@/gimnasio/vista";

const URL_BASE = "http://localhost:3000";
const pedir = (ruta: string, cuerpo?: unknown, cabeceras: Record<string, string> = {}) =>
  new Request(`${URL_BASE}${ruta}`, {
    method: cuerpo === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4", ...cabeceras },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
const params = (id: string) => ({ params: Promise.resolve({ id }) });

const entorno = { ...process.env };
beforeEach(() => {
  for (const v of ["MERCADOPAGO_ACCESS_TOKEN", "WHATSAPP_TOKEN", "IA_API_KEY", "GYMOS_TOKEN", "GYMOS_SECRETO_QR"]) delete process.env[v];
  almacen.reiniciar();
  reiniciarLimites();
});
afterEach(() => {
  process.env = { ...entorno };
});

describe("Datos de demo", () => {
  it("son deterministas y cuentan una historia: fugas arriba, novatos sin datos, congelada fuera", () => {
    const a = datosDemo(DIA_BASE_DEMO);
    expect(datosDemo(DIA_BASE_DEMO)).toEqual(a);
    const radar = radarDeBajas(a.socios, a.visitas, DIA_BASE_DEMO);
    expect(radar[0]).toMatchObject({ socioId: "lucia-herrera", nivel: "alto" });
    const nivel = (id: string) => radar.find((e) => e.socioId === id)?.nivel;
    expect(nivel("renata-flores")).toBe("sin_datos");
    expect(nivel("ines-campos")).toBe("congelado");
    expect(nivel("paula-guzman")).toBe("medio");
    expect(nivel("hugo-navarro")).toBe("bajo");
    // Los teléfonos son del rango de ficción 555-01xx.
    for (const s of a.socios) expect(s.telefono).toMatch(/^\+52 55 555 01\d\d$/);
  });
});

describe("API en modo demo", () => {
  it("el panel trae radar, cuotas, ranking y mensajes en neutro sin número de teléfono", async () => {
    const res = await panelGet(pedir("/api/panel"));
    const p: Panel = await res.json();
    expect(p.modoDemo).toBe(true);
    expect(p.hoy).toBe(DIA_BASE_DEMO);
    expect(p.resumen.riesgoAlto).toBeGreaterThan(0);
    const lucia = p.radar.find((r) => r.socioId === "lucia-herrera")!;
    expect(lucia.mensaje?.enlace).toMatch(/^https:\/\/wa\.me\/\?text=/);
    for (const r of p.radar) if (r.mensaje) expect(buscarModismos(r.mensaje.texto)).toEqual([]);
    // Quien pidió no recibir mensajes no tiene mensaje.
    expect(p.radar.find((r) => r.socioId === "ernesto-luna")?.mensaje).toBeNull();
    expect(p.ranking.length).toBeGreaterThan(0);
  });

  it("la máquina del tiempo hace aparecer nuevas fugas y valida el rango", async () => {
    const p: Panel = await (await tiempo(pedir("/api/tiempo", { dias: 28 }))).json();
    expect(p.hoy).toBe("2026-12-25");
    expect(p.radar.find((r) => r.socioId === "valentina-rios")?.nivel).toBe("alto");
    expect((await tiempo(pedir("/api/tiempo", { dias: 99 }))).status).toBe(400);
    expect((await tiempo(pedir("/api/tiempo", { dias: -1 }))).status).toBe(400);
  });

  it("escanear un QR válido deja pasar y registra la visita una vez", async () => {
    const r = await (await qr(pedir("/api/socios/martina-rojas/qr"), params("martina-rojas"))).json();
    expect(r.svg).toMatch(/^<svg/);
    const d = await (await acceso(pedir("/api/acceso", { codigo: r.codigo }))).json();
    expect(d).toMatchObject({ permitido: true, socio: { nombre: "Martina Rojas" } });
    await acceso(pedir("/api/acceso", { codigo: r.codigo }));
    const visitas = almacen.estado().visitas.get("martina-rojas")!;
    expect(visitas.filter((v) => v === DIA_BASE_DEMO)).toHaveLength(1);
  });

  it("un socio en fuga que vuelve a entrar deja de estar en riesgo por ausencia", async () => {
    const { codigo } = await (await qr(pedir("/api/socios/diego-salazar/qr"), params("diego-salazar"))).json();
    expect((await (await acceso(pedir("/api/acceso", { codigo }))).json()).permitido).toBe(true);
    const p: Panel = await (await panelGet(pedir("/api/panel"))).json();
    expect(p.radar.find((r) => r.socioId === "diego-salazar")?.senales.map((s) => s.id)).not.toContain("ausencia");
  });

  it("niega el acceso con la cuota vencida y con códigos falsos o caducados", async () => {
    const { codigo } = await (await qr(pedir("/api/socios/lucia-herrera/qr"), params("lucia-herrera"))).json();
    expect(await (await acceso(pedir("/api/acceso", { codigo }))).json()).toMatchObject({ permitido: false, estado: "vencida" });
    expect((await (await acceso(pedir("/api/acceso", { codigo: "lucia-herrera.1.falso" }))).json()).permitido).toBe(false);
    const viejo = generarCodigoQr("martina-rojas", Date.now() - 10 * 60_000, (secretoQr() as { secreto: string }).secreto);
    expect(await (await acceso(pedir("/api/acceso", { codigo: viejo }))).json()).toMatchObject({ permitido: false, mensaje: expect.stringContaining("caducado") });
    expect((await acceso(pedir("/api/acceso", { codigo: "" }))).status).toBe(400);
  });

  it("renovar en recepción vuelve a dar acceso", async () => {
    expect((await renovarRuta(pedir("/api/socios/lucia-herrera/renovar", { planId: "plus" }), params("lucia-herrera"))).status).toBe(200);
    const { codigo } = await (await qr(pedir("/api/socios/lucia-herrera/qr"), params("lucia-herrera"))).json();
    expect((await (await acceso(pedir("/api/acceso", { codigo }))).json()).permitido).toBe(true);
    expect((await renovarRuta(pedir("/api/socios/lucia-herrera/renovar", { planId: "gratis" }), params("lucia-herrera"))).status).toBe(400);
    expect((await renovarRuta(pedir("/api/socios/nadie/renovar", { planId: "plus" }), params("nadie"))).status).toBe(404);
  });

  it("registrar un contacto aplica las reglas: no se escribe dos veces ni a quien pidió que no", async () => {
    expect((await contacto(pedir("/api/socios/lucia-herrera/contacto", {}), params("lucia-herrera"))).status).toBe(200);
    expect((await contacto(pedir("/api/socios/lucia-herrera/contacto", {}), params("lucia-herrera"))).status).toBe(409);
    expect((await contacto(pedir("/api/socios/ernesto-luna/contacto", {}), params("ernesto-luna"))).status).toBe(409);
    const p: Panel = await (await panelGet(pedir("/api/panel"))).json();
    expect(p.radar.find((r) => r.socioId === "lucia-herrera")).toMatchObject({ mensaje: null, ultimoContacto: DIA_BASE_DEMO });
  });

  it("genera rutinas y valida la entrada", async () => {
    const r = await rutina(pedir("/api/rutina", { objetivo: "salud_general", nivel: "principiante", diasPorSemana: 3 }));
    expect((await r.json()).dias).toHaveLength(3);
    expect((await rutina(pedir("/api/rutina", { objetivo: "x" }))).status).toBe(400);
  });

  it("el QR de un socio inexistente da 404", async () => {
    expect((await qr(pedir("/api/socios/nadie/qr"), params("nadie"))).status).toBe(404);
  });
});

describe("Seguridad con integraciones reales", () => {
  it("con una integración activa exige GYMOS_TOKEN y secreto del QR propio", async () => {
    process.env.WHATSAPP_TOKEN = "algo";
    expect((await panelGet(pedir("/api/panel"))).status).toBe(503);
    process.env.GYMOS_TOKEN = "t".repeat(20);
    expect((await panelGet(pedir("/api/panel"))).status).toBe(401);
    expect((await panelGet(pedir("/api/panel", undefined, { "x-gymos-token": "t".repeat(20) }))).status).toBe(200);
    expect(secretoQr().ok).toBe(false);
    expect((await qr(pedir("/api/socios/martina-rojas/qr", undefined, { "x-gymos-token": "t".repeat(20) }), params("martina-rojas"))).status).toBe(503);
    process.env.GYMOS_SECRETO_QR = "s".repeat(32);
    expect(secretoQr()).toEqual({ ok: true, secreto: "s".repeat(32) });
    // La máquina del tiempo no existe fuera del modo demo.
    expect((await tiempo(pedir("/api/tiempo", { dias: 7 }, { "x-gymos-token": "t".repeat(20) }))).status).toBe(403);
    expect(comprobarAcceso(pedir("/api/panel", undefined, { "x-gymos-token": "otro" })).ok).toBe(false);
  });

  it("limita las peticiones por IP", async () => {
    let ultimo = 200;
    for (let i = 0; i < 31; i++) ultimo = (await rutina(pedir("/api/rutina", { objetivo: "salud_general", nivel: "principiante", diasPorSemana: 2 }))).status;
    expect(ultimo).toBe(429);
  });
});
