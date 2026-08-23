export type EncounterAssetSources = {
  modelUrl: string | null;
  animatedUrl: string | null;
  artworkUrl: string | null;
};

export type EncounterAsset =
  | { kind: "model" | "animated" | "artwork"; url: string }
  | { kind: "missing"; url: null };

export function selectEncounterAsset(sources: EncounterAssetSources): EncounterAsset {
  if (sources.modelUrl) return { kind: "model", url: sources.modelUrl };
  if (sources.animatedUrl) return { kind: "animated", url: sources.animatedUrl };
  if (sources.artworkUrl) return { kind: "artwork", url: sources.artworkUrl };
  return { kind: "missing", url: null };
}

export type HabitatParticle = "spark" | "ember" | "snow" | "mist" | "bubble" | "pollen";
export type EncounterHabitat = {
  id: "forest" | "waters-edge" | "cave" | "mountain" | "rough-terrain" | "sea" | "urban" | "meadow";
  sky: string;
  ground: string;
  glow: string;
  particle: HabitatParticle;
  maxParticles: number;
};

const HABITATS: Record<string, Omit<EncounterHabitat, "particle" | "maxParticles">> = {
  forest: { id: "forest", sky: "#173b46", ground: "#081d19", glow: "#b7e36b" },
  "waters-edge": { id: "waters-edge", sky: "#2d6d87", ground: "#092a38", glow: "#83e5e8" },
  cave: { id: "cave", sky: "#26233f", ground: "#0d0c18", glow: "#aa8cff" },
  mountain: { id: "mountain", sky: "#718ca1", ground: "#25313a", glow: "#e7f3ff" },
  "rough-terrain": { id: "rough-terrain", sky: "#644735", ground: "#251b17", glow: "#f2a65a" },
  sea: { id: "sea", sky: "#176d92", ground: "#06233e", glow: "#69d8ff" },
  urban: { id: "urban", sky: "#30374f", ground: "#10141f", glow: "#ffcf67" },
};
const MEADOW: Omit<EncounterHabitat, "particle" | "maxParticles"> = { id: "meadow", sky: "#4b8590", ground: "#173a2c", glow: "#e4ee9b" };

export function habitatForPokemon(habitat: string | null | undefined, types: readonly string[]): EncounterHabitat {
  const base = HABITATS[habitat ?? ""] ?? MEADOW;
  const type = types[0] ?? "";
  const particle: HabitatParticle = type === "electric" ? "spark" : type === "fire" ? "ember" : type === "ice" ? "snow" : type === "water" ? "bubble" : type === "ghost" ? "mist" : "pollen";
  return { ...base, particle, maxParticles: particle === "spark" ? 32 : particle === "pollen" ? 18 : 24 };
}
