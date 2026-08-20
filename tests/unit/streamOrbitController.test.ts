import { describe, expect, it } from "vitest";
import {
  advanceStreamOrbitAngle,
  STREAM_ORBIT_ANGULAR_SPEED,
  STREAM_ORBIT_PERIOD_SECONDS,
} from "@/features/retro-office/systems/cameraLighting";

describe("single stream orbit controller", () => {
  it("advances at one revolution per 180 seconds", () => {
    expect(STREAM_ORBIT_PERIOD_SECONDS).toBe(180);
    expect(STREAM_ORBIT_ANGULAR_SPEED * STREAM_ORBIT_PERIOD_SECONDS).toBeCloseTo(
      Math.PI * 2,
    );
  });

  it("clamps frame deltas and never moves backwards", () => {
    expect(advanceStreamOrbitAngle(1, -1)).toBe(1);
    expect(advanceStreamOrbitAngle(1, 1)).toBeCloseTo(
      1 + STREAM_ORBIT_ANGULAR_SPEED * 0.05,
    );
  });
});