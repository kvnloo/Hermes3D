import { describe, expect, it } from "vitest";

import { parseMuseumExhibitV1 } from "../../../core/MuseumExhibitV1";
import { selectStarWarsGameLod } from "../ExhibitScene";
import { starWarsGameManifest } from "../manifest";

const FRANCHISE_MEDIA_EXTENSIONS = /\.(?:glb|gltf|fbx|obj|png|jpe?g|webp|gif|mp3|wav|ogg|mp4|mov|woff2?|ttf|otf)$/i;

describe("star-wars-game exhibit", () => {
  it("parses the exact public v1 contract and rejects private additions", () => {
    expect(parseMuseumExhibitV1(starWarsGameManifest)).toBe(starWarsGameManifest);
    expect(() =>
      parseMuseumExhibitV1({ ...starWarsGameManifest, privateProjectPath: "/private/project" }),
    ).toThrow(/unknown fields: privateProjectPath/);
  });

  it("contains the required public-safe identity and no unverified claims", () => {
    expect(starWarsGameManifest.id).toBe("museum:star-wars-game");
    expect(starWarsGameManifest.trademarkNotice).toMatch(/Unofficial fan project/i);
    expect(starWarsGameManifest.trademarkNotice).toMatch(/not affiliated/i);
    expect(starWarsGameManifest.publicProjection).toEqual({
      allowedFields: ["verifiedMilestone", "milestoneUrl", "updatedAt"],
      verifiedMilestone: null,
      milestoneUrl: null,
      updatedAt: null,
    });
    expect(JSON.stringify(starWarsGameManifest)).not.toMatch(
      /(?:\/home\/|\/Users\/|\.env|kanban|boplog|obsidian|gateway event)/i,
    );
  });

  it("uses no copied franchise media and declares a zero-byte primitive scene", () => {
    expect(starWarsGameManifest.assets).toEqual([]);
    expect(starWarsGameManifest.assets.some((asset) => FRANCHISE_MEDIA_EXTENSIONS.test(asset.path))).toBe(false);
    expect(starWarsGameManifest.budget.maxInitialBytes).toBe(0);
    expect(starWarsGameManifest.budget.maxDeferredBytes).toBe(0);
    expect(starWarsGameManifest.budget.maxTextures).toBe(0);
  });

  it("authors five distinct anchors and sends search to approach", () => {
    const anchors = Object.values(starWarsGameManifest.cameraAnchors);
    expect(anchors).toHaveLength(5);
    expect(new Set(anchors.map((anchor) => anchor.position.join(","))).size).toBe(5);
    expect(starWarsGameManifest.search.destinationAnchor).toBe("approach");
  });

  it("declares every state and LOD tier within the exhibit budget", () => {
    expect(Object.keys(starWarsGameManifest.states)).toEqual(["sleep", "active", "milestone"]);
    expect(starWarsGameManifest.states.milestone.maxDurationMs).toBeLessThanOrEqual(6500);
    expect(starWarsGameManifest.lod.map(({ tier }) => tier)).toEqual([
      "hero",
      "near",
      "far",
      "sleep",
    ]);
    for (const tier of starWarsGameManifest.lod) {
      if (tier.tier === "sleep") {
        expect(tier.enterDistance).toBeGreaterThan(tier.exitDistance);
      } else {
        expect(tier.enterDistance).toBeLessThan(tier.exitDistance);
      }
      expect(tier.maxTriangles).toBeLessThanOrEqual(starWarsGameManifest.budget.maxTriangles);
      expect(tier.maxDrawCalls).toBeLessThanOrEqual(starWarsGameManifest.budget.maxDrawCalls);
    }
    expect(starWarsGameManifest.lod.at(-1)?.animationHz).toBe(0);
  });

  it("handles arbitrary distance jumps with deterministic hysteresis and fail-closed suspension", () => {
    expect(selectStarWarsGameLod(8, "near")).toBe("hero");
    expect(selectStarWarsGameLod(12, "hero")).toBe("near");
    expect(selectStarWarsGameLod(20, "near")).toBe("near");
    expect(selectStarWarsGameLod(24, "near")).toBe("far");
    expect(selectStarWarsGameLod(56, "near")).toBe("sleep");
    expect(selectStarWarsGameLod(44, "sleep")).toBe("far");
    expect(selectStarWarsGameLod(Number.NaN, "hero")).toBe("sleep");
  });
});
