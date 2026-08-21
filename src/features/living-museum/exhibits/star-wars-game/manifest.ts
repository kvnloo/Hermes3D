import { parseMuseumExhibitV1, type MuseumExhibitV1 } from "../../core/MuseumExhibitV1";

export const manifest = {
  schemaVersion: "museum-exhibit/v1",
  id: "museum:star-wars-game",
  slug: "star-wars-game",
  title: "Star Wars game fan-project study",
  category: "game",
  oneLineIntent: "An original spatial study of distance, signal and collective resolve.",
  summary:
    "A public-safe research diorama made only from project-authored metadata and original geometric primitives.",
  whyItMatters:
    "It preserves the project's study of cinematic approach, navigable scale and readable team objectives without reproducing franchise media.",
  publicUrls: [],
  trademarkNotice:
    "Unofficial fan project. Star Wars is a trademark of its respective owners. This exhibit is not affiliated with, endorsed by or sponsored by them.",
  assets: [],
  bounds: { min: [-14, 0, -12], max: [14, 11, 14] },
  cameraAnchors: {
    establishing: {
      position: [-12, 8, 14],
      target: [0, 3.2, 0],
      fov: 44,
      minDwellMs: 2000,
    },
    approach: {
      position: [-8.5, 3.8, 9.5],
      target: [0, 2.7, 0],
      fov: 39,
      minDwellMs: 1500,
    },
    detail: {
      position: [-2.6, 2.7, 4.6],
      target: [0, 2.2, 0],
      fov: 33,
      minDwellMs: 1300,
    },
    orbit: {
      position: [8, 5.4, 2.2],
      target: [0, 2.8, 0],
      fov: 41,
      minDwellMs: 2400,
    },
    exit: {
      position: [10.5, 3.6, -8.5],
      target: [3, 2, -2],
      fov: 46,
      minDwellMs: 1400,
    },
  },
  lod: [
    {
      tier: "hero",
      enterDistance: 9,
      exitDistance: 11,
      maxTriangles: 20000,
      maxDrawCalls: 24,
      animationHz: 30,
    },
    {
      tier: "near",
      enterDistance: 18,
      exitDistance: 22,
      maxTriangles: 10000,
      maxDrawCalls: 16,
      animationHz: 15,
    },
    {
      tier: "far",
      enterDistance: 34,
      exitDistance: 40,
      maxTriangles: 2600,
      maxDrawCalls: 7,
      animationHz: 4,
    },
    {
      tier: "sleep",
      enterDistance: 54,
      exitDistance: 46,
      maxTriangles: 180,
      maxDrawCalls: 1,
      animationHz: 0,
    },
  ],
  budget: {
    maxInitialBytes: 0,
    maxDeferredBytes: 0,
    maxTriangles: 20000,
    maxDrawCalls: 24,
    maxTextures: 0,
    maxTextureEdgePx: 0,
    maxCpuFrameMsP95: 3.8,
    maxGpuFrameMsP95: 5.8,
  },
  states: {
    sleep: { label: "Dormant beacon silhouette", animation: "none" },
    active: { label: "Signal alignment", animation: "ambient" },
    milestone: {
      label: "Verified collective milestone",
      animation: "bounded-spectacle",
      maxDurationMs: 6500,
      cooldownMs: 60000,
    },
  },
  story: {
    heroArtifact: "The Signal Forge, an original offset-ring beacon sculpture",
    processSummary:
      "Project-authored studies of approach pacing, landmark scale and cooperative objective readability. No franchise assets or private production data are included.",
    publicStudyIds: [],
    interactiveDetail:
      "Approach the Signal Forge to align its three signal planes; reduced motion presents the aligned composition without movement.",
    reflectionPrompt: "What becomes possible when distant signals resolve into one direction?",
  },
  publicProjection: {
    allowedFields: ["verifiedMilestone", "milestoneUrl", "updatedAt"],
    verifiedMilestone: null,
    milestoneUrl: null,
    updatedAt: null,
  },
  search: {
    title: "Star Wars game fan-project study",
    summary: "Original geometric study of cinematic distance, signals and cooperative objectives.",
    keywords: ["cinematic scale", "signal", "cooperative play", "game study"],
    filters: ["exhibit", "game"],
    destinationAnchor: "approach",
  },
} as const satisfies MuseumExhibitV1;

export const starWarsGameManifest = parseMuseumExhibitV1(manifest);
