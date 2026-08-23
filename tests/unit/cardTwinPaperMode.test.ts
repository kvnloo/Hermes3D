import { describe, expect, it } from "vitest";
import {
  CARD_TWIN_PAPER_DEFAULTS,
  loadCardTwinPaperSettings,
  resolveCardTwinMaterial,
  saveCardTwinPaperSettings,
} from "@/features/living-museum/exhibits/pokemon-cards/cardTwinPaperMode";

describe("CardTwin paper display mode", () => {
  it("uses a near-zero-gloss matte material without changing texture content", () => {
    expect(resolveCardTwinMaterial("glass")).toMatchObject({ roughness: 0.2, clearcoat: 0.42 });
    expect(resolveCardTwinMaterial("paper")).toMatchObject({ roughness: 0.96, metalness: 0, clearcoat: 0.01 });
  });

  it("persists bounded per-device calibration and rejects malformed storage", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
    };
    saveCardTwinPaperSettings(storage, { mode: "paper", brightness: 2, contrast: -1, grain: 4 });
    expect(loadCardTwinPaperSettings(storage)).toEqual({ mode: "paper", brightness: 1.15, contrast: 0.8, grain: 1 });
    values.set("cardtwin-paper-v1", "not-json");
    expect(loadCardTwinPaperSettings(storage)).toEqual(CARD_TWIN_PAPER_DEFAULTS);
  });
});
