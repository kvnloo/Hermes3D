import { describe, expect, it } from "vitest";
import { parseMuseumExhibitV1 } from "../../../core/MuseumExhibitV1";
import { selectCallOfDutyLod } from "../ExhibitScene";
import { callOfDutyManifest } from "../manifest";

const COPIED_MEDIA = /\.(?:glb|gltf|fbx|obj|png|jpe?g|webp|gif|mp3|wav|ogg|mp4|mov|woff2?|ttf|otf)$/i;

describe("call-of-duty exhibit", () => {
  it("parses the exact contract and rejects private additions", () => {
    expect(parseMuseumExhibitV1(callOfDutyManifest)).toBe(callOfDutyManifest);
    expect(() => parseMuseumExhibitV1({ ...callOfDutyManifest, internalTaskId: "private" })).toThrow(/unknown fields: internalTaskId/);
  });
  it("is public-safe, unofficial and claim-free", () => {
    expect(callOfDutyManifest.trademarkNotice).toMatch(/Unofficial fan project/i);
    expect(callOfDutyManifest.trademarkNotice).toMatch(/not affiliated/i);
    expect(callOfDutyManifest.publicProjection.verifiedMilestone).toBeNull();
    expect(JSON.stringify(callOfDutyManifest)).not.toMatch(/(?:\/home\/|\/Users\/|\.env|kanban|boplog|obsidian|gateway event)/i);
  });
  it("uses only original primitives with zero media bytes", () => {
    expect(callOfDutyManifest.assets).toEqual([]);
    expect(callOfDutyManifest.assets.some((asset) => COPIED_MEDIA.test(asset.path))).toBe(false);
    expect(callOfDutyManifest.budget.maxInitialBytes).toBe(0);
    expect(callOfDutyManifest.budget.maxDeferredBytes).toBe(0);
    expect(callOfDutyManifest.budget.maxTextures).toBe(0);
  });
  it("authors five distinct anchors and an approach search target", () => {
    const anchors = Object.values(callOfDutyManifest.cameraAnchors);
    expect(anchors).toHaveLength(5);
    expect(new Set(anchors.map((anchor) => anchor.position.join(","))).size).toBe(5);
    expect(callOfDutyManifest.search.destinationAnchor).toBe("approach");
  });
  it("keeps states and all LOD tiers within budget", () => {
    expect(Object.keys(callOfDutyManifest.states)).toEqual(["sleep", "active", "milestone"]);
    expect(callOfDutyManifest.lod.map(({ tier }) => tier)).toEqual(["hero", "near", "far", "sleep"]);
    for (const tier of callOfDutyManifest.lod) {
      expect(tier.maxTriangles).toBeLessThanOrEqual(callOfDutyManifest.budget.maxTriangles);
      expect(tier.maxDrawCalls).toBeLessThanOrEqual(callOfDutyManifest.budget.maxDrawCalls);
    }
    expect(callOfDutyManifest.lod.at(-1)?.animationHz).toBe(0);
  });
  it("handles arbitrary jumps, hysteresis and invalid distances fail-closed", () => {
    expect(selectCallOfDutyLod(8, "near")).toBe("hero");
    expect(selectCallOfDutyLod(14, "hero")).toBe("near");
    expect(selectCallOfDutyLod(26, "near")).toBe("far");
    expect(selectCallOfDutyLod(60, "near")).toBe("sleep");
    expect(selectCallOfDutyLod(48, "sleep")).toBe("far");
    expect(selectCallOfDutyLod(Number.NaN, "hero")).toBe("sleep");
  });
});
