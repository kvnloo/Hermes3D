export type CardTwinMotionSource = "pointer" | "orientation" | "touch";

export type CardTwinInputState = {
  preference: "auto" | "gyro" | "touch";
  source: "none" | "gyro" | "touch" | "pointer";
  availability: "unknown" | "available" | "denied" | "unavailable";
};

export const CARD_TWIN_INPUT_INITIAL: CardTwinInputState = {
  preference: "auto",
  source: "none",
  availability: "unknown",
};

export type CardTwinInputEvent =
  | { type: "orientation-sample" }
  | { type: "orientation-denied" }
  | { type: "orientation-unavailable" }
  | { type: "select-auto" }
  | { type: "select-gyro" }
  | { type: "select-touch" }
  | { type: "page-scroll" };

export function reduceCardTwinInput(state: CardTwinInputState, event: CardTwinInputEvent): CardTwinInputState {
  if (event.type === "orientation-sample") {
    return state.preference === "touch"
      ? { ...state, availability: "available" }
      : { ...state, source: "gyro", availability: "available" };
  }
  if (event.type === "orientation-denied") return { ...state, source: "none", availability: "denied" };
  if (event.type === "orientation-unavailable") return { ...state, source: "none", availability: "unavailable" };
  if (event.type === "select-touch") return { ...state, preference: "touch", source: "touch" };
  if (event.type === "select-auto") return { ...state, preference: "auto", source: state.availability === "available" ? "gyro" : "none" };
  if (event.type === "select-gyro") return { ...state, preference: "gyro", source: state.availability === "available" ? "gyro" : "none" };
  return state;
}

export function selectCardTwinMotionSource(
  orientationEnabled: boolean,
  hasOrientationSample: boolean,
): CardTwinMotionSource {
  return orientationEnabled && hasOrientationSample ? "orientation" : "pointer";
}

export type CardTwinFullscreenState = "gallery" | "requesting" | "fullscreen";
export type CardTwinFullscreenEvent =
  | { type: "inspect" }
  | { type: "fullscreenchange"; active: boolean }
  | { type: "request-failed" };

export function reduceCardTwinFullscreen(
  state: CardTwinFullscreenState,
  event: CardTwinFullscreenEvent,
): CardTwinFullscreenState {
  if (event.type === "inspect") return state === "gallery" ? "requesting" : state;
  if (event.type === "fullscreenchange") return event.active ? "fullscreen" : "gallery";
  if (event.type === "request-failed" && state === "requesting") return "gallery";
  return state;
}
