import { describe, expect, it } from "vitest";
import {
  applyCardTwinMotionFilter,
  dampCardTwinMotion,
  getCardTwinMotionCapability,
  normalizeCardTwinOrientation,
  resolveCardTwinTilt,
} from "@/features/living-museum/exhibits/pokemon-cards/cardTwinMotion";

describe("CardTwin phone tilt", () => {
  it("maps normalized phone tilt to bounded layer parallax", () => {
    expect(resolveCardTwinTilt({ x: 1, y: -1 }, 4.2, false)).toEqual({ rotateX: 0.08, rotateY: 0.12, x: 0.084, y: -0.063 });
  });

  it("returns an exact neutral pose for reduced motion", () => {
    expect(resolveCardTwinTilt({ x: 1, y: 1 }, 4.2, true)).toEqual({ rotateX: 0, rotateY: 0, x: 0, y: 0 });
  });

  it("calibrates beta and gamma to a neutral pose", () => {
    const neutral = { beta: 18, gamma: -7 };
    expect(normalizeCardTwinOrientation(neutral, neutral, 0)).toEqual({ x: 0, y: 0 });
    expect(normalizeCardTwinOrientation({ beta: 32, gamma: 4 }, neutral, 0)).toEqual({ x: 0.5, y: 0.5 });
  });

  it("maps orientation through portrait and landscape screen rotation", () => {
    const neutral = { beta: 0, gamma: 0 };
    expect(normalizeCardTwinOrientation({ beta: 14, gamma: 11 }, neutral, 0)).toEqual({ x: 0.5, y: 0.5 });
    expect(normalizeCardTwinOrientation({ beta: 14, gamma: 11 }, neutral, 90)).toEqual({ x: 0.5, y: -0.5 });
    expect(normalizeCardTwinOrientation({ beta: 14, gamma: 11 }, neutral, -90)).toEqual({ x: -0.5, y: 0.5 });
  });

  it("clamps orientation and applies a bounded low-pass response", () => {
    const target = normalizeCardTwinOrientation({ beta: 180, gamma: -180 }, { beta: 0, gamma: 0 }, 0);
    expect(target).toEqual({ x: -1, y: 1 });
    expect(applyCardTwinMotionFilter({ x: 0, y: 0 }, target, 0.2)).toEqual({ x: -0.2, y: 0.2 });
    expect(applyCardTwinMotionFilter({ x: 0.95, y: -0.95 }, { x: 2, y: -2 }, 1)).toEqual({ x: 1, y: -1 });
  });

  it.each([60, 120, 144])("converges to the same pose after one second at %iHz", (hz) => {
    let pose = { x: 0, y: 0 };
    for (let frame = 0; frame < hz; frame += 1) {
      pose = dampCardTwinMotion(pose, { x: 1, y: -0.75 }, 1 / hz, 12);
    }

    expect(pose.x).toBeCloseTo(1 - Math.exp(-12), 10);
    expect(pose.y).toBeCloseTo(-0.75 * (1 - Math.exp(-12)), 10);
  });

  it("clamps long frame gaps while preserving an exact reduced-motion snap", () => {
    expect(dampCardTwinMotion({ x: 0, y: 0 }, { x: 1, y: -1 }, 1, 12)).toEqual(
      dampCardTwinMotion({ x: 0, y: 0 }, { x: 1, y: -1 }, 0.05, 12),
    );
    expect(dampCardTwinMotion({ x: 0.25, y: -0.25 }, { x: 1, y: -1 }, 0, Infinity)).toEqual({ x: 1, y: -1 });
  });

  it("fails closed when orientation is unavailable or permission is denied", () => {
    expect(getCardTwinMotionCapability(false, false, "unknown")).toBe("unavailable");
    expect(getCardTwinMotionCapability(true, true, "denied")).toBe("denied");
    expect(getCardTwinMotionCapability(true, true, "granted")).toBe("orientation");
    expect(getCardTwinMotionCapability(true, false, "unknown")).toBe("orientation");
  });
});
