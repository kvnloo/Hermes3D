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
    await page.mouse.move(viewport.width - 10, viewport.height / 3);
    await page.waitForTimeout(250);
    const after = await encounter.evaluate((node) => getComputedStyle(node).getPropertyValue("--encounter-x"));
    expect(after).not.toBe(before);
    const creature = page.getByRole("button", { name: /react with/i });
    const frameA = await creature.screenshot();
    await page.waitForTimeout(350);
    const frameB = await creature.screenshot();
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
