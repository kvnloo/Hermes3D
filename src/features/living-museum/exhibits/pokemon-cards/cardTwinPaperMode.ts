export type CardTwinDisplayMode = "glass" | "paper";

export type CardTwinPaperSettings = {
  mode: CardTwinDisplayMode;
  brightness: number;
  contrast: number;
  grain: number;
};

type StorageLike = Pick<Storage, "getItem" | "setItem">;

const STORAGE_KEY = "cardtwin-paper-v1";
const clamp = (value: unknown, minimum: number, maximum: number, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? Math.max(minimum, Math.min(maximum, value)) : fallback;

export const CARD_TWIN_PAPER_DEFAULTS: CardTwinPaperSettings = {
  mode: "glass",
  brightness: 1.02,
  contrast: 0.94,
  grain: 0.32,
};

export function resolveCardTwinMaterial(mode: CardTwinDisplayMode) {
  return mode === "paper"
    ? { roughness: 0.96, metalness: 0, clearcoat: 0.01, clearcoatRoughness: 1 }
    : { roughness: 0.2, metalness: 0.58, clearcoat: 0.42, clearcoatRoughness: 0.32 };
}

export function loadCardTwinPaperSettings(storage: Pick<StorageLike, "getItem">): CardTwinPaperSettings {
  try {
    const parsed = JSON.parse(storage.getItem(STORAGE_KEY) ?? "null") as Partial<CardTwinPaperSettings> | null;
    if (!parsed || (parsed.mode !== "glass" && parsed.mode !== "paper")) return CARD_TWIN_PAPER_DEFAULTS;
    return {
      mode: parsed.mode,
      brightness: clamp(parsed.brightness, 0.85, 1.15, CARD_TWIN_PAPER_DEFAULTS.brightness),
      contrast: clamp(parsed.contrast, 0.8, 1.1, CARD_TWIN_PAPER_DEFAULTS.contrast),
      grain: clamp(parsed.grain, 0, 1, CARD_TWIN_PAPER_DEFAULTS.grain),
    };
  } catch {
    return CARD_TWIN_PAPER_DEFAULTS;
  }
}

export function saveCardTwinPaperSettings(storage: Pick<StorageLike, "setItem">, settings: CardTwinPaperSettings) {
  const bounded = {
    mode: settings.mode,
    brightness: clamp(settings.brightness, 0.85, 1.15, CARD_TWIN_PAPER_DEFAULTS.brightness),
    contrast: clamp(settings.contrast, 0.8, 1.1, CARD_TWIN_PAPER_DEFAULTS.contrast),
    grain: clamp(settings.grain, 0, 1, CARD_TWIN_PAPER_DEFAULTS.grain),
  } satisfies CardTwinPaperSettings;
  try { storage.setItem(STORAGE_KEY, JSON.stringify(bounded)); } catch { /* private storage may be unavailable */ }
}
