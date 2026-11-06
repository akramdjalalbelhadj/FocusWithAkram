import AxeBuilder from "@axe-core/playwright";
import { test, expect, type APIRequestContext, type Page } from "@playwright/test";

// Module « Notes & idées » (Angular seulement). Donnees nommees par un suffixe unique : rejouable sur une base de
// recette deja utilisee. Les scenarios partagent le parametre du tutoriel : ils s'executent l'un apres l'autre.
const api = "http://127.0.0.1:18080/api/v1/";

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({}, info) => {
  test.skip(info.project.name !== "angular", "« Notes & idées » n’existe que dans le frontend Angular");
});

async function tutorialDone(request: APIRequestContext): Promise<boolean> {
  return (await (await request.get(api + "settings")).json()).notesTutorialDone;
}

async function setTutorialDone(request: APIRequestContext, done: boolean): Promise<void> {
  const r = await request.patch(api + "settings", { data: { notesTutorialDone: done } });
  expect(r.ok()).toBe(true);
}

async function axe(page: Page, what: string) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(results.violations.map((v) => `${v.id} : ${v.nodes.length}`), `axe ${what}`).toEqual([]);
}

test("Notes : tutoriel « de l’idée à l’action » avec son schéma, passé puis relancé", async ({ page, request }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await setTutorialDone(request, false);

  // Premiere visite : le tutoriel demarre seul, sur le schema du parcours d'une idee.
  await page.goto("/notes");
  const tour = page.getByRole("dialog", { name: "Notes & idées : de l’idée à l’action" });
  await expect(tour).toBeVisible({ timeout: 15000 });
  await expect(tour).toContainText(/étape 1 sur/i);
  const flow = tour.getByRole("list", { name: "Le parcours d’une idée, en trois étapes" });
  const stages = flow.getByRole("listitem");
  await expect(stages).toHaveCount(3);
  await expect(stages.nth(0)).toContainText("Nouvelle idée");
  await expect(stages.nth(0)).toContainText("Capturer une pensée spontanée");
  await expect(stages.nth(1)).toContainText("Brainstorming");
  await expect(stages.nth(1)).toContainText("Développer, enrichir et organiser l’idée");
  await expect(stages.nth(2)).toContainText("Transformation en tâches");
  await expect(stages.nth(2)).toContainText("Créer une ou plusieurs actions réalisables");
  // Trois couleurs differentes, de gauche a droite sur ordinateur.
  const look = await stages.evaluateAll((els) =>
    els.map((e) => ({ bg: getComputedStyle(e).backgroundColor, x: e.getBoundingClientRect().left })),
  );
  expect(new Set(look.map((l) => l.bg)).size).toBe(3);
  expect(look[0].x).toBeLessThan(look[1].x);
  expect(look[1].x).toBeLessThan(look[2].x);
  await axe(page, "tutoriel des notes (schéma)");

  // Etape suivante : la saisie rapide est mise en valeur ; on passe le tutoriel, il ne revient plus.
  await tour.getByRole("button", { name: "Suivant" }).click();
  await expect(page.getByRole("dialog", { name: /^1\. Nouvelle idée/ })).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Passer" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect.poll(() => tutorialDone(request)).toBe(true);
  await expect(page.getByRole("button", { name: "Comment ça marche ?" })).toBeFocused();
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Nouvelle idée" })).toBeVisible();
  await page.waitForTimeout(800);
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // Relance : « Comment ça marche ? » le reprend du debut ; on le suit jusqu'au bout.
  await page.getByRole("button", { name: "Comment ça marche ?" }).click();
  await expect(page.getByRole("dialog", { name: "Notes & idées : de l’idée à l’action" })).toBeVisible();
  for (let i = 0; i < 10; i++) {
    const finish = page.getByRole("dialog").getByRole("button", { name: "Terminer" });
    if (await finish.isVisible()) break;
    const title = await page.getByRole("dialog").getByRole("heading").textContent();
    if (title?.startsWith("3. Transformation en tâches")) {
      const focused = page.getByRole("dialog").getByRole("listitem").nth(2);
      await expect(focused).toHaveAttribute("aria-current", "step");
    }
    await page.getByRole("dialog").getByRole("button", { name: "Suivant" }).click();
  }
  await expect(page.getByRole("dialog", { name: "Revoir ce tutoriel" })).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Terminer" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // Telephone : le schema passe de haut en bas, sans debordement, et reste lisible.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Comment ça marche ?" }).click();
  const phoneStages = page.getByRole("dialog").getByRole("listitem");
  await expect(phoneStages).toHaveCount(3);
  const boxes = await phoneStages.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().top));
  expect(boxes[0]).toBeLessThan(boxes[1]);
  expect(boxes[1]).toBeLessThan(boxes[2]);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, "débordement horizontal à 390 px").toBeLessThanOrEqual(0);
  const bubble = await page.getByRole("dialog").boundingBox();
  expect(bubble && bubble.x >= 0 && bubble.x + bubble.width <= 390).toBe(true);
  await axe(page, "tutoriel des notes à 390 px");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  expect(errors, "erreurs JavaScript").toEqual([]);
});

test("Notes : saisie rapide, enregistrement automatique, catégorie, idée transformée en tâche, suppression bloquée puis forcée", async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const stamp = Date.now().toString(36);
  const title = `Idée E2E ${stamp}`;
  const category = `Projets ${stamp}`;
  const taskTitle = `Tâche issue de l’idée ${stamp}`;

  // Tutoriel deja vu : il ne s'affiche pas pendant ce scenario.
  await setTutorialDone(request, true);

  // Saisie rapide par Entrée.
  await page.goto("/notes");
  await page.getByRole("textbox", { name: "Nouvelle idée" }).fill(title);
  await page.getByRole("textbox", { name: "Nouvelle idée" }).press("Enter");
  const card = page.getByRole("link", { name: new RegExp(`^${title}`) });
  await expect(card).toBeVisible();

  // Categorie dans l'ecran dedie ; un nom deja pris (casse comprise) est refuse.
  await page.getByRole("link", { name: "Catégories" }).click();
  for (const name of [category, category.toUpperCase()]) {
    await page.getByRole("main").getByRole("button", { name: "Nouvelle catégorie" }).click();
    const dialog = page.getByRole("dialog", { name: "Nouvelle catégorie" });
    await dialog.getByLabel("Nom", { exact: true }).fill(name);
    await dialog.getByRole("button", { name: "Créer", exact: true }).click();
    if (name === category) {
      await expect(page.getByRole("dialog")).toHaveCount(0);
    } else {
      await expect(dialog.getByRole("alert")).toBeVisible();
      await dialog.getByRole("button", { name: "Annuler" }).click();
    }
  }

  // Contenu et categorie enregistres automatiquement, conserves au rechargement.
  await page.goto("/notes");
  await card.click();
  const content = page.getByRole("textbox", { name: "Contenu de l’idée" });
  await content.fill("## Plan\n\n- [ ] Première étape");
  await page.getByRole("combobox", { name: "Catégorie" }).selectOption({ label: category });
  await expect(page.getByText("Enregistré", { exact: true })).toBeVisible({ timeout: 10000 });
  await page.reload();
  await expect(content).toHaveValue("## Plan\n\n- [ ] Première étape");
  await expect(page.getByRole("combobox", { name: "Catégorie" }).locator("option:checked")).toHaveText(category);

  // Transformation en tache Q1, visible dans la matrice et reliee a l'idee.
  await page.getByRole("button", { name: "Créer une tâche" }).click();
  const form = page.getByRole("dialog");
  await expect(form.getByRole("textbox", { name: /^Titre/ })).not.toHaveValue("");
  await form.getByRole("textbox", { name: /^Titre/ }).fill(taskTitle);
  await form.locator("label").filter({ has: page.getByRole("radio", { name: /^Q1 ·/ }) }).click();
  await form.getByRole("button", { name: "Créer la tâche" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("complementary", { name: "Tâches issues de cette idée" }).getByText(taskTitle)).toBeVisible();
  await page.goto("/matrix");
  await expect(page.getByRole("main").getByText(taskTitle).first()).toBeVisible();

  // Suppression : bloquee tant qu'une tache en est issue, forcee ensuite ; la tache reste.
  await page.goto("/notes");
  await card.click();
  await page.getByRole("button", { name: "Supprimer l’idée" }).click();
  const confirm = page.getByRole("alertdialog", { name: "Suppression bloquée" });
  await expect(confirm).toBeVisible();
  await confirm.getByRole("button", { name: "Supprimer quand même" }).click();
  await expect(page).toHaveURL(/\/notes$/);
  await expect(page.getByRole("link", { name: new RegExp(`^${title}`) })).toHaveCount(0);
  const tasks = await (await request.get(api + "tasks?q=" + encodeURIComponent(stamp) + "&size=20")).json();
  const kept = (tasks.items ?? tasks).find((t: { title: string }) => t.title === taskTitle);
  expect(kept, "tâche conservée après la suppression forcée").toBeTruthy();
  expect(kept.sourceNoteId ?? null).toBeNull();

  expect(errors, "erreurs JavaScript").toEqual([]);
});
