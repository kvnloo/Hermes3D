import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(process.cwd(), "public/exhibits/pokemon-cards/leafeon-ex-sv8pt5-144");
const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8")) as {
  schemaVersion: number;
  ontologyVersion: string;
  printing: { name: string; setCode: string; number: string; source: string; sourceSha256: string; width: number; height: number };
  segmentation: { implementation: string; checkpointSha256: string; promptMetadata: string; promptMetadataSha256: string; manualRefinement: { rasterization: string; operations: unknown[] } };
  layers: Array<{ id: string; semantic: string; depthMm: number; mask: string; texture: string; maskSha256: string; alphaCoverage: number; sourcePixelsOnly: boolean; textureAlphaMatchesMask: boolean }>;
  invariants: { overlapPixelCount: number; uncoveredPixelCount: number; maxHoleAreaPx: number; edgeFringePx: number; borderAndTextPreserved: boolean; recompositionMaxChannelDifference: number };
  inpainting: { used: boolean; scope: string; provenance: string; overwritesCanonicalVisiblePixels: boolean; output: string; fillMask: string; fillMaskSha256: string };
  evidence: Record<string, string>;
};
const sha256 = (path: string) => createHash("sha256").update(readFileSync(path)).digest("hex");

describe("Leafeon ex PRE 144/131 semantic cut", () => {
  it("binds the exact canonical printing, dimensions, and pinned SAM2 prompt", () => {
    expect(manifest.schemaVersion).toBe(3);
    expect(manifest.ontologyVersion).toBe("cardtwin-semantic-layers/v3");
    expect(manifest.printing).toEqual(expect.objectContaining({
      name: "Leafeon ex",
      setCode: "PRE/SV8.5",
      number: "144/131",
      sourceSha256: "f00547340035daf54ba086ee1f4c6d907476ae2772030517b68605a9ebd9842f",
      width: 733,
      height: 1024,
    }));
    expect(sha256(join(root, manifest.printing.source))).toBe(manifest.printing.sourceSha256);
    expect(manifest.segmentation).toEqual(expect.objectContaining({
      implementation: "Meta SAM 2.1 image predictor",
      checkpointSha256: "7402e0d864fa82708a20fbd15bc84245c2f26dff0eb43a4b5b93452deb34be69",
    }));
    expect(sha256(join(process.cwd(), "public/exhibits/pokemon-cards", manifest.segmentation.promptMetadata))).toBe(manifest.segmentation.promptMetadataSha256);
    expect(manifest.segmentation.manualRefinement.rasterization).toBe("opencv-fillPoly-integer-even-odd");
    expect(manifest.segmentation.manualRefinement.operations.length).toBeGreaterThan(0);
  });

  it("uses three ordered visible planes with reproducible masks and exact canonical pixels", () => {
    expect(manifest.layers.map(({ semantic }) => semantic)).toEqual([
      "far-background",
      "character/hero",
      "outer-card/frame-text",
    ]);
    for (let index = 0; index < manifest.layers.length; index += 1) {
      const layer = manifest.layers[index];
      expect(layer.depthMm).toBeGreaterThan(index === 0 ? -1 : manifest.layers[index - 1].depthMm);
      expect(sha256(join(root, layer.mask))).toBe(layer.maskSha256);
      expect(readFileSync(join(root, layer.texture)).length).toBeGreaterThan(1_000);
      expect(layer.alphaCoverage).toBeGreaterThan(0);
      expect(layer.sourcePixelsOnly).toBe(true);
      expect(layer.textureAlphaMatchesMask).toBe(true);
    }
  });

  it("passes partition, border/text, hole, fringe, and exact recomposition gates", () => {
    expect(manifest.invariants).toEqual({
      overlapPixelCount: 0,
      uncoveredPixelCount: 0,
      maxHoleAreaPx: 0,
      edgeFringePx: 0,
      borderAndTextPreserved: true,
      recompositionMaxChannelDifference: 0,
    });
  });

  it("keeps disclosed inpainted fill behind the canonical visible layers", () => {
    expect(manifest.inpainting).toEqual(expect.objectContaining({
      used: true,
      scope: "hidden-background-only",
      provenance: "inpainted-hidden-fill",
      overwritesCanonicalVisiblePixels: false,
    }));
    expect(sha256(join(root, manifest.inpainting.fillMask))).toBe(manifest.inpainting.fillMaskSha256);
    expect(readFileSync(join(root, manifest.inpainting.output)).length).toBeGreaterThan(1_000);
  });

  it("records auditable contact, edge, overlap, gap, and recomposition evidence", () => {
    expect(Object.keys(manifest.evidence)).toEqual(expect.arrayContaining([
      "contactSheet",
      "heroEdgeQuality",
      "overlapLabelMap",
      "occlusionGapMap",
      "recompositionHeatmap",
    ]));
    for (const path of Object.values(manifest.evidence)) {
      expect(readFileSync(join(process.cwd(), path)).length).toBeGreaterThan(100);
    }
  });
});
