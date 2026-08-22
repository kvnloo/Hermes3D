import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const framework = join(root, "public/exhibits/pokemon-cards/framework");

const readJson = (path: string) => JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;

describe("CardTwin cutting framework contract", () => {
  it("versions a complete semantic ontology with ordering and provenance rules", () => {
    const ontology = readJson(join(framework, "ontology.v3.json")) as {
      version: string;
      normalVisiblePlaneCount: { min: number; max: number };
      classes: Array<{ id: string; required: boolean; depthBand: number }>;
      provenance: Array<{ id: string; mayAppearInVisibleTexture: boolean }>;
      constraints: { canonicalVisiblePixelsImmutable: boolean; fillAssetsSeparate: boolean };
    };
    expect(ontology.version).toBe("cardtwin-semantic-layers/v3");
    expect(ontology.normalVisiblePlaneCount).toEqual({ min: 3, max: 5 });
    expect(ontology.classes.map(({ id }) => id)).toEqual([
      "outer-card/frame",
      "far-background",
      "mid-background",
      "character/hero",
      "foreground-effects/foliage/architecture",
      "optional-text-overlay",
      "optional-foil-overlay",
    ]);
    expect(ontology.classes.filter(({ required }) => required).map(({ id }) => id)).toEqual([
      "outer-card/frame",
      "far-background",
      "character/hero",
    ]);
    expect(ontology.provenance.find(({ id }) => id === "canonical-visible")?.mayAppearInVisibleTexture).toBe(true);
    expect(ontology.provenance.filter(({ id }) => id !== "canonical-visible").every(({ mayAppearInVisibleTexture }) => !mayAppearInVisibleTexture)).toBe(true);
    expect(ontology.constraints).toEqual({ canonicalVisiblePixelsImmutable: true, fillAssetsSeparate: true });
  });

  it("checks in normalized prompts and deterministic refinement metadata for every canonical card", () => {
    for (const id of ["arcanine-sm1-22", "umbreon-vmax-swsh7-215", "leafeon-ex-sv8pt5-144"]) {
      const prompt = readJson(join(framework, "prompts", `${id}.json`)) as {
        schemaVersion: number;
        cardId: string;
        coordinateSpace: { origin: string; units: string; width: number; height: number };
        layers: Array<{ semantic: string; sam2: { boxes?: number[][]; points?: Array<{ x: number; y: number; label: number }>; segments?: unknown[] }; refinement: { operations: unknown[]; rasterization: string } }>;
      };
      expect([1, 2]).toContain(prompt.schemaVersion);
      expect(prompt.cardId).toBe(id);
      expect(prompt.coordinateSpace).toEqual(expect.objectContaining({ origin: "top-left", units: "canonical-pixels" }));
      expect(prompt.layers.length).toBeGreaterThan(0);
      for (const layer of prompt.layers) {
        const segmentCount = layer.sam2.segments?.length ?? 0;
        expect((layer.sam2.boxes?.length ?? 0) + (layer.sam2.points?.length ?? 0) + segmentCount).toBeGreaterThan(0);
        expect(layer.refinement.rasterization).toBe("opencv-fillPoly-integer-even-odd");
        expect(Array.isArray(layer.refinement.operations)).toBe(true);
      }
    }
  });

  it("fails closed unless canonical identity and pinned SAM2 inputs match", () => {
    const python = "/mnt/zer0models/project-envs/cardtwin-sam2/bin/python";
    const result = spawnSync(python, ["scripts/generate-cardtwin-layers.py", "--validate-contract"], { cwd: root, encoding: "utf8" });
    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
    expect(result.stdout).toContain("contract valid: 3 canonical cards; pinned SAM2 identity verified");
  }, 60_000);
});
