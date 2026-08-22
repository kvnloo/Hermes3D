import { describe, expect, it } from "vitest";
import { resolveCardTwinTilt } from "@/features/living-museum/exhibits/pokemon-cards/cardTwinMotion";

describe("CardTwin phone tilt", () => {
  it("maps normalized phone tilt to bounded layer parallax", () => {
    expect(resolveCardTwinTilt({ x: 1, y: -1 }, 4.2, false)).toEqual({ rotateX: 0.08, rotateY: 0.12, x: 0.084, y: -0.063 });
  });

  it("returns an exact neutral pose for reduced motion", () => {
    expect(resolveCardTwinTilt({ x: 1, y: 1 }, 4.2, true)).toEqual({ rotateX: 0, rotateY: 0, x: 0, y: 0 });
  });
});
