import type { CardTwinCard } from "@/features/living-museum/exhibits/pokemon-cards/cardTwinCatalog";

const PUBLIC_ASSET_PREFIX = "/exhibits/pokemon-cards/";

export function cardTwinAssetsAvailable(card: CardTwinCard, exists: (path: string) => boolean) {
  const assets = [card.canonical, card.hiddenFill, ...card.layers.map((layer) => layer.texture)];
  return assets.every((asset) => {
    if (!asset.startsWith(PUBLIC_ASSET_PREFIX) || asset.includes("..")) return false;
    return exists(`public${asset}`);
  });
}