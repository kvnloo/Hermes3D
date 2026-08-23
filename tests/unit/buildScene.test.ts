import { beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  BUILD_STAGES,
  applyBuildEvent,
  parsePublicBuildEvent,
  type BuildSceneState,
} from "@/features/building/buildContract";
import {
  clearPersistedBuildState,
  loadPersistedBuildState,
  persistBuildState,
} from "@/features/building/buildStore";
import { resolveConstructionComponent } from "@/features/building/constructionManifest";

const startedAt = "2026-08-22T20:00:00.000Z";
const baseStart = {
  version: 1,
  type: "build.start",
  buildId: "build-42",
  projectLabel: "Living Museum",
  assetLabel: "Museum annex",
  stage: "DISCOVER",
  progress: null,
  revision: "a1b2c3d",
  timestamp: startedAt,
  agentCount: 2,
  componentIds: ["museum-annex-shell"],
} as const;

describe("public build event contract", () => {
  it("accepts only bounded, privacy-safe fields", () => {
    expect(parsePublicBuildEvent(baseStart)).toEqual(baseStart);
    expect(() => parsePublicBuildEvent({ ...baseStart, command: "npm run secret" })).toThrow(/field/i);
    expect(() => parsePublicBuildEvent({ ...baseStart, assetLabel: "/home/kevin/private.ts" })).toThrow(/safe label/i);
    expect(() => parsePublicBuildEvent({ ...baseStart, progress: 101 })).toThrow(/progress/i);
    expect(() => parsePublicBuildEvent({ ...baseStart, componentIds: ["museum-annex-shell", "private-component"] })).toThrow(/component/i);
  });

  it("uses the complete ordered construction stage vocabulary", () => {
    expect(BUILD_STAGES).toEqual(["DISCOVER", "FRAME", "GEOMETRY", "MATERIALS", "LIGHTING", "INTEGRATE", "VERIFY", "READY"]);
  });
});

describe("build scene state machine", () => {
  it("advances stages and keeps indeterminate progress honest", () => {
    const framed = applyBuildEvent(applyBuildEvent(null, baseStart), { ...baseStart, type: "asset.stage", stage: "FRAME", progress: null });
    expect(framed).toMatchObject({ stage: "FRAME", progress: null, status: "building" });
  });

  it("fails closed on stale and revision-mismatched completion", () => {
    const verifying = applyBuildEvent(applyBuildEvent(null, baseStart), { ...baseStart, type: "asset.stage", stage: "VERIFY", progress: 96 });
    expect(applyBuildEvent(verifying, { ...baseStart, type: "build.complete", stage: "READY", progress: 100, revision: "fffffff" })).toMatchObject({ status: "stale", finishedVisible: false });
    expect(applyBuildEvent(verifying, { ...baseStart, type: "build.stale", stage: "VERIFY", progress: 96 })).toMatchObject({ status: "stale", finishedVisible: false });
    expect(applyBuildEvent(verifying, { ...baseStart, type: "build.fail", stage: "VERIFY", progress: 96 })).toMatchObject({ status: "failed", finishedVisible: false });
  });

  it("keeps fast compiler completion in verify until presentation finishes", () => {
    const verifying = applyBuildEvent(applyBuildEvent(null, baseStart), { ...baseStart, type: "build.progress", stage: "VERIFY", progress: null });
    expect(verifying).toMatchObject({ status: "building", stage: "VERIFY", finishedVisible: false });
    const ready = applyBuildEvent(verifying, { ...baseStart, type: "build.complete", stage: "READY", progress: 100 });
    expect(ready).toMatchObject({ status: "ready", finishedVisible: true });
  });

  it("restores a server-owned completed snapshot on a fresh reconnect", () => {
    const completed = { ...baseStart, type: "build.complete", stage: "READY", progress: 100 } as const;
    expect(applyBuildEvent(null, completed)).toMatchObject({ status: "ready", stage: "READY", finishedVisible: true });
  });
});

describe("build state reconnect persistence", () => {
  beforeEach(() => clearPersistedBuildState());

  it("restores the same active stage without replaying", () => {
    const state = applyBuildEvent(applyBuildEvent(null, baseStart), { ...baseStart, type: "asset.stage", stage: "MATERIALS", progress: 58 });
    persistBuildState(state);
    expect(loadPersistedBuildState()).toEqual(state);
  });

  it("rejects corrupt persisted state", () => {
    localStorage.setItem("hermes3d.build-state.v1", "{not-json");
    expect(loadPersistedBuildState()).toBeNull();
  });
});

describe("server-owned lifecycle", () => {
  it("debounces compiler bursts into one bounded visual cycle and resumes current state", async () => {
    vi.useFakeTimers();
    const { createBuildLifecycle } = await import("../../server/build-events");
    const lifecycle = createBuildLifecycle({ revision: "a1b2c3d", now: () => new Date(Date.now()), quietMs: 700, stageMs: 1_500 });
    const seen: string[] = [];
    lifecycle.subscribe((event: { type: string; stage: string }) => seen.push(`${event.type}:${event.stage}`));
    lifecycle.compilerActivity();
    lifecycle.compilerActivity();
    await vi.advanceTimersByTimeAsync(750);
    expect(seen.filter((entry) => entry === "build.start:DISCOVER")).toHaveLength(1);
    expect(lifecycle.current()).toMatchObject({ type: "build.progress", stage: "DISCOVER", progress: null });
    await vi.advanceTimersByTimeAsync(10_000);
    expect(seen).toEqual(expect.arrayContaining(["asset.stage:FRAME", "asset.stage:GEOMETRY", "asset.stage:MATERIALS", "build.complete:READY"]));
    lifecycle.close();
    vi.useRealTimers();
  });

  it("observes nested Next output changes without exposing changed paths", async () => {
    const { createBuildOutputObserver } = await import("../../server/build-events");
    const root = mkdtempSync(join(tmpdir(), "hermes3d-build-output-"));
    const nested = join(root, "server", "app", "office");
    mkdirSync(nested, { recursive: true });
    const activity = vi.fn();
    const observer = createBuildOutputObserver({ root, onActivity: activity, intervalMs: 10 });
    try {
      writeFileSync(join(nested, "page.js"), "updated");
      await vi.waitFor(() => expect(activity).toHaveBeenCalled());
      expect(activity.mock.calls.every((call) => call.length === 0)).toBe(true);
    } finally {
      observer.close();
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("construction manifest", () => {
  it("resolves known annex components and generic fallback scaffolds", () => {
    expect(resolveConstructionComponent("museum-annex-shell").kind).toBe("annex-shell");
    expect(resolveConstructionComponent("unapproved-widget")).toMatchObject({ id: "generic-scaffold", kind: "generic-scaffold" });
  });
});

const _stateShape: BuildSceneState | null = null;
void _stateShape;
