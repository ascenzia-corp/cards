import { defineConfig, devices } from "@playwright/test";

/**
 * Parcours en viewport mobile (section 13). Requiert la base migrée et seedée, et le serveur lancé :
 *   pnpm build && pnpm start
 *   pnpm test:e2e
 * Les sessions de test sont injectées directement en base (global-setup), sans envoi d'e-mail.
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  workers: 1,
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    ...devices["iPhone 13"],
    browserName: "chromium",
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    // Chromium déjà installé ailleurs (CI, conteneur) : PLAYWRIGHT_CHROMIUM_PATH=/chemin/vers/chrome
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
      : {},
  },
  reporter: [["list"]],
});
