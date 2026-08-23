import { generationForPokemon, paginate, type CatalogQuery } from "../catalogQuery";
import type { CatalogPage, PokemonCatalogProvider, PokemonDetail, PokemonEvolution, PokemonSummary, Provenance } from "./contracts";
import { createCachedFetcher } from "./cache";

const API = "https://pokeapi.co/api/v2";
const fetcher = createCachedFetcher();
const provenance = (): Provenance => ({ source: "PokeAPI", sourceUrl: "https://pokeapi.co", fetchedAt: new Date().toISOString(), attribution: "Data and artwork from PokeAPI. Pokémon names and artwork belong to their respective owners." });
const title = (text: string) => text.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
const testFixtures = process.env.CARDTWIN_TEST_FIXTURES === "1";

type PokeApiDetail = {
  id: number; name: string;
  types?: Array<{ type: { name: string } }>;
  abilities?: Array<{ ability: { name: string }; is_hidden?: boolean }>;
  stats?: Array<{ base_stat: number; stat: { name: string } }>;
  cries?: { latest?: string | null };
  sprites?: { other?: { "official-artwork"?: { front_default?: string; front_shiny?: string | null }; showdown?: { front_default?: string | null } } };
};
type PokeApiSpecies = {
  evolution_chain?: { url?: string };
  habitat?: { name: string } | null;
  color?: { name: string } | null;
  generation?: { name: string };
  varieties?: Array<{ is_default: boolean; pokemon: { name: string; url: string } }>;
};

type EvolutionNode = { species: { name: string; url: string }; evolves_to?: EvolutionNode[] };

export function normalizeEvolutionChain(payload: { chain?: EvolutionNode }): PokemonEvolution[] {
  const records: PokemonEvolution[] = [];
  const visit = (node?: EvolutionNode) => {
    if (!node) return;
    const id = Number(node.species.url.match(/\/(\d+)\/?$/)?.[1]);
    if (Number.isInteger(id)) records.push({ id, name: title(node.species.name) });
    (node.evolves_to ?? []).forEach(visit);
  };
  visit(payload.chain);
  return records;
}

export function normalizePokemonList(payload: { results?: Array<{ name: string; url: string }> }): PokemonSummary[] {
  return (payload.results ?? []).flatMap((entry) => {
    const id = Number(entry.url.match(/\/(\d+)\/?$/)?.[1]);
    const generation = generationForPokemon(id);
    if (!generation) return [];
    return [{ id, name: title(entry.name), artworkUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`, ...generation, source: "PokeAPI" as const }];
  });
}

export function normalizePokemonDetail(payload: PokeApiDetail, evolution: PokemonEvolution[] = [], species: PokeApiSpecies = {}): PokemonDetail {
  const generation = generationForPokemon(payload.id) ?? { generation: 0, region: "Unknown" };
  return {
    id: payload.id, name: title(payload.name), ...generation, source: "PokeAPI",
    artworkUrl: payload.sprites?.other?.["official-artwork"]?.front_default ?? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${payload.id}.png`,
    types: (payload.types ?? []).map((item) => item.type.name),
    abilities: (payload.abilities ?? []).map((item) => title(item.ability.name)),
    stats: (payload.stats ?? []).map((item) => ({ name: title(item.stat.name), value: item.base_stat })), evolution,
    habitat: species.habitat?.name ?? null,
    color: species.color?.name ?? null,
    animatedSpriteUrl: payload.sprites?.other?.showdown?.front_default ?? null,
    shinyArtworkUrl: payload.sprites?.other?.["official-artwork"]?.front_shiny ?? null,
    cryUrl: payload.cries?.latest ?? null,
    forms: (species.varieties ?? []).flatMap((entry) => {
      const id = Number(entry.pokemon.url.match(/\/(\d+)\/?$/)?.[1]);
      return Number.isInteger(id) ? [{ id, name: title(entry.pokemon.name), isDefault: entry.is_default }] : [];
    }),
  };
}

export const pokeApiProvider: PokemonCatalogProvider = {
  version: "1",
  async list(query: CatalogQuery): Promise<CatalogPage<PokemonSummary>> {
    const payload = testFixtures ? { results: [{ name: "pikachu", url: `${API}/pokemon/25/` }] } : await fetcher.json<{ results: Array<{ name: string; url: string }> }>("pokemon-list-v1-1025", `${API}/pokemon?limit=1025&offset=0`);
    let records = normalizePokemonList(payload);
    if (query.q) {
      const needle = query.q.toLowerCase();
      records = records.filter((item) => item.name.toLowerCase().includes(needle) || String(item.id) === needle.replace(/^#/, ""));
    }
    if (query.generation) records = records.filter((item) => item.generation === query.generation);
    if (query.type) {
      const typePayload = await fetcher.json<{ pokemon: Array<{ pokemon: { url: string } }> }>(`pokemon-type-${query.type}`, `${API}/type/${encodeURIComponent(query.type)}`);
      const ids = new Set(typePayload.pokemon.map((item) => Number(item.pokemon.url.match(/\/(\d+)\/?$/)?.[1])));
      records = records.filter((item) => ids.has(item.id));
    }
    return { ...paginate(records, query.page, 24), provenance: provenance() };
  },
  async get(id) {
    if (!Number.isInteger(id) || id < 1 || id > 1025) return null;
    if (testFixtures && id === 25) return { record: normalizePokemonDetail({ id: 25, name: "pikachu", types: [{ type: { name: "electric" } }], abilities: [{ ability: { name: "static" } }], stats: [{ base_stat: 90, stat: { name: "speed" } }], cries: { latest: "data:audio/ogg;base64,T2dnUw==" }, sprites: { other: { showdown: { front_default: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/25.gif" }, "official-artwork": { front_default: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png", front_shiny: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/25.png" } } } }, [{ id: 172, name: "Pichu" }, { id: 25, name: "Pikachu" }, { id: 26, name: "Raichu" }], { varieties: [{ is_default: true, pokemon: { name: "pikachu", url: `${API}/pokemon/25/` } }] }), provenance: provenance() };
    const payload = await fetcher.json<PokeApiDetail>(`pokemon-detail-${id}`, `${API}/pokemon/${id}`);
    const species = await fetcher.json<PokeApiSpecies>(`pokemon-species-${id}`, `${API}/pokemon-species/${id}`);
    const chainUrl = species.evolution_chain?.url;
    const evolution = chainUrl ? normalizeEvolutionChain(await fetcher.json<{ chain?: EvolutionNode }>(`pokemon-evolution-${chainUrl.match(/\/(\d+)\/?$/)?.[1] ?? id}`, chainUrl)) : [];
    return { record: normalizePokemonDetail(payload, evolution, species), provenance: provenance() };
  },
};
