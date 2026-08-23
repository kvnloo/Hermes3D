import { beforeEach, describe, expect, it } from "vitest";
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
    expect(() =>
      parsePublicBuildEvent({ ...baseStart, command: "npm run secret" }),
    ).toThrow(/field/i);
    expect(() =>
      parsePublicBuildEvent({ ...baseStart, assetLabel: "/home/kevin/private.ts" }),
    ).toThrow(/safe label/i);
    expect(() => parsePublicBuildEvent({ ...baseStart, progress: 101 })).toThrow(
      /progress/i,
    );
  });

  it("uses the complete ordered construction stage vocabulary", () => {
    expect(BUILD_STAGES).toEqual([
      "DISCOVER",
      "FRAME",
      "GEOMETRY",
      "MATERIALS",
      "LIGHTING",
      "INTEGRATE",
      "VERIFY",
      "READY",
    ]);
  });
});

describe("build scene state machine", () => {
  it("advances stages and keeps indeterminate progress honest", () => {
    const started = applyBuildEvent(null, baseStart);
    const framed = applyBuildEvent(started, {
      ...baseStart,
      type: "asset.stage",
      stage: "FRAME",
      progress: null,
      timestamp: "2026-08-22T20:00:01.000Z",
    });
    expect(framed.stage).toBe("FRAME");
    expect(framed.progress).toBeNull();
    expect(framed.status).toBe("building");
  });

  it("fails closed on stale and revision-mismatched completion", () => {
    const verifying = applyBuildEvent(applyBuildEvent(null, baseStart), {
      ...baseStart,
      type: "asset.stage",
      stage: "VERIFY",
      progress: 96,
    });
    const mismatch = applyBuildEvent(verifying, {
      ...baseStart,
      type: "build.complete",
      stage: "READY",
      progress: 100,
      revision: "fffffff",
    });
    expect(mismatch.status).toBe("stale");
    expect(mismatch.finishedVisible).toBe(false);

    const stale = applyBuildEvent(verifying, {
      ...baseStart,
      type: "build.stale",
      stage: "VERIFY",
      progress: 96,
    });
    expect(stale.status).toBe("stale");
    expect(stale.finishedVisible).toBe(false);
  });

  it("reveals finished geometry only after matching verification", () => {
    const verifying = applyBuildEvent(applyBuildEvent(null, baseStart), {
      ...baseStart,
      type: "asset.stage",
      stage: "VERIFY",
      progress: 98,
    });
    const ready = applyBuildEvent(verifying, {
      ...baseStart,
      type: "build.complete",
      stage: "READY",
      progress: 100,
    });
    expect(ready.status).toBe("ready");
    expect(ready.finishedVisible).toBe(true);
  });
});

describe("build state reconnect persistence", () => {
  beforeEach(() => clearPersistedBuildState());

  it("restores the same active stage without replaying", () => {
    const state = applyBuildEvent(applyBuildEvent(null, baseStart), {
      ...baseStart,
      type: "asset.stage",
      stage: "MATERIALS",
      progress: 58,
    });
    persistBuildState(state);
    expect(loadPersistedBuildState()).toEqual(state);
  });

  it("rejects corrupt persisted state", () => {
    localStorage.setItem("hermes3d.build-state.v1", "{not-json");
    expect(loadPersistedBuildState()).toBeNull();
  });
});

describe("construction manifest", () => {
  it("resolves known annex components and generic fallback scaffolds", () => {
    expect(resolveConstructionComponent("museum-annex-shell").kind).toBe("annex-shell");
    expect(resolveConstructionComponent("unapproved-widget")).toMatchObject({
      id: "generic-scaffold",
      kind: "generic-scaffold",
    });
  });
});

// Compile-time guard: persisted objects use the public state shape only.
const _stateShape: BuildSceneState | null = null;
void _stateShape;
