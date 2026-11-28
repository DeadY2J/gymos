import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  // Los tests de navegador (e2e/) los ejecuta Playwright, no Vitest.
  test: { environment: "node", include: ["tests/**/*.test.ts"] },
});
