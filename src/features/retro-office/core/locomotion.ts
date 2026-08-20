import {
  LOCOMOTION_PREVIEW_MULTIPLIER,
  MAX_PREVIEW_STATE_SPEED_MULTIPLIER,
  UPSTREAM_BASELINE_FPS,
  WALK_SPEED,
  WORKING_WALK_SPEED_MULTIPLIER,
} from "@/features/retro-office/core/constants";

export const PREVIEW_BASE_SPEED_UNITS_PER_SECOND =
  WALK_SPEED * UPSTREAM_BASELINE_FPS * LOCOMOTION_PREVIEW_MULTIPLIER;

export const PREVIEW_MAX_SPEED_UNITS_PER_SECOND =
  PREVIEW_BASE_SPEED_UNITS_PER_SECOND * MAX_PREVIEW_STATE_SPEED_MULTIPLIER;

export function locomotionSpeedUnitsPerSecond(
  walkSpeedPerFrame = WALK_SPEED,
  working = false,
): number {
  const stateSpeedPerFrame = working
    ? walkSpeedPerFrame * WORKING_WALK_SPEED_MULTIPLIER
    : walkSpeedPerFrame;
  const previewSpeed =
    stateSpeedPerFrame * UPSTREAM_BASELINE_FPS * LOCOMOTION_PREVIEW_MULTIPLIER;
  return Math.min(previewSpeed, PREVIEW_MAX_SPEED_UNITS_PER_SECOND);
}

export function locomotionStepDistance(
  speedUnitsPerSecond: number,
  deltaSeconds: number,
): number {
  return speedUnitsPerSecond * Math.max(0, deltaSeconds);
}
