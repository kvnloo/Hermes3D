import { describe, expect, it } from "vitest";
import {
  reduceCardTwinFullscreen,
  selectCardTwinMotionSource,
} from "@/features/living-museum/exhibits/pokemon-cards/cardTwinInteraction";

describe("CardTwin motion input selection", () => {
  it("uses live orientation instead of a stale non-zero pointer", () => {
    expect(selectCardTwinMotionSource(true, true)).toBe("orientation");
  });

  it("keeps pointer as the fallback until an orientation sample arrives", () => {
    expect(selectCardTwinMotionSource(true, false)).toBe("pointer");
    expect(selectCardTwinMotionSource(false, false)).toBe("pointer");
  });
});

describe("CardTwin fullscreen inspection", () => {
  it("moves through request, browser confirmation, and browser exit", () => {
    let state = reduceCardTwinFullscreen("gallery", { type: "inspect" });
    expect(state).toBe("requesting");
    state = reduceCardTwinFullscreen(state, { type: "fullscreenchange", active: true });
    expect(state).toBe("fullscreen");
    state = reduceCardTwinFullscreen(state, { type: "fullscreenchange", active: false });
    expect(state).toBe("gallery");
  });

  it("returns to gallery when the fullscreen request is rejected", () => {
    expect(reduceCardTwinFullscreen("requesting", { type: "request-failed" })).toBe("gallery");
  });
});
