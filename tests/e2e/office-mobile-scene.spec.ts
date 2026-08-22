import { expect, test } from "@playwright/test";

test("mobile office keeps the 3D scene readable by collapsing desktop chrome", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/office", { waitUntil: "domcontentloaded" });

  await expect(page.getByLabel("Public company directory")).toBeHidden();
  await expect(page.getByLabel("Published public Boplog projects")).toBeHidden();
  await expect(page.locator('[data-layout-panel="office-event-console"]')).toBeHidden();
  await expect(page.locator('[data-layout-panel="office-right-rail"] [role="tabpanel"]')).toBeHidden();
  await expect(page.getByRole("button", { name: /headquarters sidebar/ })).toBeVisible();
});