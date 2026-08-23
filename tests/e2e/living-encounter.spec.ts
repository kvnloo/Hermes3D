import { expect, test } from "@playwright/test";

for (const viewport of [{ name: "mobile", width: 390, height: 844 }, { name: "desktop", width: 1920, height: 1080 }]) {
  test(`${viewport.name} Living Encounter is visible, responsive, and bounded`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/pokedex/25", { waitUntil: "networkidle" });
    const encounter = page.getByRole("region", { name: "Living Encounter" });
    await expect(encounter).toBeVisible();
    await expect(encounter).toHaveAttribute("data-asset-kind", /animated|artwork/);
    await expect(page.getByText(/2D sprite|2D artwork/)).toBeVisible();
    await expect(page.getByText("3D model unavailable")).toBeVisible();
    const before = await encounter.evaluate((node) => getComputedStyle(node).getPropertyValue("--encounter-x"));
    await page.evaluate(({ x, y }) => window.dispatchEvent(new PointerEvent("pointermove", { clientX: x, clientY: y })), { x: viewport.width - 1, y: 1 });
    await expect.poll(() => encounter.evaluate((node) => getComputedStyle(node).getPropertyValue("--encounter-x"))).not.toBe(before);
    const creature = page.getByRole("button", { name: /react with/i });
    // Freeze every environmental layer and sample the image element itself so
    // habitat motion cannot masquerade as creature motion.
    await page.addStyleTag({ content: ".ct-encounter-sky,.ct-particles,.ct-encounter-floor{animation:none!important}.ct-creature{background:#13202b!important}" });
    const creatureImage = creature.locator("img");
    const frameA = await creatureImage.screenshot();
    await page.waitForTimeout(350);
    const frameB = await creatureImage.screenshot();
    expect(frameA.equals(frameB)).toBe(false);
    await page.getByRole("button", { name: /enable cry audio/i }).click();
    await expect(page.getByRole("button", { name: /disable cry audio/i })).toBeVisible();
    await creature.click();
    await expect(encounter).toHaveClass(/is-reacting/);
    await page.screenshot({ path: `artifacts/living-encounter/${viewport.name}-reaction.png`, fullPage: true });
    const geometry = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, bodyOverflow: getComputedStyle(document.body).overflowY }));
    expect(geometry.overflow).toBeLessThanOrEqual(1);
    expect(geometry.bodyOverflow).not.toBe("hidden");
    expect(errors).toEqual([]);
  });
}

test("browser Back restores the Pokedex scroll state", async ({ page }) => {
  await page.goto("/pokedex", { waitUntil: "domcontentloaded" });
  await expect(page.locator('a[href="/pokedex/25"]').first()).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, Math.min(700, document.documentElement.scrollHeight - innerHeight)));
  const restoredY = await page.evaluate(() => scrollY);
  await page.locator('a[href="/pokedex/25"]').first().click();
  await expect(page.getByRole("region", { name: "Living Encounter" })).toBeVisible();
  await page.goBack({ waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/pokedex$/);
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(restoredY);
});

test("reduced motion and data saver produce a stable quiet encounter", async ({ browser }) => {
  const reduced = await browser.newPage({ reducedMotion: "reduce" });
  await reduced.goto("/pokedex/25", { waitUntil: "networkidle" });
  const encounter = reduced.getByRole("region", { name: "Living Encounter" });
  const before = await encounter.evaluate((node) => getComputedStyle(node).getPropertyValue("--encounter-x"));
  await reduced.mouse.move(380, 200);
  await reduced.waitForTimeout(200);
  expect(await encounter.evaluate((node) => getComputedStyle(node).getPropertyValue("--encounter-x"))).toBe(before);
  await reduced.close();

  const saver = await browser.newPage();
  await saver.addInitScript(() => Object.defineProperty(navigator, "connection", { configurable: true, value: { saveData: true } }));
  await saver.goto("/pokedex/25", { waitUntil: "networkidle" });
  await expect(saver.getByRole("region", { name: "Living Encounter" })).toHaveAttribute("data-particles", "0");
  await expect(saver.getByRole("button", { name: /audio unavailable in data saver/i })).toBeDisabled();
  await saver.close();
});

test("twenty client-side route entries release listeners and animation owners", async ({ page }) => {
  await page.goto("/pokedex", { waitUntil: "networkidle" });
  const runtime = () => page.evaluate(() => (window as typeof window & { __livingEncounterRuntime?: { owners: number; listeners: number; reactions: number } }).__livingEncounterRuntime ?? { owners: 0, listeners: 0, reactions: 0 });
  expect(await runtime()).toEqual({ owners: 0, listeners: 0, reactions: 0 });
  for (let index = 0; index < 20; index += 1) {
    await page.locator('a[href="/pokedex/25"]').first().click();
    await expect(page.getByRole("region", { name: "Living Encounter" })).toHaveCount(1);
    await expect.poll(runtime).toEqual({ owners: 1, listeners: 1, reactions: 0 });
    await page.getByRole("button", { name: /react with/i }).click();
    await expect.poll(runtime).toEqual({ owners: 1, listeners: 1, reactions: 1 });
    await page.goBack({ waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/pokedex$/);
    await expect.poll(runtime).toEqual({ owners: 0, listeners: 0, reactions: 0 });
    await expect(page.locator("canvas")).toHaveCount(0);
  }
});
