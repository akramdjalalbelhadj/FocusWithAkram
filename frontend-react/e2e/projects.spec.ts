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

test("Projets : dossiers, déplacement, projets inactifs, export puis import d’un dossier", async ({ page, request }) => {
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

    // Un seul bouton « Nouveau » : Dossier (explique) ou Projet.
    await page.getByRole("button", { name: "Nouveau", exact: true }).click();
    await expect(page.getByRole("menuitem", { name: /^Dossier Un groupe de projets/ })).toBeVisible();
    await axe(page, "menu Nouveau");
    await page.getByRole("menuitem", { name: /^Dossier/ }).click();
    const folderDialog = page.getByRole("dialog", { name: "Nouveau dossier" });
    await folderDialog.getByLabel("Nom").fill(dmp);
    await folderDialog.getByRole("button", { name: "Créer" }).click();
    await expect(folderDialog).toBeHidden();
    const bar = page.getByRole("navigation", { name: "Dossiers de projets" });
    // Le dossier par defaut existe toujours, ne se renomme ni ne se supprime, et son nom est reserve.
    await expect(bar.getByRole("button", { name: /^Projets sans dossier \d+$/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Projets sans dossier", level: 2 })).toBeVisible();
    await expect(page.getByRole("button", { name: "Actions du dossier Projets sans dossier" })).toHaveCount(0);
    await page.getByRole("button", { name: "Nouveau", exact: true }).click();
    await page.getByRole("menuitem", { name: /^Dossier/ }).click();
    await folderDialog.getByLabel("Nom").fill("projets sans dossier");
    await folderDialog.getByRole("button", { name: "Créer" }).click();
    await expect(folderDialog).toContainText("est le dossier par defaut");
    await folderDialog.getByRole("button", { name: "Annuler" }).click();

    // Le nouveau dossier est ferme dans la vue « Tous ».
    await expect(page.getByRole("button", { name: new RegExp(`^${dmp} 0$`), expanded: false })).toBeVisible();
    await bar.getByRole("button", { name: new RegExp(`^${dmp} 0$`) }).click();

    // Nouveau projet depuis le dossier filtre : le dossier est deja choisi ; ni icone ni echeance.
    await page.getByRole("button", { name: "Nouveau", exact: true }).click();
    await page.getByRole("menuitem", { name: /^Projet/ }).click();
    const projectDialog = page.getByRole("dialog", { name: "Nouveau projet" });
    await expect(projectDialog.getByLabel("Icône")).toHaveCount(0);
    await expect(projectDialog.getByText("Échéance")).toHaveCount(0);
    // Le dossier filtre est deja coche ; un projet peut en avoir plusieurs.
    await expect(projectDialog.getByRole("checkbox", { name: dmp, exact: true })).toBeChecked();
    await expect(projectDialog.getByRole("checkbox", { name: mes, exact: true })).not.toBeChecked();
    await projectDialog.getByLabel("Nom").fill(`Appli A ${s}`);
    await projectDialog.getByRole("button", { name: "Créer" }).click();
    await expect(projectDialog).toBeHidden();
    await expect(page.getByRole("heading", { name: `Appli A ${s}` })).toBeVisible();

    // Une tache liee au projet (le dossier n'y change rien).
    const projects = await (await request.get(api + "projects")).json();
    const appA = projects.find((p: { name: string }) => p.name === `Appli A ${s}`);
    await post(request, "tasks", { title: `Corriger ${s}`, projectIds: [appA.id, appB.id] });

    // « Appli B » (dans MES) est ajoute aussi a DMP par le menu de sa carte : il est dans les deux dossiers.
    await bar.getByRole("button", { name: new RegExp(`^${mes} `) }).click();
    await page.getByRole("button", { name: `Autres actions pour Appli B ${s}` }).click();
    await page.getByRole("menuitemcheckbox", { name: `Ajouter à ${dmp}` }).click();
    await expect(page.getByText(`« Appli B ${s} » ajouté à ${dmp}.`)).toBeVisible();
    await expect(bar.getByRole("button", { name: new RegExp(`^${dmp} 2$`) })).toBeVisible();
    await expect(bar.getByRole("button", { name: new RegExp(`^${mes} 2$`) })).toBeVisible();
    await bar.getByRole("button", { name: new RegExp(`^${dmp} `) }).click();
    await expect(page.getByText(`Aussi dans : ${mes}`)).toBeVisible();
    // Puis retire de MES : il ne reste que dans DMP.
    await page.getByRole("button", { name: `Autres actions pour Appli B ${s}` }).click();
    await expect(page.getByRole("menuitemcheckbox", { name: `Retirer de ${dmp}` })).toBeVisible();
    await page.getByRole("menuitemcheckbox", { name: `Retirer de ${mes}` }).click();
    await expect(page.getByText(`« Appli B ${s} » retiré de ${mes}.`)).toBeVisible();
    await expect(bar.getByRole("button", { name: new RegExp(`^${mes} 1$`) })).toBeVisible();

    // Vue « Tous » : dossiers fermes par defaut ; DMP, ouvert a la creation de son projet, le reste.
    await bar.getByRole("button", { name: /^Tous / }).click();
    await expect(page.getByRole("button", { name: new RegExp(`^${mes}`), expanded: false })).toBeVisible();
    const dmpToggle = page.getByRole("button", { name: new RegExp(`^${dmp}`), expanded: true });
    await expect(dmpToggle).toBeVisible();
    await axe(page, "page Projets avec dossiers");
    await dmpToggle.click();
    await expect(page.getByRole("heading", { name: `Appli A ${s}` })).toBeHidden();
    await page.getByRole("button", { name: new RegExp(`^${dmp}`), expanded: false }).click();
    await expect(page.getByRole("heading", { name: `Appli A ${s}` })).toBeVisible();

    // Projet inactif : il quitte les projets actifs et se retrouve, dans son dossier, parmi les inactifs.
    await page.getByRole("button", { name: `Autres actions pour Appli B ${s}` }).click();
    await page.getByRole("menuitem", { name: "Rendre inactif" }).click();
    await expect(page.getByText(`« Appli B ${s} » est maintenant inactif`)).toBeVisible();
    await expect(page.getByRole("heading", { name: `Appli B ${s}` })).toBeHidden();
    await page.getByRole("button", { name: /^Projets inactifs/ }).click();
    await bar.getByRole("button", { name: new RegExp(`^${dmp} 1$`) }).click();
    await expect(page.getByRole("heading", { name: dmp, level: 2 })).toBeVisible();
    await expect(page.getByRole("heading", { name: `Appli B ${s}` })).toBeVisible();
    await expect(page.getByRole("heading", { name: `Appli A ${s}` })).toBeHidden();
    await axe(page, "projets inactifs");
    await page.getByRole("button", { name: "Réactiver" }).click();
    await expect(page.getByText(`« Appli B ${s} » est de nouveau actif.`)).toBeVisible();
    await page.getByRole("button", { name: "Projets actifs" }).click();
    await bar.getByRole("button", { name: /^Tous / }).click();

    // Export par la fenetre « Exporter… » : trois choix ; on coche seulement le dossier DMP.
    // Petit ecran (portable zoome a 125 %) : la liste defile, rien n'est recouvert par les boutons.
    await page.setViewportSize({ width: 1093, height: 614 });
    await page.getByRole("button", { name: "Importer / Exporter" }).click();
    await expect(page.getByRole("menuitem")).toHaveCount(2);
    await page.getByRole("menuitem", { name: "Exporter…" }).click();
    const exportDialog = page.getByRole("dialog", { name: "Exporter des projets" });
    await expect(exportDialog.getByRole("radio")).toHaveCount(3);
    await exportDialog.getByRole("radio", { name: /^Certains dossiers/ }).check();
    await expect(exportDialog.getByRole("button", { name: "Exporter" })).toBeDisabled();
    await expect(exportDialog).not.toContainText("Cochez au moins");
    await expect(exportDialog).toContainText(/0 sur \d+ sélectionné\(s\)/);
    // Clics reels (Playwright refuse un element recouvert) sur chaque case, jusqu'a la derniere.
    const boxes = exportDialog.getByRole("group", { name: "Dossiers à exporter" }).getByRole("checkbox");
    const n = await boxes.count();
    await exportDialog.getByRole("button", { name: "Tout sélectionner" }).click();
    await expect(exportDialog).toContainText(`${n} sur ${n} sélectionné(s)`);
    await boxes.last().uncheck();
    await exportDialog.getByRole("checkbox", { name: "Inclure les tâches de ces projets" }).uncheck();
    await exportDialog.getByRole("checkbox", { name: "Inclure les tâches de ces projets" }).check();
    await expect(exportDialog).toContainText(`${n - 1} sur ${n} sélectionné(s)`);
    await exportDialog.getByRole("button", { name: "Tout sélectionner" }).click();
    await exportDialog.getByRole("button", { name: "Tout désélectionner" }).click();
    await expect(exportDialog).toContainText(`0 sur ${n} sélectionné(s)`);
    await exportDialog.getByRole("checkbox", { name: new RegExp(`^${dmp}`) }).check();
    await axe(page, "fenêtre d’export sur petit écran");
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(exportDialog).toContainText("Le fichier contiendra 1 dossier(s) et 2 projet(s), avec leurs tâches.");
    await axe(page, "fenêtre d’export");
    const downloadPromise = page.waitForEvent("download");
    await exportDialog.getByRole("button", { name: "Exporter" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^focusflow-projets-dmp-\d+-\d{4}-\d{2}-\d{2}\.json$/);
    const file = test.info().outputPath("dmp.json");
    await download.saveAs(file);
    const exported = JSON.parse(await fs.readFile(file, "utf8"));
    expect(exported.version).toBe(7);
    expect(exported.folders.map((f: { name: string }) => f.name)).toEqual([dmp]);
    expect(exported.projects.map((p: { name: string }) => p.name).sort()).toEqual([`Appli A ${s}`, `Appli B ${s}`]);
    expect(exported.tasks.map((t: { title: string }) => t.title)).toEqual([`Corriger ${s}`]);

    // On efface tout, puis on importe le fichier : aucun conflit, apercu, confirmation, dossier recree.
    await cleanup(request, s);
    await page.reload();
    await expect(page.getByRole("heading", { name: `Appli A ${s}` })).toBeHidden();
    await page.locator('input[type="file"]').setInputFiles(file);
    const importDialog = page.getByRole("dialog", { name: "Importer « dmp.json »" });
    await expect(importDialog).toContainText("Aucun conflit");
    await expect(importDialog).toContainText("Dossiers : 1 dossier sera créé.");
    await expect(importDialog).toContainText("Projets : 2 projets seront créés.");
    await expect(importDialog).toContainText("Tâches : 1 tâche sera créée.");
    await axe(page, "aperçu d’import sans conflit");
    await importDialog.getByRole("button", { name: "Importer" }).click();
    await expect(page.getByText(/Import terminé\./)).toBeVisible();
    await expect(bar.getByRole("button", { name: new RegExp(`^${dmp} 2$`) })).toBeVisible();
    const tasks = await (await request.get(api + "tasks", { params: { q: `Corriger ${s}` } })).json();
    expect(tasks.items[0].projects.map((p: { name: string }) => p.name)).toEqual([`Appli A ${s}`, `Appli B ${s}`]);

    // Modification locale, puis reimport : le dossier est en conflit.
    const appAId = (await (await request.get(api + "projects")).json()).find(
      (p: { name: string }) => p.name === `Appli A ${s}`,
    ).id;
    await request.patch(api + `projects/${appAId}`, { data: { description: "Version locale" } });
    await page.locator('input[type="file"]').setInputFiles(file);
    await expect(importDialog).toContainText("1 dossier(s) du fichier existent déjà");
    await expect(importDialog).toContainText(`Dossier « ${dmp} »`);
    await expect(importDialog).toContainText(
      `Un dossier de ce nom existe déjà dans l’application ; 2 de ses 2 projets existent déjà : Appli A ${s} (dans « ${dmp} »), Appli B ${s} (dans « ${dmp} »).`,
    );
    // Par defaut : ignorer ces dossiers.
    await expect(importDialog.getByRole("radio", { name: /^Ignorer ces dossiers/ })).toBeChecked();
    await expect(importDialog).toContainText("2 ignoré(s) (dossiers en conflit)");
    await axe(page, "conflit d’import");
    // Remplacer : l'apercu change, puis le fichier ecrase la modification locale.
    await importDialog.getByRole("radio", { name: /^Remplacer par le fichier/ }).check();
    await expect(importDialog).toContainText("Projets : 0 projet sera créé, 2 remplacé(s) par le fichier.");
    await expect(importDialog).toContainText("1 remplacée(s) par le fichier");
    await importDialog.getByRole("button", { name: "Importer" }).click();
    await expect(importDialog).toBeHidden();
    await expect
      .poll(async () => (await (await request.get(api + `projects/${appAId}`)).json()).description ?? "")
      .toBe("");
    const after = await (await request.get(api + "tasks", { params: { q: `Corriger ${s}` } })).json();
    expect(after.totalItems).toBe(1);

    // Suppression du dossier par son menu : seul ce dossier est coche ; par defaut, les projets sont gardes.
    await page.getByRole("button", { name: `Actions du dossier ${dmp}` }).click();
    await page.getByRole("menuitem", { name: "Supprimer le dossier" }).click();
    const delDialog = page.getByRole("dialog", { name: "Supprimer des dossiers" });
    await expect(delDialog).toContainText("Par défaut, ne peut pas être supprimé");
    await expect(delDialog.getByRole("checkbox", { name: new RegExp(`^${dmp} `) })).toBeChecked();
    await expect(delDialog).toContainText("1 dossier sera supprimé.");
    await expect(delDialog).toContainText("2 projets passeront dans « Projets sans dossier » (avec leurs tâches).");
    await delDialog.getByRole("button", { name: "Supprimer le dossier" }).click();
    await expect(page.getByText("1 dossier supprimé. 2 projets sont passés dans « Projets sans dossier »")).toBeVisible();
    await bar.getByRole("button", { name: /^Projets sans dossier/ }).click();
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

test("Projets : supprimer des dossiers sans perdre un projet rangé aussi ailleurs", async ({ page, request }) => {
  // Dossier A {X, Y}, dossier B {Y, Z} ; taches tX (X) et tXZ (X et Z). On supprime A avec ses projets et taches :
  // X et tX disparaissent, Y reste (il est aussi dans B), tXZ reste avec Z.
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const s = String(Date.now()).slice(-6);
  const [A, B] = [`A ${s}`, `B ${s}`];
  try {
    const a = await post(request, "project-folders", { name: A });
    const b = await post(request, "project-folders", { name: B });
    const x = await post(request, "projects", { name: `X ${s}`, folderIds: [a.id] });
    const y = await post(request, "projects", { name: `Y ${s}`, folderIds: [a.id, b.id] });
    const z = await post(request, "projects", { name: `Z ${s}`, folderIds: [b.id] });
    await post(request, "tasks", { title: `tX ${s}`, projectId: x.id });
    await post(request, "tasks", { title: `tXZ ${s}`, projectIds: [x.id, z.id] });

    await page.goto("/projects");
    await page.getByRole("button", { name: "Supprimer des dossiers" }).click();
    const del = page.getByRole("dialog", { name: "Supprimer des dossiers" });
    // Par defaut tous les dossiers sont coches ; on ne garde que A.
    await expect(del.getByRole("button", { name: "Tout désélectionner" })).toBeVisible();
    await del.getByRole("button", { name: "Tout désélectionner" }).click();
    await expect(del).toContainText("Aucun dossier sélectionné.");
    await expect(del.getByRole("button", { name: /^Supprimer/ })).toBeDisabled();
    await del.getByRole("checkbox", { name: new RegExp(`^${A} `) }).check();
    await expect(del.getByRole("radio", { name: /^Garder les projets/ })).toBeChecked();
    await expect(del).toContainText("1 projet passera dans « Projets sans dossier » (avec leurs tâches).");
    await del.getByRole("radio", { name: /^Supprimer les projets et leurs tâches/ }).check();
    await expect(del).toContainText("1 projet sera supprimé.");
    await expect(del).toContainText("1 tâche sera supprimée définitivement.");
    await expect(del).toContainText("1 tâche sera gardée car elle fait aussi partie d’un projet conservé.");
    await expect(del).toContainText(`1 projet conservé car il fait aussi partie d’un autre dossier : Y ${s} (aussi dans « ${B} »).`);
    await axe(page, "suppression de dossiers");
    await del.getByRole("button", { name: "Supprimer le dossier" }).click();
    await expect(del).toBeHidden();

    const names = (await (await request.get(api + "projects")).json()).map((p: { name: string }) => p.name);
    expect(names).toContain(`Y ${s}`);
    expect(names).toContain(`Z ${s}`);
    expect(names).not.toContain(`X ${s}`);
    const yNow = await (await request.get(api + `projects/${y.id}`)).json();
    expect(yNow.folderIds).toEqual([b.id]);
    const tasks = await (await request.get(api + "tasks", { params: { q: s, size: 50 } })).json();
    expect(tasks.items.map((t: { title: string }) => t.title)).toEqual([`tXZ ${s}`]);
    expect(tasks.items[0].projects.map((p: { name: string }) => p.name)).toEqual([`Z ${s}`]);
    expect(errors).toEqual([]);
  } finally {
    await cleanup(request, s);
  }
});
