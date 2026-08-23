import { describe, expect, it } from "vitest";
import { createFixtureTruthAdapter } from "@/features/mobile-game/truthAdapter";

describe("mobile game fixture truth adapter", () => {
  it("applies an assignment once and advances only from synthetic evidence", () => {
    const adapter = createFixtureTruthAdapter();
    expect(adapter.issue({ version: 1, commandId: "cmd-001", action: "assign", taskId: "task-mobile-shell", agentId: "agent-atlas" })).toEqual({ status: "applied" });
    expect(adapter.issue({ version: 1, commandId: "cmd-001", action: "assign", taskId: "task-mobile-shell", agentId: "agent-atlas" })).toEqual({ status: "duplicate" });
    expect(adapter.snapshot().tasks[0].status).toBe("queued");
    expect(adapter.applyEvidence({ version: 1, evidenceId: "ev-running-001", taskId: "task-mobile-shell", status: "running" })).toBe(true);
    expect(adapter.applyEvidence({ version: 1, evidenceId: "ev-review-001", taskId: "task-mobile-shell", status: "review" })).toBe(true);
    expect(adapter.snapshot().tasks[0].status).toBe("review");
  });

  it("rejects malformed or destructive commands without consuming their ID", () => {
    const adapter = createFixtureTruthAdapter();
    expect(adapter.issue({ version: 1, commandId: "cmd-unsafe", action: "delete", taskId: "task-mobile-shell" })).toEqual({ status: "rejected" });
    expect(adapter.issue({ version: 1, commandId: "cmd-unsafe", action: "assign", taskId: "task-mobile-shell", agentId: "agent-atlas" })).toEqual({ status: "applied" });
  });

  it("exposes stale source metadata and refuses commands while disconnected", () => {
    const adapter = createFixtureTruthAdapter({
      stale: true,
      observedAt: "2026-08-22T17:42:00Z",
    });

    expect(adapter.snapshot()).toMatchObject({
      stale: true,
      observedAt: "2026-08-22T17:42:00Z",
    });
    expect(adapter.issue({ version: 1, commandId: "cmd-stale", action: "assign", taskId: "task-mobile-shell", agentId: "agent-atlas" })).toEqual({ status: "unavailable" });
    expect(adapter.snapshot().handledCommandIds).toEqual([]);
  });
});
