import { describe, expect, it } from "vitest";
import {
  CARD_TWIN_ART_DEFAULT,
  loadCardTwinArtMode,
  resolveCardTwinArt,
  saveCardTwinArtMode,
} from "@/features/living-museum/exhibits/pokemon-cards/cardTwinArtMode";
import { CARD_TWIN_CARDS } from "@/features/living-museum/exhibits/pokemon-cards/cardTwinCatalog";

function memoryStorage(seed: Record<string, string> = {}) {
  const values = new Map(Object.entries(seed));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

describe("CardTwin Original and HD Art selection", () => {
  it("defaults every exact printing to Original", () => {
    const storage = memoryStorage();
    expect(loadCardTwinArtMode(storage, "arcanine-sm1-22")).toBe(CARD_TWIN_ART_DEFAULT);
  });

  it("persists HD preference separately for each exact printing", () => {
    const storage = memoryStorage();
    saveCardTwinArtMode(storage, "arcanine-sm1-22", "hd");
    expect(loadCardTwinArtMode(storage, "arcanine-sm1-22")).toBe("hd");
    expect(loadCardTwinArtMode(storage, "umbreon-vmax-swsh7-215")).toBe("original");
  });

  it("maps Arcanine only to its approved audited C100 derivative", () => {
    const arcanine = CARD_TWIN_CARDS.find((card) => card.id === "arcanine-sm1-22")!;
    expect(resolveCardTwinArt(arcanine, "hd")).toMatchObject({
      mode: "hd",
      image: "/exhibits/pokemon-cards/arcanine-sm1-22/derivatives/approved-hd-art.png",
      model: "RealESRGAN_x4plus_anime_6B",
      outputSha256: "b805c5a9495ee805a3df2e0db8aad622586d1c71ac6b52a302943c8e2a49e7f6",
    });
  });

  it("fails closed to canonical pixels when the exact printing has no approved derivative", () => {
    const umbreon = CARD_TWIN_CARDS.find((card) => card.id === "umbreon-vmax-swsh7-215")!;
    expect(resolveCardTwinArt(umbreon, "hd")).toEqual({ mode: "original", image: umbreon.canonical });
  });
});
