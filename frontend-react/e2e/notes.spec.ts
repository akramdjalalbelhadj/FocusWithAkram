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
  // La carte de la liste (un onglet de la meme idee porte le meme nom).
  const card = page.getByRole("article").getByRole("link", { name: new RegExp(`^${title}`) });
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
  // Ni carte ni onglet : supprimer l'idee ferme aussi son onglet.
  await expect(page.getByRole("link", { name: new RegExp(`^${title}`) })).toHaveCount(0);
  const tasks = await (await request.get(api + "tasks?q=" + encodeURIComponent(stamp) + "&size=20")).json();
  const kept = (tasks.items ?? tasks).find((t: { title: string }) => t.title === taskTitle);
  expect(kept, "tâche conservée après la suppression forcée").toBeTruthy();
  expect(kept.sourceNoteId ?? null).toBeNull();

  expect(errors, "erreurs JavaScript").toEqual([]);
});

test("Notes : onglets des idées ouvertes, gardés au retour à la liste, fermés seulement par l’utilisateur", async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const stamp = Date.now().toString(36);
  const krimou = `Projet Krimou ${stamp}`;
  const achats = `Mes achats ${stamp}`;
  await setTutorialDone(request, true);
  const ids: string[] = [];
  for (const title of [krimou, achats]) {
    const r = await request.post(api + "notes", { data: { title } });
    expect(r.ok()).toBe(true);
    ids.push((await r.json()).id);
  }
  const [krimouId, achatsId] = ids;

  const bar = page.getByRole("navigation", { name: "Onglets des idées" });
  const tab = (title: string) => bar.getByRole("link", { name: title, exact: true });
  const closeTab = (title: string) => bar.getByRole("button", { name: `Fermer l’onglet « ${title} »` });
  const card = (title: string) => page.getByRole("article").getByRole("link", { name: new RegExp(`^${title}`) });
  // Titres des onglets d'idees, dans l'ordre (assertion qui attend l'affichage, rechargement compris).
  const expectTabs = (titles: string[]) => expect(bar.locator(".ntab-link")).toHaveText(titles);

  // Aucune idee ouverte : pas de barre d'onglets sur la liste.
  await page.goto("/notes");
  await expect(card(krimou)).toBeVisible();
  await expect(bar).toHaveCount(0);

  // Ouvrir une idee lui donne un onglet ; « Notes & idées » ramene a la liste et l'onglet reste.
  await card(krimou).click();
  await expect(page).toHaveURL(new RegExp(`/notes/${krimouId}$`));
  await expect(tab(krimou)).toHaveAttribute("aria-current", "page");
  await axe(page, "idée ouverte avec sa barre d’onglets");
  await bar.getByRole("link", { name: "Notes & idées" }).click();
  await expect(page).toHaveURL(/\/notes$/);
  await expect(tab(krimou)).toBeVisible();
  await expect(bar.getByRole("link", { name: "Notes & idées" })).toHaveAttribute("aria-current", "page");

  // Une deuxieme idee s'ajoute a droite ; on bascule de l'une a l'autre par les onglets.
  await card(achats).click();
  await expect(tab(achats)).toHaveAttribute("aria-current", "page");
  await expectTabs([krimou, achats]);

  // Changer d'onglet juste apres une saisie l'enregistre quand meme, sur la bonne idee.
  await page.getByRole("textbox", { name: "Contenu de l’idée" }).fill("Liste de courses");
  await tab(krimou).click();
  await expect(page).toHaveURL(new RegExp(`/notes/${krimouId}$`));
  await expect(page.getByRole("textbox", { name: "Titre de l’idée" })).toHaveValue(krimou);
  await expect
    .poll(async () => (await (await request.get(api + "notes/" + achatsId)).json()).content)
    .toBe("Liste de courses");
  expect((await (await request.get(api + "notes/" + krimouId)).json()).content).toBe("");

  // L'onglet suit le titre saisi ; les onglets survivent au rechargement.
  await page.getByRole("textbox", { name: "Titre de l’idée" }).fill(`${krimou} v2`);
  await expect(tab(`${krimou} v2`)).toBeVisible();
  await expect(page.getByText("Enregistré", { exact: true })).toBeVisible({ timeout: 10000 });
  await page.reload();
  await expectTabs([`${krimou} v2`, achats]);

  // Fermer l'onglet affiche ouvre son voisin ; l'idee fermee n'a plus d'onglet tant qu'on ne la rouvre pas.
  await tab(achats).click();
  await closeTab(achats).click();
  await expect(page).toHaveURL(new RegExp(`/notes/${krimouId}$`));
  await expectTabs([`${krimou} v2`]);
  await bar.getByRole("link", { name: "Notes & idées" }).click();
  await expect(tab(achats)).toHaveCount(0);
  await card(achats).click();
  await expectTabs([`${krimou} v2`, achats]);

  // Fermer un autre onglet depuis la liste ne quitte pas la liste ; au dernier, la barre disparait.
  await bar.getByRole("link", { name: "Notes & idées" }).click();
  await closeTab(`${krimou} v2`).click();
  await expect(page).toHaveURL(/\/notes$/);
  await closeTab(achats).click();
  await expect(bar).toHaveCount(0);

  // Sur telephone : la barre defile seule, la page ne deborde pas.
  await card(krimou).click();
  await expect(tab(`${krimou} v2`)).toBeVisible();
  await page.goto("/notes/" + achatsId);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(tab(achats)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await axe(page, "barre d’onglets à 390 px");

  for (const id of ids) await request.delete(api + "notes/" + id);
  expect(errors, "erreurs JavaScript").toEqual([]);
});

test("Notes : barre d’outils collée en haut de l’écran pendant la saisie d’un long texte", async ({ page, request }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const stamp = Date.now().toString(36);
  await setTutorialDone(request, true);
  const previousMode = (await (await request.get(api + "settings")).json()).noteEditorMode;
  expect((await request.patch(api + "settings", { data: { noteEditorMode: "RICH" } })).ok()).toBe(true);
  const lines = Array.from({ length: 80 }, (_, i) => `Ligne ${i + 1} du long texte`);
  const created = await request.post(api + "notes", { data: { title: `Long texte ${stamp}`, content: lines.join("\n\n") } });
  expect(created.ok()).toBe(true);
  const noteId = (await created.json()).id;

  try {
    await page.goto("/notes/" + noteId);
    const toolbar = page.getByRole("toolbar", { name: "Mise en forme — Contenu de l’idée" });
    const editor = page.getByRole("textbox", { name: "Contenu de l’idée" });
    const line = (n: number) => editor.getByText(`Ligne ${n} du long texte`, { exact: true });
    await expect(line(80)).toBeVisible();
    const header = (await page.locator("header").first().boundingBox())!;

    // En bas d'un long texte, la barre reste sous la barre de l'application et ses boutons servent.
    await line(80).click();
    await page.keyboard.press("End");
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const stuck = (await toolbar.boundingBox())!;
    expect(Math.abs(stuck.y - (header.y + header.height))).toBeLessThanOrEqual(2);
    await toolbar.getByRole("button", { name: "Gras" }).click();
    await page.keyboard.type(" fin");
    await expect(editor.locator("strong")).toHaveText("fin");

    // Un curseur qui remonte sous la barre fait defiler la page : il reste visible.
    await line(40).click();
    const bar = (await toolbar.boundingBox())!;
    const barBottom = bar.y + bar.height;
    const target = (await line(40).boundingBox())!;
    await page.evaluate((dy) => window.scrollBy(0, dy), target.y - barBottom - 4);
    expect((await line(39).boundingBox())!.y).toBeLessThan(barBottom);
    await page.keyboard.press("ArrowUp");
    await expect.poll(async () => (await line(39).boundingBox())!.y).toBeGreaterThanOrEqual(barBottom);

    // Sur telephone, la barre tient sur une ligne (elle defile horizontalement) et la page ne deborde pas.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight / 2));
    const phone = (await toolbar.boundingBox())!;
    expect(phone.height).toBeLessThan(56);
    expect(Math.abs(phone.y - (header.y + header.height))).toBeLessThanOrEqual(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await axe(page, "barre d’outils collée à 390 px");
  } finally {
    await request.patch(api + "settings", { data: { noteEditorMode: previousMode } });
    await request.delete(api + "notes/" + noteId);
  }
  expect(errors, "erreurs JavaScript").toEqual([]);
});

test("Notes : surligner en jaune, rouge, bleu ciel ou violet, en mode Visuel comme en Markdown", async ({ page, request }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const stamp = Date.now().toString(36);
  await setTutorialDone(request, true);
  const previousMode = (await (await request.get(api + "settings")).json()).noteEditorMode;
  expect((await request.patch(api + "settings", { data: { noteEditorMode: "RICH" } })).ok()).toBe(true);
  const created = await request.post(api + "notes", { data: { title: `Surlignage ${stamp}`, content: "Un mot important" } });
  expect(created.ok()).toBe(true);
  const noteId = (await created.json()).id;
  const content = async () => (await (await request.get(api + "notes/" + noteId)).json()).content;

  try {
    await page.goto("/notes/" + noteId);
    const toolbar = page.getByRole("toolbar", { name: "Mise en forme — Contenu de l’idée" });
    const editor = page.getByRole("textbox", { name: "Contenu de l’idée" });
    await expect(editor).toHaveText("Un mot important");

    // Mode Visuel : selection du dernier mot, couleur choisie dans le menu.
    await editor.click();
    await page.keyboard.press("End");
    await page.keyboard.press("Control+Shift+ArrowLeft");
    await toolbar.getByRole("button", { name: "Couleur du surlignage" }).click();
    const menu = page.getByRole("menu", { name: "Couleur du surlignage" });
    await expect(menu.getByRole("menuitemradio")).toHaveText(["Jaune", "Rouge", "Bleu ciel", "Violet"]);
    await menu.getByRole("menuitemradio", { name: "Rouge" }).click();
    await expect(editor.locator('mark[data-color="red"]')).toHaveText("important");
    await expect.poll(content).toBe('Un mot <mark data-color="red">important</mark>');
    await axe(page, "texte surligné, thème clair");

    // Le bouton reprend la derniere couleur : un clic retire le surlignage, Ctrl+Maj+H le remet.
    const apply = toolbar.getByRole("button", { name: "Surligner en rouge" });
    await expect(apply).toHaveAttribute("aria-pressed", "true");
    await apply.click();
    await expect(editor.locator("mark")).toHaveCount(0);
    await expect.poll(content).toBe("Un mot important");
    await page.keyboard.press("Control+Shift+H");
    await expect(editor.locator('mark[data-color="red"]')).toHaveText("important");
    await expect.poll(content).toBe('Un mot <mark data-color="red">important</mark>');

    // Mode Markdown : meme bouton sur le texte selectionne, syntaxe visible et apercu colore.
    await page.getByRole("radio", { name: "Markdown" }).click();
    const area = page.getByRole("textbox", { name: "Contenu de l’idée" });
    await expect(area).toHaveValue('Un mot <mark data-color="red">important</mark>');
    await area.evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(3, 6));
    await toolbar.getByRole("button", { name: "Couleur du surlignage" }).click();
    await page.getByRole("menu", { name: "Couleur du surlignage" }).getByRole("menuitemradio", { name: "Bleu ciel" }).click();
    await expect(area).toHaveValue('Un <mark data-color="sky">mot</mark> <mark data-color="red">important</mark>');
    await area.evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(0, 2));
    await toolbar.getByRole("button", { name: "Couleur du surlignage" }).click();
    await page.getByRole("menu", { name: "Couleur du surlignage" }).getByRole("menuitemradio", { name: "Jaune" }).click();
    await expect(area).toHaveValue('==Un== <mark data-color="sky">mot</mark> <mark data-color="red">important</mark>');
    await expect.poll(content).toBe('==Un== <mark data-color="sky">mot</mark> <mark data-color="red">important</mark>');
    await page.getByRole("tab", { name: "Aperçu" }).click();
    const preview = page.getByRole("tabpanel");
    await expect(preview.locator("mark")).toHaveCount(3);
    await expect(preview.locator('mark[data-color="sky"]')).toHaveText("mot");

    // Theme sombre : couleurs foncees, texte toujours lisible.
    await page.emulateMedia({ colorScheme: "dark" });
    await page.getByRole("radio", { name: "Visuel" }).click();
    await expect(editor.locator("mark")).toHaveCount(3);
    await axe(page, "texte surligné, thème sombre");
  } finally {
    await request.patch(api + "settings", { data: { noteEditorMode: previousMode } });
    await request.delete(api + "notes/" + noteId);
  }
  expect(errors, "erreurs JavaScript").toEqual([]);
});

test("Notes : un seul bouton Exporter, en Markdown ou en PDF", async ({ page, request }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const stamp = Date.now().toString(36);
  await setTutorialDone(request, true);
  const title = `Export ${stamp}`;
  const content = "## Plan 🚀\n\n- [x] ==Réserver== la salle 🎉\n- [ ] Écrire le compte rendu\n\n```js\nconst a = 1;\n```";
  const created = await request.post(api + "notes", { data: { title, content, tags: ["visa"] } });
  expect(created.ok()).toBe(true);
  const noteId = (await created.json()).id;

  try {
    await page.goto("/notes/" + noteId);
    const exportButton = page.getByRole("button", { name: "Exporter" });
    await expect(exportButton).toBeVisible();
    await exportButton.click();
    const menu = page.getByRole("menu", { name: "Exporter la note" });
    await expect(menu.getByRole("menuitem")).toHaveText(["Markdown (.md)", "PDF (.pdf)"]);
    await axe(page, "menu d’export");

    // Markdown : en-tete YAML puis contenu tel quel.
    const [md] = await Promise.all([page.waitForEvent("download"), menu.getByRole("menuitem", { name: "Markdown (.md)" }).click()]);
    expect(md.suggestedFilename()).toBe(`export-${stamp}.md`);
    const mdText = (await (await md.createReadStream()).toArray()).map((c) => c.toString()).join("");
    expect(mdText).toContain(`title: "${title}"`);
    expect(mdText).toContain("- [x] ==Réserver== la salle");

    // PDF : vrai fichier, telecharge directement (pdfmake charge au premier export).
    await exportButton.click();
    const [pdf] = await Promise.all([
      page.waitForEvent("download", { timeout: 30000 }),
      page.getByRole("menu", { name: "Exporter la note" }).getByRole("menuitem", { name: "PDF (.pdf)" }).click(),
    ]);
    expect(pdf.suggestedFilename()).toBe(`export-${stamp}.pdf`);
    const bytes = Buffer.concat(await (await pdf.createReadStream()).toArray());
    expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
    expect(bytes.length).toBeGreaterThan(5000);
    // Emojis ecrits avec la police d'emojis, embarquee dans le fichier.
    expect(bytes.includes("NotoEmoji")).toBe(true);
    await expect(page.getByText("Note exportée en PDF.")).toBeVisible();
    await expect(exportButton).toBeEnabled();
  } finally {
    await request.delete(api + "notes/" + noteId);
  }
  expect(errors, "erreurs JavaScript").toEqual([]);
});
