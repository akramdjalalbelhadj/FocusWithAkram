import AxeBuilder from "@axe-core/playwright";
import { test, expect, type APIRequestContext, type Page } from "@playwright/test";

// Tutoriel de la matrice d'Eisenhower (Angular seulement). Le scenario remet lui-meme le parametre a faux : il est
// rejouable sur une base de recette deja utilisee.
const api = "http://127.0.0.1:18080/api/v1/";

test.beforeEach(async ({}, info) => {
  test.skip(info.project.name !== "angular", "Le tutoriel de la matrice n’existe que dans le frontend Angular");
});

async function tutorialDone(request: APIRequestContext): Promise<boolean> {
  return (await (await request.get(api + "settings")).json()).matrixTutorialDone;
}

async function axe(page: Page, what: string) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(results.violations.map((v) => `${v.id} : ${v.nodes.length}`), `axe ${what}`).toEqual([]);
}

test("Matrice : tutoriel « décider quoi faire d’abord » avec son schéma 2 × 2, passé puis relancé", async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  expect((await request.patch(api + "settings", { data: { matrixTutorialDone: false } })).ok()).toBe(true);
  // Une tache au moins, pour l'etape qui montre une carte.
  const created = await request.post(api + "tasks", { data: { title: `Tutoriel matrice ${Date.now()}`, quadrant: "Q2" } });
  expect(created.ok()).toBe(true);
  const task = await created.json();

  try {
    // Premiere visite : le tutoriel demarre seul, sur le schema des quatre cases.
    await page.goto("/matrix");
    const tour = page.getByRole("dialog", { name: "La matrice d’Eisenhower : décider quoi faire d’abord" });
    await expect(tour).toBeVisible({ timeout: 15000 });
    const cases = tour.getByRole("list", { name: "Les quatre cases de la matrice d’Eisenhower" }).getByRole("listitem");
    await expect(cases).toHaveCount(4);
    const expected = [
      ["Q1", "Faire maintenant", "Urgent et important"],
      ["Q2", "Planifier", "Important, pas urgent"],
      ["Q3", "Déléguer / limiter", "Urgent, pas important"],
      ["Q4", "Éliminer / plus tard", "Ni urgent ni important"],
    ];
    for (const [i, texts] of expected.entries()) {
      for (const t of texts) await expect(cases.nth(i)).toContainText(t);
    }
    // Disposition 2 × 2 (Q1 en haut a gauche, Q4 en bas a droite), quatre couleurs, axes affiches.
    const boxes = await cases.evaluateAll((els) =>
      els.map((e) => {
        const r = e.getBoundingClientRect();
        return { x: Math.round(r.left), y: Math.round(r.top), bg: getComputedStyle(e).backgroundColor };
      }),
    );
    expect(boxes[0].x).toBe(boxes[2].x);
    expect(boxes[1].x).toBe(boxes[3].x);
    expect(boxes[0].x).toBeLessThan(boxes[1].x);
    expect(boxes[0].y).toBe(boxes[1].y);
    expect(boxes[2].y).toBe(boxes[3].y);
    expect(boxes[0].y).toBeLessThan(boxes[2].y);
    expect(new Set(boxes.map((b) => b.bg)).size).toBe(4);
    for (const axis of ["Urgent", "Pas urgent", "Important", "Pas important"]) {
      await expect(tour.getByText(axis, { exact: true })).toBeVisible();
    }
    await axe(page, "tutoriel de la matrice (schéma)");

    // Etape suivante, puis « Passer » : enregistre, ne revient plus, le focus revient au bouton de relance.
    await tour.getByRole("button", { name: "Suivant" }).click();
    await expect(page.getByRole("dialog", { name: "Ajoutez une tâche" })).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Passer" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect.poll(() => tutorialDone(request)).toBe(true);
    await expect(page.getByRole("button", { name: "Comment ça marche ?" })).toBeFocused();
    await page.reload();
    await expect(page.getByRole("button", { name: "Nouvelle tâche" })).toBeVisible();
    await page.waitForTimeout(800);
    await expect(page.getByRole("dialog")).toHaveCount(0);

    // Relance : toutes les etapes jusqu'a « Terminer » ; l'etape « Planifier » met la case Q2 en avant.
    await page.getByRole("button", { name: "Comment ça marche ?" }).click();
    await expect(tour).toBeVisible();
    const seen: string[] = [];
    for (let i = 0; i < 12; i++) {
      const title = (await page.getByRole("dialog").getByRole("heading").textContent()) ?? "";
      seen.push(title.replace(/\s+/g, " "));
      if (/Planifier/.test(title)) {
        await expect(page.getByRole("dialog").getByRole("listitem").nth(1)).toHaveAttribute("aria-current", "step");
      }
      const finish = page.getByRole("dialog").getByRole("button", { name: "Terminer" });
      if (await finish.isVisible()) break;
      await page.getByRole("dialog").getByRole("button", { name: "Suivant" }).click();
    }
    expect(seen).toContain("Changez une tâche de case");
    expect(seen).toContain("Le secret : la case « Planifier »");
    expect(seen.at(-1)).toBe("Revoir ce tutoriel");
    // Sur grand ecran, les onglets Q1 a Q4 sont caches : leur etape est sautee.
    expect(seen).not.toContain("Une case à la fois");
    await page.getByRole("dialog").getByRole("button", { name: "Terminer" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    // Telephone : la matrice reste en 2 × 2 dans la bulle, sans debordement ; l'etape des onglets apparait.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "Comment ça marche ?" }).click();
    const phoneCases = page.getByRole("dialog").getByRole("listitem");
    await expect(phoneCases).toHaveCount(4);
    const phone = await phoneCases.evaluateAll((els) => els.map((e) => e.getBoundingClientRect()));
    expect(Math.round(phone[0].top)).toBe(Math.round(phone[1].top));
    expect(phone[0].left).toBeLessThan(phone[1].left);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, "débordement horizontal à 390 px").toBeLessThanOrEqual(0);
    const bubble = await page.getByRole("dialog").boundingBox();
    expect(bubble && bubble.x >= 0 && bubble.x + bubble.width <= 390).toBe(true);
    await axe(page, "tutoriel de la matrice à 390 px");
    await page.getByRole("dialog").getByRole("button", { name: "Suivant" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Suivant" }).click();
    await expect(page.getByRole("dialog", { name: "Une case à la fois" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  } finally {
    await request.delete(api + `tasks/${task.id}`);
  }

  expect(errors, "erreurs JavaScript").toEqual([]);
});
