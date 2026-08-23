import { expect, test } from "@playwright/test";

const viewports = [{ name: "mobile", width: 390, height: 844 }, { name: "desktop", width: 1920, height: 1080 }] as const;

for (const viewport of viewports) {
  test(`${viewport.name} catalog preserves URL state, scroll, safe area, and width`, async ({ page }) => {
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
  });

  test(`${viewport.name} cards preserve submitted URL filters and page geometry`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/cards");
    await page.getByLabel("Search cards").fill("Pikachu");
    await page.getByLabel("Set").fill("Base Set");
    await page.getByLabel("Rarity").fill("Rare");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page).toHaveURL(/\/cards\?q=Pikachu&set=Base\+Set&rarity=Rare/);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
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

  test(`${viewport.name} card details exercise Back and exact CardTwin available/unavailable states`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/cards?q=Arcanine");
    await page.goto("/cards/sm1-22");
    await expect(page.getByTestId("cardtwin-detail-embed")).toBeVisible();
    await expect(page.getByTestId("pokemon-card-webgl-stage")).toBeVisible();
    await page.getByRole("button", { name: /back/i }).click();
    await expect(page).toHaveURL(/\/cards\?q=Arcanine$/);
    await page.goto("/cards/base1-4");
    await expect(page.getByText("CardTwin depth not available")).toBeVisible();
    await expect(page.getByTestId("cardtwin-detail-embed")).toHaveCount(0);
  });
}