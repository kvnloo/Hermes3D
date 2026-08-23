import { describe, expect, it } from "vitest";
import {
  habitatForPokemon,
  selectEncounterAsset,
  type EncounterAssetSources,
} from "@/features/cardtwin/livingEncounter";

const sources = (overrides: Partial<EncounterAssetSources> = {}): EncounterAssetSources => ({
  modelUrl: null,
  animatedUrl: null,
  artworkUrl: null,
  ...overrides,
});

describe("Living Encounter asset ladder", () => {
  it("selects an approved local 3D model before remote presentations", () => {
    expect(selectEncounterAsset(sources({ modelUrl: "/approved/pikachu.glb", animatedUrl: "https://sprites.test/pikachu.gif", artworkUrl: "https://art.test/pikachu.png" }))).toEqual({ kind: "model", url: "/approved/pikachu.glb" });
  });

  it("selects an evidenced animated sprite before official artwork", () => {
    expect(selectEncounterAsset(sources({ animatedUrl: "https://sprites.test/pikachu.gif", artworkUrl: "https://art.test/pikachu.png" }))).toEqual({ kind: "animated", url: "https://sprites.test/pikachu.gif" });
  });

  it("uses artwork when no approved model or animation exists", () => {
    expect(selectEncounterAsset(sources({ artworkUrl: "https://art.test/pikachu.png" }))).toEqual({ kind: "artwork", url: "https://art.test/pikachu.png" });
  });

  it("fails closed when every visual source is missing", () => {
    expect(selectEncounterAsset(sources())).toEqual({ kind: "missing", url: null });
  });
});

describe("Living Encounter habitat normalization", () => {
  it("maps forest electric species to a bounded living habitat", () => {
    expect(habitatForPokemon("forest", ["electric"])).toMatchObject({
      id: "forest",
      particle: "spark",
      maxParticles: 32,
    });
  });

  it("uses a calm fail-closed fallback for unknown habitat and type", () => {
    expect(habitatForPokemon(null, ["unknown"])).toMatchObject({
      id: "meadow",
      particle: "pollen",
      maxParticles: 18,
    });
  });
});
