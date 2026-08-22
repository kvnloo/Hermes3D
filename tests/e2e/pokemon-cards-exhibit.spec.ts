import { expect, test, type Page } from "@playwright/test";

const exhibitUrl = "/exhibits/pokemon-cards?evidence=1";

type Rect = { x: number; y: number; width: number; height: number };

function intersects(a: Rect, b: Rect) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

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

test("hero composition exposes nine readable cards without overlay collision", async ({ page }) => {
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
    expect(box.height).toBeGreaterThan(116);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport?.width ?? 0);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport?.height ?? 0);
  }

  const hero = await exhibit.locator('[data-testid="exhibit-hero"] strong').boundingBox();
  const controls = await exhibit.locator('[data-testid="exhibit-controls"]').boundingBox();
  expect(hero).not.toBeNull();
  expect(controls).not.toBeNull();
  expect((hero?.y ?? 0) + (hero?.height ?? 0)).toBeLessThan(controls?.y ?? 0);
  expect(cardBoxes.some((box) => intersects(box, controls as Rect))).toBe(false);
});

test("rendered WebGL pixels reject blank white, black, and brown output", async ({ page }) => {
  await expect(page.locator('[data-testid="pokemon-card-webgl-stage"] canvas')).toBeVisible();
  await page.waitForTimeout(750);
  const metrics = await readCanvasMetrics(page);
  expect(metrics.mean).toBeGreaterThan(28);
  expect(metrics.mean).toBeLessThan(210);
  expect(metrics.contrast).toBeGreaterThan(24);
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
  await expect(stage).toHaveAttribute("data-camera-anchor", "ember-inspection");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await expect(stage).toHaveAttribute("data-camera-transition", "instant");
});

test("hero constructions are real WebGL geometry with variant depth", async ({ page }) => {
  const stage = page.locator('[data-testid="pokemon-card-webgl-stage"]');
  await expect(stage.locator("canvas")).toBeVisible();
  await expect(stage).toHaveAttribute("data-renderer", "three-webgl");
  await expect(stage.locator('[data-webgl-card="astral"]')).toHaveCount(1);
  await expect(stage.locator('[data-webgl-card="verdant"]')).toHaveCount(1);
  await expect(stage.locator('[data-webgl-card="ember"]')).toHaveCount(1);
  const depths = await stage.locator("[data-cavity-depth]").evaluateAll((nodes) =>
    nodes.map((node) => Number(node.getAttribute("data-cavity-depth"))),
  );
  expect(depths).toHaveLength(3);
  expect(depths[2]).toBeGreaterThan(depths[0]);
  expect(depths[2]).toBeGreaterThan(depths[1]);
});

test("macro and side evidence modes isolate the deep construction", async ({ page }) => {
  await page.goto(`${exhibitUrl}&view=macro`, { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-testid="pokemon-card-webgl-stage"]')).toHaveAttribute("data-view", "macro");
  await page.goto(`${exhibitUrl}&view=side`, { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-testid="pokemon-card-webgl-stage"]')).toHaveAttribute("data-view", "side");
});
