export const STREAM_CAMERA_MODES = ["DEFAULT", "WIDE", "ORBIT", "DRONE", "AUTO"] as const;

export type StreamCameraMode = (typeof STREAM_CAMERA_MODES)[number];
export type AutoCameraMode = Exclude<StreamCameraMode, "AUTO">;

export const AUTO_CAMERA_SEQUENCE: readonly AutoCameraMode[] = [
  "DEFAULT",
  "WIDE",
  "ORBIT",
  "DRONE",
];

export const MIN_CAMERA_DWELL_SECONDS = 20;
export const MAX_CAMERA_DWELL_SECONDS = 60;
export const DEFAULT_CAMERA_DWELL_SECONDS = 45;

export const resolveStreamCameraMode = (value: string | null | undefined): StreamCameraMode => {
  const normalized = value?.trim().toUpperCase();
  if (normalized === "DESK" || normalized === "OVERHEAD") {
    return normalized === "DESK" ? "DEFAULT" : "DRONE";
  }
  return STREAM_CAMERA_MODES.includes(normalized as StreamCameraMode)
    ? (normalized as StreamCameraMode)
    : "DEFAULT";
};

export const resolveCameraDwellSeconds = (value: string | null | undefined): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_CAMERA_DWELL_SECONDS;
  return Math.min(MAX_CAMERA_DWELL_SECONDS, Math.max(MIN_CAMERA_DWELL_SECONDS, parsed));
};

export const autoCameraModeAt = (
  elapsedSeconds: number,
  dwellSeconds: number = DEFAULT_CAMERA_DWELL_SECONDS,
): AutoCameraMode => {
  const safeElapsed = Math.max(0, Number.isFinite(elapsedSeconds) ? elapsedSeconds : 0);
  const safeDwell = resolveCameraDwellSeconds(String(dwellSeconds));
  const index = Math.floor(safeElapsed / safeDwell) % AUTO_CAMERA_SEQUENCE.length;
  return AUTO_CAMERA_SEQUENCE[index];
};
