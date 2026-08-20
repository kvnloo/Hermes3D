import { describe, expect, it } from "vitest";
import {
  AUTO_CAMERA_SEQUENCE,
  autoCameraModeAt,
  resolveCameraDwellSeconds,
  resolveStreamCameraMode,
} from "@/features/retro-office/core/streamCameraModes";

describe("stream camera modes", () => {
  it("normalizes supported modes and aliases", () => {
    expect(resolveStreamCameraMode("wide")).toBe("WIDE");
    expect(resolveStreamCameraMode("desk")).toBe("DEFAULT");
    expect(resolveStreamCameraMode("overhead")).toBe("DRONE");
  });

  it("fails closed to the exact default for unknown or popup-related values", () => {
    expect(resolveStreamCameraMode("unknown")).toBe("DEFAULT");
    expect(resolveStreamCameraMode("dismiss-popup")).toBe("DEFAULT");
    expect(resolveStreamCameraMode(null)).toBe("DEFAULT");
  });

  it("clamps dwell time to stream-safe bounds", () => {
    expect(resolveCameraDwellSeconds("2")).toBe(20);
    expect(resolveCameraDwellSeconds("45")).toBe(45);
    expect(resolveCameraDwellSeconds("600")).toBe(60);
    expect(resolveCameraDwellSeconds("bad")).toBe(45);
  });

  it("uses a deterministic auto sequence", () => {
    expect(AUTO_CAMERA_SEQUENCE).toEqual(["DEFAULT", "WIDE", "ORBIT", "DRONE"]);
    expect(autoCameraModeAt(0, 20)).toBe("DEFAULT");
    expect(autoCameraModeAt(20, 20)).toBe("WIDE");
    expect(autoCameraModeAt(40, 20)).toBe("ORBIT");
    expect(autoCameraModeAt(60, 20)).toBe("DRONE");
    expect(autoCameraModeAt(80, 20)).toBe("DEFAULT");
  });
});