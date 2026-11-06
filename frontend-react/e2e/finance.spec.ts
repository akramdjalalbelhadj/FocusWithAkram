import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Module « Mes achats » (Angular seulement), organisation du lot 13 : compte unique, feuille du mois, visite guidee.
// Exige une base de recette sans compte : voir docs/technique/exploitation.md (recette E2E isolee).
// Dates fixes : la recette du 5 novembre 2026 ; salaire de novembre 2026 a fevrier 2027.
const api = "http://127.0.0.1:18080/api/v1/";

/** Montant au format francais, espaces fines ou insecables comprises. */
const money = (text: string) => new RegExp(text.replace(/ /g, "\\s?") + "\\s?€");

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

async function closed(page: Page) {
  await expect(page.getByRole("dialog")).toHaveCount(0);
}

const section = (page: Page, name: string) => page.getByRole("region", { name, exact: true });

/** Ligne d'une section de la feuille (tableau sur ordinateur). */
const row = (page: Page, sectionName: string, label: string) =>
  section(page, sectionName).getByRole("row").filter({ hasText: label });

async function rowAction(page: Page, label: string, item: string | RegExp) {
  await page.getByRole("button", { name: `Actions sur « ${label} »` }).first().click();
  await page.getByRole("menuitem", { name: item }).click();
}

async function axe(page: Page, what: string) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(results.violations.map((v) => `${v.id} : ${v.nodes.length}`), `axe ${what}`).toEqual([]);
}

test.beforeEach(async ({ request }, info) => {
  test.skip(info.project.name !== "angular", "« Mes achats » n’existe que dans le frontend Angular");
  const accounts = await (await request.get(api + "finance/accounts")).json();
  test.skip(accounts.length > 0, "base de recette déjà utilisée : repartir d’une base neuve");
});

test("Mes achats : solde, visite guidée, feuille du mois, montants datés, plafond dépassé et commenté", async ({
  page,
  request,
}) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  // Premier acces : une seule question, le total de son argent.
  await page.goto("/finance");
  await page.getByRole("button", { name: "Saisir mon total" }).click();
  let dialog = await openedDialog(page, "Mon argent aujourd’hui");
  await dialog.getByLabel("Total disponible").fill("1 200,00");
  await dialog.getByRole("button", { name: "Commencer" }).click();

  // La visite guidee demarre seule ; on la parcourt un peu puis on la passe : elle ne revient plus.
  const tour = page.getByRole("dialog").filter({ hasText: /étape 1 sur/i });
  await expect(tour).toBeVisible({ timeout: 15000 });
  await tour.getByRole("button", { name: "Suivant" }).click();
  await expect(page.getByRole("dialog").filter({ hasText: /étape 2 sur/i })).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Passer" }).click();
  await closed(page);
  await expect
    .poll(async () => (await (await request.get(api + "finance/preferences")).json()).tutorialDone)
    .toBe(true);
  await page.reload();
  await expect(section(page, "Revenus")).toBeVisible();
  await page.waitForTimeout(800);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("main").getByText(money("1 200,00")).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pour bien démarrer" })).toBeVisible();

  // Bulle d'aide : ouverte au clic, fermee par Echap.
  await section(page, "Revenus").getByRole("button", { name: "Aide : Revenus" }).click();
  await expect(section(page, "Revenus").getByRole("tooltip")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(section(page, "Revenus").getByRole("tooltip")).toBeHidden();

  // Salaire : 2 290 EUR le 28 de chaque mois, de novembre 2026 a fevrier 2027.
  await section(page, "Revenus").getByRole("button", { name: "Revenu prévu" }).click();
  dialog = await openedDialog(page, "Revenu prévu");
  await dialog.getByLabel("Montant").fill("2 290,00");
  await dialog.getByText("Chaque mois", { exact: true }).click();
  await dialog.getByLabel("De", { exact: true }).fill("2026-11");
  await dialog.getByLabel("À (facultatif)").fill("2027-02");
  await dialog.getByLabel("Jour du mois").fill("28");
  await dialog.getByRole("button", { name: "Enregistrer" }).click();
  await closed(page);
  await expect(row(page, "Revenus", "Salaire").getByText(money("2 290,00")).first()).toBeVisible();

  // Depenses fixes : loyer 350 EUR, deja remplies chaque mois.
  await section(page, "Dépenses fixes").getByRole("button", { name: "Dépense fixe" }).click();
  dialog = await openedDialog(page, "Dépense fixe");
  await dialog.getByLabel("Libellé").fill("Loyer");
  await dialog.getByLabel("Montant").fill("350,00");
  await dialog.getByLabel("Catégorie").selectOption({ label: "Loyer" });
  await dialog.getByLabel("Jour du mois").fill("5");
  await dialog.getByRole("button", { name: "Ajouter" }).click();
  await closed(page);
  await expect(row(page, "Dépenses fixes", "Loyer").getByText(money("350,00")).first()).toBeVisible();

  // Le loyer passe a 400 EUR a partir de janvier 2027 : novembre et decembre restent a 350 EUR.
  await rowAction(page, "Loyer", /Changer à partir de ce mois/);
  dialog = await openedDialog(page, /Loyer|montant/i);
  await dialog.getByLabel("Nouveau montant").fill("400,00");
  await dialog.getByLabel("À partir de", { exact: true }).fill("2027-01");
  await dialog.getByRole("button", { name: "Enregistrer" }).click();
  await closed(page);
  await expect(row(page, "Dépenses fixes", "Loyer").getByText(money("350,00")).first()).toBeVisible();
  await page.goto("/finance/month?mois=2026-12");
  await expect(row(page, "Dépenses fixes", "Loyer").getByText(money("350,00")).first()).toBeVisible();
  await expect(row(page, "Revenus", "Salaire")).toHaveCount(1);
  await page.goto("/finance/month?mois=2027-01");
  await expect(row(page, "Dépenses fixes", "Loyer").getByText(money("400,00")).first()).toBeVisible();
  await page.goto("/finance/month?mois=2027-03");
  await expect(row(page, "Revenus", "Salaire")).toHaveCount(0);
  await page.goto("/finance/month?mois=2026-11");

  // Salaire reellement recu plus bas (absence), explique en commentaire ; loyer paye.
  await section(page, "Revenus").getByRole("button", { name: "Saisir le montant reçu : Salaire" }).click();
  dialog = await openedDialog(page, "Montant reçu");
  await dialog.getByLabel("Montant reçu").fill("2 100,00");
  await dialog.getByLabel(/Commentaire/).fill("Deux jours d’absence");
  await dialog.getByRole("button", { name: "Enregistrer" }).click();
  await closed(page);
  const salary = row(page, "Revenus", "Salaire");
  await expect(salary.getByText(money("2 100,00")).first()).toBeVisible();
  await expect(salary.getByText(/190,00/).first()).toBeVisible();
  await expect(section(page, "Revenus").getByText("Deux jours d’absence")).toBeVisible();

  await section(page, "Dépenses fixes").getByRole("button", { name: "Saisir le montant payé : Loyer" }).click();
  dialog = await openedDialog(page, "Montant payé");
  await dialog.getByRole("button", { name: "Enregistrer" }).click();
  await closed(page);

  // Depense variable plafonnee : courses 300 EUR par mois.
  await section(page, "Dépenses variables").getByRole("button", { name: "Dépense variable" }).click();
  dialog = await openedDialog(page, "Dépense variable");
  await dialog.getByLabel("Catégorie").selectOption({ label: "Courses (général)" });
  await dialog.getByLabel("Plafond par mois").fill("300,00");
  await dialog.getByRole("button", { name: "Ajouter" }).click();
  await closed(page);
  await expect(row(page, "Dépenses variables", "Courses").getByText(money("300,00")).first()).toBeVisible();

  // Une depense au fil du mois, puis la meme : doublon probable confirme explicitement.
  for (const [label, confirm] of [
    ["Marché", false],
    ["Marché bis", true],
  ] as const) {
    await section(page, "Dépenses variables").getByRole("button", { name: "Ajouter une dépense : Courses" }).click();
    dialog = await openedDialog(page, "Nouvelle opération");
    await dialog.getByLabel("Montant").fill("45,90");
    await dialog.getByLabel("Libellé").fill(label);
    await dialog.getByRole("button", { name: "Ajouter", exact: true }).click();
    if (confirm) {
      await expect(dialog.getByText("Doublon probable")).toBeVisible();
      await dialog.getByRole("button", { name: "Enregistrer quand même" }).click();
    }
    await closed(page);
  }
  await expect(row(page, "Dépenses variables", "Courses").getByText(money("91,80")).first()).toBeVisible();

  // Coupure reseau pendant l'enregistrement : message dans le dialogue et une seule notification ; saisie
  // conservee ; nouvel essai reussi.
  await page.route("**/api/v1/finance/operations**", (route) =>
    route.request().method() === "POST" ? route.abort("internetdisconnected") : route.continue(),
  );
  await page.getByRole("main").getByRole("button", { name: "Dépense", exact: true }).click();
  dialog = await openedDialog(page, "Nouvelle opération");
  await dialog.getByLabel("Montant").fill("50,00");
  await dialog.getByLabel("Libellé").fill("Prêt à Sami");
  await dialog.getByLabel("Catégorie").selectOption({ label: "Prêts (général)" });
  await dialog.getByRole("button", { name: "Ajouter", exact: true }).click();
  await expect(dialog.getByRole("alert")).toHaveText(/Impossible de joindre le serveur/);
  await expect(page.locator('[aria-label="Notifications"]').getByText(/Impossible de joindre le serveur/)).toHaveCount(1);
  await expect(dialog.getByLabel("Libellé")).toHaveValue("Prêt à Sami");
  await page.unroute("**/api/v1/finance/operations**");
  await dialog.getByRole("button", { name: /^(Ajouter|Enregistrer quand même)$/ }).click();
  await closed(page);
  // Le pret est une simple depense de la categorie « Prets » : elle va dans les autres depenses.
  await expect(section(page, "Autres dépenses").getByText("Prêt à Sami")).toBeVisible();

  // Total du mois des courses : au-dela du plafond, le dialogue exige une explication ; 280 EUR passe sans.
  await rowAction(page, "Courses", "Saisir le total du mois");
  dialog = await openedDialog(page, "Total du mois");
  await dialog.getByLabel("Total dépensé ce mois-ci").fill("320,00");
  await dialog.getByRole("button", { name: "Enregistrer" }).click();
  await expect(dialog.getByRole("alert")).toHaveText(/dépassé.*expliquez/i);
  await dialog.getByLabel("Total dépensé ce mois-ci").fill("280,00");
  await dialog.getByRole("button", { name: "Enregistrer" }).click();
  await closed(page);
  await expect(row(page, "Dépenses variables", "Courses").getByText(money("280,00")).first()).toBeVisible();

  // Une depense de plus fait depasser le plafond (340 EUR pour 300) : la feuille demande une explication.
  await section(page, "Dépenses variables").getByRole("button", { name: "Ajouter une dépense : Courses" }).click();
  dialog = await openedDialog(page, "Nouvelle opération");
  await dialog.getByLabel("Montant").fill("60,00");
  await dialog.getByLabel("Libellé").fill("Courses invités");
  await dialog.getByRole("button", { name: "Ajouter", exact: true }).click();
  await closed(page);
  const explain = section(page, "Dépenses variables").getByRole("button", { name: "Expliquez le dépassement : Courses" });
  await expect(explain).toBeVisible();
  await explain.click();
  dialog = await openedDialog(page, "Expliquer le dépassement");
  await dialog.getByLabel(/Explication/).fill("Invités dimanche");
  await dialog.getByRole("button", { name: "Enregistrer" }).click();
  await closed(page);
  await expect(section(page, "Dépenses variables").getByText("Invités dimanche")).toBeVisible();

  // Epargne reelle de novembre : 2 100 - (350 + 340 + 50) = 1 360 EUR.
  await expect(section(page, "Épargne du mois").getByText(money("1 360,00")).first()).toBeVisible();
  await axe(page, "Mon mois");

  // Operations : historique et vue des recurrents.
  const tabs = page.getByRole("navigation", { name: "Sections de Mes achats" });
  await tabs.getByRole("link", { name: "Opérations" }).click();
  for (const label of ["Marché", "Marché bis", "Prêt à Sami"]) {
    await expect(page.getByRole("main").getByText(label, { exact: true }).first()).toBeVisible();
  }
  await page.getByRole("button", { name: "Revenus et charges récurrents" }).click();
  await expect(page.getByRole("region", { name: "Charges et factures" }).getByText(/Loyer/).first()).toBeVisible();
  await expect(page.getByRole("region", { name: "Revenus réguliers" }).getByText(/Salaire/).first()).toBeVisible();

  // Projet d'achat : verdict de faisabilite calcule avant l'enregistrement.
  await tabs.getByRole("link", { name: "Projets d’achat" }).click();
  await page.getByRole("main").getByRole("button", { name: /Ajouter un achat prévu|Ajouter un projet/ }).first().click();
  dialog = page.getByRole("dialog");
  await expect(dialog).toHaveCount(1);
  await dialog.getByLabel("Produit ou service").fill("Vélo");
  await dialog.getByLabel("Prix estimé").fill("400,00");
  await dialog.getByLabel("Date cible").fill("2026-11-20");
  const feasibility = dialog.getByRole("complementary", { name: "Faisabilité" });
  await expect(feasibility.getByText("Calcul en cours…")).toHaveCount(0, { timeout: 15000 });
  await expect(feasibility.getByText(/réalisable|risqué/i).first()).toBeVisible();
  await dialog.getByRole("button", { name: /^Ajouter/ }).click();
  await closed(page);
  await expect(page.getByRole("main").getByText("Vélo", { exact: true }).filter({ visible: true }).first()).toBeVisible();

  // Analyses : statistiques (epargne et plafond mois par mois) et calendrier.
  await tabs.getByRole("link", { name: "Analyses" }).click();
  await expect(page.getByRole("heading", { name: "Épargne et plafond, mois par mois" })).toBeVisible();
  await page.getByRole("button", { name: "Calendrier", exact: true }).click();
  await expect(page).toHaveURL(/vue=calendrier/);

  // Anciennes adresses redirigees.
  await page.goto("/finance/budget");
  await expect(page).toHaveURL(/\/finance\/month/);
  await page.goto("/finance/schedules");
  await expect(page).toHaveURL(/\/finance\/operations\?vue=recurrents/);

  // Telephone : aucune page ne deborde horizontalement une fois les donnees presentes.
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of [
    "month",
    "month?mois=2027-01",
    "operations",
    "operations?vue=recurrents",
    "purchases",
    "analyses",
    "analyses?vue=calendrier",
    "settings",
  ]) {
    await page.goto("/finance/" + path);
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `débordement horizontal de /finance/${path} à 390 px`).toBeLessThanOrEqual(0);
  }
  await page.goto("/finance/month");
  await expect(section(page, "Dépenses variables").getByText("Invités dimanche")).toBeVisible();
  await axe(page, "Mon mois à 390 px");

  expect(errors, "erreurs JavaScript").toEqual([]);
});
