import { expect, test } from "@playwright/test";

const viewports = [
  { width: 320, height: 720 },
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 844, height: 390 },
] as const;

test.setTimeout(90_000);
test.use({ hasTouch: true, isMobile: true });

for (const viewport of viewports) {
  test(`keeps mobile actions visible and the gallery vertically scrollable at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/exhibits/pokemon-cards?view=gallery", { waitUntil: "domcontentloaded" });

    const actions = page.getByTestId("cardtwin-mobile-actions");
    await expect(actions).toBeVisible();
    const box = await actions.boundingBox();
    expect(box).not.toBeNull();
    expect((box?.y ?? Infinity) + (box?.height ?? 0)).toBeLessThanOrEqual(viewport.height);
    await expect(page.getByRole("button", { name: "Inspect fullscreen" })).toBeVisible();
    await expect(page.locator(".card-face-gallery")).toBeHidden();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(48);
    const visual = await actions.evaluate((element) => {
      const style = getComputedStyle(element);
      const stage = document.querySelector('[data-testid="pokemon-card-webgl-stage"]')?.getBoundingClientRect();
      const bounds = element.getBoundingClientRect();
      return { background: style.backgroundColor, overlapsStage: Boolean(stage && bounds.left < stage.right && bounds.right > stage.left && bounds.top < stage.bottom && bounds.bottom > stage.top) };
    });
    expect(visual.background).not.toBe("rgba(0, 0, 0, 0)");
    expect(visual.overlapsStage).toBe(false);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollHeight > innerHeight)).toBe(true);

    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    await expect.poll(() => page.evaluate(() => scrollY > 0)).toBe(true);
  });
}

test("a vertical card swipe scrolls without enabling touch parallax", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/exhibits/pokemon-cards?view=gallery", { waitUntil: "domcontentloaded" });
  const root = page.locator(".hero-cards");
  await expect(root).toHaveAttribute("data-input-preference", "auto");
  const before = await page.evaluate(() => scrollY);
  const stage = page.getByTestId("pokemon-card-webgl-stage");
  const box = await stage.boundingBox();
  await page.touchscreen.tap((box?.x ?? 0) + 20, (box?.y ?? 0) + 20);
  await page.evaluate(() => scrollBy(0, 160));
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before);
  await expect(root).toHaveAttribute("data-input-preference", "auto");
  await expect(root).not.toHaveAttribute("data-motion-source", "touch");
});

test("explicit Touch enables only the dedicated card drag region", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/exhibits/pokemon-cards?view=gallery", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("pokemon-card-webgl-stage")).toHaveAttribute("data-textures-ready", "true");
  await page.getByRole("button", { name: "Touch" }).dispatchEvent("click");
  const root = page.locator(".hero-cards");
  await expect(root).toHaveAttribute("data-input-preference", "touch");
  await expect(root).toHaveAttribute("data-motion-source", "touch");
  await expect(page.getByTestId("pokemon-card-webgl-stage")).toHaveAttribute("data-touch-parallax", "enabled");
});

test("Inspect enters fullscreen and Exit restores the scrollable gallery", async ({ page }) => {
  await page.addInitScript(() => {
    let fullscreen: Element | null = null;
    Object.defineProperty(document, "fullscreenElement", { configurable: true, get: () => fullscreen });
    Object.defineProperty(Element.prototype, "requestFullscreen", { configurable: true, value: async function (this: Element) {
      fullscreen = document.querySelector(".hero-cards");
      document.dispatchEvent(new Event("fullscreenchange"));
    } });
    Object.defineProperty(Document.prototype, "exitFullscreen", { configurable: true, value: async () => {
      fullscreen = null;
      document.dispatchEvent(new Event("fullscreenchange"));
    } });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/exhibits/pokemon-cards?view=gallery", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("pokemon-card-webgl-stage")).toHaveAttribute("data-textures-ready", "true");
  await page.evaluate(() => scrollTo(0, 180));
  const savedScroll = await page.evaluate(() => scrollY);
  await page.getByRole("button", { name: "Inspect fullscreen" }).dispatchEvent("click");
  const root = page.locator(".hero-cards");
  await expect(root).toHaveAttribute("data-fullscreen-state", "fullscreen");
  await expect(page.getByRole("button", { name: "Exit", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Exit", exact: true }).click();
  await expect(root).toHaveAttribute("data-fullscreen-state", "gallery");
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(savedScroll);
});
