import { describe, expect, it } from "vitest";

import { parseMuseumExhibitV1 } from "../../../core/MuseumExhibitV1";
import { selectPokemonGameLod } from "../ExhibitScene";
import { pokemonGameManifest } from "../manifest";

const FRANCHISE_MEDIA_EXTENSIONS = /\.(?:glb|gltf|fbx|obj|png|jpe?g|webp|gif|mp3|wav|ogg|mp4|mov|woff2?|ttf|otf)$/i;

describe("pokemon-game exhibit", () => {
  it("parses the exact public v1 contract and rejects private additions", () => {
    expect(parseMuseumExhibitV1(pokemonGameManifest)).toBe(pokemonGameManifest);
    expect(() =>
      parseMuseumExhibitV1({ ...pokemonGameManifest, privateProjectPath: "/private/project" }),
    ).toThrow(/unknown fields: privateProjectPath/);
  });

  it("contains the required public-safe identity and no unverified claims", () => {
    expect(pokemonGameManifest.id).toBe("museum:pokemon-game");
    expect(pokemonGameManifest.trademarkNotice).toMatch(/Unofficial fan project/i);
    expect(pokemonGameManifest.trademarkNotice).toMatch(/not affiliated/i);
    expect(pokemonGameManifest.publicProjection).toEqual({
      allowedFields: ["verifiedMilestone", "milestoneUrl", "updatedAt"],
      verifiedMilestone: null,
      milestoneUrl: null,
      updatedAt: null,
    });
    expect(JSON.stringify(pokemonGameManifest)).not.toMatch(
      /(?:\/home\/|\/Users\/|\.env|kanban|boplog|obsidian|gateway event)/i,
    );
  });

  it("uses no copied franchise media and declares a zero-byte primitive scene", () => {
    expect(pokemonGameManifest.assets).toEqual([]);
    expect(pokemonGameManifest.assets.some((asset) => FRANCHISE_MEDIA_EXTENSIONS.test(asset.path))).toBe(false);
    expect(pokemonGameManifest.budget.maxInitialBytes).toBe(0);
    expect(pokemonGameManifest.budget.maxDeferredBytes).toBe(0);
    expect(pokemonGameManifest.budget.maxTextures).toBe(0);
  });

  it("authors distinct anchors and sends search to approach", () => {
    const anchors = Object.values(pokemonGameManifest.cameraAnchors);
    expect(anchors).toHaveLength(5);
    expect(new Set(anchors.map((anchor) => anchor.position.join(","))).size).toBe(5);
    expect(pokemonGameManifest.search.destinationAnchor).toBe("approach");
  });

  it("declares hero, near, far and sleep tiers within the exhibit budget", () => {
    expect(pokemonGameManifest.lod.map(({ tier }) => tier)).toEqual([
      "hero",
      "near",
      "far",
      "sleep",
    ]);
    for (const tier of pokemonGameManifest.lod) {
      if (tier.tier === "sleep") {
        expect(tier.enterDistance).toBeGreaterThan(tier.exitDistance);
      } else {
        expect(tier.enterDistance).toBeLessThan(tier.exitDistance);
      }
      expect(tier.maxTriangles).toBeLessThanOrEqual(pokemonGameManifest.budget.maxTriangles);
      expect(tier.maxDrawCalls).toBeLessThanOrEqual(pokemonGameManifest.budget.maxDrawCalls);
    }
    expect(pokemonGameManifest.lod.at(-1)?.animationHz).toBe(0);
  });

  it("applies deterministic one-step LOD hysteresis and fail-closed suspension", () => {
    expect(selectPokemonGameLod(7, "near")).toBe("hero");
    expect(selectPokemonGameLod(12, "hero")).toBe("near");
    expect(selectPokemonGameLod(18, "near")).toBe("near");
    expect(selectPokemonGameLod(22, "near")).toBe("far");
    expect(selectPokemonGameLod(50, "far")).toBe("sleep");
    expect(selectPokemonGameLod(40, "sleep")).toBe("far");
    expect(selectPokemonGameLod(Number.NaN, "hero")).toBe("sleep");
  });
});
