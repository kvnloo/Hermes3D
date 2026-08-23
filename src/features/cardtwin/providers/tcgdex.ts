import { paginate } from "../catalogQuery";
import type { CardCatalogProvider, CardSummary, Provenance } from "./contracts";
import { createCachedFetcher } from "./cache";

const API = "https://api.tcgdex.net/v2/en";
const fetcher = createCachedFetcher({ ttlMs: 30 * 60_000 });
const provenance = (): Provenance => ({ source: "TCGdex", sourceUrl: "https://tcgdex.dev", fetchedAt: new Date().toISOString(), attribution: "Card metadata and image URLs from TCGdex. Card artwork belongs to its respective owners." });
const testFixtures = process.env.CARDTWIN_TEST_FIXTURES === "1";
const fixtureCards: TcgDexCard[] = [
  { id: "sm1-22", localId: "22", name: "Arcanine", rarity: "Rare", set: { id: "sm1", name: "Sun & Moon" } },
  { id: "base1-4", localId: "4", name: "Charizard", rarity: "Rare Holo", set: { id: "base1", name: "Base Set" } },
];

type TcgDexCard = { id: string; localId?: string; name: string; image?: string; rarity?: string; types?: string[]; set?: { id?: string; name?: string } };

export function normalizeTcgCard(payload: TcgDexCard): CardSummary {
  return {
    id: String(payload.id), name: String(payload.name), number: String(payload.localId ?? ""),
    imageUrl: payload.image ? `${payload.image}/high.webp` : "", rarity: payload.rarity || undefined,
    types: Array.isArray(payload.types) ? payload.types : [],
    set: { id: String(payload.set?.id ?? ""), name: String(payload.set?.name ?? "Unknown set") },
    source: "TCGdex", sourceUrl: `https://api.tcgdex.net/v2/en/cards/${encodeURIComponent(payload.id)}`,
  };
}

export const tcgdexProvider: CardCatalogProvider = {
  version: "1",
  async list(query) {
    const raw = testFixtures ? fixtureCards : await fetcher.json<TcgDexCard[]>("tcgdex-card-index-v1", `${API}/cards`);
    let cards = raw.map(normalizeTcgCard);
    if (query.q) cards = cards.filter((card) => card.name.toLowerCase().includes(query.q.toLowerCase()) || card.id.toLowerCase() === query.q.toLowerCase());
    if (query.set) cards = cards.filter((card) => card.set.id === query.set || card.set.name === query.set);
    if (query.rarity) cards = cards.filter((card) => card.rarity === query.rarity);
    if (query.type) cards = cards.filter((card) => card.types.some((type) => type.toLowerCase() === query.type));
    return { ...paginate(cards, query.page, 24), provenance: provenance() };
  },
  async get(id) {
    if (!/^[a-zA-Z0-9.-]+$/.test(id)) return null;
    const payload = testFixtures ? fixtureCards.find((card) => card.id === id) : await fetcher.json<TcgDexCard>(`tcgdex-card-${id}`, `${API}/cards/${encodeURIComponent(id)}`);
    if (!payload) return null;
    return { record: normalizeTcgCard(payload), provenance: provenance() };
  },
};
