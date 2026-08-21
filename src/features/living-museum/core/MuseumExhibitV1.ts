export const MUSEUM_EXHIBIT_V1 = "museum-exhibit/v1" as const;

export const MUSEUM_EXHIBIT_SLUGS = [
  "pokemon-game",
  "star-wars-game",
  "pokemon-cards",
  "call-of-duty",
  "halo",
  "obsidian-vault",
] as const;

export type MuseumExhibitSlug = (typeof MUSEUM_EXHIBIT_SLUGS)[number];
export type Vec3 = readonly [number, number, number];

export type MuseumAssetV1 = {
  path: string;
  sha256: string;
  bytes: number;
  mediaType: string;
  origin: "procedural" | "project-owned" | "original-commission";
  creator: string;
  license: string;
  sourceUrl: string | null;
};

export type MuseumCameraAnchorV1 = {
  position: Vec3;
  target: Vec3;
  fov: number;
  minDwellMs: number;
};

export type MuseumExhibitV1 = {
  schemaVersion: typeof MUSEUM_EXHIBIT_V1;
  id: `museum:${MuseumExhibitSlug}`;
  slug: MuseumExhibitSlug;
  title: string;
  category: "game" | "collection" | "private-placeholder";
  oneLineIntent: string;
  summary: string;
  whyItMatters: string;
  publicUrls: readonly { label: string; url: string }[];
  trademarkNotice: string;
  assets: readonly MuseumAssetV1[];
  bounds: { min: Vec3; max: Vec3 };
  cameraAnchors: {
    establishing: MuseumCameraAnchorV1;
    approach: MuseumCameraAnchorV1;
    detail: MuseumCameraAnchorV1;
    orbit: MuseumCameraAnchorV1;
    exit: MuseumCameraAnchorV1;
  };
  lod: readonly {
    tier: "hero" | "near" | "far" | "sleep";
    enterDistance: number;
    exitDistance: number;
    maxTriangles: number;
    maxDrawCalls: number;
    animationHz: number;
  }[];
  budget: {
    maxInitialBytes: number;
    maxDeferredBytes: number;
    maxTriangles: number;
    maxDrawCalls: number;
    maxTextures: number;
    maxTextureEdgePx: number;
    maxCpuFrameMsP95: number;
    maxGpuFrameMsP95: number;
  };
  states: {
    sleep: { label: string; animation: "none" | "subtle" };
    active: { label: string; animation: "ambient" };
    milestone: { label: string; animation: "bounded-spectacle"; maxDurationMs: number; cooldownMs: number };
  };
  story: {
    heroArtifact: string;
    processSummary: string;
    publicStudyIds: readonly string[];
    interactiveDetail: string;
    reflectionPrompt: string;
  };
  publicProjection: {
    allowedFields: readonly ["verifiedMilestone", "milestoneUrl", "updatedAt"];
    verifiedMilestone: string | null;
    milestoneUrl: string | null;
    updatedAt: string | null;
  };
  search: {
    title: string;
    summary: string;
    keywords: readonly string[];
    filters: readonly ("exhibit" | "game" | "collection" | "private-placeholder")[];
    destinationAnchor: "approach";
  };
};

const KEYS = {
  root: ["schemaVersion", "id", "slug", "title", "category", "oneLineIntent", "summary", "whyItMatters", "publicUrls", "trademarkNotice", "assets", "bounds", "cameraAnchors", "lod", "budget", "states", "story", "publicProjection", "search"],
  asset: ["path", "sha256", "bytes", "mediaType", "origin", "creator", "license", "sourceUrl"],
  bounds: ["min", "max"],
  anchors: ["establishing", "approach", "detail", "orbit", "exit"],
  anchor: ["position", "target", "fov", "minDwellMs"],
  lod: ["tier", "enterDistance", "exitDistance", "maxTriangles", "maxDrawCalls", "animationHz"],
  budget: ["maxInitialBytes", "maxDeferredBytes", "maxTriangles", "maxDrawCalls", "maxTextures", "maxTextureEdgePx", "maxCpuFrameMsP95", "maxGpuFrameMsP95"],
  states: ["sleep", "active", "milestone"],
  sleep: ["label", "animation"],
  active: ["label", "animation"],
  milestone: ["label", "animation", "maxDurationMs", "cooldownMs"],
  story: ["heroArtifact", "processSummary", "publicStudyIds", "interactiveDetail", "reflectionPrompt"],
  projection: ["allowedFields", "verifiedMilestone", "milestoneUrl", "updatedAt"],
  search: ["title", "summary", "keywords", "filters", "destinationAnchor"],
  publicUrl: ["label", "url"],
} as const;

const object = (value: unknown, path: string): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${path} must be an object`);
  return value as Record<string, unknown>;
};
const exact = (value: unknown, allowed: readonly string[], path: string) => {
  const record = object(value, path);
  const unknown = Object.keys(record).filter((key) => !allowed.includes(key));
  const missing = allowed.filter((key) => !(key in record));
  if (unknown.length) throw new Error(`${path} contains unknown fields: ${unknown.join(", ")}`);
  if (missing.length) throw new Error(`${path} is missing fields: ${missing.join(", ")}`);
  return record;
};
const array = (value: unknown, path: string): unknown[] => {
  if (!Array.isArray(value)) throw new Error(`${path} must be an array`);
  return value;
};

/**
 * Fail-closed structural parser. It rejects unknown or missing fields at every
 * object boundary before returning the typed manifest. Semantic CI performs
 * URL, hash, provenance, privacy, budget, anchor and LOD invariants.
 */
export function parseMuseumExhibitV1(value: unknown): MuseumExhibitV1 {
  const root = exact(value, KEYS.root, "exhibit");
  exact(root.bounds, KEYS.bounds, "exhibit.bounds");
  const anchors = exact(root.cameraAnchors, KEYS.anchors, "exhibit.cameraAnchors");
  for (const key of KEYS.anchors) exact(anchors[key], KEYS.anchor, `exhibit.cameraAnchors.${key}`);
  for (const [index, item] of array(root.assets, "exhibit.assets").entries()) exact(item, KEYS.asset, `exhibit.assets[${index}]`);
  for (const [index, item] of array(root.lod, "exhibit.lod").entries()) exact(item, KEYS.lod, `exhibit.lod[${index}]`);
  exact(root.budget, KEYS.budget, "exhibit.budget");
  const states = exact(root.states, KEYS.states, "exhibit.states");
  exact(states.sleep, KEYS.sleep, "exhibit.states.sleep");
  exact(states.active, KEYS.active, "exhibit.states.active");
  exact(states.milestone, KEYS.milestone, "exhibit.states.milestone");
  exact(root.story, KEYS.story, "exhibit.story");
  exact(root.publicProjection, KEYS.projection, "exhibit.publicProjection");
  exact(root.search, KEYS.search, "exhibit.search");
  for (const [index, item] of array(root.publicUrls, "exhibit.publicUrls").entries()) exact(item, KEYS.publicUrl, `exhibit.publicUrls[${index}]`);

  if (root.schemaVersion !== MUSEUM_EXHIBIT_V1) throw new Error("Unsupported exhibit schemaVersion");
  if (!MUSEUM_EXHIBIT_SLUGS.includes(root.slug as MuseumExhibitSlug)) throw new Error("Exhibit slug is not allowlisted");
  if (root.id !== `museum:${String(root.slug)}`) throw new Error("Exhibit id must match its slug");
  return root as MuseumExhibitV1;
}

const finiteVec3 = (value: unknown): value is Vec3 => Array.isArray(value) && value.length === 3 && value.every((item) => typeof item === "number" && Number.isFinite(item));
const publicText = (value: unknown, path: string) => {
  if (typeof value !== "string" || !value.trim() || /[\u0000-\u001f\u007f]/.test(value)) throw new Error(`${path} must be public-safe text`);
  if (/(?:^|[\s/])(?:home|users|workspace|\.hermes)(?:[\s/]|$)|(?:secret|token|password|credential|kanban|task[_-]?id|session|database|tailnet)/i.test(value)) throw new Error(`${path} contains private data`);
};

/** Semantic validation for runtime and registry generation. Asset byte/hash checks
 * remain a filesystem-only CI responsibility and never run in the browser. */
export function validateMuseumExhibitV1(value: unknown): MuseumExhibitV1 {
  const exhibit = parseMuseumExhibitV1(value);
  [exhibit.title, exhibit.oneLineIntent, exhibit.summary, exhibit.whyItMatters, exhibit.trademarkNotice, exhibit.story.heroArtifact, exhibit.story.processSummary, exhibit.story.interactiveDetail, exhibit.story.reflectionPrompt].forEach((text, index) => publicText(text, `exhibit.publicText[${index}]`));
  if (!finiteVec3(exhibit.bounds.min) || !finiteVec3(exhibit.bounds.max) || exhibit.bounds.min.some((min, index) => min >= exhibit.bounds.max[index])) throw new Error("Exhibit bounds are invalid");
  for (const [name, anchor] of Object.entries(exhibit.cameraAnchors)) {
    if (!finiteVec3(anchor.position) || !finiteVec3(anchor.target) || !Number.isFinite(anchor.fov) || anchor.fov < 20 || anchor.fov > 100 || !Number.isFinite(anchor.minDwellMs) || anchor.minDwellMs < 0) throw new Error(`Camera anchor ${name} is invalid`);
  }
  const expectedTiers = ["hero", "near", "far", "sleep"];
  if (exhibit.lod.length !== expectedTiers.length || exhibit.lod.some((tier, index) => {
    const invalidHysteresis = tier.tier === "sleep"
      ? tier.enterDistance < tier.exitDistance
      : tier.enterDistance > tier.exitDistance;
    return tier.tier !== expectedTiers[index] || !Number.isFinite(tier.enterDistance) || !Number.isFinite(tier.exitDistance) || invalidHysteresis || tier.maxTriangles < 0 || tier.maxDrawCalls < 0 || tier.animationHz < 0;
  })) throw new Error("LOD tiers or hysteresis are invalid");
  const ceilings = { maxInitialBytes: 1572864, maxDeferredBytes: 6291456, maxTriangles: 180000, maxDrawCalls: 90, maxTextures: 12, maxTextureEdgePx: 2048, maxCpuFrameMsP95: 8, maxGpuFrameMsP95: 10 } as const;
  for (const [key, ceiling] of Object.entries(ceilings)) {
    const actual = exhibit.budget[key as keyof typeof ceilings];
    if (!Number.isFinite(actual) || actual < 0 || actual > ceiling) throw new Error(`Budget ${key} exceeds its ceiling`);
  }
  if (exhibit.publicProjection.allowedFields.join(",") !== "verifiedMilestone,milestoneUrl,updatedAt") throw new Error("Public projection allowlist is invalid");
  if (exhibit.publicProjection.verifiedMilestone && !exhibit.publicProjection.milestoneUrl) throw new Error("A public milestone requires a URL");
  for (const link of [...exhibit.publicUrls, ...(exhibit.publicProjection.milestoneUrl ? [{ label: "milestone", url: exhibit.publicProjection.milestoneUrl }] : [])]) {
    const url = new URL(link.url);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || /^(localhost|\d{1,3}(?:\.\d{1,3}){3}|\[.*\])$/i.test(url.hostname)) throw new Error("Public URL is invalid");
  }
  for (const asset of exhibit.assets) {
    if (asset.path.startsWith("/") || asset.path.includes("..") || !/^[a-f0-9]{64}$/.test(asset.sha256) || !Number.isInteger(asset.bytes) || asset.bytes <= 0 || !asset.creator.trim() || !asset.license.trim() || /unknown|unreviewed/i.test(asset.license)) throw new Error(`Asset ${asset.path} has invalid provenance`);
  }
  return exhibit;
}
