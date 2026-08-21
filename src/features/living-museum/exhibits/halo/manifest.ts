import { parseMuseumExhibitV1, type MuseumExhibitV1 } from "../../core/MuseumExhibitV1";

export const manifest = {
  schemaVersion: "museum-exhibit/v1",
  id: "museum:halo",
  slug: "halo",
  title: "Halo game fan-project study",
  category: "game",
  oneLineIntent: "An original arena study of readable routes, vertical pressure and shared focus.",
  summary:
    "A public-safe spatial diorama built only from project-authored metadata and original geometric primitives.",
  whyItMatters:
    "It explores how silhouette, light and elevation can make competitive spaces legible before a visitor learns their routes.",
  publicUrls: [],
  trademarkNotice:
    "Unofficial fan project. Halo is a trademark of its respective owners. This exhibit is not affiliated with, endorsed by or sponsored by them.",
  assets: [],
  bounds: { min: [-16, -1, -16], max: [16, 12, 16] },
  cameraAnchors: {
    establishing: { position: [-14, 9, 15], target: [0, 2.5, 0], fov: 45, minDwellMs: 2200 },
    approach: { position: [-10, 3.8, 11], target: [0, 2.2, 0], fov: 40, minDwellMs: 1700 },
    detail: { position: [-3.6, 2.4, 4.8], target: [0, 1.7, 0], fov: 34, minDwellMs: 1400 },
    orbit: { position: [10, 6.5, 4], target: [0, 2.6, 0], fov: 42, minDwellMs: 2400 },
    exit: { position: [12, 4.2, -10], target: [3.5, 1.8, -2.5], fov: 47, minDwellMs: 1500 },
  },
  lod: [
    { tier: "hero", enterDistance: 10, exitDistance: 12, maxTriangles: 28000, maxDrawCalls: 30, animationHz: 30 },
    { tier: "near", enterDistance: 20, exitDistance: 24, maxTriangles: 15000, maxDrawCalls: 22, animationHz: 15 },
    { tier: "far", enterDistance: 38, exitDistance: 44, maxTriangles: 4200, maxDrawCalls: 9, animationHz: 4 },
    { tier: "sleep", enterDistance: 58, exitDistance: 50, maxTriangles: 240, maxDrawCalls: 1, animationHz: 0 },
  ],
  budget: {
    maxInitialBytes: 0,
    maxDeferredBytes: 0,
    maxTriangles: 28000,
    maxDrawCalls: 30,
    maxTextures: 0,
    maxTextureEdgePx: 0,
    maxCpuFrameMsP95: 4,
    maxGpuFrameMsP95: 6,
  },
  states: {
    sleep: { label: "Dormant arena silhouette", animation: "none" },
    active: { label: "Route pulse", animation: "ambient" },
    milestone: {
      label: "Verified arena milestone",
      animation: "bounded-spectacle",
      maxDurationMs: 6000,
      cooldownMs: 60000,
    },
  },
  story: {
    heroArtifact: "The Convergence Well, an original split-ring arena sculpture",
    processSummary:
      "Project-authored studies of route readability, vertical pressure and landmark recognition. No franchise assets or private production data are included.",
    publicStudyIds: [],
    interactiveDetail:
      "Approach the central well to bring its suspended route bands into alignment; reduced motion shows the resolved composition without animation.",
    reflectionPrompt: "How little geometry does a place need before its routes become memorable?",
  },
  publicProjection: {
    allowedFields: ["verifiedMilestone", "milestoneUrl", "updatedAt"],
    verifiedMilestone: null,
    milestoneUrl: null,
    updatedAt: null,
  },
  search: {
    title: "Halo game fan-project study",
    summary: "Original geometric arena study of readable routes, elevation and shared focus.",
    keywords: ["arena", "route readability", "verticality", "multiplayer game study"],
    filters: ["exhibit", "game"],
    destinationAnchor: "approach",
  },
} as const satisfies MuseumExhibitV1;

export const haloManifest = parseMuseumExhibitV1(manifest);
