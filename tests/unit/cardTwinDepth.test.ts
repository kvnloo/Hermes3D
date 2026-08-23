import { describe, expect, it } from "vitest";
import { CARD_TWIN_CARDS } from "@/features/living-museum/exhibits/pokemon-cards/cardTwinCatalog";
import {
  CARD_TWIN_MIN_PLANE_SEPARATION,
  resolveCardTwinSurfaceDepths,
} from "@/features/living-museum/exhibits/pokemon-cards/cardTwinDepth";

describe("CardTwin surface depth contract", () => {
  it("keeps every rendered surface strictly separated at every rigid card tilt", () => {
    for (const card of CARD_TWIN_CARDS) {
      const surfaces = resolveCardTwinSurfaceDepths(card.layers);
      const ordered = Object.values(surfaces).sort((a, b) => a - b);

      for (let index = 1; index < ordered.length; index += 1) {
        expect(ordered[index] - ordered[index - 1]).toBeGreaterThanOrEqual(
          CARD_TWIN_MIN_PLANE_SEPARATION,
        );
      }

      // A rigid rotation preserves the normal-axis distance between parallel planes.
      for (const tilt of [-0.22, -0.11, 0, 0.11, 0.22]) {
        const projected = ordered.map((depth) => depth * Math.cos(tilt));
        expect(new Set(projected.map((depth) => depth.toFixed(8))).size).toBe(ordered.length);
      }
    }
  });
});