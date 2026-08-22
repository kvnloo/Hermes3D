import { expect, test, type Locator, type Page } from "@playwright/test";

type Rect = { x: number; y: number; width: number; height: number };
const viewports = [{ width: 1920, height: 1080 }, { width: 1440, height: 900 }, { width: 390, height: 844 }] as const;
const panelNames = ["museum-bar", "museum-arrival", "office-right-rail", "office-chat-control"] as const;

function overlap(a: Rect, b: Rect) {
  return Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x))
    * Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
}

function gap(a: Rect, b: Rect) {
  if (overlap(a, b) > 0) return -1;
  const horizontal = Math.max(a.x, b.x) - Math.min(a.x + a.width, b.x + b.width);
  const vertical = Math.max(a.y, b.y) - Math.min(a.y + a.height, b.y + b.height);
  return Math.max(horizontal, vertical);
}

async function bounds(locator: Locator) {
  await expect(locator).toBeVisible();
  return await locator.boundingBox() as Rect;
}

async function openFixture(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await page.goto("/museum/layout-contract", { waitUntil: "networkidle" });
  await expect(page.getByRole("complementary", { name: "Living Museum gallery" })).toBeVisible();
}

for (const viewport of viewports) {
  test(`museum chrome keeps a compact collision-free scene at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await openFixture(page, viewport.width, viewport.height);

    await expect(page.locator('[data-layout-panel="office-left-panels"]')).toBeHidden();
    await expect(page.locator('[data-layout-panel="office-event-console"]')).toBeHidden();

    const panels = Object.fromEntries(await Promise.all(panelNames.map(async (name) => [name, await bounds(page.locator(`[data-layout-panel="${name}"]`))]))) as Record<(typeof panelNames)[number], Rect>;
    const { "museum-bar": bar, "museum-arrival": arrival } = panels;
    const area = viewport.width * viewport.height;

    for (let index = 0; index < panelNames.length; index += 1) {
      const name = panelNames[index];
      const rect = panels[name];
      expect(rect.x, `${name} left edge`).toBeGreaterThanOrEqual(0);
      expect(rect.y, `${name} top edge`).toBeGreaterThanOrEqual(0);
      expect(rect.x + rect.width, `${name} right edge`).toBeLessThanOrEqual(viewport.width);
      expect(rect.y + rect.height, `${name} bottom edge`).toBeLessThanOrEqual(viewport.height);
      for (const otherName of panelNames.slice(index + 1)) {
        expect(overlap(rect, panels[otherName]), `${name}/${otherName} collision`).toBe(0);
        expect(gap(rect, panels[otherName]), `${name}/${otherName} gap`).toBeGreaterThanOrEqual(16);
      }
    }

    expect(bar.width * bar.height / area, "museum bar density").toBeLessThanOrEqual(0.15);
    expect(arrival.width * arrival.height / area, "arrival density").toBeLessThanOrEqual(0.28);
    expect(1 - (bar.width * bar.height + arrival.width * arrival.height) / area, "unobstructed scene").toBeGreaterThanOrEqual(0.55);
    expect(bar.x % 8, "bar follows 8px grid").toBe(0);
    expect(bar.y % 8, "bar follows 8px grid").toBe(0);
    expect(arrival.x % 8, "arrival follows 8px grid").toBe(0);
    expect(arrival.y % 8, "arrival follows 8px grid").toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

    const zIndices = await Promise.all(panelNames.map((name) => page.locator(`[data-layout-panel="${name}"]`).evaluate((element) => Number(getComputedStyle(element).zIndex))));
    expect(zIndices).toEqual([40, 40, 20, 30]);
    await expect(page.getByRole("button", { name: "Office", exact: true })).toBeInViewport();
    await expect(page).toHaveScreenshot(`museum-layout-${viewport.width}x${viewport.height}.png`, { animations: "disabled", maxDiffPixelRatio: 0.01 });
    await page.screenshot({ path: `artifacts/hitl/office-museum-repair/green/museum-${viewport.width}x${viewport.height}.png` });
  });
}