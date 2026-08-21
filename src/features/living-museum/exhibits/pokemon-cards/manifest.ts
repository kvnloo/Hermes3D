import { parseMuseumExhibitV1, type MuseumExhibitV1 } from "../../core/MuseumExhibitV1";

const manifest = {
  schemaVersion: "museum-exhibit/v1",
  id: "museum:pokemon-cards",
  slug: "pokemon-cards",
  title: "Pokémon card collecting fan study",
  category: "collection",
  oneLineIntent: "An original gallery about collecting, care and shared memory.",
  summary:
    "A public-safe card archive rendered with project-authored geometry, materials and fictional specimen metadata.",
  whyItMatters:
    "It studies how a collection gains meaning through arrangement, condition, exchange and the stories remembered between people.",
  publicUrls: [],
  trademarkNotice:
    "Unofficial fan project. Pokémon is a trademark of its respective owners. This exhibit is not affiliated with, endorsed by or sponsored by them.",
  assets: [],
  bounds: { min: [-13, 0, -9], max: [13, 8, 10] },
  cameraAnchors: {
    establishing: { position: [-11, 6.5, 12], target: [0, 2.7, 0], fov: 42, minDwellMs: 1800 },
    approach: { position: [-7.5, 3.8, 7.5], target: [-1, 2.5, 0], fov: 38, minDwellMs: 1400 },
    detail: { position: [-1.8, 2.8, 3.6], target: [0, 2.65, 0], fov: 30, minDwellMs: 1400 },
    orbit: { position: [7.5, 4.8, 3], target: [0, 2.4, -0.5], fov: 40, minDwellMs: 2200 },
    exit: { position: [10, 3.4, -7.5], target: [3, 2, -1], fov: 44, minDwellMs: 1200 },
  },
  lod: [
    { tier: "hero", enterDistance: 8, exitDistance: 10, maxTriangles: 24000, maxDrawCalls: 28, animationHz: 30 },
    { tier: "near", enterDistance: 16, exitDistance: 20, maxTriangles: 13000, maxDrawCalls: 20, animationHz: 15 },
    { tier: "far", enterDistance: 30, exitDistance: 36, maxTriangles: 3600, maxDrawCalls: 8, animationHz: 4 },
    { tier: "sleep", enterDistance: 48, exitDistance: 42, maxTriangles: 120, maxDrawCalls: 1, animationHz: 0 },
  ],
  budget: {
    maxInitialBytes: 0,
    maxDeferredBytes: 0,
    maxTriangles: 24000,
    maxDrawCalls: 28,
    maxTextures: 0,
    maxTextureEdgePx: 0,
    maxCpuFrameMsP95: 3.5,
    maxGpuFrameMsP95: 5.5,
  },
  states: {
    sleep: { label: "Archive closed", animation: "none" },
    active: { label: "Collection illuminated", animation: "ambient" },
    milestone: {
      label: "Verified collection milestone",
      animation: "bounded-spectacle",
      maxDurationMs: 5000,
      cooldownMs: 60000,
    },
  },
  story: {
    heroArtifact: "The Memory Folio, an original nine-card light archive",
    processSummary:
      "Project-authored studies of card hierarchy, protective display and collection rhythm. No card scans, character art, logos or private collection records are included.",
    publicStudyIds: [],
    interactiveDetail:
      "Approach the folio to reveal abstract foil layers and condition rails; reduced motion presents the same final arrangement without movement.",
    reflectionPrompt: "Which object in a collection carries a story no price can measure?",
  },
  publicProjection: {
    allowedFields: ["verifiedMilestone", "milestoneUrl", "updatedAt"],
    verifiedMilestone: null,
    milestoneUrl: null,
    updatedAt: null,
  },
  search: {
    title: "Pokémon card collecting fan study",
    summary: "Original abstract gallery about collecting, care and shared memory.",
    keywords: ["cards", "collection", "archive", "memory", "preservation"],
    filters: ["exhibit", "collection"],
    destinationAnchor: "approach",
  },
} as const satisfies MuseumExhibitV1;

export const pokemonCardsManifest = parseMuseumExhibitV1(manifest);
