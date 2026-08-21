import { parseMuseumExhibitV1, type MuseumExhibitV1 } from "../../core/MuseumExhibitV1";

const manifest = {
  schemaVersion: "museum-exhibit/v1",
  id: "museum:obsidian-vault",
  slug: "obsidian-vault",
  title: "Private Knowledge Vault",
  category: "private-placeholder",
  oneLineIntent: "A sealed spatial marker for a deliberately disabled private connector.",
  summary:
    "An original abstract placeholder that reveals no private knowledge, structure, location or connection metadata.",
  whyItMatters:
    "The empty monument makes the privacy boundary visible without inspecting or projecting any private source.",
  publicUrls: [],
  trademarkNotice:
    "Original project-authored placeholder. No third-party or private source material is represented.",
  assets: [],
  bounds: { min: [-9, 0, -9], max: [9, 9, 9] },
  cameraAnchors: {
    establishing: {
      position: [-12, 8, 13],
      target: [0, 3.2, 0],
      fov: 43,
      minDwellMs: 1900,
    },
    approach: {
      position: [-7.5, 4.1, 8.5],
      target: [0, 3, 0],
      fov: 38,
      minDwellMs: 1500,
    },
    detail: {
      position: [-2.7, 3, 4.5],
      target: [0, 2.8, 0],
      fov: 32,
      minDwellMs: 1400,
    },
    orbit: {
      position: [7.8, 5.7, 2.6],
      target: [0, 3.1, 0],
      fov: 40,
      minDwellMs: 2200,
    },
    exit: {
      position: [10.5, 4.2, -8],
      target: [0, 2.6, 0],
      fov: 46,
      minDwellMs: 1400,
    },
  },
  lod: [
    {
      tier: "hero",
      enterDistance: 9,
      exitDistance: 11,
      maxTriangles: 7200,
      maxDrawCalls: 14,
      animationHz: 0,
    },
    {
      tier: "near",
      enterDistance: 18,
      exitDistance: 22,
      maxTriangles: 3600,
      maxDrawCalls: 10,
      animationHz: 0,
    },
    {
      tier: "far",
      enterDistance: 34,
      exitDistance: 40,
      maxTriangles: 900,
      maxDrawCalls: 4,
      animationHz: 0,
    },
    {
      tier: "sleep",
      enterDistance: 54,
      exitDistance: 46,
      maxTriangles: 80,
      maxDrawCalls: 1,
      animationHz: 0,
    },
  ],
  budget: {
    maxInitialBytes: 0,
    maxDeferredBytes: 0,
    maxTriangles: 7200,
    maxDrawCalls: 14,
    maxTextures: 0,
    maxTextureEdgePx: 0,
    maxCpuFrameMsP95: 2.2,
    maxGpuFrameMsP95: 3.4,
  },
  states: {
    sleep: { label: "Sealed connector monument", animation: "none" },
    active: { label: "Connector remains disabled", animation: "ambient" },
    milestone: {
      label: "No milestone projection",
      animation: "bounded-spectacle",
      maxDurationMs: 0,
      cooldownMs: 60000,
    },
  },
  story: {
    heroArtifact: "The Black Archive, an original sealed geometric monument",
    processSummary:
      "A project-authored zero-asset composition. It performs no filesystem, network, indexing or connector work.",
    publicStudyIds: [],
    interactiveDetail:
      "The monument remains static and closed at every distance; no private data or source structure is requested.",
    reflectionPrompt: "What should remain unseen when privacy is part of the architecture?",
  },
  publicProjection: {
    allowedFields: ["verifiedMilestone", "milestoneUrl", "updatedAt"],
    verifiedMilestone: null,
    milestoneUrl: null,
    updatedAt: null,
  },
  search: {
    title: "Private Knowledge Vault",
    summary: "Sealed abstract placeholder for a disabled private connector.",
    keywords: ["private placeholder", "disabled connector", "sealed knowledge"],
    filters: ["exhibit", "private-placeholder"],
    destinationAnchor: "approach",
  },
} as const satisfies MuseumExhibitV1;

export const obsidianVaultManifest = parseMuseumExhibitV1(manifest);
