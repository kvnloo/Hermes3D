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
      { id: "forest-distance", label: "Forest distance", depthMm: 0, texture: texture("sawsbuck-tef-166", "forest-distance") },
      { id: "forest-midground", label: "Autumn forest midground", depthMm: 0.9, texture: texture("sawsbuck-tef-166", "forest-midground") },
      { id: "body-rear", label: "Rear body + hind feet", depthMm: 1.8, texture: texture("sawsbuck-tef-166", "body-rear") },
      { id: "body-forward", label: "Forward anatomy + front feet", depthMm: 2.7, texture: texture("sawsbuck-tef-166", "body-forward") },
      { id: "antlers-foliage", label: "Antler tips + nearest foliage", depthMm: 3.6, texture: texture("sawsbuck-tef-166", "antlers-foliage") },
      { id: "printing-frame", label: "Printing + identity frame", depthMm: 4.5, texture: texture("sawsbuck-tef-166", "printing-frame") },
    ],
  },
] as const;

export function getCardTwinCard(id?: string) {
  return CARD_TWIN_CARDS.find((card) => card.id === id) ?? CARD_TWIN_CARDS[0];
}
