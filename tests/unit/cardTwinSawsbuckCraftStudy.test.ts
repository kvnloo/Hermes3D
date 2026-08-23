import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

type Piece = {
  id: string;
  depthRank: number;
  sourceRegion: { bounds: number[]; owns: string };
  occludes?: string[];
  occludedBy?: string[];
  donorRestoration: string;
  cutBoundary: string;
  edgeInspection: string[];
  completeness: { requiredAnchors: number[][]; requiredExtremityGroups?: string[]; borderMarginPx?: number };
  assemblyDestination: string;
  zMm: number;
};

type Plan = {
  status: string;
  coordinateSpace: { width: number; height: number };
  pieces: Piece[];
  occlusionEdges: [string, string][];
  completenessGates: Record<string, string>;
  gates: Record<string, string>;
};

const plan = JSON.parse(
  readFileSync(join(process.cwd(), "config/cardtwin/sawsbuck-tef-166-occlusion-plan.json"), "utf8"),
) as Plan;

describe("Sawsbuck pre-cut CRAFT-STUDY contract", () => {
  it("passes planning before cut while keeping assembly behind Kevin HITL", () => {
    expect(plan.status).toBe("CRAFT_STUDY_PASSED_CUT_AUTHORIZED");
    expect(plan.gates).toMatchObject({
      craftStudy: "PASS",
      depthPlan: "PASS_BEFORE_CUT",
      cutMasks: "NOT_AUTHORED_BY_THIS_TASK",
      assembly: "BLOCKED_PENDING_KEVIN_CUTOUT_APPROVAL",
    });
  });

  it("defines a complete, stable, strictly depth-ranked piece inventory", () => {
    expect(plan.pieces).toHaveLength(10);
    expect(plan.pieces.map(({ id }) => id)).toEqual([
      "saw-r00-backing-datum",
      "saw-r01-far-pink-grove",
      "saw-r02-far-green-grove",
      "saw-r03-mid-warm-grove",
      "saw-r04-ground-flora",
      "saw-r05-body-rear",
      "saw-r06-antler-crown",
      "saw-r07-body-forward",
      "saw-r08-near-flora",
      "saw-r09-print-identity-frame",
    ]);
    expect(plan.pieces.map(({ depthRank }) => depthRank)).toEqual([...Array(10).keys()]);
    expect(new Set(plan.pieces.map(({ id }) => id)).size).toBe(plan.pieces.length);
    for (const [index, piece] of plan.pieces.entries()) {
      expect(piece.sourceRegion.bounds).toHaveLength(4);
      expect(piece.sourceRegion.owns.length).toBeGreaterThan(10);
      expect(piece.occludes?.length || piece.occludedBy?.length).toBeGreaterThan(0);
      expect(piece.donorRestoration.length).toBeGreaterThan(10);
      expect(piece.cutBoundary.length).toBeGreaterThan(10);
      expect(piece.edgeInspection.length).toBeGreaterThan(0);
      expect(piece.completeness.requiredAnchors.length).toBeGreaterThan(0);
      expect(piece.assemblyDestination).toContain("@z");
      if (index > 0) expect(piece.zMm).toBeGreaterThan(plan.pieces[index - 1].zMm);
    }
  });

  it("keeps every graph edge acyclic and back-to-front", () => {
    const rank = new Map(plan.pieces.map((piece) => [piece.id, piece.depthRank]));
    const ids = new Set(rank.keys());
    for (const [behind, occluder] of plan.occlusionEdges) {
      expect(ids.has(behind)).toBe(true);
      expect(ids.has(occluder)).toBe(true);
      expect(rank.get(behind)!).toBeLessThan(rank.get(occluder)!);
    }
  });

  it("fails closed on fragile feet, antlers, ears, chest and foliage", () => {
    const fragile = new Set(
      plan.pieces.flatMap(({ completeness }) => completeness.requiredExtremityGroups ?? []),
    );
    for (const required of [
      "left-hind-hoof",
      "right-hind-hoof",
      "left-front-hoof",
      "right-front-hoof",
      "left-antler-tip",
      "center-antler-tip",
      "right-antler-tip",
      "left-ear-tip",
      "right-ear-tip",
      "chest-ruff-tips",
      "yellow-stalk-tip",
      "purple-petal-tips",
    ]) {
      expect(fragile.has(required), `missing extremity gate: ${required}`).toBe(true);
    }
    for (const piece of plan.pieces.filter(({ completeness }) => completeness.requiredExtremityGroups)) {
      expect(piece.completeness.requiredAnchors.length).toBeGreaterThanOrEqual(3);
      expect(piece.completeness.borderMarginPx ?? 2).toBeGreaterThanOrEqual(2);
    }
    expect(plan.completenessGates.failureMode).toContain("abort generation");
    expect(plan.completenessGates.recomposition).toContain("equals 0");
  });

  it("keeps all source coordinates inside the canonical image", () => {
    for (const piece of plan.pieces) {
      const [x, y, width, height] = piece.sourceRegion.bounds;
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(x + width).toBeLessThanOrEqual(plan.coordinateSpace.width);
      expect(y + height).toBeLessThanOrEqual(plan.coordinateSpace.height);
      for (const [anchorX, anchorY] of piece.completeness.requiredAnchors) {
        expect(anchorX).toBeGreaterThanOrEqual(x);
        expect(anchorX).toBeLessThan(x + width);
        expect(anchorY).toBeGreaterThanOrEqual(y);
        expect(anchorY).toBeLessThan(y + height);
      }
    }
  });
});
