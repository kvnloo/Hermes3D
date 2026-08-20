import { describe, expect, it } from "vitest";
import {
  parsePublicDemoAgentState,
  rendererHeartbeatIsHealthy,
  syntheticStateAt,
} from "@/lib/live/publicDemoState";

describe("public demo state contract", () => {
  it("accepts only the four synthetic states", () => {
    for (const state of ["idle", "thinking", "waiting", "offline"]) {
      expect(parsePublicDemoAgentState({ state, synthetic: true })).toEqual({ state, synthetic: true });
    }
    expect(parsePublicDemoAgentState({ state: "running", synthetic: true })).toBeNull();
  });

  it.each(["task", "prompt", "logs", "messages", "model", "host", "path", "id"])("refuses prohibited or unknown field %s", (field) => {
    expect(parsePublicDemoAgentState({ state: "idle", synthetic: true, [field]: "private" })).toBeNull();
  });

  it("does not mutate prohibited input", () => {
    const input = Object.freeze({ state: "thinking", synthetic: true, prompt: "private" });
    expect(parsePublicDemoAgentState(input)).toBeNull();
    expect(input.prompt).toBe("private");
  });

  it("uses deterministic bounded state intervals", () => {
    expect(syntheticStateAt(0, 0)).toBe("idle");
    expect(syntheticStateAt(7_000, 0)).toBe("thinking");
    expect(syntheticStateAt(11_000, 1)).toBe("waiting");
  });

  it("fails renderer heartbeat closed when absent, stale, or clock-invalid", () => {
    expect(rendererHeartbeatIsHealthy(null, 10_000)).toBe(false);
    expect(rendererHeartbeatIsHealthy(1_000, 4_001)).toBe(false);
    expect(rendererHeartbeatIsHealthy(5_000, 4_999)).toBe(false);
    expect(rendererHeartbeatIsHealthy(1_000, 4_000)).toBe(true);
  });
});
