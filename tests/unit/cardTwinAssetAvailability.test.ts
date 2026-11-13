import { describe, expect, it } from "vitest";
import { cardTwinAssetsAvailable } from "@/features/cardtwin/cardTwinAssetAvailability";
import type { CardTwinCard } from "@/features/living-museum/exhibits/pokemon-cards/cardTwinCatalog";

const card: CardTwinCard = {
  id: "test-card",
  name: "Test",
  printing: "1/1",
  set: "Test Set",
  accent: "#fff",
  canonical: "/exhibits/pokemon-cards/test-card/canonical.png",
  hiddenFill: "/exhibits/pokemon-cards/test-card/layers/hidden.png",
  layers: [{ id: "hero", label: "Hero", depthMm: 1, texture: "/exhibits/pokemon-cards/test-card/layers/hero.png" }],
};

describe("cardTwinAssetsAvailable", () => {
  it("returns true only when every viewer texture is present", () => {
    const present = new Set([
      "public/exhibits/pokemon-cards/test-card/canonical.png",
      "public/exhibits/pokemon-cards/test-card/layers/hidden.png",
      "public/exhibits/pokemon-cards/test-card/layers/hero.png",
    ]);
    expect(cardTwinAssetsAvailable(card, (path) => present.has(path))).toBe(true);
    present.delete("public/exhibits/pokemon-cards/test-card/layers/hidden.png");
    expect(cardTwinAssetsAvailable(card, (path) => present.has(path))).toBe(false);
  });

  it("rejects non-public asset paths instead of probing outside the asset root", () => {
    expect(cardTwinAssetsAvailable({ ...card, hiddenFill: "/../secret.png" }, () => true)).toBe(false);
  });
});
