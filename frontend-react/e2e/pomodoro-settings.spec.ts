import { test, expect } from "@playwright/test";

const settingsUrl = "http://127.0.0.1:18080/api/v1/settings";

test("réglages Pomodoro dans Focus, persistés et préservés par les paramètres généraux", async ({
  page,
  request,
}, info) => {
  const original = await (await request.get(settingsUrl)).json();
  const workMinutes = original.workMinutes === 37 ? 38 : 37;
  try {
    await page.goto("/settings");
    await expect(
      page.getByRole("heading", { name: "Minuteur Pomodoro", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.locator('input[name="workMinutes"], #p-workMinutes'),
    ).toHaveCount(0);

    await page.goto("/focus");
    await page.getByRole("button", { name: "Configurer", exact: true }).click();
    const panel = page.locator("#pomodoro-settings");
    await expect(
      panel.getByRole("heading", { name: "Minuteur Pomodoro" }),
    ).toBeVisible();
    const work = panel.locator('#p-workMinutes, input[name="workMinutes"]');
    await expect(work).toHaveAttribute("min", "1");
    await expect(work).toHaveAttribute("max", "180");
    await work.fill(String(workMinutes));
    await work.press("Tab");
    if (info.project.name === "react")
      await panel
        .getByRole("button", { name: "Enregistrer le minuteur" })
        .click();
    await expect
      .poll(
        async () => (await (await request.get(settingsUrl)).json()).workMinutes,
      )
      .toBe(workMinutes);

    const autoBreaks = panel.getByLabel("Démarrer automatiquement les pauses", {
      exact: true,
    });
    await autoBreaks.setChecked(!original.autoStartBreaks);
    if (info.project.name === "react")
      await panel
        .getByRole("button", { name: "Enregistrer le minuteur" })
        .click();
    await expect
      .poll(
        async () =>
          (await (await request.get(settingsUrl)).json()).autoStartBreaks,
      )
      .toBe(!original.autoStartBreaks);

    await page.reload();
    await page.getByRole("button", { name: "Configurer", exact: true }).click();
    await expect(work).toHaveValue(String(workMinutes));
    await expect(
      panel.getByLabel("Son de fin de session", { exact: true }),
    ).toBeVisible();
    await expect(
      panel.getByLabel("Notifications du navigateur", { exact: true }),
    ).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);

    await page.goto("/settings");
    const savedGeneral = page.waitForResponse(
      (response) =>
        response.url().includes("/api/v1/settings") &&
        response.request().method() === "PATCH",
    );
    if (info.project.name === "react") {
      await page
        .getByRole("button", { name: "Enregistrer les paramètres" })
        .click();
      await expect(
        page.getByRole("button", { name: "Enregistrer les paramètres" }),
      ).toBeEnabled();
    } else {
      await page
        .getByRole("radio", {
          name: original.theme === "LIGHT" ? "Sombre" : "Clair",
          exact: true,
        })
        .locator("..")
        .click();
    }
    await expect
      .poll(
        async () => (await (await request.get(settingsUrl)).json()).workMinutes,
      )
      .toBe(workMinutes);
    await savedGeneral;
    const saved = await (await request.get(settingsUrl)).json();
    expect(saved.autoStartBreaks).toBe(!original.autoStartBreaks);
    expect(saved.shortBreakMinutes).toBe(original.shortBreakMinutes);
    expect(saved.dailyFocusGoalMinutes).toBe(original.dailyFocusGoalMinutes);
    expect(saved.soundName).toBe(original.soundName);
  } finally {
    await request.patch(settingsUrl, { data: original });
  }
});
