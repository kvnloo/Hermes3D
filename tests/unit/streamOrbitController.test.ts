import { describe, expect, it } from "vitest";
import {
  advanceStreamOrbitAngle,
  STREAM_ORBIT_ANGULAR_SPEED,
  STREAM_ORBIT_HEIGHT,
  STREAM_ORBIT_INITIAL_ANGLE,
  STREAM_ORBIT_PERIOD_SECONDS,
  STREAM_ORBIT_RADIUS,
  STREAM_ORBIT_TARGET,
} from "@/features/retro-office/systems/cameraLighting";

describe("single stream orbit controller", () => {
  it("advances at one revolution per 60 seconds", () => {
    expect(STREAM_ORBIT_PERIOD_SECONDS).toBe(60);
    expect(STREAM_ORBIT_ANGULAR_SPEED * STREAM_ORBIT_PERIOD_SECONDS).toBeCloseTo(
      Math.PI * 2,
    );
  });

  it("uses the authored occupied-office composition", () => {
    expect(STREAM_ORBIT_TARGET).toEqual([0, 1.15, -9.72]);
    expect(STREAM_ORBIT_RADIUS).toBe(18);
    expect(STREAM_ORBIT_HEIGHT).toBe(13.25);
    expect(STREAM_ORBIT_INITIAL_ANGLE).toBeCloseTo(Math.atan2(14, 11.5));
  });

  it("tracks elapsed time exactly and never moves backwards", () => {
    expect(advanceStreamOrbitAngle(1, -1)).toBe(1);
    expect(advanceStreamOrbitAngle(1, 1)).toBeCloseTo(
      1 + STREAM_ORBIT_ANGULAR_SPEED,
    );
  });
});