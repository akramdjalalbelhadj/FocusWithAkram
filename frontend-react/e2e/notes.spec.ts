import { test, expect } from "@playwright/test";

// Module « Notes & idées » (Angular seulement). Donnees nommees par un suffixe unique : rejouable sur une base de
// recette deja utilisee.
const api = "http://127.0.0.1:18080/api/v1/";

test.beforeEach(async ({}, info) => {
  test.skip(info.project.name !== "angular", "« Notes & idées » n’existe que dans le frontend Angular");
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
