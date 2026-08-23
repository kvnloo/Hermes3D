export type CardTwinLayer = {
  id: string;
  label: string;
  depthMm: number;
  texture: string;
};

export type CardTwinCard = {
  id: string;
  name: string;
  printing: string;
  set: string;
  accent: string;
  canonical: string;
  hiddenFill: string;
  layers: readonly CardTwinLayer[];
};

function texture(cardId: string, file: string) {
  return `/exhibits/pokemon-cards/${cardId}/layers/${file}.png`;
}

export const CARD_TWIN_CARDS: readonly CardTwinCard[] = [
  {
    id: "arcanine-sm1-22",
    name: "Arcanine",
    printing: "22/149",
    set: "Sun & Moon",
    accent: "#e8a45b",
    canonical: "/exhibits/pokemon-cards/canonical/arcanine-sm1-22.png",
    hiddenFill: texture("arcanine-sm1-22", "hidden-background-fill"),
    layers: [
      { id: "far-background", label: "Far background", depthMm: 0, texture: texture("arcanine-sm1-22", "far-background") },
      { id: "hero", label: "Arcanine silhouette", depthMm: 1.5, texture: texture("arcanine-sm1-22", "hero") },
      { id: "foreground-effects", label: "Foreground foliage", depthMm: 2.6, texture: texture("arcanine-sm1-22", "foreground-effects") },
      { id: "outer-frame-text", label: "Frame + printing", depthMm: 3.8, texture: texture("arcanine-sm1-22", "outer-frame-text") },
    ],
  },
  {
    id: "umbreon-vmax-swsh7-215",
    name: "Umbreon VMAX",
    printing: "215/203",
    set: "Evolving Skies",
    accent: "#a99cff",
    canonical: "/exhibits/pokemon-cards/canonical/umbreon-vmax-swsh7-215.png",
    hiddenFill: texture("umbreon-vmax-swsh7-215", "hidden-background-fill"),
    layers: [
      { id: "far-background", label: "Moonlit distance", depthMm: 0, texture: texture("umbreon-vmax-swsh7-215", "far-background") },
      { id: "hero", label: "Umbreon silhouette", depthMm: 1.8, texture: texture("umbreon-vmax-swsh7-215", "hero") },
      { id: "foreground-architecture", label: "Tower architecture", depthMm: 3, texture: texture("umbreon-vmax-swsh7-215", "foreground-architecture") },
      { id: "outer-card-frame", label: "Foil frame + printing", depthMm: 4.2, texture: texture("umbreon-vmax-swsh7-215", "outer-card-frame") },
    ],
  },
  {
    id: "leafeon-ex-sv8pt5-144",
    name: "Leafeon ex",
    printing: "144/131",
    set: "Prismatic Evolutions",
    accent: "#9fd58a",
    canonical: "/exhibits/pokemon-cards/canonical/leafeon-ex-sv8pt5-144.png",
    hiddenFill: texture("leafeon-ex-sv8pt5-144", "hidden-background-fill"),
    layers: [
      { id: "far-background", label: "Forest distance", depthMm: 0, texture: texture("leafeon-ex-sv8pt5-144", "far-background") },
      { id: "hero", label: "Leafeon silhouette", depthMm: 1.5, texture: texture("leafeon-ex-sv8pt5-144", "hero") },
      { id: "outer-frame-text", label: "Foil frame + printing", depthMm: 3.8, texture: texture("leafeon-ex-sv8pt5-144", "outer-frame-text") },
    ],
  },
  {
    id: "sawsbuck-tef-166",
    name: "Sawsbuck",
    printing: "166/162",
    set: "Temporal Forces",
    accent: "#c8864f",
    canonical: "/exhibits/pokemon-cards/canonical/sawsbuck-tef-166.png",
    hiddenFill: texture("sawsbuck-tef-166", "hidden-background-fill"),
    layers: [
      { id: "saw-r00-backing-datum", label: "Backing datum · uncut", depthMm: 0, texture: texture("sawsbuck-tef-166", "saw-r00-backing-datum") },
      { id: "saw-r01-far-pink-grove", label: "Far left pink grove", depthMm: 0.6, texture: texture("sawsbuck-tef-166", "saw-r01-far-pink-grove") },
      { id: "saw-r02-far-green-grove", label: "Far center green grove", depthMm: 1.2, texture: texture("sawsbuck-tef-166", "saw-r02-far-green-grove") },
      { id: "saw-r03-mid-warm-grove", label: "Warm right midground forest", depthMm: 1.8, texture: texture("sawsbuck-tef-166", "saw-r03-mid-warm-grove") },
      { id: "saw-r04-ground-flora", label: "Ground and middle flora", depthMm: 2.4, texture: texture("sawsbuck-tef-166", "saw-r04-ground-flora") },
      { id: "saw-r05-body-rear", label: "Rear anatomy and hind hooves", depthMm: 3, texture: texture("sawsbuck-tef-166", "saw-r05-body-rear") },
      { id: "saw-r06-antler-crown", label: "Antler and foliage crown", depthMm: 3.6, texture: texture("sawsbuck-tef-166", "saw-r06-antler-crown") },
      { id: "saw-r07-body-forward", label: "Forward anatomy and front hooves", depthMm: 4.2, texture: texture("sawsbuck-tef-166", "saw-r07-body-forward") },
      { id: "saw-r08-near-flora", label: "Nearest flora", depthMm: 4.8, texture: texture("sawsbuck-tef-166", "saw-r08-near-flora") },
      { id: "saw-r09-print-identity-frame", label: "Printing and identity frame", depthMm: 5.4, texture: texture("sawsbuck-tef-166", "saw-r09-print-identity-frame") },
    ],
  },
] as const;

export function getCardTwinCard(id?: string) {
  return CARD_TWIN_CARDS.find((card) => card.id === id) ?? CARD_TWIN_CARDS[0];
}
