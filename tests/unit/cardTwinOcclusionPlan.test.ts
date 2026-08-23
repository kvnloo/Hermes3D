import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const planPath = join(root, "public/exhibits/pokemon-cards/arcanine-sm1-22/derivatives/occlusion-plan.json");

describe("Arcanine pre-generation occlusion plan", () => {
  it("records the approved eight-plane physical depth order without splitting the far background", () => {
    const plan = JSON.parse(readFileSync(planPath, "utf8"));
    expect(plan.canonical).toEqual({
      path: "source/arcanine-sm1-22.png",
      sha256: "763abeb960a5c5e362bf49b6e4e1210b8b3d6a483384a85de372d19ea848ed1c",
      width: 734,
      height: 1024,
      mutable: false,
    });
    expect(plan.status).toBe("APPROVED_FOR_ARCANINE_BENCHMARK");
    expect(plan.components.length).toBe(8);
    expect(new Set(plan.components.map((component: { id: string }) => component.id)).size).toBe(8);
    expect(plan.components.map((component: { semanticGroup: string }) => component.semanticGroup)).toEqual([
      "outer-frame",
      "far-background",
      "midground-cliff",
      "character/hero",
      "midground-seed-puffs-wind-streaks",
      "foreground-foliage",
      "art-border-caption-bar",
      "card-body-ui-text",
    ]);
    for (const component of plan.components) {
      expect(component).toEqual(expect.objectContaining({
        id: expect.stringMatching(/^arc-r\d{2}-[a-z-]+$/),
        semanticGroup: expect.any(String),
        depthRank: expect.any(Number),
        parentOccluder: expect.any(String),
        registrationAnchor: expect.objectContaining({ coordinateSpace: "canonical-pixels", x: expect.any(Number), y: expect.any(Number) }),
        confidence: expect.stringMatching(/^(high|medium|low)$/),
      }));
    }
  });

  it("permits only the approved Arcanine benchmark while boundaries remain gated", () => {
    const plan = JSON.parse(readFileSync(planPath, "utf8"));
    expect(plan.gates.depthPlan).toBe("PASS");
    expect(plan.gates.boundary).toBe("REVIEW_REQUIRED");
    expect(plan.fluxGenerationAllowed).toBe(true);
    expect(plan.allowedScope).toBe("arcanine-benchmark-only");
    expect(plan.occlusionGraph.every((edge: { behind: string; occludedBy: string }) => edge.behind !== edge.occludedBy)).toBe(true);
  });
});
