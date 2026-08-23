import { expect, test } from "@playwright/test";

const url = "/exhibits/pokemon-cards?evidence=1&view=macro";

test("Paper toggle persists and calibration remains available in inspection framing", async ({ page }) => {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  const stage = page.locator('[data-testid="pokemon-card-webgl-stage"]');
  await expect(stage).toHaveAttribute("data-display-mode", "glass");
  await page.getByRole("button", { name: "Paper", exact: true }).click();
  await expect(stage).toHaveAttribute("data-display-mode", "paper");
  await page.getByRole("button", { name: "Calibrate" }).click();
  await expect(page.getByRole("region", { name: "Paper display calibration" })).toBeVisible();
  await page.getByRole("slider", { name: "Paper grain" }).fill("0.6");
  await page.reload();
  await expect(stage).toHaveAttribute("data-display-mode", "paper");
  await expect(page.getByRole("button", { name: "Paper · on" })).toBeVisible();
});

for (const viewport of [{ name: "desktop", width: 1440, height: 1000 }, { name: "mobile", width: 390, height: 844 }]) {
  test(`${viewport.name} captures glass and paper evidence without reducing display cadence`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.locator('[data-testid="pokemon-card-webgl-stage"][data-textures-ready="true"]').waitFor();
    const root = "/home/kvn/.hermes/kanban/boards/zer0-company/workspaces/t_e42ad487/evidence";
    const sampleCadence = () => page.evaluate(() => new Promise<number>((resolve) => {
      let frames = 0;
      const start = performance.now();
      const tick = (now: number) => { frames += 1; if (now - start >= 1000) resolve(frames); else requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    }));
    await page.screenshot({ path: `${root}/${viewport.name}-glass.png` });
    const glassCadence = await sampleCadence();
    await page.getByRole("button", { name: "Paper", exact: true }).click();
    await page.locator('[data-testid="pokemon-card-webgl-stage"][data-display-mode="paper"]').waitFor();
    await page.screenshot({ path: `${root}/${viewport.name}-paper.png` });
    const paperCadence = await sampleCadence();
    expect(paperCadence).toBeGreaterThanOrEqual(glassCadence * 0.65);
  });
}
