import { describe, expect, it } from "vitest";

import { premiumCardConstructions } from "@/features/living-museum/exhibits/pokemon-cards/constructions";

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
