import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const cardsRoot = join(process.cwd(), "public/exhibits/pokemon-cards");
const root = join(cardsRoot, "umbreon-vmax-swsh7-215");
const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8")) as {
  schemaVersion: number;
  ontologyVersion: string;
  printing: { name: string; setCode: string; number: string; source: string; sourceSha256: string; width: number; height: number };
  segmentation: { checkpointSha256: string; promptMetadata: string; promptMetadataSha256: string; manualRefinement: { operations: Array<{ op: string; reason?: string }> } };
  layers: Array<{ id: string; semantic: string; depthMm: number; mask: string; texture: string; maskSha256: string; textureSha256: string; dimensions: { width: number; height: number }; coveragePixels: number; holePixelCount: number; edgeFringePx: number; provenance: string; textureAlphaMatchesMask: boolean }>;
  invariants: { overlapPixelCount: number; uncoveredPixelCount: number; maxHoleAreaPx: number; edgeFringePx: number; borderAndTextPreserved: boolean; recompositionMaxChannelDifference: number };
  inpainting: { used: boolean; scope: string; provenance: string; overwritesCanonicalVisiblePixels: boolean; output: string; outputSha256: string; fillMask: string; fillMaskSha256: string };
  evidence: Record<string, { path: string; sha256: string }>;
};
const sha256 = (path: string) => createHash("sha256").update(readFileSync(path)).digest("hex");

describe("Umbreon VMAX SWSH7 215 deterministic CardTwin slice", () => {
  it("binds the exact canonical printing and pinned prompt provenance", () => {
    expect(manifest.schemaVersion).toBe(3);
    expect(manifest.ontologyVersion).toBe("cardtwin-semantic-layers/v3");
    expect(manifest.printing).toEqual(expect.objectContaining({
      name: "Umbreon VMAX", setCode: "SWSH7", number: "215/203",
      sourceSha256: "0588afac1c3dee4c8a039d5ff9d0cff2ec4abfbcadedbb62b573750b8f772d92",
      width: 734, height: 1024,
    }));
    expect(sha256(join(root, manifest.printing.source))).toBe(manifest.printing.sourceSha256);
    expect(sha256(join(cardsRoot, manifest.segmentation.promptMetadata))).toBe(manifest.segmentation.promptMetadataSha256);
    expect(manifest.segmentation.manualRefinement.operations).toContainEqual(expect.objectContaining({
      op: "subtract-polygons", reason: expect.stringContaining("cyan sky fragment"),
    }));
  });

  it("records four ordered, exact-pixel visible planes with reproducible hashes", () => {
    expect(manifest.layers.map((layer) => layer.semantic)).toEqual([
      "far-background", "character/hero", "foreground-effects/foliage/architecture", "outer-card/frame",
    ]);
    for (let index = 1; index < manifest.layers.length; index += 1) {
      expect(manifest.layers[index].depthMm).toBeGreaterThan(manifest.layers[index - 1].depthMm);
    }
    for (const layer of manifest.layers) {
      expect(layer.dimensions).toEqual({ width: 734, height: 1024 });
      expect(layer.coveragePixels).toBeGreaterThan(0);
      expect(layer.provenance).toBe("canonical-visible");
      expect(layer.textureAlphaMatchesMask).toBe(true);
      expect(layer.edgeFringePx).toBeLessThanOrEqual(1);
      expect(sha256(join(root, layer.mask))).toBe(layer.maskSha256);
      expect(sha256(join(root, layer.texture))).toBe(layer.textureSha256);
    }
  });

  it("is an exclusive complete partition and isolates hidden inpainted fill", () => {
    expect(manifest.invariants).toEqual(expect.objectContaining({
      overlapPixelCount: 0, uncoveredPixelCount: 0, maxHoleAreaPx: 0,
      edgeFringePx: 0, borderAndTextPreserved: true, recompositionMaxChannelDifference: 0,
    }));
    expect(manifest.inpainting).toEqual(expect.objectContaining({
      used: true, scope: "hidden-background-only", provenance: "inpainted-hidden-fill",
      overwritesCanonicalVisiblePixels: false,
    }));
    expect(sha256(join(root, manifest.inpainting.output))).toBe(manifest.inpainting.outputSha256);
    expect(sha256(join(root, manifest.inpainting.fillMask))).toBe(manifest.inpainting.fillMaskSha256);
  });

  it("hashes every inspectable evidence artifact", () => {
    expect(Object.keys(manifest.evidence)).toEqual(expect.arrayContaining([
      "assembledExact", "contactSheet", "edgeQualitySheet", "overlapLabelMap", "occlusionGapMap", "recompositionHeatmap",
    ]));
    for (const artifact of Object.values(manifest.evidence)) {
      expect(sha256(join(process.cwd(), artifact.path))).toBe(artifact.sha256);
    }
  });
});
