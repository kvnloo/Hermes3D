import { describe, expect, it } from "vitest";
import {
  PREVIEW_BASE_SPEED_UNITS_PER_SECOND,
  PREVIEW_MAX_SPEED_UNITS_PER_SECOND,
  locomotionSpeedUnitsPerSecond,
  locomotionStepDistance,
} from "@/features/retro-office/core/locomotion";
import {
  CONVERSATION_APPROACH_SPEED,
  PING_PONG_APPROACH_SPEED,
  WALK_SPEED,
} from "@/features/retro-office/core/constants";

describe("2x locomotion preview", () => {
  it("calibrates the default rate to exactly twice the 60fps upstream baseline", () => {
    expect(PREVIEW_BASE_SPEED_UNITS_PER_SECOND).toBe(36);
    expect(locomotionSpeedUnitsPerSecond()).toBe(36);
  });

  it("normalizes working and special-route rates to the bounded preview cap", () => {
    expect(PREVIEW_MAX_SPEED_UNITS_PER_SECOND).toBe(54);
    expect(locomotionSpeedUnitsPerSecond(WALK_SPEED, true)).toBe(54);
    expect(locomotionSpeedUnitsPerSecond(PING_PONG_APPROACH_SPEED)).toBe(54);
    expect(locomotionSpeedUnitsPerSecond(CONVERSATION_APPROACH_SPEED)).toBe(54);
  });

  it.each([30, 60, 120])("travels the same distance in one second at %i fps", (fps) => {
    const distance = Array.from({ length: fps }).reduce<number>(
      (sum) => sum + locomotionStepDistance(PREVIEW_BASE_SPEED_UNITS_PER_SECOND, 1 / fps),
      0,
    );
    expect(distance).toBeCloseTo(36, 10);
  });

  it("rejects negative frame deltas", () => {
    expect(locomotionStepDistance(36, -1)).toBe(0);
  });
});
