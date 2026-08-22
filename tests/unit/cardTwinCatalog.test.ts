import { describe, expect, it } from "vitest";
import { CARD_TWIN_CARDS, getCardTwinCard } from "@/features/living-museum/exhibits/pokemon-cards/cardTwinCatalog";

describe("CardTwin viewer catalog", () => {
  it("loads all three exact printings with deterministic semantic depth order", () => {
    expect(CARD_TWIN_CARDS.map((card) => card.id)).toEqual([
      "arcanine-sm1-22",
      "umbreon-vmax-swsh7-215",
      "leafeon-ex-sv8pt5-144",
    ]);
    for (const card of CARD_TWIN_CARDS) {
      expect(card.layers.length).toBeGreaterThanOrEqual(3);
      expect(card.layers.map((layer) => layer.depthMm)).toEqual(
        [...card.layers].map((layer) => layer.depthMm).sort((a, b) => a - b),
      );
      expect(new Set(card.layers.map((layer) => layer.texture)).size).toBe(card.layers.length);
      expect(card.layers.every((layer) => layer.texture.startsWith(`/exhibits/pokemon-cards/${card.id}/layers/`))).toBe(true);
    }
  });

  it("falls back to Arcanine for an unknown printing id", () => {
    expect(getCardTwinCard("not-a-printing").id).toBe("arcanine-sm1-22");
  });
});
