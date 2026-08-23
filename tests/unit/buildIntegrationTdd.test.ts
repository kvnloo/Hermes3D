import { afterEach, describe, expect, it, vi } from "vitest";
import { createBuildLifecycle } from "../../server/build-events";
import {
  applyBuildEvent,
  parsePublicBuildEvent,
  type PublicBuildEvent,
} from "@/features/building/buildContract";
import {
  clearPersistedBuildState,
  loadPersistedBuildState,
  persistBuildState,
} from "@/features/building/buildStore";

const baseStart = {
  version: 1,
  type: "build.start",
  buildId: "build-42",
  projectLabel: "Living Museum",
  assetLabel: "Museum annex",
  stage: "DISCOVER",
  progress: null,
  revision: "a1b2c3d",
  timestamp: "2026-08-22T20:00:00.000Z",
  agentCount: 2,
  componentIds: ["museum-annex-shell"],
} as const;

function makeLifecycle(overrides = {}) {
  return createBuildLifecycle({ revision: "a1b2c3d4e5f6", quietMs: 20, stageMs: 10, ...overrides });
}

afterEach(() => {
  vi.useRealTimers();
  clearPersistedBuildState();
});

describe("lifecycle debounce", () => {
  it("does not complete while compiler activity keeps arriving", () => {
    vi.useFakeTimers();
    const lifecycle = makeLifecycle();
    type LifecycleEvent = NonNullable<ReturnType<typeof lifecycle.current>>;
    const events: LifecycleEvent[] = [];
    const unsubscribe = lifecycle.subscribe((event: LifecycleEvent) => events.push(event));
    lifecycle.compilerActivity();
    // Keep the compiler busy past several quiet windows.
    for (let t = 0; t < 5; t += 1) {
      vi.advanceTimersByTime(15);
      lifecycle.compilerActivity();
    }
    expect(events.some((event) => event.type === "build.complete")).toBe(false);
    // After activity stops, the quiet window completes the build exactly once.
    vi.advanceTimersByTime(5000);
    const completions = events.filter((event) => event.type === "build.complete");
    expect(completions).toHaveLength(1);
    expect(completions[0]).toMatchObject({ stage: "READY", progress: 100 });
    unsubscribe();
    lifecycle.close();
  });

  it("restarts a fresh lifecycle on activity after fail", () => {
    vi.useFakeTimers();
    const lifecycle = makeLifecycle();
    type LifecycleEvent = NonNullable<ReturnType<typeof lifecycle.current>>;
    const events: LifecycleEvent[] = [];
    const unsubscribe = lifecycle.subscribe((event: LifecycleEvent) => events.push(event));
    lifecycle.compilerActivity();
    lifecycle.fail();
    const failedIndex = events.map((event) => event.type).lastIndexOf("build.fail");
    lifecycle.compilerActivity();
    expect(events[failedIndex + 1].type).toBe("build.start");
    unsubscribe();
    lifecycle.close();
  });
});

describe("strict build event redaction", () => {
  it("rejects every disallowed mutation of the public shape", () => {
    const cases: Array<[unknown, RegExp]> = [
      [{ ...baseStart, type: "build.stderr" }, /type/i],
      [{ ...baseStart, revision: "TOOLONGREV" }, /revision/i],
      [{ ...baseStart, timestamp: "not-a-date" }, /timestamp/i],
      [{ ...baseStart, agentCount: -1 }, /agent/i],
      [{ ...baseStart, agentCount: 1000 }, /agent/i],
      [{ ...baseStart, stage: "SECRET_STAGE" }, /stage/i],
      [{ ...baseStart, buildId: "../escape" }, /build ID/i],
      [{ ...baseStart, componentIds: ["../../etc"] }, /component/i],
      [`${baseStart}`, /object/i],
      [[baseStart], /object/i],
    ];
    for (const [input, pattern] of cases) {
      expect(() => parsePublicBuildEvent(input)).toThrow(pattern);
    }
  });

  it("accepts componentIds omitted entirely", () => {
    const { componentIds: _omitted, ...rest } = baseStart;
    const parsed = parsePublicBuildEvent(rest as PublicBuildEvent);
    expect(parsed.componentIds).toBeUndefined();
  });
});

describe("hmr/remount state persistence", () => {
  it("survives a simulated HMR remount round-trip", () => {
    const state = applyBuildEvent(applyBuildEvent(null, baseStart), {
      ...baseStart,
      type: "asset.stage",
      stage: "INTEGRATE",
      progress: 82,
      timestamp: "2026-08-22T20:00:04.000Z",
    });
    persistBuildState(state);
    // Remount: fresh read from storage must equal the exact prior state.
    expect(loadPersistedBuildState()).toEqual(state);
    // And a restored active state can accept further events without replaying.
    const next = applyBuildEvent(loadPersistedBuildState(), {
      ...baseStart,
      type: "asset.stage",
      stage: "VERIFY",
      progress: 96,
      timestamp: "2026-08-22T20:00:05.000Z",
    });
    expect(next.stage).toBe("VERIFY");
    expect(next.status).toBe("building");
  });

  it("keeps rendering when localStorage writes throw", () => {
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = () => {
      throw new Error("quota exceeded");
    };
    try {
      expect(() => persistBuildState(applyBuildEvent(null, baseStart))).not.toThrow();
      expect(() => clearPersistedBuildState()).not.toThrow();
    } finally {
      localStorage.setItem = originalSetItem;
    }
  });

  it("rejects persisted payloads whose status or fields were tampered with", () => {
    persistBuildState(applyBuildEvent(null, baseStart));
    const raw = localStorage.getItem("hermes3d.build-state.v1") ?? "";
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    localStorage.setItem(
      "hermes3d.build-state.v1",
      JSON.stringify({ ...parsed, status: "hacked" }),
    );
    expect(loadPersistedBuildState()).toBeNull();

    const eventOnly: Record<string, unknown> = { ...parsed };
    delete eventOnly.status;
    delete eventOnly.finishedVisible;
    localStorage.setItem(
      "hermes3d.build-state.v1",
      JSON.stringify({ ...eventOnly, command: "rm -rf /", status: "ready", finishedVisible: true }),
    );
    expect(loadPersistedBuildState()).toBeNull();
  });
});

describe("build-completes-before-animation semantics", () => {
  it("treats an early matching-revision completion as stale until VERIFY was reached", () => {
    const building = applyBuildEvent(null, baseStart);
    // Completion arrives while the client has only seen FRAME — animation never
    // reached VERIFY, so the reveal must be withheld.
    const early = applyBuildEvent(building, {
      ...baseStart,
      type: "asset.stage",
      stage: "FRAME",
      progress: null,
      timestamp: "2026-08-22T20:00:01.000Z",
    });
    const complete = applyBuildEvent(early, {
      ...baseStart,
      type: "build.complete",
      stage: "READY",
      progress: 100,
      timestamp: "2026-08-22T20:00:02.000Z",
    });
    expect(complete.status).toBe("stale");
    expect(complete.finishedVisible).toBe(false);
  });

  it("reveals the finished building once completion follows VERIFY", () => {
    let state = applyBuildEvent(null, baseStart);
    for (const [stage, progress] of [
      ["GEOMETRY", 40],
      ["VERIFY", 98],
    ] as const) {
      state = applyBuildEvent(state, {
        ...baseStart,
        type: "asset.stage",
        stage,
        progress,
        timestamp: "2026-08-22T20:00:03.000Z",
      });
    }
    const ready = applyBuildEvent(state, {
      ...baseStart,
      type: "build.complete",
      stage: "READY",
      progress: 100,
      timestamp: "2026-08-22T20:00:04.000Z",
    });
    expect(ready.status).toBe("ready");
    expect(ready.finishedVisible).toBe(true);
  });
});
