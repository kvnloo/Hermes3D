import { describe, expect, it } from "vitest";
import {
  CARD_TWIN_INPUT_INITIAL,
  reduceCardTwinInput,
  reduceCardTwinFullscreen,
  selectCardTwinMotionSource,
} from "@/features/living-museum/exhibits/pokemon-cards/cardTwinInteraction";

describe("CardTwin motion input selection", () => {
  it("promotes Auto to gyro only after a valid orientation sample", () => {
    const next = reduceCardTwinInput(CARD_TWIN_INPUT_INITIAL, { type: "orientation-sample" });
    expect(next).toMatchObject({ preference: "auto", source: "gyro", availability: "available" });
  });

  it("does not let a page scroll change Auto or gyro state", () => {
    const gyro = reduceCardTwinInput(CARD_TWIN_INPUT_INITIAL, { type: "orientation-sample" });
    expect(reduceCardTwinInput(gyro, { type: "page-scroll" })).toBe(gyro);
  });

  it("activates touch parallax only after an explicit Touch selection", () => {
    const next = reduceCardTwinInput(CARD_TWIN_INPUT_INITIAL, { type: "select-touch" });
    expect(next).toMatchObject({ preference: "touch", source: "touch" });
  });

  it("offers fallback after denial without silently activating touch", () => {
    const next = reduceCardTwinInput(CARD_TWIN_INPUT_INITIAL, { type: "orientation-denied" });
    expect(next).toEqual({ preference: "auto", source: "none", availability: "denied" });
  });

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
