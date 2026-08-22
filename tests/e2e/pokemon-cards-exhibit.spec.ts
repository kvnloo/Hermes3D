import { expect, test, type Page } from "@playwright/test";

const exhibitUrl = "/exhibits/pokemon-cards?evidence=1";

async function readCanvasMetrics(page: Page) {
  const screenshot = await page.locator('[data-testid="pokemon-card-webgl-stage"] canvas').screenshot();
  return page.evaluate(async (base64) => {
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const source = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
    const sample = document.createElement("canvas");
    sample.width = 96;
    sample.height = 64;
    const context = sample.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("2D evidence sampler unavailable");
    context.drawImage(source, 0, 0, sample.width, sample.height);
    source.close();
    const pixels = context.getImageData(0, 0, sample.width, sample.height).data;
    const luminance: number[] = [];
    let nearBlack = 0;
    let nearWhite = 0;
    let brown = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      const [red, green, blue] = [pixels[index], pixels[index + 1], pixels[index + 2]];
      const value = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
      luminance.push(value);
      if (value < 12) nearBlack += 1;
      if (value > 243) nearWhite += 1;
      if (red > green * 1.15 && green > blue * 1.1 && value < 150) brown += 1;
    }
    const mean = luminance.reduce((sum, value) => sum + value, 0) / luminance.length;
    const contrast = Math.sqrt(luminance.reduce((sum, value) => sum + (value - mean) ** 2, 0) / luminance.length);
    return {
      mean,
      contrast,
      nearBlackRatio: nearBlack / luminance.length,
      nearWhiteRatio: nearWhite / luminance.length,
      brownRatio: brown / luminance.length,
    };
  }, screenshot.toString("base64"));
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto(exhibitUrl, { waitUntil: "domcontentloaded" });
});

test("evidence route mounts the card exhibit without onboarding", async ({ page }) => {
  await expect(page.locator('[data-testid="pokemon-cards-exhibit-active"]')).toBeVisible();
  await expect(page.getByRole("dialog", { name: /onboarding/i })).toHaveCount(0);
  await expect(page.getByText(/welcome to hermes3d/i)).toHaveCount(0);
  await expect(page).toHaveURL(/\/exhibits\/pokemon-cards\?evidence=1$/);
});

test("hero composition exposes nine readable evidence objects without horizontal clipping", async ({ page }) => {
  const exhibit = page.locator('[data-testid="pokemon-cards-exhibit-active"]');
  await expect(exhibit.locator('[data-card-object="true"]')).toHaveCount(9);

  const cardBoxes = await exhibit.locator('[data-card-object="true"]').evaluateAll((cards) =>
    cards.map((card) => {
      const { x, y, width, height } = card.getBoundingClientRect();
      return { x, y, width, height };
    }),
  );
  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  for (const box of cardBoxes) {
    expect(box.width).toBeGreaterThan(82);
    expect(box.height).toBeGreaterThan(34);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport?.width ?? 0);

  }

  const hero = await exhibit.locator('[data-testid="exhibit-hero"] strong').boundingBox();
  expect(hero).not.toBeNull();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport?.width ?? 0);
});

test("rendered WebGL pixels reject blank white, black, and brown output", async ({ page }) => {
  await expect(page.locator('[data-testid="pokemon-card-webgl-stage"] canvas')).toBeVisible();
  await expect(page.locator('[data-testid="pokemon-card-webgl-stage"]')).toHaveAttribute("data-textures-ready", "true");
  await page.waitForTimeout(250);
  const metrics = await readCanvasMetrics(page);
  expect(metrics.mean).toBeGreaterThan(28);
  expect(metrics.mean).toBeLessThan(210);
  expect(metrics.contrast).toBeGreaterThan(10);
  expect(metrics.nearBlackRatio).toBeLessThan(0.72);
  expect(metrics.nearWhiteRatio).toBeLessThan(0.28);
  expect(metrics.brownRatio).toBeLessThan(0.62);
});

for (const viewport of [
  { name: "desktop", width: 1920, height: 1080 },
  { name: "mobile", width: 390, height: 844 },
]) {
  test(`${viewport.name} evidence framing keeps all nine cards in bounds`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto(exhibitUrl, { waitUntil: "domcontentloaded" });
    const boxes = await page.locator('[data-card-object="true"]').evaluateAll((cards) => cards.map((card) => {
      const { x, y, width, height } = card.getBoundingClientRect();
      return { x, y, width, height };
    }));
    expect(boxes).toHaveLength(9);
    for (const box of boxes) {
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
    }
  });
}

test("reduced motion disables foil animation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await expect(page.locator('[data-testid="pokemon-cards-exhibit-active"]')).toHaveAttribute("data-reduced-motion", "true");
  await expect(page.locator('[data-card-object="true"]').first()).toHaveCSS("animation-name", "none");
});

test("inspection camera advertises a deliberate transition and reduced motion disables it", async ({ page }) => {
  const stage = page.locator('[data-testid="pokemon-card-webgl-stage"]');
  await expect(stage).toHaveAttribute("data-view", "gallery");
  await page.goto(`${exhibitUrl}&view=macro`, { waitUntil: "domcontentloaded" });
  await expect(stage).toHaveAttribute("data-camera-transition", "settled");
  await expect(stage).toHaveAttribute("data-camera-anchor", "arcanine-sm1-22-inspection");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await expect(stage).toHaveAttribute("data-camera-transition", "instant");
});

test("hero construction is real WebGL geometry with semantic layer depth", async ({ page }) => {
  const stage = page.locator('[data-testid="pokemon-card-webgl-stage"]');
  await expect(stage.locator("canvas")).toBeVisible();
  await expect(stage).toHaveAttribute("data-renderer", "three-webgl");
  await expect(stage.locator("[data-layer-depth]")).toHaveCount(4);
  const depths = await stage.locator("[data-layer-depth]").evaluateAll((nodes) =>
    nodes.map((node) => Number(node.getAttribute("data-layer-depth"))),
  );
  expect(depths).toEqual([0, 1.5, 2.6, 3.8]);
  await expect(stage).toHaveAttribute("data-card-shell", "beveled-physical-slab");
  await expect(stage).toHaveAttribute("data-display-furniture", "museum-plinth");
  await expect(stage).toHaveAttribute("data-lighting-rig", "key-fill-rim");
  await expect(stage).toHaveAttribute("data-foil-response", "restrained-iridescent");
});

test("reduced motion preserves the assembled inspection composition", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`${exhibitUrl}&view=macro`, { waitUntil: "domcontentloaded" });
  const stage = page.locator('[data-testid="pokemon-card-webgl-stage"]');
  await expect(stage).toHaveAttribute("data-static-composition", "assembled-readable");
  await expect(stage).toHaveAttribute("data-camera-transition", "instant");
  await expect(stage).toHaveAttribute("data-foil-motion", "disabled");
});

test("macro and side evidence modes isolate the deep construction", async ({ page }) => {
  await page.goto(`${exhibitUrl}&view=macro`, { waitUntil: "domcontentloaded" });
  const stage = page.locator('[data-testid="pokemon-card-webgl-stage"]');
  await expect(stage).toHaveAttribute("data-view", "macro");
  await expect(stage).toHaveAttribute("data-camera-framing", "inspection-fit");
  await page.goto(`${exhibitUrl}&view=side`, { waitUntil: "domcontentloaded" });
  await expect(stage).toHaveAttribute("data-view", "side");
});
