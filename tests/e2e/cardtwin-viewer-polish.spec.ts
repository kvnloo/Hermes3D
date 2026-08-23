import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const evidence = join(process.cwd(), "artifacts/hitl/cardtwin-viewer-polish");

const sizes = [
  { width: 320, height: 720 },
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 844, height: 390 },
  { width: 1280, height: 720 },
  { width: 1920, height: 1080 },
] as const;

test.setTimeout(90_000);

test("uses one printing selector and keeps provenance in a collapsed Details drawer", async ({ page }) => {
  await page.goto("/exhibits/pokemon-cards?view=gallery", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("navigation", { name: "Exact printing selection" })).toHaveCount(1);
  await expect(page.locator(".card-face-gallery, .study-strip")).toHaveCount(0);
  const details = page.getByRole("group", { name: "Details" });
  await expect(details).toBeVisible();
  await expect(details).not.toHaveAttribute("open", "");
  await details.locator("summary").click();
  await expect(page.getByText("Candidate assembly", { exact: true })).toBeVisible();
  await expect(page.getByText("Awaiting Kevin HITL", { exact: true })).toBeVisible();
});

for (const size of sizes) {
  test(`keeps the premium viewer bounded at ${size.width}x${size.height}`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.goto("/exhibits/pokemon-cards?view=gallery", { waitUntil: "domcontentloaded" });
    await expect(page.locator('[data-testid="pokemon-card-webgl-stage"][data-textures-ready="true"]')).toBeVisible();

    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(size.width);
    const stage = await page.getByTestId("pokemon-card-webgl-stage").boundingBox();
    const actions = await page.getByTestId("cardtwin-mobile-actions").boundingBox();
    expect(stage).not.toBeNull();
    expect(actions).not.toBeNull();
    const overlaps = Boolean(stage && actions && actions.x < stage.x + stage.width && actions.x + actions.width > stage.x && actions.y < stage.y + stage.height && actions.y + actions.height > stage.y);
    expect(overlaps).toBe(false);
    expect(actions?.height ?? 0).toBeGreaterThanOrEqual(48);
    if ((size.width === 390 && size.height === 844) || size.width === 844 || size.width === 1920) {
      mkdirSync(evidence, { recursive: true });
      await page.screenshot({ path: join(evidence, `${size.width}x${size.height}.png`), fullPage: size.width !== 844 });
    }
  });
}

test("exposes grouped display and input controls with truthful status", async ({ page }) => {
  await page.goto("/exhibits/pokemon-cards?view=gallery", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("group", { name: "Display" })).toBeVisible();
  await expect(page.getByRole("group", { name: "Input" })).toBeVisible();
  await expect(page.getByRole("status")).toContainText(/Auto|Gyro active|Touch fallback|Unavailable/);
});

test("restores focus to the fullscreen trigger after Exit", async ({ page }) => {
  await page.goto("/exhibits/pokemon-cards?view=gallery", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("pokemon-card-webgl-stage")).toHaveAttribute("data-textures-ready", "true");
  await page.locator(".hero-cards").evaluate((root) => {
    Object.defineProperty(document, "fullscreenElement", { configurable: true, get: () => root.getAttribute("data-fullscreen-mock") === "active" ? root : null });
    Object.defineProperty(root, "requestFullscreen", { configurable: true, value: async () => {
      root.setAttribute("data-fullscreen-mock", "active");
    } });
    Object.defineProperty(document, "exitFullscreen", { configurable: true, value: async () => {
      root.removeAttribute("data-fullscreen-mock");
      document.dispatchEvent(new Event("fullscreenchange"));
    } });
  });
  const inspect = page.getByRole("button", { name: "Inspect fullscreen" });
  await inspect.focus();
  await inspect.click();
  await page.locator(".hero-cards").evaluate((root) => root.setAttribute("data-fullscreen-mock", "active"));
  await page.evaluate(() => document.dispatchEvent(new Event("fullscreenchange")));
  const exit = page.getByRole("button", { name: "Exit" });
  await expect(exit).toBeVisible();
  await exit.click();
  await expect(inspect).toBeFocused();
});
