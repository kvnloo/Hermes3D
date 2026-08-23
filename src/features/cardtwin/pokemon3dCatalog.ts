export type Pokemon3DAssetCatalogEntry = {
  pokemonId: number;
  catalogVersion: "2";
  modelUrl: string;
  derivativeSha256: string;
  promotionRecord: string;
  license: string;
  attribution: string;
};

export const POKEMON_3D_ASSET_CATALOG_VERSION = "2" as const;

// Promotion-only registry. Source plates and unreviewed generated candidates are never entries.
const APPROVED_MODELS: readonly Pokemon3DAssetCatalogEntry[] = [];

export function resolvePokemonModel(pokemonId: number) {
  return APPROVED_MODELS.find((entry) => entry.pokemonId === pokemonId) ?? null;
}
