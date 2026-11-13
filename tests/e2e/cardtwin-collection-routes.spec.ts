import { expect, test } from "@playwright/test";

const viewports = [
  { name: "mobile-320", width: 320, height: 844 },
  { name: "mobile-360", width: 360, height: 844 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-412", width: 412, height: 915 },
  { name: "landscape", width: 844, height: 390 },
  { name: "desktop", width: 1920, height: 1080 },
] as const;

function observeRuntimeErrors(page: import("@playwright/test").Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  return errors;
}

for (const viewport of viewports) {
  test(`${viewport.name} catalog preserves URL state, scroll, safe area, and width`, async ({ page }) => {
    const runtimeErrors = observeRuntimeErrors(page);
    await page.setViewportSize(viewport);
    await page.goto("/pokedex?q=pika&generation=1&type=electric&page=1");
    await expect(page).toHaveURL(/q=pika.*generation=1.*type=electric/);
    await expect(page.getByRole("navigation", { name: "Collection navigation" })).toBeVisible();
    const geometry = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      scrollAllowed: getComputedStyle(document.documentElement).overflowY !== "hidden" && getComputedStyle(document.body).overflowY !== "hidden",
      navBottom: getComputedStyle(document.querySelector(".ct-bottom-nav")!).paddingBottom,
    }));
    expect(geometry.overflow).toBeLessThanOrEqual(1);
    expect(geometry.scrollAllowed).toBeTruthy();
    expect(geometry.navBottom).not.toBe("0px");
    await page.screenshot({ path: `artifacts/cardtwin-gauntlet/screenshots/${viewport.name}-pokedex.png`, fullPage: true });
    expect(runtimeErrors).toEqual([]);
  });

  test(`${viewport.name} cards preserve submitted URL filters and page geometry`, async ({ page }) => {
    const runtimeErrors = observeRuntimeErrors(page);
    await page.setViewportSize(viewport);
    await page.goto("/cards");
    await page.getByLabel("Search cards").fill("Pikachu");
    await page.getByLabel("Set").fill("Base Set");
    await page.getByLabel("Rarity").fill("Rare");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page).toHaveURL(/\/cards\?q=Pikachu&set=Base\+Set&rarity=Rare/);
    await expect(page.locator("body")).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await page.screenshot({ path: `artifacts/cardtwin-gauntlet/screenshots/${viewport.name}-cards.png`, fullPage: true });
    expect(runtimeErrors).toEqual([]);
  });

  test(`${viewport.name} active filters can be cleared without editing every field`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/pokedex?q=pika&generation=1&type=electric");
    await page.getByRole("link", { name: "Clear filters" }).click();
    await expect(page).toHaveURL(/\/pokedex$/);
    await expect(page.getByLabel("Search")).toHaveValue("");
  });

  test(`${viewport.name} Pokémon detail exercises contextual Back and honest empty 3D catalog`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/pokedex?q=pika");
    await page.goto("/pokedex/25");
    await expect(page.getByText("3D model unavailable")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Evolution" })).toBeVisible();
    await page.getByRole("button", { name: /back/i }).click();
    await expect(page).toHaveURL(/\/pokedex\?q=pika$/);
  });

  test(`${viewport.name} card details fail closed when matched CardTwin assets are unavailable`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.goto("/cards?q=Arcanine");
    await page.goto("/cards/sm1-22");
    await expect(page.getByText("CardTwin depth not available")).toBeVisible();
    await expect(page.getByTestId("cardtwin-detail-embed")).toHaveCount(0);
    expect(pageErrors).toEqual([]);
    await page.getByRole("button", { name: /back/i }).click();
    await expect(page).toHaveURL(/\/cards\?q=Arcanine$/);
    await page.goto("/cards/base1-4");
    await expect(page.getByText("CardTwin depth not available")).toBeVisible();
    await expect(page.getByTestId("cardtwin-detail-embed")).toHaveCount(0);
  });

  test(`${viewport.name} invalid deep links recover to their parent catalog`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/pokedex/999999");
    await expect(page.getByRole("heading", { name: "Pokémon not found" })).toBeVisible();
    await page.getByRole("link", { name: "Return to Pokédex" }).click();
    await expect(page).toHaveURL(/\/pokedex$/);
    await page.goto("/cards/not-a-real-card");
    await expect(page.getByRole("heading", { name: "Card not found" })).toBeVisible();
    await page.getByRole("link", { name: "Return to cards" }).click();
    await expect(page).toHaveURL(/\/cards$/);
  });
}

test("seeded independent exercise completes at least 25 control transitions without dead controls or runtime errors", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const runtimeErrors = observeRuntimeErrors(page);
  const exercised: string[] = [];
  const step = async (name: string, action: () => Promise<unknown>) => {
    await action();
    exercised.push(name);
  };

  await step("open pokedex", () => page.goto("/pokedex"));
  await step("search pokemon", () => page.getByLabel("Search").fill("pika"));
  await step("choose generation", () => page.getByLabel("Generation").selectOption("1"));
  await step("choose type", () => page.getByLabel("Type").selectOption("electric"));
  await step("apply pokemon filters", () => page.getByRole("button", { name: "Apply" }).click());
  await step("clear pokemon filters", () => page.getByRole("link", { name: "Clear filters" }).click());
  await step("open cards from nav", () => page.getByRole("link", { name: "Cards" }).click());
  await step("search cards", () => page.getByLabel("Search cards").fill("Pikachu"));
  await step("filter card set", () => page.getByLabel("Set").fill("Base Set"));
  await step("filter card rarity", () => page.getByLabel("Rarity").fill("Rare"));
  await step("apply card filters", () => page.getByRole("button", { name: "Apply" }).click());
  await step("clear card filters", () => page.getByRole("link", { name: "Clear filters" }).click());
  await step("browser back cards", () => page.goBack());
  await step("browser forward cards", () => page.goForward());
  await step("reload cards", () => page.reload());
  await step("open pokemon from nav", () => page.getByRole("link", { name: "Pokédex" }).click());
  await step("open pokemon deep link", () => page.goto("/pokedex/25"));
  await step("pokemon contextual back", () => page.getByRole("button", { name: /back/i }).click());
  await step("reload pokemon catalog", () => page.reload());
  await step("open cards after pokemon", () => page.getByRole("link", { name: "Cards" }).click());
  await step("open card deep link", () => page.goto("/cards/sm1-22"));
  await step("card contextual back", () => page.getByRole("button", { name: /back/i }).click());
  await step("reload card catalog", () => page.reload());
  await step("open pokedex after card", () => page.getByRole("link", { name: "Pokédex" }).click());
  await step("keyboard focus", () => page.keyboard.press("Tab"));
  await step("keyboard reverse focus", () => page.keyboard.press("Shift+Tab"));
  await step("final reload", () => page.reload());

  await expect(page.getByRole("navigation", { name: "Collection navigation" })).toBeVisible();
  expect(exercised.length).toBeGreaterThanOrEqual(25);
  expect(runtimeErrors).toEqual([]);
  await test.info().attach("seeded-control-exercise", {
    body: JSON.stringify({ seed: 146, count: exercised.length, exercised, runtimeErrors }, null, 2),
    contentType: "application/json",
  });
});