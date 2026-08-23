import type { CardTwinCard } from "./cardTwinCatalog";

export type CardTwinArtMode = "original" | "hd";

type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

export const CARD_TWIN_ART_DEFAULT: CardTwinArtMode = "original";
const STORAGE_PREFIX = "cardtwin-art-mode:";

export function loadCardTwinArtMode(storage: Pick<StorageLike, "getItem">, cardId: string): CardTwinArtMode {
  return storage.getItem(`${STORAGE_PREFIX}${cardId}`) === "hd" ? "hd" : CARD_TWIN_ART_DEFAULT;
}

export function saveCardTwinArtMode(storage: Pick<StorageLike, "setItem">, cardId: string, mode: CardTwinArtMode) {
  storage.setItem(`${STORAGE_PREFIX}${cardId}`, mode);
}

export function resolveCardTwinArt(card: CardTwinCard, mode: CardTwinArtMode) {
  if (mode === "hd" && card.approvedHdArt) return { mode, ...card.approvedHdArt } as const;
  return { mode: "original", image: card.canonical } as const;
}