import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";


const root = join(process.cwd(), "public/exhibits/pokemon-cards/arcanine-sm1-22");
const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8")) as {
  schemaVersion: number;
  printing: { name: string; setCode: string; number: string; source: string; sourceSha256: string; width: number; height: number };
  ontologyVersion: string;
  layers: Array<{ id: string; semantic: string; depthMm: number; mask: string; texture: string; maskSha256: string; sourcePixelsOnly: boolean; textureAlphaMatchesMask: boolean }>;
  invariants: { overlapPixelCount: number; uncoveredPixelCount: number; maxHoleAreaPx: number; edgeFringePx: number; borderAndTextPreserved: boolean; recompositionMaxChannelDifference: number };
  inpainting: { used: boolean; scope: string; provenance: string; output: string; fillMask: string; fillMaskSha256: string; overwritesCanonicalVisiblePixels: boolean };
  evidence: { contactSheet: string; heroEdgeQuality: string; overlapLabelMap: string; occlusionGapMap: string; recompositionHeatmap: string };
};
const sha256 = (path: string) => createHash("sha256").update(readFileSync(path)).digest("hex");

describe("Arcanine SM1 22 exact CardTwin slice", () => {
  it("binds the exact canonical printing and source pixels", () => {
    expect(manifest.printing).toEqual(expect.objectContaining({
      name: "Arcanine",
      setCode: "SM1",
      number: "22/149",
      sourceSha256: "763abeb960a5c5e362bf49b6e4e1210b8b3d6a483384a85de372d19ea848ed1c",
      width: 734,
      height: 1024,
    }));
    expect(sha256(join(root, manifest.printing.source))).toBe(manifest.printing.sourceSha256);
  });

  it("uses four composition-driven ontology-v3 planes in strict depth order", () => {
    expect(manifest.schemaVersion).toBe(3);
    expect(manifest.ontologyVersion).toBe("cardtwin-semantic-layers/v3");
    expect(manifest.layers.map((layer) => layer.id)).toEqual(["far-background", "hero", "foreground-effects", "outer-frame-text"]);
    expect(manifest.layers.map((layer) => layer.semantic)).toEqual(["far-background", "character/hero", "foreground-effects", "outer-card/frame-text"]);
    for (let index = 1; index < manifest.layers.length; index += 1) {
      expect(manifest.layers[index].depthMm).toBeGreaterThan(manifest.layers[index - 1].depthMm);
    }
    for (const layer of manifest.layers) {
      expect(sha256(join(root, layer.mask))).toBe(layer.maskSha256);
      expect(readFileSync(join(root, layer.texture)).length).toBeGreaterThan(1_000);
    }
  });

  it("discloses hidden-only occlusion fill while exact front recomposition remains pixel-identical", () => {
    expect(manifest.inpainting).toEqual(expect.objectContaining({ used: true, scope: "hidden-background-only", provenance: "inpainted-hidden-fill", overwritesCanonicalVisiblePixels: false }));
    expect(readFileSync(join(root, manifest.inpainting.output)).length).toBeGreaterThan(1_000);
    expect(sha256(join(root, manifest.inpainting.fillMask))).toBe(manifest.inpainting.fillMaskSha256);
    expect(manifest.invariants.recompositionMaxChannelDifference).toBe(0);
  });

  it("keeps every visible texture alpha-exclusive to its semantic mask", () => {
    expect(manifest.invariants).toEqual(expect.objectContaining({ overlapPixelCount: 0, uncoveredPixelCount: 0, maxHoleAreaPx: 0, edgeFringePx: 0, borderAndTextPreserved: true }));
    for (const path of Object.values(manifest.evidence)) expect(readFileSync(join(process.cwd(), path)).length).toBeGreaterThan(100);
    for (const layer of manifest.layers) {
      expect(layer.sourcePixelsOnly).toBe(true);
      expect(layer.textureAlphaMatchesMask).toBe(true);
    }
  });
});
