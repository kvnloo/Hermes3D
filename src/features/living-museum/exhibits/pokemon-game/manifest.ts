import { parseMuseumExhibitV1, type MuseumExhibitV1 } from "../../core/MuseumExhibitV1";

const manifest = {
  schemaVersion: "museum-exhibit/v1",
  id: "museum:pokemon-game",
  slug: "pokemon-game",
  title: "Pokémon game fan-project study",
  category: "game",
  oneLineIntent: "An original spatial study of discovery, choice and return.",
  summary:
    "A public-safe research diorama built only from original geometric primitives and project-authored metadata.",
  whyItMatters:
    "It preserves the project's exploration of readable routes, environmental memory and player-led discovery without reproducing franchise media.",
  publicUrls: [],
  trademarkNotice:
    "Unofficial fan project. Pokémon is a trademark of its respective owners. This exhibit is not affiliated with, endorsed by or sponsored by them.",
  assets: [],
  bounds: { min: [-12, 0, -10], max: [12, 9, 12] },
  cameraAnchors: {
    establishing: {
      position: [-10, 7, 12],
      target: [0, 2.5, 0],
      fov: 42,
      minDwellMs: 1800,
    },
    approach: {
      position: [-7, 3.2, 7.5],
      target: [0, 2.1, 0],
      fov: 38,
      minDwellMs: 1400,
    },
    detail: {
      position: [-1.8, 2.4, 3.8],
      target: [0, 1.8, 0],
      fov: 34,
      minDwellMs: 1200,
    },
    orbit: {
      position: [6.5, 4.6, 1.5],
      target: [0, 2.1, 0],
      fov: 40,
      minDwellMs: 2200,
    },
    exit: {
      position: [8.5, 3.4, -7],
      target: [2.5, 1.7, -1.5],
      fov: 44,
      minDwellMs: 1200,
    },
  },
  lod: [
    {
      tier: "hero",
      enterDistance: 8,
      exitDistance: 10,
      maxTriangles: 18000,
      maxDrawCalls: 22,
      animationHz: 30,
    },
    {
      tier: "near",
      enterDistance: 16,
      exitDistance: 20,
      maxTriangles: 9000,
      maxDrawCalls: 14,
      animationHz: 15,
    },
    {
      tier: "far",
      enterDistance: 30,
      exitDistance: 36,
      maxTriangles: 2400,
      maxDrawCalls: 7,
      animationHz: 4,
    },
    {
      tier: "sleep",
      enterDistance: 48,
      exitDistance: 42,
      maxTriangles: 160,
      maxDrawCalls: 1,
      animationHz: 0,
    },
  ],
  budget: {
    maxInitialBytes: 0,
    maxDeferredBytes: 0,
    maxTriangles: 18000,
    maxDrawCalls: 22,
    maxTextures: 0,
    maxTextureEdgePx: 0,
    maxCpuFrameMsP95: 3.5,
    maxGpuFrameMsP95: 5.5,
  },
  states: {
    sleep: { label: "Dormant silhouette", animation: "none" },
    active: { label: "Discovery field", animation: "ambient" },
    milestone: {
      label: "Verified journey milestone",
      animation: "bounded-spectacle",
      maxDurationMs: 6000,
      cooldownMs: 60000,
    },
  },
  story: {
    heroArtifact: "The Wayfinder, an original ring-and-spire route sculpture",
    processSummary:
      "Project-authored studies of route legibility, landmark recall and approach pacing. No franchise assets or private production data are included.",
    publicStudyIds: [],
    interactiveDetail:
      "Approach the Wayfinder to reveal three route arcs; reduced motion holds the same final composition without animation.",
    reflectionPrompt: "Which landmark would bring you back after the path disappears?",
  },
  publicProjection: {
    allowedFields: ["verifiedMilestone", "milestoneUrl", "updatedAt"],
    verifiedMilestone: null,
    milestoneUrl: null,
    updatedAt: null,
  },
  search: {
    title: "Pokémon game fan-project study",
    summary: "Original geometric study of discovery, routes and environmental memory.",
    keywords: ["discovery", "route design", "wayfinding", "game study"],
    filters: ["exhibit", "game"],
    destinationAnchor: "approach",
  },
} as const satisfies MuseumExhibitV1;

export const pokemonGameManifest = parseMuseumExhibitV1(manifest);
