export type Pokemon3dCatalogEntry = { pokemonId: number; catalogVersion: "1"; modelUrl: string; license: string; attribution: string };

// Deliberately empty until an approved, versioned local model is promoted.
const APPROVED_MODELS: readonly Pokemon3dCatalogEntry[] = [];

export function resolvePokemonModel(pokemonId: number) {
  return APPROVED_MODELS.find((entry) => entry.pokemonId === pokemonId) ?? null;
}
