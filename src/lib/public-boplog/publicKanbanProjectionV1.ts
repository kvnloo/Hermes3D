export type PublicKanbanCountsV1 = {
  planned: number;
  active: number;
  review: number;
  blocked: number;
  completed: number;
  total: number;
};

export type PublicKanbanEntryV1 = {
  publicId: string;
  repoIdentity: string;
  selector: string;
  provenance: string;
  counts: PublicKanbanCountsV1;
  lastUpdatedBucket: "today" | "this week" | "older";
};

export type PublicKanbanProjectionV1 = {
  schemaVersion: 1;
  generatedAt: string;
  sourceRevision: string;
  projectionHash: string;
  entries: PublicKanbanEntryV1[];
};

const ROOT_KEYS = ["schemaVersion", "generatedAt", "sourceRevision", "projectionHash", "entries"];
const ENTRY_KEYS = ["publicId", "repoIdentity", "selector", "provenance", "counts", "lastUpdatedBucket"];
const COUNT_KEYS = ["planned", "active", "review", "blocked", "completed", "total"];
const PUBLIC_IDS = new Set(["hermes-keel", "boplog"]);
const REPO_IDENTITIES = new Map([
  ["hermes-keel", "github.com/kvnloo/hermes-keel"],
  ["boplog", "github.com/kvnloo/boplog"],
]);
const SELECTORS = new Map([
  ["hermes-keel", "git-common-dir:github.com/kvnloo/hermes-keel"],
  ["boplog", "registry:product_boplog"],
]);
const PROVENANCE = new Map([
  ["hermes-keel", "exact public repo remote plus canonical workspace identity"],
  ["boplog", "exact public repo remote plus canonical company registry product"],
]);
const HASH_RE = /^sha256:[a-f0-9]{64}$/;
const SEALED_HASH = "sha256:216aee8961bb0c3fbf2202a38b510c5463facb13542cee71ef3736e196fced57";
const SAFE_TEXT_RE = /^[a-zA-Z0-9 .:_/-]+$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const exactKeys = (value: Record<string, unknown>, keys: string[]) => {
  const actual = Object.keys(value);
  return actual.length === keys.length && actual.every((key) => keys.includes(key));
};

export function parsePublicKanbanProjectionV1(value: unknown): PublicKanbanProjectionV1 | null {
  if (!isRecord(value) || !exactKeys(value, ROOT_KEYS)) return null;
  if (value.schemaVersion !== 1 || typeof value.generatedAt !== "string" || Number.isNaN(Date.parse(value.generatedAt))) return null;
  if (typeof value.sourceRevision !== "string" || !SAFE_TEXT_RE.test(value.sourceRevision)) return null;
  if (typeof value.projectionHash !== "string" || !HASH_RE.test(value.projectionHash) || value.projectionHash !== SEALED_HASH) return null;
  if (!Array.isArray(value.entries) || value.entries.length > PUBLIC_IDS.size) return null;

  const seen = new Set<string>();
  for (const entry of value.entries) {
    if (!isRecord(entry) || !exactKeys(entry, ENTRY_KEYS)) return null;
    if (typeof entry.publicId !== "string" || !PUBLIC_IDS.has(entry.publicId) || seen.has(entry.publicId)) return null;
    if (entry.repoIdentity !== REPO_IDENTITIES.get(entry.publicId)) return null;
    if (entry.selector !== SELECTORS.get(entry.publicId) || entry.provenance !== PROVENANCE.get(entry.publicId)) return null;
    if (!["today", "this week", "older"].includes(String(entry.lastUpdatedBucket))) return null;
    if (!isRecord(entry.counts) || !exactKeys(entry.counts, COUNT_KEYS)) return null;
    const counts = entry.counts as Record<string, unknown>;
    if (!COUNT_KEYS.every((key) => Number.isSafeInteger(counts[key]) && Number(counts[key]) >= 0 && Number(counts[key]) <= 999)) return null;
    if (Number(counts.total) !== COUNT_KEYS.slice(0, 5).reduce((sum, key) => sum + Number(counts[key]), 0)) return null;
    seen.add(entry.publicId);
  }
  return value as PublicKanbanProjectionV1;
}
