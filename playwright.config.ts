import { defineConfig, devices } from "@playwright/test";

/** Test de humo en navegador: arranca la app compilada en modo demo (sin claves) y recorre lo esencial. */
export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  retries: 0,
  // Un solo trabajador: la demo guarda su estado en la memoria del servidor y los proyectos lo comparten.
  workers: 1,
  reporter: "list",
  use: { baseURL: "http://localhost:3100", trace: "off" },
  projects: [
    { name: "escritorio", use: { ...devices["Desktop Chrome"] } },
    { name: "movil", use: { ...devices["Pixel 7"] } },
  ],
  webServer: { command: "npm run start -- -p 3100", url: "http://localhost:3100", reuseExistingServer: false, timeout: 60_000 },
});
