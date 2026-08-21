import { parseMuseumExhibitV1, type MuseumExhibitV1 } from "../../core/MuseumExhibitV1";

const manifest = {
  schemaVersion: "museum-exhibit/v1", id: "museum:call-of-duty", slug: "call-of-duty",
  title: "Call of Duty fan-project study", category: "game",
  oneLineIntent: "An original spatial study of tactical communication, cover and coordinated movement.",
  summary: "A public-safe training-ground diorama built entirely from original geometric primitives and authored metadata.",
  whyItMatters: "It studies readable lanes, team roles and moment-to-moment spatial decisions without reproducing franchise media.",
  publicUrls: [],
  trademarkNotice: "Unofficial fan project. Call of Duty is a trademark of its respective owners. This exhibit is not affiliated with, endorsed by or sponsored by them.",
  assets: [], bounds: { min: [-16, 0, -14], max: [16, 9, 15] },
  cameraAnchors: {
    establishing: { position: [-15, 10, 15], target: [0, 1.8, 0], fov: 46, minDwellMs: 2000 },
    approach: { position: [-11, 4.2, 10], target: [-1, 1.6, 0], fov: 40, minDwellMs: 1600 },
    detail: { position: [-3.4, 2.8, 4.4], target: [0, 1.1, 0], fov: 34, minDwellMs: 1400 },
    orbit: { position: [10, 6.2, 3], target: [0, 1.7, 0], fov: 42, minDwellMs: 2400 },
    exit: { position: [12, 3.8, -10], target: [3, 1.4, -2], fov: 47, minDwellMs: 1500 },
  },
  lod: [
    { tier: "hero", enterDistance: 10, exitDistance: 12, maxTriangles: 24000, maxDrawCalls: 30, animationHz: 30 },
    { tier: "near", enterDistance: 20, exitDistance: 24, maxTriangles: 13000, maxDrawCalls: 22, animationHz: 15 },
    { tier: "far", enterDistance: 38, exitDistance: 44, maxTriangles: 3400, maxDrawCalls: 9, animationHz: 4 },
    { tier: "sleep", enterDistance: 58, exitDistance: 50, maxTriangles: 240, maxDrawCalls: 2, animationHz: 0 },
  ],
  budget: { maxInitialBytes: 0, maxDeferredBytes: 0, maxTriangles: 24000, maxDrawCalls: 30, maxTextures: 0, maxTextureEdgePx: 0, maxCpuFrameMsP95: 4.2, maxGpuFrameMsP95: 6.2 },
  states: {
    sleep: { label: "Dormant course silhouette", animation: "none" },
    active: { label: "Tactical route rehearsal", animation: "ambient" },
    milestone: { label: "Verified coordinated route", animation: "bounded-spectacle", maxDurationMs: 6000, cooldownMs: 60000 },
  },
  story: {
    heroArtifact: "The Route Table, an original layered tactical terrain sculpture",
    processSummary: "Project-authored studies of cover rhythm, route legibility and coordinated movement. No franchise assets or private production data are included.",
    publicStudyIds: [],
    interactiveDetail: "Approach the Route Table to trace three coordinated paths through the training ground; reduced motion shows the complete route at rest.",
    reflectionPrompt: "How does clear terrain turn individual motion into coordinated intent?",
  },
  publicProjection: { allowedFields: ["verifiedMilestone", "milestoneUrl", "updatedAt"], verifiedMilestone: null, milestoneUrl: null, updatedAt: null },
  search: { title: "Call of Duty fan-project study", summary: "Original geometric study of tactical communication, cover and coordinated movement.", keywords: ["tactical training", "cover", "team movement", "route planning", "game study"], filters: ["exhibit", "game"], destinationAnchor: "approach" },
} as const satisfies MuseumExhibitV1;

export const callOfDutyManifest = parseMuseumExhibitV1(manifest);
