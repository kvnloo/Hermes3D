import { afterEach, describe, expect, it, vi } from "vitest";
import { createBuildEventHandler, createBuildLifecycle } from "../../server/build-events";

type LifecycleEvent = {
  version: number;
  type: string;
  buildId: string;
  projectLabel: string;
  assetLabel: string;
  stage: string;
  progress: number | null;
  revision: string;
  timestamp: string;
  agentCount: number;
  componentIds?: string[];
};

const ALLOWED_KEYS = new Set([
  "version",
  "type",
  "buildId",
  "projectLabel",
  "assetLabel",
  "stage",
  "progress",
  "revision",
  "timestamp",
  "agentCount",
  "componentIds",
]);
const SAFE_ID = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/;
const SAFE_LABEL = /^[a-zA-Z0-9][a-zA-Z0-9 ()&+.,'_-]{0,63}$/;
const SHORT_REVISION = /^[a-f0-9]{7,12}$/;
const STAGES = new Set([
  "DISCOVER",
  "FRAME",
  "GEOMETRY",
  "MATERIALS",
  "LIGHTING",
  "INTEGRATE",
  "VERIFY",
  "READY",
]);
const EVENT_TYPES = new Set([
  "build.start",
  "build.progress",
  "asset.stage",
  "build.complete",
  "build.fail",
  "build.stale",
]);

function makeLifecycle(overrides = {}) {
  return createBuildLifecycle({
    revision: "a1b2c3d4e5f6",
    quietMs: 20,
    stageMs: 10,
    ...overrides,
  });
}

function collect(lifecycle: ReturnType<typeof createBuildLifecycle>) {
  const events: LifecycleEvent[] = [];
  const unsubscribe = lifecycle.subscribe((event: LifecycleEvent) => events.push(event));
  return { events, unsubscribe };
}

/** Splits an event stream into per-cycle segments delimited by build.start. */
function segments(events: LifecycleEvent[]): LifecycleEvent[][] {
  const out: LifecycleEvent[][] = [];
  for (const event of events) {
    if (event.type === "build.start") out.push([event]);
    else if (out.length > 0) out[out.length - 1].push(event);
  }
  return out;
}

afterEach(() => {
  vi.useRealTimers();
});

describe("slice-02: rebuild bursts debounce into exactly one bounded cycle", () => {
  it("collapses a tight rebuild burst into a single cycle", () => {
    vi.useFakeTimers();
    const lifecycle = makeLifecycle();
    const { events, unsubscribe } = collect(lifecycle);
    // A rebuild burst: many rapid compile signals within the quiet window.
    for (let i = 0; i < 25; i += 1) {
      lifecycle.compilerActivity();
      vi.advanceTimersByTime(2);
    }
    const starts = events.filter((event) => event.type === "build.start");
    expect(starts).toHaveLength(1);
    // One bounded visual sequence follows the single cycle.
    vi.advanceTimersByTime(5000);
    expect(events.filter((event) => event.type === "build.start")).toHaveLength(1);
    expect(events.filter((event) => event.type === "build.complete")).toHaveLength(1);
    // Each stage transition happened exactly once in that cycle.
    for (const type of ["FRAME", "GEOMETRY", "MATERIALS", "LIGHTING", "INTEGRATE", "VERIFY"]) {
      expect(events.filter((event) => event.stage === type)).toHaveLength(1);
    }
    unsubscribe();
    lifecycle.close();
  });

  it("opens exactly one fresh cycle for each distinct burst after completion", () => {
    vi.useFakeTimers();
    const lifecycle = makeLifecycle({ quietMs: 20, stageMs: 5 });
    const { events, unsubscribe } = collect(lifecycle);
    lifecycle.compilerActivity();
    vi.advanceTimersByTime(5000); // burst 1 settles into a complete cycle
    lifecycle.compilerActivity(); // burst 2
    vi.advanceTimersByTime(5000);
    expect(events.filter((event) => event.type === "build.start")).toHaveLength(2);
    expect(events.filter((event) => event.type === "build.complete")).toHaveLength(2);
    unsubscribe();
    lifecycle.close();
  });
});

describe("slice-02: lifecycle transitions fire correctly and exactly once per cycle", () => {
  it("emits nothing after fail until a genuinely new cycle starts", () => {
    vi.useFakeTimers();
    const lifecycle = makeLifecycle();
    const { events, unsubscribe } = collect(lifecycle);
    lifecycle.compilerActivity();
    lifecycle.fail();
    const failCount = events.filter((event) => event.type === "build.fail").length;
    expect(failCount).toBe(1);
    const failIndex = events.map((event) => event.type).lastIndexOf("build.fail");
    vi.advanceTimersByTime(5000);
    // The dead cycle must stay dead: no trailing progress/stage events may
    // leak out after build.fail (the pending quiet timer was never disarmed).
    expect(events.slice(failIndex + 1)).toEqual([]);
    unsubscribe();
    lifecycle.close();
  });

  it("emits nothing after stale until a genuinely new cycle starts", () => {
    vi.useFakeTimers();
    const lifecycle = makeLifecycle();
    const { events, unsubscribe } = collect(lifecycle);
    lifecycle.compilerActivity();
    lifecycle.stale();
    expect(events.filter((event) => event.type === "build.stale")).toHaveLength(1);
    const staleIndex = events.map((event) => event.type).lastIndexOf("build.stale");
    vi.advanceTimersByTime(5000);
    expect(events.slice(staleIndex + 1)).toEqual([]);
    unsubscribe();
    lifecycle.close();
  });

  it("keeps the restarted cycle clean: no timers from the failed cycle fire in the new one", () => {
    vi.useFakeTimers();
    const lifecycle = makeLifecycle();
    const { events, unsubscribe } = collect(lifecycle);
    lifecycle.compilerActivity(); // cycle 1
    lifecycle.fail();
    lifecycle.compilerActivity(); // cycle 2 begins immediately
    vi.advanceTimersByTime(5000);
    const cycles = segments(events);
    expect(cycles.length).toBe(2);
    // Every cycle segment must contain each visual stage at most once — the
    // failed cycle's pending stage timers must not re-enter the live cycle.
    for (const cycle of cycles) {
      const seen = new Map<string, number>();
      for (const event of cycle) {
        seen.set(event.stage, (seen.get(event.stage) ?? 0) + 1);
        expect(seen.get(event.stage)).toBeLessThanOrEqual(1);
      }
      expect(cycle.filter((event) => event.type === "build.complete")).toHaveLength(
        cycle === cycles[cycles.length - 1] ? 1 : 0,
      );
    }
    unsubscribe();
    lifecycle.close();
  });
});

describe("slice-02: strict redaction of emitted server payloads", () => {
  it("emits only the public allowlist across a full lifecycle", () => {
    vi.useFakeTimers();
    const lifecycle = makeLifecycle({ agentCount: 3 });
    const { events, unsubscribe } = collect(lifecycle);
    lifecycle.compilerActivity();
    vi.advanceTimersByTime(5000);
    lifecycle.compilerActivity();
    lifecycle.fail();
    lifecycle.compilerActivity();
    lifecycle.stale();
    vi.advanceTimersByTime(5000);
    expect(events.length).toBeGreaterThan(5);
    for (const event of events) {
      for (const key of Object.keys(event)) {
        expect(ALLOWED_KEYS.has(key)).toBe(true);
      }
      expect(EVENT_TYPES.has(event.type)).toBe(true);
      expect(STAGES.has(event.stage)).toBe(true);
      expect(event.buildId).toMatch(SAFE_ID);
      expect(event.projectLabel).toMatch(SAFE_LABEL);
      expect(event.assetLabel).toMatch(SAFE_LABEL);
      expect(event.revision).toMatch(SHORT_REVISION);
      expect(Number.isFinite(Date.parse(event.timestamp))).toBe(true);
      expect(event.agentCount).toBe(3);
      if (event.progress !== null) {
        expect(event.progress).toBeGreaterThanOrEqual(0);
        expect(event.progress).toBeLessThanOrEqual(100);
      }
      if (event.componentIds !== undefined) {
        expect(event.componentIds.every((id) => SAFE_ID.test(id))).toBe(true);
      }
      // No free-text field may smuggle paths, commands or secrets.
      const serialized = JSON.stringify(event);
      expect(serialized).not.toMatch(/\/|\.\.|\\|rm -rf|password|secret|token|home\//i);
    }
    unsubscribe();
    lifecycle.close();
  });
});

describe("slice-02: production stream stays disabled without the arming flag", () => {
  function mockReq(url: string) {
    return { url, on: () => {} };
  }
  function mockRes() {
    return {
      statusCode: 0,
      headers: null as Record<string, string> | null,
      body: "",
      writeHead(code: number, headers: Record<string, string>) {
        this.statusCode = code;
        this.headers = headers;
      },
      end(body?: string) {
        this.body = body ?? "";
      },
      write(chunk: string) {
        this.body += chunk;
      },
    };
  }

  it("answers 404 and never opens an SSE stream when unarmed", () => {
    const lifecycle = makeLifecycle();
    const handler = createBuildEventHandler({ enabled: false, lifecycle });
    const res = mockRes();
    const handled = handler(mockReq("/api/build-events"), res);
    expect(handled).toBe(true);
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body)).toEqual({ error: "build events disabled" });
    lifecycle.close();
  });

  it("streams only armed lifecycles on the exact endpoint path", () => {
    const lifecycle = makeLifecycle();
    const handler = createBuildEventHandler({ enabled: true, lifecycle });
    const miss = mockRes();
    expect(handler(mockReq("/api/build-events/other"), miss)).toBe(false);
    expect(miss.statusCode).toBe(0);
    lifecycle.compilerActivity();
    const res = mockRes();
    expect(handler(mockReq("/api/build-events"), res)).toBe(true);
    expect(res.statusCode).toBe(200);
    expect(res.headers?.["content-type"]).toContain("text/event-stream");
    expect(res.body).toContain("event: build");
    lifecycle.close();
  });
});
