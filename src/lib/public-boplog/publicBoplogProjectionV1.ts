export type PublicBoplogKindV1 = "product" | "project" | "experiment" | "oss";

export type PublicBoplogEntryV1 = {
  publicId: string;
  displayName: string;
  kind: PublicBoplogKindV1;
  summary: string;
  urls: string[];
  imageUrl?: string;
  order: number;
  tags: string[];
  publicStatusLabel?: string;
};

export type PublicBoplogProjectionV1 = {
  schemaVersion: 1;
  generatedAt: string;
  source: { canonicalUrl: string; contentHash: string };
  pageSize: number;
  entries: PublicBoplogEntryV1[];
};

const ROOT_KEYS = ["schemaVersion", "generatedAt", "source", "pageSize", "entries"] as const;
const SOURCE_KEYS = ["canonicalUrl", "contentHash"] as const;
const ENTRY_KEYS = ["publicId", "displayName", "kind", "summary", "urls", "imageUrl", "order", "tags", "publicStatusLabel"] as const;
const REQUIRED_ENTRY_KEYS = ["publicId", "displayName", "kind", "summary", "urls", "order", "tags"] as const;
const KINDS = new Set<PublicBoplogKindV1>(["product", "project", "experiment", "oss"]);
const SAFE_ID_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const HASH_RE = /^sha256:[a-f0-9]{64}$/;
const UNSAFE_TEXT_RE = /[<>\u0000-\u001f\u007f]/;
const PUBLIC_HOSTS = new Set(["kvnloo.github.io", "github.com"]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasExactKeys = (value: Record<string, unknown>, allowed: readonly string[], required: readonly string[]): boolean => {
  const keys = Object.keys(value);
  return keys.every((key) => allowed.includes(key)) && required.every((key) => keys.includes(key));
};

const isSafeText = (value: unknown, maxLength: number): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= maxLength && value === value.trim() && !UNSAFE_TEXT_RE.test(value);

const isPublicUrl = (value: unknown): value is string => {
  if (typeof value !== "string" || value.length > 300) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return false;
    if (!PUBLIC_HOSTS.has(url.hostname)) return false;
    return url.hostname !== "github.com" || url.pathname.startsWith("/kvnloo/");
  } catch {
    return false;
  }
};

export function parsePublicBoplogProjectionV1(value: unknown): PublicBoplogProjectionV1 | null {
  if (!isRecord(value) || !hasExactKeys(value, ROOT_KEYS, ROOT_KEYS)) return null;
  if (value.schemaVersion !== 1 || typeof value.generatedAt !== "string" || Number.isNaN(Date.parse(value.generatedAt))) return null;
  if (!isRecord(value.source) || !hasExactKeys(value.source, SOURCE_KEYS, SOURCE_KEYS)) return null;
  if (!isPublicUrl(value.source.canonicalUrl) || typeof value.source.contentHash !== "string" || !HASH_RE.test(value.source.contentHash)) return null;
  if (!Number.isSafeInteger(value.pageSize) || Number(value.pageSize) < 1 || Number(value.pageSize) > 4) return null;
  if (!Array.isArray(value.entries) || value.entries.length < 1 || value.entries.length > 12) return null;

  const entries: PublicBoplogEntryV1[] = [];
  for (const candidate of value.entries) {
    if (!isRecord(candidate) || !hasExactKeys(candidate, ENTRY_KEYS, REQUIRED_ENTRY_KEYS)) return null;
    if (!isSafeText(candidate.publicId, 64) || !SAFE_ID_RE.test(candidate.publicId)) return null;
    if (!isSafeText(candidate.displayName, 64) || !isSafeText(candidate.summary, 180)) return null;
    if (typeof candidate.kind !== "string" || !KINDS.has(candidate.kind as PublicBoplogKindV1)) return null;
    if (!Number.isSafeInteger(candidate.order) || Number(candidate.order) < 1) return null;
    if (!Array.isArray(candidate.urls) || candidate.urls.length < 1 || candidate.urls.length > 3 || !candidate.urls.every(isPublicUrl)) return null;
    if (new Set(candidate.urls).size !== candidate.urls.length) return null;
    if (!Array.isArray(candidate.tags) || candidate.tags.length > 4 || !candidate.tags.every((tag) => isSafeText(tag, 32) && SAFE_ID_RE.test(tag))) return null;
    if (candidate.imageUrl !== undefined && !isPublicUrl(candidate.imageUrl)) return null;
    if (candidate.publicStatusLabel !== undefined && !isSafeText(candidate.publicStatusLabel, 40)) return null;
    entries.push(candidate as PublicBoplogEntryV1);
  }

  if (new Set(entries.map((entry) => entry.publicId)).size !== entries.length) return null;
  if (!entries.every((entry, index) => entry.order === index + 1)) return null;
  return { schemaVersion: 1, generatedAt: value.generatedAt, source: value.source as PublicBoplogProjectionV1["source"], pageSize: value.pageSize as number, entries };
}
