import { expect, test } from "@playwright/test";

const exhibitUrl = "/exhibits/pokemon-cards?evidence=1";

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
    cards.map((card) => ({ width: card.getBoundingClientRect().width, height: card.getBoundingClientRect().height })),
  );
  for (const box of cardBoxes) {
    expect(box.width).toBeGreaterThan(82);
    expect(box.height).toBeGreaterThan(116);
  }

  const hero = await exhibit.locator('[data-testid="exhibit-hero"] strong').boundingBox();
  const controls = await exhibit.locator('[data-testid="exhibit-controls"]').boundingBox();
  expect(hero).not.toBeNull();
  expect(controls).not.toBeNull();
  expect((hero?.y ?? 0) + (hero?.height ?? 0)).toBeLessThan(controls?.y ?? 0);
});

test("scene has bounded luminance and contrast", async ({ page }) => {
  const metrics = await page.locator('[data-testid="pokemon-cards-exhibit-active"]').evaluate((node) => {
    const style = getComputedStyle(node);
    const card = node.querySelector<HTMLElement>('[data-card-object="true"]');
    const cardStyle = card ? getComputedStyle(card) : null;
    return {
      background: style.backgroundColor,
      cardBackground: cardStyle?.backgroundColor,
      cardColor: cardStyle?.color,
    };
  });
  expect(metrics.background).not.toBe("rgb(255, 255, 255)");
  expect(metrics.background).not.toBe("rgb(0, 0, 0)");
  expect(metrics.cardBackground).not.toBe(metrics.background);
  expect(metrics.cardColor).not.toBe(metrics.cardBackground);
});

test("reduced motion disables foil animation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await expect(page.locator('[data-testid="pokemon-cards-exhibit-active"]')).toHaveAttribute("data-reduced-motion", "true");
  await expect(page.locator('[data-card-object="true"]').first()).toHaveCSS("animation-name", "none");
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
