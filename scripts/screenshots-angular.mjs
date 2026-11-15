// Captures d'écran du frontend Angular uniquement, rangées dans screenshot/<Module>/<clair|sombre|mobile>/.
// Usage (recette isolée : backend 18080, Angular 4300, voir docs/technique/exploitation.md § 7) :
//   node scripts/screenshots-angular.mjs finance [premier-acces]
// « premier-acces » capture l'écran d'accueil et la visite guidée : à lancer sur une base sans compte, avant de
// remplir les données (par exemple avec finance.spec.ts).
// Playwright est pris dans frontend-react/node_modules, où la suite E2E l'installe.
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const playwright = join(repo, "frontend-react", "node_modules", "playwright", "index.mjs");
const { chromium } = await import(pathToFileURL(playwright).href);
const root = join(repo, "screenshot");
const web = process.env.E2E_ANGULAR_URL ?? "http://127.0.0.1:4300";
const api = "http://127.0.0.1:18080/api/v1/";
const [moduleName, step] = process.argv.slice(2);

const theme = (t) =>
  fetch(api + "settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ theme: t }),
  });

/** Pages de chaque module : [fichier, adresse, action facultative avant la capture]. */
const MODULES = {
  Finance: {
    pages: [
      ["01-mon-mois", "/finance/month?mois=2026-11"],
      ["02-mon-mois-janvier", "/finance/month?mois=2027-01"],
      ["03-operations-historique", "/finance/operations"],
      ["04-operations-recurrents", "/finance/operations?vue=recurrents"],
      ["05-projets-achat", "/finance/purchases"],
      [
        "05b-projets-achat-matrice",
        "/finance/purchases",
        (p) => p.getByRole("main").getByRole("tab", { name: "Matrice" }).click(),
      ],
      ["06-analyses-statistiques", "/finance/analyses"],
      ["07-analyses-calendrier", "/finance/analyses?vue=calendrier"],
      ["08-reglages", "/finance/settings"],
      [
        "09-dialogue-nouvelle-operation",
        "/finance/month?mois=2026-11",
        (p) => p.getByRole("main").getByRole("button", { name: "Dépense", exact: true }).click(),
      ],
      [
        "10-dialogue-projet-achat",
        "/finance/purchases",
        async (p) => {
          await p.getByRole("main").getByRole("button", { name: /Achat prévu|Ajouter un achat prévu|Ajouter un projet/ }).first().click();
          const d = p.getByRole("dialog");
          await d.getByLabel("Produit ou service").fill("Ordinateur portable");
          await d.getByLabel("Prix estimé").fill("900,00");
          await d.getByLabel("Date cible").fill("2027-02-15");
          await d.getByText("Calcul en cours…").waitFor({ state: "detached", timeout: 15000 }).catch(() => {});
        },
      ],
    ],
    // Écran d'accueil (base sans compte) puis visite guidée, rejouée pour chaque variante.
    first: async (p, out, last) => {
      await p.goto(web + "/finance");
      await p.getByRole("button", { name: "Saisir mon total" }).waitFor();
      await shot(p, out, "00a-premier-acces");
      await p.getByRole("button", { name: "Saisir mon total" }).click();
      await p.getByRole("dialog").getByLabel("Total disponible").fill("1 200,00");
      await shot(p, out, "00b-mon-argent-aujourdhui");
      if (!last) await p.keyboard.press("Escape");
      else await p.getByRole("dialog").getByRole("button", { name: "Commencer" }).click();
    },
    tour: async (p, out) => {
      const prefs = await (await fetch(api + "finance/preferences")).json();
      await fetch(api + "finance/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...prefs, tutorialDone: false }),
      });
      await p.goto(web + "/finance");
      await p.getByRole("dialog").filter({ hasText: /étape 1 sur/i }).waitFor({ timeout: 15000 });
      await shot(p, out, "00c-visite-guidee");
      await p.getByRole("dialog").getByRole("button", { name: "Passer" }).click();
    },
  },
};

async function shot(p, out, name) {
  await p.waitForLoadState("networkidle");
  await p.waitForTimeout(700);
  await p.screenshot({ path: join(out, name + ".png"), fullPage: true });
  console.log("  " + name);
}

const key = Object.keys(MODULES).find((k) => k.toLowerCase() === String(moduleName).toLowerCase());
if (!key) throw new Error("Module inconnu : " + moduleName + " (choix : " + Object.keys(MODULES).join(", ") + ")");
const mod = MODULES[key];
const browser = await chromium.launch();
const variants = [
  ["clair", "LIGHT", { width: 1440, height: 900 }],
  ["sombre", "DARK", { width: 1440, height: 900 }],
  ["mobile", "LIGHT", { width: 390, height: 844 }],
];
async function run(action) {
  for (const [i, [folder, t, viewport]] of variants.entries()) {
    const out = join(root, key, folder);
    mkdirSync(out, { recursive: true });
    console.log(key + " / " + folder);
    await theme(t);
    const ctx = await browser.newContext({ viewport, locale: "fr-FR", timezoneId: "Europe/Paris" });
    await action(await ctx.newPage(), out, i === variants.length - 1);
    await ctx.close();
  }
}
try {
  if (step === "premier-acces") {
    await run(mod.first);
    await run(mod.tour);
  } else {
    await run(async (p, out) => {
      for (const [name, path, before] of mod.pages) {
        await p.goto(web + path);
        await p.waitForLoadState("networkidle");
        if (before) await before(p);
        await shot(p, out, name);
      }
    });
  }
} finally {
  await theme("LIGHT");
  await browser.close();
}
