import { expect, test } from "@playwright/test";

// La demo vive en memoria del servidor: los tests comparten estado, así que van en serie y empiezan reiniciando.
test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ request }) => {
  await request.post("/api/demo/reiniciar", { data: {} });
});

test("el panel carga con la CSP y sin errores en la consola", async ({ page }) => {
  const errores: string[] = [];
  page.on("pageerror", (e) => errores.push(e.message));
  page.on("console", (m) => m.type() === "error" && errores.push(m.text()));
  const respuesta = await page.goto("/");
  expect(respuesta?.headers()["content-security-policy"]).toContain("nonce-");
  await expect(page.getByRole("heading", { level: 1, name: "Forja Gym" })).toBeVisible();
  await expect(page.getByRole("img", { name: /Código QR de/ })).toBeVisible();
  const ancho = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(ancho).toBeLessThanOrEqual(0);
  expect(errores).toEqual([]);
});

test("en la puerta: pasa con la cuota al día y no pasa con la cuota vencida", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Socio en la puerta").selectOption("martina-rojas");
  await expect(page.getByRole("img", { name: "Código QR de Martina Rojas" })).toBeVisible();
  await page.getByRole("button", { name: "Escanear en la entrada" }).click();
  await expect(page.getByText("Bienvenido, Martina.")).toBeVisible();

  await page.getByLabel("Socio en la puerta").selectOption("lucia-herrera");
  await expect(page.getByRole("img", { name: "Código QR de Lucía Herrera" })).toBeVisible();
  await page.getByRole("button", { name: "Escanear en la entrada" }).click();
  await expect(page.getByText(/cuota está vencida/)).toBeVisible();
});

test("la máquina del tiempo enciende el radar y prepara un mensaje uno a uno", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "+6 semanas" }).click();
  await expect(page.getByRole("button", { name: "+6 semanas" })).toHaveAttribute("aria-current", "true");
  const valentina = page.locator("#socio-valentina-rios");
  await expect(valentina).toContainText("Riesgo alto");
  await valentina.getByRole("button", { name: "Preparar WhatsApp" }).click();
  await expect(valentina.getByRole("link", { name: "Abrir WhatsApp" })).toHaveAttribute("href", /wa\.me/);
  await expect(valentina).toContainText("Hola Valentina");
});

test("genera una rutina", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Generar rutina" }).click();
  await expect(page.getByRole("heading", { level: 3, name: /días por semana/ })).toBeVisible();
});

test("el modo presentación arranca, muestra el guion y se reinicia", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Modo presentación (60 s)" }).click();
  const barra = page.getByRole("region", { name: "Modo presentación" });
  await expect(barra).toContainText("se van en silencio");
  await expect(barra).toContainText("una captura no sirve", { timeout: 10_000 });
  await expect(page.getByText("Bienvenido, Martina.")).toBeVisible({ timeout: 10_000 });
  await barra.getByRole("button", { name: "Reiniciar" }).click();
  await expect(barra).toBeHidden();
  await expect(page.getByRole("button", { name: /^Hoy/ })).toHaveAttribute("aria-current", "true");
});
