import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  timeout: 120000,
  workers: 1,
  use: {
    browserName: "chromium",
    headless: true,
    viewport: { width: 1440, height: 900 },
    timezoneId: "Europe/Paris",
    locale: "fr-FR",
    trace: "retain-on-failure",
  },
  reporter: [
    ["list"],
    ["json", { outputFile: new URL("../docs/test-results/e2e.json", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1") }],
  ],
  projects: [
    // E2E_ANGULAR_URL : autre adresse quand 4200 sert deja l'application personnelle (ex. http://127.0.0.1:4300).
    { name: "angular", use: { baseURL: process.env.E2E_ANGULAR_URL ?? "http://127.0.0.1:4200" } },
    { name: "react", use: { baseURL: "http://127.0.0.1:5173" } },
  ],
});
