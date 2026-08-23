import { describe, expect, it } from "vitest";

import { premiumCardConstructions } from "@/features/living-museum/exhibits/pokemon-cards/constructions";
import { CARD_TWIN_CARDS } from "@/features/living-museum/exhibits/pokemon-cards/cardTwinCatalog";
import { resolvePartsSheetLayout } from "@/features/living-museum/exhibits/pokemon-cards/cardTwinPartsSheet";

describe("premium card constructions", () => {
  it("defines three rights-safe multilayer constructions with strict monotonic depth", () => {
    expect(premiumCardConstructions).toHaveLength(3);
    for (const construction of premiumCardConstructions) {
      expect(construction.rightsSafe).toBe(true);
      expect(construction.layers.length).toBeGreaterThanOrEqual(construction.minimumLayers);
      expect(construction.layers.length).toBeLessThanOrEqual(construction.maximumLayers);
      for (let index = 1; index < construction.layers.length; index += 1) {
        expect(construction.layers[index].z).toBeGreaterThan(construction.layers[index - 1].z);
        const spacing = construction.layers[index].z - construction.layers[index - 1].z;
        expect(spacing).toBeGreaterThanOrEqual(construction.layerSpacingMm[0]);
        expect(spacing).toBeLessThanOrEqual(construction.layerSpacingMm[1]);
      }
      expect(construction.aspectRatio).toBeCloseTo(63 / 88, 2);
      expect(construction.totalThicknessMm).toBeLessThanOrEqual(32);
      expect(construction.stand.contactPoints).toBeGreaterThanOrEqual(2);
      expect(construction.silhouetteClearanceMm).toBeGreaterThanOrEqual(1.5);
      expect(construction.innerFrameClearanceMm).toBeGreaterThanOrEqual(construction.foilFrame.clearanceMm);
      expect(construction.bevelMm).toBeGreaterThanOrEqual(0.6);
      expect(construction.foilFrame.clearanceMm).toBeGreaterThanOrEqual(2);
      expect(construction.materials.foil.metalness).toBeGreaterThan(construction.materials.cardstock.metalness);
      expect(construction.materials.cardstock.roughness).toBeGreaterThan(construction.materials.foil.roughness);
      expect(construction.materials.foil.channel).toBe("iridescent-foil");
      expect(construction.projectedCardWidth.desktop).toBeGreaterThanOrEqual(240);
      expect(construction.projectedCardWidth.mobile).toBeGreaterThanOrEqual(96);
    }
  });

  it("makes the fire-bird cavity deepest and spans three subject depth bands", () => {
    const [a, b, c] = premiumCardConstructions;
    expect(c.slug).toBe("emberwing-sanctuary");
    expect(c.layers.length).toBeGreaterThanOrEqual(10);
    expect(c.layers.length).toBeLessThanOrEqual(16);
    expect(c.cavityDepthMm).toBeGreaterThan(a.cavityDepthMm);
    expect(c.cavityDepthMm).toBeGreaterThan(b.cavityDepthMm);
    expect(new Set(c.subjectDepthBands).size).toBeGreaterThanOrEqual(3);
    expect(c.subjectDepthBands.every((band) => c.layers.some((layer) => layer.band === band))).toBe(true);
    expect(c.camera.near).toBeGreaterThan(0);
    expect(c.camera.near).toBeLessThan(c.camera.subjectDistance * 0.1);
    expect(c.camera.focusDistance).toBe(c.camera.subjectDistance);
  });
});

describe("Sawsbuck CardTwin craft build", () => {
  it("registers the exact Temporal Forces printing with a depth-ranked cut plan", () => {
    const sawsbuck = CARD_TWIN_CARDS.find((card) => card.id === "sawsbuck-tef-166");
    expect(sawsbuck).toMatchObject({ name: "Sawsbuck", set: "Temporal Forces", printing: "166/162" });
    expect(sawsbuck?.layers.map((layer) => layer.id)).toEqual([
      "forest-distance", "forest-midground", "body-rear", "body-forward", "antlers-foliage", "printing-frame",
    ]);
    expect(sawsbuck?.layers.map((layer) => layer.depthMm)).toEqual([0, 0.9, 1.8, 2.7, 3.6, 4.5]);
  });

  it("lays every cut piece on a non-overlapping cutting-mat grid", () => {
    const layout = resolvePartsSheetLayout(6, 3);
    expect(layout).toHaveLength(6);
    expect(new Set(layout.map(({ column, row }) => `${column}:${row}`)).size).toBe(6);
    expect(layout.at(-1)).toEqual({ column: 2, row: 1, x: 2.5, y: -1.7 });
  });
});
