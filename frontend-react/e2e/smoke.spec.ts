import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs/promises";
const docs = new URL("../../docs/", import.meta.url).pathname.replace(
  /^\/([A-Za-z]:)/,
  "$1",
);
const base = "http://127.0.0.1:18080/api/v1/";
const routes = [
  ["tableau-de-bord", "/"],
  ["matrice", "/matrix"],
  ["mes-taches", "/tasks"],
  ["focus-pomodoro", "/focus"],
  ["calendrier", "/calendar"],
  ["statistiques", "/statistics"],
  ["projets", "/projects"],
] as const;
// Tutoriels de page (matrice, notes) deja vus : ils ne recouvrent pas les ecrans verifies ici.
test.beforeEach(async ({ request }) => {
  const r = await request.patch(base + "settings", {
    data: { matrixTutorialDone: true, notesTutorialDone: true },
  });
  expect(r.ok()).toBeTruthy();
});
test("navigation, thèmes, captures et accessibilité", async ({
  page,
  request,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await fs.mkdir(docs + "screenshots", { recursive: true });
  await fs.mkdir(docs + "test-results", { recursive: true });
  for (const theme of ["LIGHT", "DARK"]) {
    await request.patch(base + "settings", { data: { theme } });
    for (const [name, route] of routes) {
      await page.goto(route);
      await expect(page.locator("main h1")).toBeVisible();
      await page.waitForLoadState("networkidle");
      await page.screenshot({
        path: `${docs}screenshots/${testInfo.project.name}-${name}-${theme === "LIGHT" ? "clair" : "sombre"}.png`,
        fullPage: true,
      });
      {
        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa"])
          .analyze();
        await fs.writeFile(
          `${docs}test-results/axe-${testInfo.project.name}-${name}-${theme.toLowerCase()}.json`,
          JSON.stringify(results.violations, null, 2),
        );
        expect(results.violations).toEqual([]);
      }
    }
  }
  for (const [width, height] of [
    [768, 1024],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    for (const [name, route] of routes) {
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      await page.screenshot({
        path: `${docs}screenshots/${testInfo.project.name}-${name}-sombre-${width}.png`,
        fullPage: true,
      });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBeTruthy();
    }
  }
  for (const route of ["/archives", "/settings"]) {
    await page.goto(route);
    await expect(page.locator("main h1")).toBeVisible();
  }
  expect(errors).toEqual([]);
});
test("création, déplacement clavier, édition, persistance et archivage", async ({
  page,
  request,
}, info) => {
  const title = `E2E ${info.project.name} ${Date.now()}`;
  await page.goto("/matrix");
  await page.waitForLoadState("networkidle");
  const quick = page.getByRole("textbox", {
    name: "Ajout rapide dans Faire maintenant",
  });
  await quick.fill(title);
  await quick.press("Enter");
  await expect(
    page.getByRole("button", { name: title, exact: true }),
  ).toBeVisible();
  const task = (
    await (await request.get(base + "tasks/priorities")).json()
  ).find((t: { title: string }) => t.title === title);
  try {
    await page.getByRole("button", { name: title, exact: true }).focus();
    await page.keyboard.press("Alt+2");
    await expect
      .poll(
        async () =>
          (await (await request.get(base + `tasks/${task.id}`)).json())
            .quadrant,
      )
      .toBe("Q2");
    await page.reload();
    await expect(
      page.getByRole("button", { name: title, exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: title, exact: true }).click();
    await page
      .getByRole("button", { name: "Modifier", exact: true })
      .last()
      .click();
    const titleField = page.getByRole("textbox", { name: /^Titre/ });
    await titleField.click();
    await titleField.press("ControlOrMeta+A");
    await titleField.pressSequentially(title + " modifiée");
    await page.getByRole("textbox", { name: /^Titre/ }).press("Enter");
    await expect
      .poll(
        async () =>
          (await (await request.get(base + `tasks/${task.id}`)).json()).title,
      )
      .toBe(title + " modifiée");
    await request.post(base + `tasks/${task.id}/start`, { data: {} });
    await request.post(base + `tasks/${task.id}/complete`, { data: {} });
    await page.goto("/matrix");
    await expect(
      page.getByRole("button", { name: title + " modifiée", exact: true }),
    ).toHaveCount(0);
    await page.goto("/archives");
    await expect(
      page.getByRole("button", { name: title + " modifiée", exact: true }),
    ).toBeVisible();
  } finally {
    await request.delete(base + `tasks/${task.id}`);
  }
});
test("Pomodoro pause, recharge, reprise et interruption", async ({
  page,
  request,
}) => {
  const old = await (
    await request.get(base + "pomodoro/sessions/active")
  ).json();
  if (old.session)
    await request.post(base + `pomodoro/sessions/${old.session.id}/cancel`, {
      data: {},
    });
  await page.goto("/focus");
  await page.getByRole("button", { name: "Démarrer", exact: true }).click();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Reprendre", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Reprendre", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reprendre", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  const state = await (
    await request.get(base + "pomodoro/sessions/active")
  ).json();
  await request.post(base + `pomodoro/sessions/${state.session.id}/cancel`, {
    data: {},
  });
});
test("erreur réseau visible", async ({ page }) => {
  await page.route("**/api/v1/eisenhower/matrix**", (r) => r.abort());
  await page.goto("/matrix");
  await expect(page.getByRole("button", { name: "Réessayer" })).toBeVisible({
    timeout: 15000,
  });
});

test("planification et déplacement de date à la souris", async ({
  page,
  request,
}, info) => {
  const title = `Planning ${info.project.name} ${Date.now()}`;
  const r = await request.post(base + "tasks", {
    data: {
      title,
      quadrant: "Q2",
      plannedStartAt: "2026-11-03T08:00:00Z",
      plannedEndAt: "2026-11-03T10:00:00Z",
    },
  });
  expect(r.ok()).toBeTruthy();
  const task = await r.json();
  try {
    await page.goto("/calendar");
    await page.waitForLoadState("networkidle");
    const source =
      info.project.name === "angular"
        ? page.locator("[cdkdrag]").filter({ hasText: title })
        : page
            .locator(".draggable")
            .filter({ hasText: title })
            .getByRole("button", { name: `Déplacer ${title}` });
    const target = page.getByRole("group", { name: /^mercredi 4 novembre/ });
    const box = await target.boundingBox();
    await source.hover();
    await page.mouse.down();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2, {
      steps: 20,
    });
    await page.mouse.up();
    await expect
      .poll(
        async () =>
          (await (await request.get(base + `tasks/${task.id}`)).json())
            .plannedEndAt,
      )
      .toBe("2026-11-04T10:00:00Z");
    await page.reload();
    await expect(
      page.getByRole("button", { name: new RegExp(title) }).first(),
    ).toBeVisible();
    expect(
      (await (await request.get(base + `tasks/${task.id}`)).json())
        .plannedStartAt,
    ).toBe("2026-11-04T08:00:00Z");
  } finally {
    await request.delete(base + `tasks/${task.id}`);
  }
});

test("création par formulaire, sous-tâche et thème persistés", async ({
  page,
  request,
}, info) => {
  const title = `Formulaire ${info.project.name} ${Date.now()}`;
  let id: string | undefined;
  try {
    await request.patch(base + "settings", {data:{theme:"DARK"}});
    await page.goto("/matrix");
    await page
      .getByRole("button", { name: "Nouvelle tâche", exact: true })
      .last()
      .click();
    await page
      .getByRole("textbox", { name: /^Titre/ })
      .pressSequentially(title);
    await page
      .getByRole("textbox", { name: "Description", exact: true })
      .fill("Vérification du formulaire réel");
    await page
      .getByRole("textbox", { name: /Sous-tâches/ })
      .fill("Premier contrôle");
    await page.getByRole("textbox", { name: /^Titre/ }).press("Enter");
    await expect(
      page.getByRole("button", { name: title, exact: true }),
    ).toBeVisible();
    const tasks = await (await request.get(base + "tasks/priorities")).json();
    const t = tasks.find((t: { title: string }) => t.title === title);
    id = t.id;
    expect(t.subtasks.length).toBe(1);
    await page.goto("/settings");
    if (info.project.name === "angular")
      await page.locator("label").filter({has: page.getByRole("radio", { name: "Clair", exact: true })}).click();
    else
      await page
        .getByLabel("Thème", { exact: true })
        .last()
        .selectOption("LIGHT");
    if (info.project.name === "react")
      await page
        .getByRole("button", { name: "Enregistrer les paramètres" })
        .click();
    await expect
      .poll(
        async () => (await (await request.get(base + "settings")).json()).theme,
      )
      .toBe("LIGHT");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  } finally {
    if (id) await request.delete(base + `tasks/${id}`);
  }
});

test("aperçu des tâches du projet et ouverture du détail", async ({ page }) => {
  await page.goto("/projects");
  // Angular (lot 24) : avec des dossiers, les sections sont fermees par defaut ; on les ouvre toutes.
  await page.locator('.project-preview button, button[aria-controls^="pf-grid-"][aria-expanded="false"]').first().waitFor();
  const closed = page.locator('button[aria-controls^="pf-grid-"][aria-expanded="false"]');
  while (await closed.count()) await closed.first().click();
  const preview = page.locator(".project-preview button").first();
  await expect(preview).toBeVisible();
  await preview.click();
  await expect(
    page.getByRole("dialog", { name: "Détail de la tâche", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Début prévu", { exact: true }).last(),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: "Détail de la tâche", exact: true }),
  ).toHaveCount(0);
});
