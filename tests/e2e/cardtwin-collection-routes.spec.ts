import { expect, test } from "@playwright/test";

for (const viewport of [{ name: "mobile", width: 390, height: 844 }, { name: "desktop", width: 1920, height: 1080 }]) {
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
}

test("Pokémon detail exposes contextual Back, evolution, and honest 3D fallback", async ({ page }) => {
  await page.goto("/pokedex/25");
  await expect(page.getByRole("button", { name: /back/i })).toBeVisible();
  await expect(page.getByText("3D model unavailable")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Evolution" })).toBeVisible();
});

test("card detail embeds exact CardTwin and fails closed for an unprocessed printing", async ({ page }) => {
  await page.goto("/cards/sm1-22");
  await expect(page.getByTestId("cardtwin-detail-embed")).toBeVisible();
  await expect(page.getByTestId("pokemon-card-webgl-stage")).toBeVisible();
  await page.goto("/cards/base1-4");
  await expect(page.getByText("CardTwin depth not available")).toBeVisible();
  await expect(page.getByTestId("cardtwin-detail-embed")).toHaveCount(0);
});