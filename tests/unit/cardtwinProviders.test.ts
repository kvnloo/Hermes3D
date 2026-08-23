import { describe, expect, it } from "vitest";
import { normalizeEvolutionChain, normalizePokemonList, normalizePokemonDetail } from "@/features/cardtwin/providers/pokeApi";
import { normalizeTcgCard } from "@/features/cardtwin/providers/tcgdex";
import { resolvePokemonModel } from "@/features/cardtwin/pokemon3dCatalog";

describe("catalog provider normalization", () => {
  it("derives official artwork URLs without eager detail requests", () => {
    const records = normalizePokemonList({ results: [{ name: "bulbasaur", url: "https://pokeapi.co/api/v2/pokemon/1/" }] });
    expect(records[0]).toMatchObject({ id: 1, name: "Bulbasaur", source: "PokeAPI" });
    expect(records[0].artworkUrl).toContain("official-artwork/1.png");
  });

  it("normalizes only API-evidenced Pokémon detail fields", () => {
    const detail = normalizePokemonDetail({ id: 25, name: "pikachu", types: [{ type: { name: "electric" } }], abilities: [{ ability: { name: "static" }, is_hidden: false }], stats: [{ base_stat: 90, stat: { name: "speed" } }], sprites: { other: { "official-artwork": { front_default: "https://images.test/25.png" } } } });
    expect(detail).toMatchObject({ id: 25, name: "Pikachu", types: ["electric"], abilities: ["Static"], stats: [{ name: "Speed", value: 90 }] });
  });

  it("normalizes an evidenced evolution chain in source order", () => {
    const evolution = normalizeEvolutionChain({ chain: {
      species: { name: "pichu", url: "https://pokeapi.co/api/v2/pokemon-species/172/" },
      evolves_to: [{ species: { name: "pikachu", url: "https://pokeapi.co/api/v2/pokemon-species/25/" }, evolves_to: [
        { species: { name: "raichu", url: "https://pokeapi.co/api/v2/pokemon-species/26/" }, evolves_to: [] },
      ] }],
    } });
    expect(evolution).toEqual([{ id: 172, name: "Pichu" }, { id: 25, name: "Pikachu" }, { id: 26, name: "Raichu" }]);
  });

  it("preserves TCGdex source identity and image provenance", () => {
    expect(normalizeTcgCard({ id: "base1-4", localId: "4", name: "Charizard", image: "https://assets.tcgdex.net/en/base/base1/4", rarity: "Rare Holo", set: { id: "base1", name: "Base Set" } })).toMatchObject({ id: "base1-4", number: "4", set: { id: "base1", name: "Base Set" }, source: "TCGdex" });
  });

  it("fails closed when no approved local 3D model is catalogued", () => {
    expect(resolvePokemonModel(25)).toBeNull();
  });
});
