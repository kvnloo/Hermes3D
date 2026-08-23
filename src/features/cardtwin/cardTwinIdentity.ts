import { CARD_TWIN_CARDS } from "@/features/living-museum/exhibits/pokemon-cards/cardTwinCatalog";

export type CardPrintingIdentity = { sourceId: string; setName: string; number: string };

const EXACT_IDENTITIES = new Map([
  ["sm1-22|Sun & Moon|22", "arcanine-sm1-22"],
  ["swsh7-215|Evolving Skies|215", "umbreon-vmax-swsh7-215"],
  ["sv8pt5-144|Prismatic Evolutions|144", "leafeon-ex-sv8pt5-144"],
  ["tef-166|Temporal Forces|166", "sawsbuck-tef-166"],
]);

export function findExactCardTwin(identity: CardPrintingIdentity) {
  const id = EXACT_IDENTITIES.get(`${identity.sourceId}|${identity.setName}|${identity.number}`);
  return id ? CARD_TWIN_CARDS.find((card) => card.id === id) ?? null : null;
}
