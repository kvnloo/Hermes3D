import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const evidence = join(process.cwd(), "artifacts/hitl/cardtwin-final");
const cards = [
  { slug: "arcanine-sm1-22", printing: "Arcanine · Sun & Moon · 22/149" },
  { slug: "umbreon-vmax-swsh7-215", printing: "Umbreon VMAX · Evolving Skies · 215/203" },
  { slug: "leafeon-ex-sv8pt5-144", printing: "Leafeon ex · Prismatic Evolutions · 144/131" },
  { slug: "sawsbuck-tef-166", printing: "Sawsbuck · Temporal Forces · 166/162" },
] as const;
test.use({ viewport: { width: 1280, height: 720 }, video: "on" });
test.setTimeout(90_000);

test("switches Arcanine between truthful Original and approved HD Art without navigation", async ({ page }) => {
  const toggleEvidence = join(evidence, "arcanine-sm1-22", "hd-toggle");
  mkdirSync(toggleEvidence, { recursive: true });
  await page.goto("/exhibits/pokemon-cards?evidence=1&view=macro", { waitUntil: "domcontentloaded" });
  const stage = page.locator('[data-testid="pokemon-card-webgl-stage"]');
  await expect(page.getByRole("button", { name: "Original" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Original · canonical printing", { exact: true })).toBeVisible();
  const url = page.url();
  await page.screenshot({ path: join(toggleEvidence, "desktop-original.png") });

  await page.getByRole("button", { name: "HD Art" }).click();
  await expect(stage).toHaveAttribute("data-art-mode", "hd");
  await expect(page.getByText("HD Art · flat preview", { exact: true })).toBeVisible();
  await expect(page.getByText("Assembled front only · layered parallax unavailable", { exact: true })).toBeVisible();
  expect(page.url()).toBe(url);
  await page.screenshot({ path: join(toggleEvidence, "desktop-hd-art.png") });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: join(toggleEvidence, "mobile-hd-art-390x844.png") });

  await page.reload();
  await expect(page.getByRole("button", { name: "HD Art" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: /View exact printing Umbreon/i }).click();
  await expect(page.getByRole("button", { name: "HD Art" })).toBeDisabled();
  await expect(page.getByText("HD version unavailable", { exact: true })).toBeVisible();
  await expect(stage).toHaveAttribute("data-art-mode", "original");
});

for (const [index, card] of cards.entries()) {
  test(`captures exact neutral, exploded, and mobile evidence for ${card.slug}`, async ({ page }) => {
    const cardEvidence = join(evidence, card.slug);
    mkdirSync(cardEvidence, { recursive: true });

    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/exhibits/pokemon-cards?evidence=1&view=macro", { waitUntil: "domcontentloaded" });
    const stage = page.locator('[data-testid="pokemon-card-webgl-stage"]');
    await expect(stage).toHaveAttribute("data-textures-ready", "true");
    await page.getByRole("button", { name: /view exact printing/i }).nth(index).click();
    await expect(stage).toHaveAttribute("data-card-printing", card.printing);
    await expect(stage).toHaveAttribute("data-textures-ready", "true");
    await expect(stage.locator("canvas")).toBeVisible();
    await page.waitForTimeout(500);
    await stage.screenshot({ path: join(cardEvidence, "assembled-neutral-stage.png") });
    await page.screenshot({ path: join(cardEvidence, "desktop-assembled.png"), fullPage: true });

    await page.setViewportSize({ width: 390, height: 844 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(cardEvidence, "mobile-assembled.png"), fullPage: true });

    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/exhibits/pokemon-cards?evidence=1&view=side", { waitUntil: "domcontentloaded" });
    await expect(stage).toHaveAttribute("data-textures-ready", "true");
    await page.getByRole("button", { name: /view exact printing/i }).nth(index).click();
    await expect(stage).toHaveAttribute("data-card-printing", card.printing);
    await expect(stage).toHaveAttribute("data-textures-ready", "true");
    await page.waitForTimeout(500);
    await stage.screenshot({ path: join(cardEvidence, "exploded-stage.png") });
  });

  test(`captures actual relative-plane tilt motion for ${card.slug}`, async ({ page }) => {
    const cardEvidence = join(evidence, card.slug);
    mkdirSync(cardEvidence, { recursive: true });
    const video = page.video();
    await page.goto("/exhibits/pokemon-cards?evidence=1&view=macro", { waitUntil: "domcontentloaded" });
    const stage = page.locator('[data-testid="pokemon-card-webgl-stage"]');
    await expect(stage).toHaveAttribute("data-textures-ready", "true");
    await page.getByRole("button", { name: /view exact printing/i }).nth(index).click();
    await expect(stage).toHaveAttribute("data-textures-ready", "true");
    const box = await stage.boundingBox();
    expect(box).not.toBeNull();
    const planeDepths = await stage.locator("[data-plane-z]").evaluateAll((nodes) =>
      nodes.map((node) => Number(node.getAttribute("data-plane-z"))),
    );
    expect(new Set(planeDepths.map((depth) => depth.toFixed(8))).size).toBe(planeDepths.length);
    for (let pass = 0; pass < 3; pass += 1) {
      for (const [x, y] of [[0.12, 0.15], [0.88, 0.15], [0.88, 0.85], [0.12, 0.85], [0.5, 0.5]]) {
        await page.mouse.move((box?.x ?? 0) + (box?.width ?? 1) * x, (box?.y ?? 0) + (box?.height ?? 1) * y, { steps: 24 });
        await page.waitForTimeout(1_000);
      }
    }
    await page.close();
    await video?.saveAs(join(cardEvidence, "tilt-parallax.webm"));
  });
}

test("all exact printings switch deterministically and expose real layer-relative parallax", async ({ page }) => {
  await page.goto("/exhibits/pokemon-cards?evidence=1&view=macro", { waitUntil: "domcontentloaded" });
  const stage = page.locator('[data-testid="pokemon-card-webgl-stage"]');
  const choices = page.getByRole("button", { name: /view exact printing/i });
  await expect(choices).toHaveCount(cards.length);

  for (const [index, { printing: expected }] of cards.entries()) {
    await choices.nth(index).click();
    await expect(stage).toHaveAttribute("data-card-printing", expected);
    await expect(stage).toHaveAttribute("data-textures-ready", "true");
  }

  const layerContracts = stage.locator("[data-layer-depth][data-parallax-x]");
  expect(await layerContracts.count()).toBeGreaterThanOrEqual(3);
  const box = await stage.boundingBox();
  await page.mouse.move((box?.x ?? 0) + (box?.width ?? 1) * 0.85, (box?.y ?? 0) + (box?.height ?? 1) * 0.35);
  await page.waitForTimeout(500);
  const offsets = await layerContracts.evaluateAll((nodes) => nodes.map((node) => Number(node.getAttribute("data-parallax-x"))));
  expect(new Set(offsets).size).toBeGreaterThan(1);
});

test("reveal communicates exact lookup pipeline and reduced motion settles immediately", async ({ page }) => {
  await page.goto("/exhibits/pokemon-cards?evidence=1&view=macro", { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-testid="cardtwin-reveal"]')).toHaveAttribute("data-phase", /capture|lookup|canonical|segment|assemble|ready/);
  await expect(page.locator('[data-testid="cardtwin-pipeline"] li')).toHaveCount(6);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await expect(page.locator('[data-testid="cardtwin-reveal"]')).toHaveAttribute("data-phase", "ready");
});
