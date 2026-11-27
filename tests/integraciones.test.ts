import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as enlace } from "@/app/api/pagos/enlace/route";
import { POST as suscripcion } from "@/app/api/pagos/suscripcion/route";
import { POST as webhook } from "@/app/api/pagos/webhook/route";
import { POST as rutinaRuta } from "@/app/api/rutina/route";
import { POST as whatsapp } from "@/app/api/socios/[id]/whatsapp/route";
import { almacen } from "@/gimnasio/almacen";
import { EntradaRutina } from "@/gimnasio/rutinas";
import { reiniciarLimites } from "@/gimnasio/seguridad";
import { aceptarPropuesta, rutinaConIa } from "@/integraciones/ia";
import { leerReferencia, verificarFirmaWebhook } from "@/integraciones/mercadopago";

const TOKEN = "t".repeat(20);
const pedir = (ruta: string, cuerpo: unknown, cabeceras: Record<string, string> = {}) =>
  new Request(`http://localhost:3000${ruta}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "9.9.9.9", "x-gymos-token": TOKEN, ...cabeceras },
    body: JSON.stringify(cuerpo),
  });
const params = (id: string) => ({ params: Promise.resolve({ id }) });
const respuesta = (cuerpo: unknown, status = 200) => new Response(JSON.stringify(cuerpo), { status, headers: { "Content-Type": "application/json" } });

const entorno = { ...process.env };
let fetchFalso: ReturnType<typeof vi.fn>;
beforeEach(() => {
  for (const v of ["MERCADOPAGO_ACCESS_TOKEN", "MERCADOPAGO_WEBHOOK_SECRET", "WHATSAPP_TOKEN", "WHATSAPP_PHONE_NUMBER_ID", "WHATSAPP_PLANTILLA_RETENCION", "IA_API_KEY", "IA_MODELO", "IA_BASE_URL", "GYMOS_URL_PUBLICA"]) delete process.env[v];
  process.env.GYMOS_TOKEN = TOKEN;
  almacen.reiniciar();
  reiniciarLimites();
  fetchFalso = vi.fn();
  vi.stubGlobal("fetch", fetchFalso);
});
afterEach(() => {
  process.env = { ...entorno };
  vi.unstubAllGlobals();
});

describe("Mercado Pago (simulado)", () => {
  beforeEach(() => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = "TEST-secreto-mp";
    process.env.MERCADOPAGO_WEBHOOK_SECRET = "secreto-webhook";
    process.env.GYMOS_URL_PUBLICA = "https://gymos.example";
  });

  it("crea el enlace de pago con la referencia del socio y sin filtrar el token", async () => {
    fetchFalso.mockResolvedValueOnce(respuesta({ init_point: "https://www.mercadopago.com/checkout/abc" }));
    const res = await enlace(pedir("/api/pagos/enlace", { socioId: "lucia-herrera", planId: "plus" }));
    expect(await res.json()).toEqual({ url: "https://www.mercadopago.com/checkout/abc" });
    const [url, init] = fetchFalso.mock.calls[0];
    expect(url).toBe("https://api.mercadopago.com/checkout/preferences");
    const cuerpo = JSON.parse(init.body);
    expect(cuerpo).toMatchObject({ external_reference: "lucia-herrera:plus", notification_url: "https://gymos.example/api/pagos/webhook" });
    expect(cuerpo.items[0]).toMatchObject({ unit_price: 850, currency_id: "MXN" });
    expect(init.headers.Authorization).toBe("Bearer TEST-secreto-mp");
  });

  it("si Mercado Pago falla devuelve un error controlado sin datos internos", async () => {
    fetchFalso.mockResolvedValueOnce(respuesta({ message: "invalid token TEST-secreto-mp" }, 401));
    const res = await enlace(pedir("/api/pagos/enlace", { socioId: "lucia-herrera", planId: "plus" }));
    expect(res.status).toBe(502);
    expect(JSON.stringify(await res.json())).not.toContain("TEST-secreto-mp");
    fetchFalso.mockRejectedValueOnce(new Error("red caída"));
    expect((await enlace(pedir("/api/pagos/enlace", { socioId: "lucia-herrera", planId: "plus" }))).status).toBe(502);
  });

  it("crea la suscripción mensual y valida el correo", async () => {
    fetchFalso.mockResolvedValueOnce(respuesta({ init_point: "https://www.mercadopago.com/subscriptions/xyz" }));
    const res = await suscripcion(pedir("/api/pagos/suscripcion", { socioId: "martina-rojas", planId: "mensual", email: "martina@example.com" }));
    expect(res.status).toBe(200);
    const cuerpo = JSON.parse(fetchFalso.mock.calls[0][1].body);
    expect(cuerpo.auto_recurring).toEqual({ frequency: 1, frequency_type: "months", transaction_amount: 650, currency_id: "MXN" });
    expect((await suscripcion(pedir("/api/pagos/suscripcion", { socioId: "martina-rojas", planId: "mensual", email: "no-es-correo" }))).status).toBe(400);
  });

  const firmar = (idDato: string, idPeticion: string, ts: number, secreto = "secreto-webhook") =>
    `ts=${ts},v1=${createHmac("sha256", secreto).update(`id:${idDato};request-id:${idPeticion};ts:${ts};`).digest("hex")}`;
  const notificar = (idDato: string, firma: string) =>
    new Request(`http://localhost:3000/api/pagos/webhook?data.id=${idDato}&type=payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-signature": firma, "x-request-id": "req-1" },
      body: JSON.stringify({ type: "payment", data: { id: idDato } }),
    });

  it("valida la firma del webhook", () => {
    const ahora = Date.now();
    expect(verificarFirmaWebhook(firmar("123", "req-1", ahora), "req-1", "123", ahora)).toBe(true);
    expect(verificarFirmaWebhook(firmar("123", "req-1", ahora, "otro"), "req-1", "123", ahora)).toBe(false);
    expect(verificarFirmaWebhook(firmar("123", "req-1", ahora), "req-2", "123", ahora)).toBe(false);
    expect(verificarFirmaWebhook(firmar("123", "req-1", ahora - 3_600_000), "req-1", "123", ahora)).toBe(false);
    expect(verificarFirmaWebhook("basura", "req-1", "123", ahora)).toBe(false);
    expect(verificarFirmaWebhook(null, "req-1", "123", ahora)).toBe(false);
    expect(leerReferencia("a:b:c")).toBeNull();
  });

  it("un pago aprobado y firmado renueva la cuota una sola vez", async () => {
    expect(almacen.socio("lucia-herrera")!.vencimiento < almacen.hoy()).toBe(true);
    fetchFalso.mockImplementation(async () => respuesta({ status: "approved", external_reference: "lucia-herrera:plus", transaction_amount: 850 }));
    const res = await webhook(notificar("555", firmar("555", "req-1", Date.now())));
    expect(await res.json()).toEqual({ ok: true, renovado: "lucia-herrera" });
    expect(almacen.socio("lucia-herrera")!.vencimiento > almacen.hoy()).toBe(true);
    expect(fetchFalso.mock.calls[0][0]).toBe("https://api.mercadopago.com/v1/payments/555");
    expect(await (await webhook(notificar("555", firmar("555", "req-1", Date.now())))).json()).toMatchObject({ repetido: true });
    expect(almacen.pagos.filter((p) => p.medio === "mercadopago")).toHaveLength(1);
  });

  it("rechaza webhooks sin firma y no renueva pagos pendientes ni con importe menor", async () => {
    expect((await webhook(notificar("556", "ts=1,v1=00"))).status).toBe(401);
    expect(fetchFalso).not.toHaveBeenCalled();
    fetchFalso.mockResolvedValueOnce(respuesta({ status: "pending", external_reference: "lucia-herrera:plus", transaction_amount: 850 }));
    expect(await (await webhook(notificar("557", firmar("557", "req-1", Date.now())))).json()).toMatchObject({ ignorado: true });
    fetchFalso.mockResolvedValueOnce(respuesta({ status: "approved", external_reference: "lucia-herrera:plus", transaction_amount: 1 }));
    expect(await (await webhook(notificar("558", firmar("558", "req-1", Date.now())))).json()).toMatchObject({ ignorado: true });
    expect(almacen.socio("lucia-herrera")!.vencimiento < almacen.hoy()).toBe(true);
  });

  it("sin Mercado Pago configurado, las rutas de pago no existen", async () => {
    delete process.env.MERCADOPAGO_ACCESS_TOKEN;
    process.env.WHATSAPP_TOKEN = "x"; // mantiene el modo con token
    expect((await enlace(pedir("/api/pagos/enlace", { socioId: "lucia-herrera", planId: "plus" }))).status).toBe(404);
    expect((await webhook(notificar("1", "x"))).status).toBe(404);
  });
});

describe("WhatsApp Cloud API (simulado)", () => {
  beforeEach(() => {
    process.env.WHATSAPP_TOKEN = "EAAG-secreto";
    process.env.WHATSAPP_PHONE_NUMBER_ID = "123456";
    process.env.WHATSAPP_PLANTILLA_RETENCION = "retencion_socio";
  });

  it("envía la plantilla a un socio y registra el contacto; no deja repetir", async () => {
    fetchFalso.mockImplementation(async () => respuesta({ messages: [{ id: "wamid.1" }] }));
    expect((await whatsapp(pedir("/api/socios/diego-salazar/whatsapp", {}), params("diego-salazar"))).status).toBe(200);
    const [url, init] = fetchFalso.mock.calls[0];
    expect(url).toBe("https://graph.facebook.com/v21.0/123456/messages");
    expect(JSON.parse(init.body)).toMatchObject({ type: "template", template: { name: "retencion_socio", components: [{ parameters: [{ text: "Diego" }] }] } });
    expect((await whatsapp(pedir("/api/socios/diego-salazar/whatsapp", {}), params("diego-salazar"))).status).toBe(409);
    expect((await whatsapp(pedir("/api/socios/ernesto-luna/whatsapp", {}), params("ernesto-luna"))).status).toBe(409);
    expect(fetchFalso).toHaveBeenCalledTimes(1);
  });

  it("exige la clave de acceso y no registra el contacto si el envío falla", async () => {
    expect((await whatsapp(pedir("/api/socios/diego-salazar/whatsapp", {}, { "x-gymos-token": "mala" }), params("diego-salazar"))).status).toBe(401);
    fetchFalso.mockResolvedValueOnce(respuesta({ error: { message: "token EAAG-secreto inválido" } }, 400));
    const res = await whatsapp(pedir("/api/socios/diego-salazar/whatsapp", {}), params("diego-salazar"));
    expect(res.status).toBe(502);
    expect(JSON.stringify(await res.json())).not.toContain("EAAG");
    expect(almacen.ultimoContacto("diego-salazar")).toBeUndefined();
  });
});

describe("Rutina con IA (simulada)", () => {
  const entrada = EntradaRutina.parse({ objetivo: "ganar_musculo", nivel: "principiante", diasPorSemana: 2, cuidar: ["rodilla"] });
  const propuesta = (ids: string[]) => ({
    titulo: "Rutina de fuerza para empezar",
    notas: ["Hidrátate bien.", "Che, dale con todo"],
    dias: [1, 2].map((n) => ({ titulo: `Día ${n}`, cardioMin: 10, ejercicios: ids.map((id) => ({ id, series: 3, repeticiones: "10-12", descansoSeg: 90 })) })),
  });

  beforeEach(() => {
    process.env.IA_API_KEY = "clave-ia";
    process.env.IA_MODELO = "modelo-x";
    process.env.IA_BASE_URL = "https://omniroute.example/v1/";
  });

  it("acepta una propuesta válida, pone los nombres del catálogo y quita notas con modismos", async () => {
    fetchFalso.mockResolvedValueOnce(respuesta({ choices: [{ message: { content: "```json\n" + JSON.stringify(propuesta(["jalon", "flexiones", "plancha"])) + "\n```" } }] }));
    const r = await rutinaConIa(entrada);
    expect(r.origen).toBe("ia");
    expect(r.dias[0].ejercicios[0].nombre).toBe("Jalón al pecho");
    expect(r.notas.join(" ")).not.toMatch(/che/i);
    expect(fetchFalso.mock.calls[0][0]).toBe("https://omniroute.example/v1/chat/completions");
  });

  it("si la IA inventa, ignora una zona a cuidar, falla o tarda, usa las reglas", async () => {
    expect(aceptarPropuesta(propuesta(["sentadilla-copa"]), entrada)).toBeNull(); // carga la rodilla
    expect(aceptarPropuesta(propuesta(["dominadas"]), entrada)).toBeNull(); // nivel avanzado
    expect(aceptarPropuesta(propuesta(["salto-mortal"]), entrada)).toBeNull(); // fuera del catálogo
    fetchFalso.mockResolvedValueOnce(respuesta({ choices: [{ message: { content: "no es JSON" } }] }));
    expect((await rutinaConIa(entrada)).origen).toBe("reglas");
    fetchFalso.mockResolvedValueOnce(respuesta({}, 500));
    expect((await rutinaConIa(entrada)).origen).toBe("reglas");
    fetchFalso.mockRejectedValueOnce(new Error("timeout"));
    const r = await rutinaConIa(entrada);
    expect(r.origen).toBe("reglas");
    expect(r.notas.at(-1)).toContain("La IA no estaba disponible");
  });

  it("sin IA configurada no llama a ninguna API", async () => {
    delete process.env.IA_API_KEY;
    delete process.env.GYMOS_TOKEN;
    const res = await rutinaRuta(pedir("/api/rutina", { objetivo: "salud_general", nivel: "principiante", diasPorSemana: 3 }));
    expect((await res.json()).origen).toBe("reglas");
    expect(fetchFalso).not.toHaveBeenCalled();
  });
});
