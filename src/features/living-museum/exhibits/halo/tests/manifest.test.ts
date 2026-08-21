import { describe, expect, it } from "vitest";

import { parseMuseumExhibitV1 } from "../../../core/MuseumExhibitV1";
import { selectHaloLod } from "../ExhibitScene";
import { haloManifest } from "../manifest";

const COPIED_MEDIA = /\.(?:glb|gltf|fbx|obj|png|jpe?g|webp|gif|mp3|wav|ogg|mp4|mov|woff2?|ttf|otf)$/i;

describe("halo exhibit", () => {
  it("parses the exact public contract and rejects private additions", () => {
    expect(parseMuseumExhibitV1(haloManifest)).toBe(haloManifest);
    expect(() => parseMuseumExhibitV1({ ...haloManifest, privatePath: "/private" })).toThrow(
      /unknown fields: privatePath/,
    );
  });

  it("is clearly unofficial and carries no unverified milestone", () => {
    expect(haloManifest.id).toBe("museum:halo");
    expect(haloManifest.trademarkNotice).toMatch(/Unofficial fan project/i);
    expect(haloManifest.trademarkNotice).toMatch(/not affiliated/i);
    expect(haloManifest.publicProjection).toEqual({
      allowedFields: ["verifiedMilestone", "milestoneUrl", "updatedAt"],
      verifiedMilestone: null,
      milestoneUrl: null,
      updatedAt: null,
    });
    expect(JSON.stringify(haloManifest)).not.toMatch(
      /(?:\/home\/|\/Users\/|\.env|kanban|boplog|obsidian|gateway event)/i,
    );
  });

  it("uses only procedural primitives with zero external asset budget", () => {
    expect(haloManifest.assets).toEqual([]);
    expect(haloManifest.assets.some((asset) => COPIED_MEDIA.test(asset.path))).toBe(false);
    expect(haloManifest.budget.maxInitialBytes).toBe(0);
    expect(haloManifest.budget.maxDeferredBytes).toBe(0);
    expect(haloManifest.budget.maxTextures).toBe(0);
  });

  it("authors five distinct anchors and an approach search target", () => {
    const anchors = Object.values(haloManifest.cameraAnchors);
    expect(anchors).toHaveLength(5);
    expect(new Set(anchors.map((anchor) => anchor.position.join(","))).size).toBe(5);
    expect(haloManifest.search.destinationAnchor).toBe("approach");
  });

  it("keeps every state and LOD tier inside declared budgets", () => {
    expect(Object.keys(haloManifest.states)).toEqual(["sleep", "active", "milestone"]);
    expect(haloManifest.states.milestone.maxDurationMs).toBeLessThanOrEqual(6000);
    expect(haloManifest.lod.map(({ tier }) => tier)).toEqual(["hero", "near", "far", "sleep"]);
    for (const tier of haloManifest.lod) {
      expect(tier.maxTriangles).toBeLessThanOrEqual(haloManifest.budget.maxTriangles);
      expect(tier.maxDrawCalls).toBeLessThanOrEqual(haloManifest.budget.maxDrawCalls);
      if (tier.tier === "sleep") expect(tier.enterDistance).toBeGreaterThan(tier.exitDistance);
      else expect(tier.enterDistance).toBeLessThan(tier.exitDistance);
    }
    expect(haloManifest.lod.at(-1)?.animationHz).toBe(0);
  });

  it("handles arbitrary distance jumps and invalid input fail-closed", () => {
    expect(selectHaloLod(9, "near")).toBe("hero");
    expect(selectHaloLod(13, "hero")).toBe("near");
    expect(selectHaloLod(22, "near")).toBe("near");
    expect(selectHaloLod(25, "near")).toBe("far");
    expect(selectHaloLod(60, "near")).toBe("sleep");
    expect(selectHaloLod(48, "sleep")).toBe("far");
    expect(selectHaloLod(Number.NaN, "hero")).toBe("sleep");
  });
});
