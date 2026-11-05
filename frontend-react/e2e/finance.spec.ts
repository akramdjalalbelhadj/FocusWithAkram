import { test, expect, type Page } from "@playwright/test";

// Module « Mes achats » (Angular seulement). Exige une base de recette sans donnees financieres :
// voir docs/technique/exploitation.md (recette E2E isolee).
const api = "http://127.0.0.1:18080/api/v1/";

/** Montant au format francais, espaces fines ou insecables comprises. */
const money = (text: string) => new RegExp(text.replace(/ /g, "\\s?") + "\\s?€");

/** Date locale AAAA-MM-JJ, decalee de `days` jours. */
function isoDate(days = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Un seul dialogue, nomme, et aucun identifiant en double (un libelle de champ pointerait ailleurs). */
async function openedDialog(page: Page, name: string | RegExp) {
  const dialog = page.getByRole("dialog", { name });
  await expect(dialog).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(1);
  const duplicates = await page.evaluate(() => {
    const seen = new Map<string, number>();
    for (const e of document.querySelectorAll("[id]")) seen.set(e.id, (seen.get(e.id) ?? 0) + 1);
    return [...seen].filter(([, n]) => n > 1).map(([id]) => id);
  });
  expect(duplicates, "identifiants en double").toEqual([]);
  return dialog;
}

async function addExpense(page: Page, amount: string, label: string) {
  await page.getByRole("main").getByRole("button", { name: "Dépense", exact: true }).click();
  const dialog = await openedDialog(page, "Nouvelle opération");
  await dialog.getByLabel("Montant").fill(amount);
  await dialog.getByLabel("Libellé").fill(label);
  await dialog.getByLabel("Catégorie").selectOption({ index: 1 });
  return dialog;
}

test.beforeEach(async ({ request }, info) => {
  test.skip(info.project.name !== "angular", "« Mes achats » n’existe que dans le frontend Angular");
  const accounts = await (await request.get(api + "finance/accounts")).json();
  test.skip(accounts.length > 0, "base de recette déjà utilisée : repartir d’une base neuve");
});

test("Mes achats : compte, dépenses, doublon, coupure réseau, échéancier, budget, achat prévu, prêt", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  // Premier compte depuis l'ecran de premiere utilisation.
  await page.goto("/finance/overview");
  await page.getByRole("button", { name: "Créer mon premier compte" }).click();
  let dialog = await openedDialog(page, "Nouveau compte");
  await dialog.getByLabel("Nom", { exact: true }).fill("Compte courant");
  await dialog.getByLabel("Solde actuel", { exact: true }).fill("1 200,00");
  await dialog.getByRole("button", { name: "Créer le compte" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("main").getByText(money("1 200,00")).first()).toBeVisible();

  // Depense saisie au format francais.
  dialog = await addExpense(page, "45,90", "Courses");
  await dialog.getByRole("button", { name: "Ajouter", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // Meme montant, meme compte : doublon probable signale, enregistrement sur confirmation explicite.
  dialog = await addExpense(page, "45,90", "Courses bis");
  await dialog.getByRole("button", { name: "Ajouter", exact: true }).click();
  await expect(dialog.getByText("Doublon probable")).toBeVisible();
  await dialog.getByRole("button", { name: "Enregistrer quand même" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // Coupure reseau pendant l'enregistrement : message dans le dialogue (seul annonce, le reste de la page etant
  // masque aux lecteurs d'ecran pendant un dialogue modal) et une seule notification ; saisie conservee ;
  // nouvel essai reussi.
  await page.route("**/api/v1/finance/operations**", (route) =>
    route.request().method() === "POST" ? route.abort("internetdisconnected") : route.continue(),
  );
  dialog = await addExpense(page, "12,00", "Café");
  await dialog.getByRole("button", { name: "Ajouter", exact: true }).click();
  await expect(dialog.getByRole("alert")).toHaveText(/Impossible de joindre le serveur/);
  await expect(page.locator('[aria-label="Notifications"]').getByText(/Impossible de joindre le serveur/)).toHaveCount(1);
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Libellé")).toHaveValue("Café");
  await page.unroute("**/api/v1/finance/operations**");
  await dialog.getByRole("button", { name: /^(Ajouter|Enregistrer quand même)$/ }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await page.getByRole("navigation", { name: "Sections de Mes achats" }).getByRole("link", { name: "Opérations" }).click();
  for (const label of ["Courses", "Courses bis", "Café"]) {
    await expect(page.getByRole("main").getByText(label, { exact: true }).first()).toBeVisible();
  }

  // Salaire mensuel dans l'echeancier.
  await page.getByRole("navigation", { name: "Sections de Mes achats" }).getByRole("link", { name: "Échéancier" }).click();
  await page.getByRole("main").getByRole("button", { name: "Déclarer mon salaire" }).click();
  dialog = await openedDialog(page, "Nouvel échéancier");
  await dialog.getByLabel("Libellé").fill("Salaire");
  await dialog.getByLabel("Montant habituel").fill("2 000,00");
  await dialog.getByLabel("Première échéance suivie").fill(isoDate(20));
  await dialog.getByRole("button", { name: "Créer" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("main").getByText("Salaire", { exact: true }).first()).toBeVisible();

  // Plafond des depenses variables : 103,80 EUR depenses pour 50 EUR, depassement signale (jamais bloque).
  await page.getByRole("navigation", { name: "Sections de Mes achats" }).getByRole("link", { name: "Budget" }).click();
  await page.getByRole("main").getByRole("button", { name: "Définir un plafond" }).click();
  dialog = await openedDialog(page, /^Budget de /);
  await dialog.getByLabel("Plafond des dépenses variables").fill("50,00");
  await dialog.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("main").getByText(money("50,00")).first()).toBeVisible();

  // Achat prevu : verdict de faisabilite calcule avant l'enregistrement.
  await page.getByRole("navigation", { name: "Sections de Mes achats" }).getByRole("link", { name: "Achats prévus" }).click();
  await page.getByRole("main").getByRole("button", { name: "Ajouter un achat prévu" }).click();
  dialog = await openedDialog(page, "Nouvel achat prévu");
  await dialog.getByLabel("Produit ou service").fill("Vélo");
  await dialog.getByLabel("Prix estimé").fill("400,00");
  await dialog.getByLabel("Date cible").fill(isoDate(10));
  const feasibility = dialog.getByRole("complementary", { name: "Faisabilité" });
  await expect(feasibility.getByText("Calcul en cours…")).toHaveCount(0, { timeout: 15000 });
  await expect(feasibility.getByText(/réalisable|risqué/i).first()).toBeVisible();
  await dialog.getByRole("button", { name: "Ajouter l’achat" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("main").getByText("Vélo", { exact: true }).filter({ visible: true }).first()).toBeVisible();

  // Pret de 300 EUR, remboursement partiel de 120,50 EUR : reste du 179,50 EUR.
  await page.getByRole("navigation", { name: "Sections de Mes achats" }).getByRole("link", { name: "Prêts" }).click();
  await page.getByRole("main").getByRole("button", { name: "J’ai prêté de l’argent" }).click();
  dialog = await openedDialog(page, "Nouveau prêt ou emprunt");
  await dialog.getByLabel("Prêté à").fill("Sami");
  await dialog.getByLabel("Montant").fill("300,00");
  await dialog.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Actions sur le prêt de Sami" }).click();
  await page.getByRole("menuitem", { name: "Remboursement reçu" }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Montant").fill("120,50");
  await dialog.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("region", { name: "On me doit" }).getByText(money("179,50")).first()).toBeVisible();

  // Analyses : alertes en vue d'ensemble, calendrier et statistiques alimentes.
  await page.getByRole("navigation", { name: "Sections de Mes achats" }).getByRole("link", { name: "Vue d’ensemble" }).click();
  await expect(page.getByRole("main").getByText(/plafond/i).first()).toBeVisible();
  await page.getByRole("navigation", { name: "Sections de Mes achats" }).getByRole("link", { name: "Calendrier" }).click();
  await expect(page.getByRole("main").getByRole("button", { pressed: true })).toBeVisible();
  await page.getByRole("navigation", { name: "Sections de Mes achats" }).getByRole("link", { name: "Statistiques" }).click();
  await expect(page.getByRole("main").getByText("Courses").first()).toBeVisible();

  // Telephone : aucun onglet ne deborde horizontalement une fois les donnees presentes (cartes en grille).
  await page.setViewportSize({ width: 390, height: 844 });
  for (const tab of ["overview", "operations", "budget", "purchases", "schedules", "loans", "calendar", "statistics", "settings"]) {
    await page.goto("/finance/" + tab);
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `débordement horizontal de /finance/${tab} à 390 px`).toBeLessThanOrEqual(0);
  }

  expect(errors, "erreurs JavaScript").toEqual([]);
});
