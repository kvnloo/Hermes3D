import { describe, expect, it } from "vitest";

import { parseMuseumExhibitV1 } from "../../../core/MuseumExhibitV1";
import { selectPokemonCardsLod } from "../ExhibitScene";
import { pokemonCardsManifest } from "../manifest";

const FORBIDDEN_MEDIA = /\.(?:glb|gltf|fbx|obj|png|jpe?g|webp|gif|mp3|wav|ogg|mp4|mov|woff2?|ttf|otf)$/i;

describe("pokemon-cards exhibit", () => {
  it("parses the strict contract and rejects private additions", () => {
    expect(parseMuseumExhibitV1(pokemonCardsManifest)).toBe(pokemonCardsManifest);
    expect(() => parseMuseumExhibitV1({ ...pokemonCardsManifest, privateBinderPath: "/private" })).toThrow(/unknown fields/);
  });

  it("is public-safe, unofficial and claim-free", () => {
    expect(pokemonCardsManifest.trademarkNotice).toMatch(/Unofficial fan project/i);
    expect(pokemonCardsManifest.trademarkNotice).toMatch(/not affiliated/i);
    expect(pokemonCardsManifest.publicProjection).toEqual({
      allowedFields: ["verifiedMilestone", "milestoneUrl", "updatedAt"],
      verifiedMilestone: null,
      milestoneUrl: null,
      updatedAt: null,
    });
    expect(JSON.stringify(pokemonCardsManifest)).not.toMatch(/(?:\/home\/|\/Users\/|\.env|kanban|boplog|obsidian|gateway event)/i);
  });

  it("uses original primitives with no scans, art, logos, fonts or external bytes", () => {
    expect(pokemonCardsManifest.assets).toEqual([]);
    expect(pokemonCardsManifest.assets.some((asset) => FORBIDDEN_MEDIA.test(asset.path))).toBe(false);
    expect(pokemonCardsManifest.budget.maxInitialBytes).toBe(0);
    expect(pokemonCardsManifest.budget.maxDeferredBytes).toBe(0);
    expect(pokemonCardsManifest.budget.maxTextures).toBe(0);
  });

  it("authors five distinct anchors and approach search", () => {
    const anchors = Object.values(pokemonCardsManifest.cameraAnchors);
    expect(anchors).toHaveLength(5);
    expect(new Set(anchors.map(({ position }) => position.join(","))).size).toBe(5);
    expect(pokemonCardsManifest.search.destinationAnchor).toBe("approach");
  });

  it("keeps every LOD tier inside its declared budget", () => {
    expect(pokemonCardsManifest.lod.map(({ tier }) => tier)).toEqual(["hero", "near", "far", "sleep"]);
    for (const tier of pokemonCardsManifest.lod) {
      expect(tier.maxTriangles).toBeLessThanOrEqual(pokemonCardsManifest.budget.maxTriangles);
      expect(tier.maxDrawCalls).toBeLessThanOrEqual(pokemonCardsManifest.budget.maxDrawCalls);
    }
    expect(pokemonCardsManifest.lod.at(-1)?.animationHz).toBe(0);
  });

  it("resolves arbitrary distance jumps directly and fails closed", () => {
    expect(selectPokemonCardsLod(4, "sleep")).toBe("hero");
    expect(selectPokemonCardsLod(18, "near")).toBe("near");
    expect(selectPokemonCardsLod(28, "hero")).toBe("far");
    expect(selectPokemonCardsLod(60, "near")).toBe("sleep");
    expect(selectPokemonCardsLod(Number.NaN, "hero")).toBe("sleep");
  });
});
