import { describe, expect, it, vi, afterEach } from "vitest";
import { EventEmitter } from "node:events";
import type { ServerResponse } from "node:http";
import {
  createBuildEventHandler,
  createBuildLifecycle,
  createBuildOutputObserver,
} from "../../server/build-events";

type Lifecycle = ReturnType<typeof createBuildLifecycle>;

type FakeRes = ServerResponse & {
  headers: { code: number; "content-type"?: string; "cache-control"?: string } | null;
  body: string;
};

const PUBLIC_FIELDS = new Set([
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

const STAGES = [
  "DISCOVER",
  "FRAME",
  "GEOMETRY",
  "MATERIALS",
  "LIGHTING",
  "INTEGRATE",
  "VERIFY",
  "READY",
];

function makeLifecycle(overrides = {}) {
  return createBuildLifecycle({ revision: "a1b2c3d4e5f6", quietMs: 10, stageMs: 10, ...overrides });
}

function emittedEvents(lifecycle: Lifecycle, trigger: () => void) {
  const events: ReturnType<Lifecycle["current"]>[] = [];
  const unsubscribe = lifecycle.subscribe((event: NonNullable<ReturnType<Lifecycle["current"]>>) => events.push(event));
  trigger();
  unsubscribe();
  return events;
}

afterEach(() => vi.useRealTimers());

describe("createBuildLifecycle", () => {
  it("fails closed before emitting unsafe server metadata", () => {
    expect(() => makeLifecycle({ revision: "/home/kevin/private-repo" })).toThrow(
      "Invalid public build revision",
    );
    expect(() => makeLifecycle({ agentCount: 100 })).toThrow(
      "Invalid aggregate agent count",
    );
    expect(() => makeLifecycle({ agentCount: 1.5 })).toThrow(
      "Invalid aggregate agent count",
    );
  });

  it("emits only the public allowlist fields on every event", () => {
    vi.useFakeTimers();
    const lifecycle = makeLifecycle();
    const events = emittedEvents(lifecycle, () => {
      lifecycle.compilerActivity();
      vi.advanceTimersByTime(200);
    });
    lifecycle.close();

    expect(events.length).toBeGreaterThan(0);
    for (const event of events) {
      expect(new Set(Object.keys(event))).toEqual(PUBLIC_FIELDS);
      expect(event.version).toBe(1);
      expect(event.projectLabel).toBe("Living Museum");
      expect(event.assetLabel).toBe("Museum annex");
      expect(event.revision).toMatch(/^[a-f0-9]{7,12}$/);
      expect(STAGES).toContain(event.stage);
      expect(event.agentCount).toBeGreaterThanOrEqual(0);
      expect(event.agentCount).toBeLessThanOrEqual(99);
      expect(Number.isFinite(Date.parse(event.timestamp))).toBe(true);
      for (const id of event.componentIds ?? []) {
        expect(id).toMatch(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/);
      }
    }
  });

  it("starts with build.start/DISCOVER and never includes path-like or command-like text", () => {
    vi.useFakeTimers();
    const lifecycle = makeLifecycle();
    const [first] = emittedEvents(lifecycle, () => lifecycle.compilerActivity());
    lifecycle.close();

    expect(first.type).toBe("build.start");
    expect(first.stage).toBe("DISCOVER");
    const serialized = JSON.stringify(emittedEvents(lifecycle, () => { lifecycle.compilerActivity(); vi.advanceTimersByTime(500); lifecycle.close(); }));
    expect(serialized).not.toMatch(/\/|\.\.(\/)|npm |node |process\.env|home\//i);
  });

  it("completes after compiler goes quiet and stages advance to VERIFY/READY", () => {
    vi.useFakeTimers();
    const lifecycle = makeLifecycle();
    const events = emittedEvents(lifecycle, () => {
      lifecycle.compilerActivity();
      vi.advanceTimersByTime(3000);
    });
    lifecycle.close();

    const types = events.map((event) => event.type);
    expect(types[0]).toBe("build.start");
    expect(types).toContain("asset.stage");
    const complete = events.find((event) => event.type === "build.complete");
    expect(complete).toBeDefined();
    expect(complete.stage).toBe("READY");
    expect(complete.progress).toBe(100);
  });

  it("labels post-compile stages as presentation rather than compilation", () => {
    vi.useFakeTimers();
    const lifecycle = makeLifecycle({ quietMs: 5, stageMs: 10 });
    const events = emittedEvents(lifecycle, () => {
      lifecycle.compilerActivity();
      vi.advanceTimersByTime(55);
    });
    lifecycle.close();

    const postCompileStages = events.filter((event) => event.stage !== "DISCOVER");
    expect(postCompileStages).not.toHaveLength(0);
    expect(postCompileStages.every((event) => event.type === "build.progress")).toBe(true);
  });

  it("emits build.fail and build.stale without leaking details", () => {
    vi.useFakeTimers();
    const lifecycle = makeLifecycle();
    const events = emittedEvents(lifecycle, () => {
      lifecycle.compilerActivity();
      lifecycle.fail();
      lifecycle.stale();
    });
    lifecycle.close();
    expect(events.some((e) => e.type === "build.fail")).toBe(true);
    expect(events.some((e) => e.type === "build.stale")).toBe(true);
  });

  it("replays the current state immediately on late subscribe", () => {
    vi.useFakeTimers();
    const lifecycle = makeLifecycle();
    lifecycle.compilerActivity();
    vi.advanceTimersByTime(50);
    let replayed = null;
    const unsubscribe = lifecycle.subscribe((event: NonNullable<ReturnType<Lifecycle["current"]>>) => { replayed = event; });
    unsubscribe();
    lifecycle.close();
    expect(replayed).not.toBeNull();
  });

  it("close() stops future emissions", () => {
    vi.useFakeTimers();
    const lifecycle = makeLifecycle();
    const seen = [];
    const unsubscribe = lifecycle.subscribe((event: NonNullable<ReturnType<Lifecycle["current"]>>) => seen.push(event));
    lifecycle.compilerActivity();
    lifecycle.close();
    const count = seen.length;
    vi.advanceTimersByTime(3000);
    unsubscribe();
    expect(seen.length).toBe(count);
  });
});

function makeRes(): FakeRes {
  const res = Object.assign(new EventEmitter(), {
    headers: null as FakeRes["headers"],
    body: "",
    writeHead(code: number, headers: Record<string, string>) { (this as FakeRes).headers = { code, ...headers }; },
    end(chunk?: string) {
      const self = this as unknown as FakeRes;
      self.body += chunk ?? "";
      self.emit("close");
    },
    write(chunk: string) { (this as FakeRes).body += chunk; },
  });
  return res as unknown as FakeRes;
}

describe("createBuildEventHandler", () => {
  it("returns false for other routes", () => {
    const handler = createBuildEventHandler({ enabled: true, lifecycle: makeLifecycle() });
    const res = makeRes();
    expect(handler({ url: "/api/other" }, res)).toBe(false);
  });

  it("serves 404 when disabled (production default)", () => {
    const handler = createBuildEventHandler({ enabled: false, lifecycle: makeLifecycle() });
    const res = makeRes();
    expect(handler({ url: "/api/build-events" }, res)).toBe(true);
    expect(res.headers?.code).toBe(404);
  });

  it("streams lifecycle events as SSE when enabled, with no-store headers", () => {
    vi.useFakeTimers();
    const lifecycle = makeLifecycle();
    const handler = createBuildEventHandler({ enabled: true, lifecycle });
    const res = makeRes();
    expect(handler({ url: "/api/build-events", on: () => {} } as unknown as { url: string }, res)).toBe(true);
    expect(res.headers?.code).toBe(200);
    expect(res.headers?.["content-type"]).toContain("text/event-stream");
    expect(res.headers?.["cache-control"]).toBe("no-cache, no-store, no-transform");

    lifecycle.compilerActivity();
    vi.advanceTimersByTime(100);

    expect(res.body).toContain("event: build");
    for (const line of res.body.split("\n")) {
      if (!line.startsWith("data: ")) continue;
      const event = JSON.parse(line.slice("data: ".length));
      expect(new Set(Object.keys(event))).toEqual(PUBLIC_FIELDS);
    }
    lifecycle.close();
  });
});

describe("createBuildOutputObserver", () => {
  it("reports activity when watched output files change", async () => {
    const fs = await import("node:fs");
    const os = await import("node:os");
    const path = await import("node:path");
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "build-events-"));
    const file = path.join(dir, "out.js");
    fs.writeFileSync(file, "initial");

    const onActivity = vi.fn();
    const observer = createBuildOutputObserver({ root: dir, onActivity, intervalMs: 10 });
    try {
      fs.writeFileSync(file, "changed");
      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(onActivity).toHaveBeenCalled();
    } finally {
      observer.close();
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("tolerates a missing root and closes cleanly", () => {
    const observer = createBuildOutputObserver({ root: "/nonexistent-path/build-output", onActivity: () => {} });
    expect(() => observer.close()).not.toThrow();
  });
});
