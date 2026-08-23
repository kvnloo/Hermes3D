export type CatalogQuery = {
  q: string;
  generation?: number;
  type?: string;
  set?: string;
  rarity?: string;
  page: number;
};

function value(input: string | string[] | undefined) {
  return Array.isArray(input) ? input[0] : input;
}

export function parseCatalogQuery(input: Record<string, string | string[] | undefined>): CatalogQuery {
  const page = Number.parseInt(value(input.page) ?? "1", 10);
  const generation = Number.parseInt(value(input.generation) ?? "", 10);
  return {
    q: (value(input.q) ?? "").trim().slice(0, 80),
    ...(Number.isInteger(generation) && generation >= 1 && generation <= 9 ? { generation } : {}),
    ...(value(input.type) ? { type: value(input.type)!.toLowerCase().slice(0, 24) } : {}),
    ...(value(input.set) ? { set: value(input.set)!.slice(0, 80) } : {}),
    ...(value(input.rarity) ? { rarity: value(input.rarity)!.slice(0, 80) } : {}),
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

export function buildCatalogHref(path: string, query: CatalogQuery) {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.generation) params.set("generation", String(query.generation));
  if (query.type) params.set("type", query.type);
  if (query.set) params.set("set", query.set);
  if (query.rarity) params.set("rarity", query.rarity);
  if (query.page > 1) params.set("page", String(query.page));
  const suffix = params.toString();
  return suffix ? `${path}?${suffix}` : path;
}

const GENERATIONS = [
  { max: 151, region: "Kanto" }, { max: 251, region: "Johto" },
  { max: 386, region: "Hoenn" }, { max: 493, region: "Sinnoh" },
  { max: 649, region: "Unova" }, { max: 721, region: "Kalos" },
  { max: 809, region: "Alola" }, { max: 905, region: "Galar" },
  { max: 1025, region: "Paldea" },
] as const;

export function generationForPokemon(id: number) {
  if (!Number.isInteger(id) || id < 1) return null;
  const index = GENERATIONS.findIndex((entry) => id <= entry.max);
  return index < 0 ? null : { generation: index + 1, region: GENERATIONS[index].region };
}

export function paginate<T>(items: readonly T[], page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  return { items: items.slice((currentPage - 1) * pageSize, currentPage * pageSize), page: currentPage, totalPages, total: items.length };
}
