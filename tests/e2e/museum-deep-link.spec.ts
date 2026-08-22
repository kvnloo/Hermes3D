import { expect, test } from "@playwright/test";
import { MUSEUM_EXHIBIT_SLUGS } from "@/features/living-museum/core/MuseumExhibitV1";
import { validatedMuseumExhibits } from "@/features/living-museum/registry";

test("fresh hard navigation deterministically activates every museum exhibit", async ({ page }) => {
  test.setTimeout(180_000);
  for (const slug of MUSEUM_EXHIBIT_SLUGS) {
    await page.goto("about:blank");
    await page.goto(`/office?room=museum&exhibit=${slug}`, { waitUntil: "domcontentloaded" });

    const gallery = page.getByRole("complementary", { name: "Living Museum gallery" });
    await expect(gallery).toBeVisible({ timeout: 15_000 });
    const title = validatedMuseumExhibits.find(({ manifest }) => manifest.slug === slug)?.manifest.title;
    await expect(gallery.getByRole("button", { name: title, exact: false })).toHaveAttribute("aria-pressed", "true");
    await expect(page).toHaveURL(new RegExp(`room=museum.*exhibit=${slug}$`));
  }
});
