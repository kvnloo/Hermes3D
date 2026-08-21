import { describe, expect, it } from "vitest";
import { parseMuseumExhibitV1, type MuseumExhibitV1 } from "@/features/living-museum/core/MuseumExhibitV1";

const anchor = { position: [0, 2, 6], target: [0, 1, 0], fov: 40, minDwellMs: 800 } as const;

const valid = (): MuseumExhibitV1 => ({
  schemaVersion: "museum-exhibit/v1",
  id: "museum:halo",
  slug: "halo",
  title: "Halo fan project",
  category: "game",
  oneLineIntent: "An original abstract arena study.",
  summary: "A public-safe spatial study using original geometry.",
  whyItMatters: "It records the project's spatial design language.",
  publicUrls: [],
  trademarkNotice: "Unofficial fan project. No affiliation or endorsement implied.",
  assets: [{ path: "assets/hero.glb", sha256: "a".repeat(64), bytes: 1024, mediaType: "model/gltf-binary", origin: "procedural", creator: "Hermes3D project", license: "MIT", sourceUrl: null }],
  bounds: { min: [-4, 0, -4], max: [4, 5, 4] },
  cameraAnchors: { establishing: anchor, approach: anchor, detail: anchor, orbit: anchor, exit: anchor },
  lod: [
    { tier: "hero", enterDistance: 8, exitDistance: 10, maxTriangles: 1000, maxDrawCalls: 10, animationHz: 60 },
    { tier: "near", enterDistance: 16, exitDistance: 20, maxTriangles: 600, maxDrawCalls: 7, animationHz: 30 },
    { tier: "far", enterDistance: 30, exitDistance: 36, maxTriangles: 200, maxDrawCalls: 3, animationHz: 10 },
    { tier: "sleep", enterDistance: 50, exitDistance: 44, maxTriangles: 20, maxDrawCalls: 1, animationHz: 0 },
  ],
  budget: { maxInitialBytes: 1024, maxDeferredBytes: 4096, maxTriangles: 1000, maxDrawCalls: 10, maxTextures: 2, maxTextureEdgePx: 1024, maxCpuFrameMsP95: 4, maxGpuFrameMsP95: 6 },
  states: { sleep: { label: "Sleeping", animation: "none" }, active: { label: "Active", animation: "ambient" }, milestone: { label: "Verified milestone", animation: "bounded-spectacle", maxDurationMs: 8000, cooldownMs: 60000 } },
  story: { heroArtifact: "Abstract arena", processSummary: "Original studies", publicStudyIds: [], interactiveDetail: "Orbit the arena", reflectionPrompt: "What makes a space memorable?" },
  publicProjection: { allowedFields: ["verifiedMilestone", "milestoneUrl", "updatedAt"], verifiedMilestone: null, milestoneUrl: null, updatedAt: null },
  search: { title: "Halo fan project", summary: "Original abstract arena study", keywords: ["arena"], filters: ["exhibit", "game"], destinationAnchor: "approach" },
});

describe("parseMuseumExhibitV1", () => {
  it("accepts the exact v1 object shape", () => expect(parseMuseumExhibitV1(valid()).slug).toBe("halo"));

  it("rejects unknown root fields", () => {
    expect(() => parseMuseumExhibitV1({ ...valid(), privatePath: "/private" })).toThrow(/unknown fields: privatePath/);
  });

  it("rejects unknown nested fields", () => {
    const fixture = valid();
    expect(() => parseMuseumExhibitV1({ ...fixture, search: { ...fixture.search, rawStatus: "running" } })).toThrow(/search.*unknown fields: rawStatus/);
  });
});
