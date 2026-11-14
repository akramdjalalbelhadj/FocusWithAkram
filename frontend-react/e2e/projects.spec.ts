import AxeBuilder from "@axe-core/playwright";
import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import fs from "node:fs/promises";

// Lot 23 : dossiers de projets, export et import de projets (Angular seulement). Donnees nommees par un suffixe
// unique : rejouable sur une base de recette deja utilisee ; tout ce qui est cree est supprime a la fin.
const api = "http://127.0.0.1:18080/api/v1/";

test.beforeEach(async ({ request }, info) => {
  test.skip(info.project.name !== "angular", "Les dossiers de projets n’existent que dans le frontend Angular");
  const r = await request.patch(api + "settings", {
    data: { matrixTutorialDone: true, notesTutorialDone: true, displayName: "Recette" },
  });
  expect(r.ok()).toBeTruthy();
});

async function axe(page: Page, what: string) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(
    results.violations.map((v) => `${v.id} : ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`),
    `axe ${what}`,
  ).toEqual([]);
}

async function post(request: APIRequestContext, path: string, data: unknown) {
  const r = await request.post(api + path, { data });
  expect(r.ok(), `${path} : ${await r.text()}`).toBeTruthy();
  return r.json();
}

async function cleanup(request: APIRequestContext, suffix: string) {
  const tasks = await (await request.get(api + "tasks", { params: { q: suffix, size: 100 } })).json();
  for (const t of tasks.items ?? []) await request.delete(api + `tasks/${t.id}`);
  for (const p of await (await request.get(api + "projects")).json())
    if (p.name.includes(suffix)) await request.delete(api + `projects/${p.id}`);
  for (const f of await (await request.get(api + "project-folders")).json())
    if (f.name.includes(suffix)) await request.delete(api + `project-folders/${f.id}`);
}

test("Projets : dossiers, déplacement, export puis import d’un dossier", async ({ page, request }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const s = String(Date.now()).slice(-6);
  const dmp = `DMP ${s}`;
  const mes = `MES ${s}`;
  try {
    const mesFolder = await post(request, "project-folders", { name: mes, color: "#f97316" });
    const appB = await post(request, "projects", { name: `Appli B ${s}`, folderId: mesFolder.id });
    await post(request, "projects", { name: `Ligne 1 ${s}`, folderId: mesFolder.id });

    await page.goto("/projects");
    await expect(page.getByRole("heading", { name: "Projets", level: 1 })).toBeVisible();

    // Nouveau dossier par l'interface : il devient le filtre courant.
    await page.getByRole("button", { name: "Nouveau dossier" }).click();
    const folderDialog = page.getByRole("dialog", { name: "Nouveau dossier" });
    await folderDialog.getByLabel("Nom").fill(dmp);
    await folderDialog.getByRole("button", { name: "Créer" }).click();
    await expect(folderDialog).toBeHidden();
    const bar = page.getByRole("navigation", { name: "Dossiers de projets" });
    await expect(bar.getByRole("button", { name: new RegExp(`^${dmp} 0$`) })).toHaveAttribute("aria-pressed", "true");

    // Nouveau projet depuis le dossier filtre : le dossier est deja choisi dans la fenetre.
    await page.getByRole("button", { name: "Nouveau projet", exact: true }).click();
    const projectDialog = page.getByRole("dialog", { name: "Nouveau projet" });
    await expect(projectDialog.getByLabel("Dossier")).toHaveValue(/.+/);
    await expect(projectDialog.getByLabel("Dossier").locator("option:checked")).toHaveText(dmp);
    await projectDialog.getByLabel("Nom").fill(`Appli A ${s}`);
    await projectDialog.getByRole("button", { name: "Créer" }).click();
    await expect(projectDialog).toBeHidden();
    await expect(page.getByRole("heading", { name: `Appli A ${s}` })).toBeVisible();

    // Une tache liee au projet (le dossier n'y change rien).
    const projects = await (await request.get(api + "projects")).json();
    const appA = projects.find((p: { name: string }) => p.name === `Appli A ${s}`);
    await post(request, "tasks", { title: `Corriger ${s}`, projectIds: [appA.id, appB.id] });

    // Deplacer « Appli B » de MES vers DMP par le menu de sa carte.
    await bar.getByRole("button", { name: new RegExp(`^${mes} `) }).click();
    await page.getByRole("button", { name: `Autres actions pour Appli B ${s}` }).click();
    await page.getByRole("menuitem", { name: `Déplacer vers ${dmp}` }).click();
    await expect(page.getByText(`« Appli B ${s} » rangé dans ${dmp}.`)).toBeVisible();
    await expect(bar.getByRole("button", { name: new RegExp(`^${dmp} 2$`) })).toBeVisible();

    // Vue « Tous » : sections repliables, une par dossier.
    await bar.getByRole("button", { name: /^Tous / }).click();
    const dmpToggle = page.getByRole("button", { name: new RegExp(`^${dmp}`), expanded: true });
    await expect(dmpToggle).toBeVisible();
    await axe(page, "page Projets avec dossiers");
    await dmpToggle.click();
    await expect(page.getByRole("heading", { name: `Appli A ${s}` })).toBeHidden();
    await page.getByRole("button", { name: new RegExp(`^${dmp}`), expanded: false }).click();
    await expect(page.getByRole("heading", { name: `Appli A ${s}` })).toBeVisible();

    // Export du dossier DMP : fichier v6 avec ses deux projets et la tache.
    await page.getByRole("button", { name: `Actions du dossier ${dmp}` }).click();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("menuitem", { name: "Exporter le dossier" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^focusflow-projets-dmp-\d+-\d{4}-\d{2}-\d{2}\.json$/);
    const file = test.info().outputPath("dmp.json");
    await download.saveAs(file);
    const exported = JSON.parse(await fs.readFile(file, "utf8"));
    expect(exported.version).toBe(6);
    expect(exported.folders.map((f: { name: string }) => f.name)).toEqual([dmp]);
    expect(exported.projects.map((p: { name: string }) => p.name).sort()).toEqual([`Appli A ${s}`, `Appli B ${s}`]);
    expect(exported.tasks.map((t: { title: string }) => t.title)).toEqual([`Corriger ${s}`]);

    // On efface tout, puis on reimporte le fichier par la page : apercu, confirmation, dossier recree.
    await cleanup(request, s);
    await page.reload();
    await expect(page.getByRole("heading", { name: `Appli A ${s}` })).toBeHidden();
    await page.locator('input[type="file"]').setInputFiles(file);
    const confirm = page.getByRole("alertdialog", { name: "Importer « dmp.json » ?" });
    await expect(confirm).toContainText("Dossiers : 1 à créer");
    await expect(confirm).toContainText("Projets : 2 à créer");
    await expect(confirm).toContainText("Tâches : 1 à créer");
    await axe(page, "aperçu d’import");
    await confirm.getByRole("button", { name: "Importer" }).click();
    await expect(page.getByText(/Import terminé\./)).toBeVisible();
    await expect(bar.getByRole("button", { name: new RegExp(`^${dmp} 2$`) })).toBeVisible();
    const tasks = await (await request.get(api + "tasks", { params: { q: `Corriger ${s}` } })).json();
    expect(tasks.items[0].projects.map((p: { name: string }) => p.name)).toEqual([`Appli A ${s}`, `Appli B ${s}`]);

    // Reimport : rien n'est duplique.
    await page.locator('input[type="file"]').setInputFiles(file);
    await expect(confirm).toContainText("Projets : 0 à créer, 2 déjà présent(s)");
    await confirm.getByRole("button", { name: "Annuler" }).click();

    // Suppression du dossier : projets conserves, sans dossier.
    await page.getByRole("button", { name: `Actions du dossier ${dmp}` }).click();
    await page.getByRole("menuitem", { name: "Supprimer le dossier" }).click();
    await page.getByRole("alertdialog", { name: "Supprimer ce dossier ?" })
      .getByRole("button", { name: "Supprimer le dossier" }).click();
    await expect(page.getByText("Dossier supprimé — ses projets sont conservés.")).toBeVisible();
    await expect(page.getByRole("heading", { name: `Appli A ${s}` })).toBeVisible();

    // Telephone : aucun debordement horizontal.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await expect(page.getByRole("heading", { name: "Projets", level: 1 })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    expect(errors).toEqual([]);
  } finally {
    await cleanup(request, s);
  }
});
