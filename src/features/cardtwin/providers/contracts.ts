import type { CatalogQuery } from "../catalogQuery";

export type Provenance = { source: string; sourceUrl: string; fetchedAt: string; attribution: string };
export type PokemonSummary = { id: number; name: string; artworkUrl: string; generation: number; region: string; source: "PokeAPI" };
export type PokemonEvolution = { id: number; name: string };
export type PokemonDetail = PokemonSummary & { types: string[]; abilities: string[]; stats: Array<{ name: string; value: number }>; evolution: PokemonEvolution[] };
export type CardSummary = { id: string; name: string; number: string; imageUrl: string; rarity?: string; types: string[]; set: { id: string; name: string }; source: "TCGdex"; sourceUrl: string };
export type CatalogPage<T> = { items: T[]; page: number; totalPages: number; total: number; provenance: Provenance };

export interface PokemonCatalogProvider {
  readonly version: "1";
  list(query: CatalogQuery): Promise<CatalogPage<PokemonSummary>>;
  get(id: number): Promise<{ record: PokemonDetail; provenance: Provenance } | null>;
}
export interface CardCatalogProvider {
  readonly version: "1";
  list(query: CatalogQuery): Promise<CatalogPage<CardSummary>>;
  get(id: string): Promise<{ record: CardSummary; provenance: Provenance } | null>;
}
