export type CardTwinMotionSource = "pointer" | "orientation";

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
