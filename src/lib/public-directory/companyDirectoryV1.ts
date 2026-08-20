export type CompanyDirectoryAgentV1 = {
  publicId: string;
  displayName: string;
  roleLabel: string;
  avatarKey?: string;
  order: number;
};

export type CompanyDirectoryMeshEntityV1 = {
  publicId: string;
  displayName: string;
  entityType: "hermes-node" | "compute-node" | "transport-gateway";
  roleLabel: string;
  order: number;
};

export type CompanyDirectoryV1 = {
  schemaVersion: 1;
  company: {
    publicId: string;
    displayName: string;
  };
  agents: CompanyDirectoryAgentV1[];
  meshEntities: CompanyDirectoryMeshEntityV1[];
};

const ROOT_KEYS = ["schemaVersion", "company", "agents", "meshEntities"] as const;
const COMPANY_KEYS = ["publicId", "displayName"] as const;
const AGENT_KEYS = ["publicId", "displayName", "roleLabel", "avatarKey", "order"] as const;
const MESH_KEYS = ["publicId", "displayName", "entityType", "roleLabel", "order"] as const;
const ENTITY_TYPES = new Set(["hermes-node", "compute-node", "transport-gateway"]);
const SAFE_ID_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const UNSAFE_DISPLAY_RE = /[<>\u0000-\u001f\u007f]/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasExactKeys = (
  value: Record<string, unknown>,
  allowed: readonly string[],
  required: readonly string[],
): boolean => {
  const keys = Object.keys(value);
  return keys.every((key) => allowed.includes(key)) && required.every((key) => keys.includes(key));
};

const isSafeId = (value: unknown): value is string =>
  typeof value === "string" && SAFE_ID_RE.test(value);

const isSafeDisplayText = (value: unknown): value is string =>
  typeof value === "string" &&
  value.length > 0 &&
  value.length <= 64 &&
  value === value.trim() &&
  !UNSAFE_DISPLAY_RE.test(value);

const isOrder = (value: unknown): value is number =>
  Number.isSafeInteger(value) && Number(value) > 0;

const hasUniqueOrderedIds = (entries: Array<{ publicId: string; order: number }>): boolean => {
  const ids = new Set<string>();
  const orders = new Set<number>();
  for (const entry of entries) {
    if (ids.has(entry.publicId) || orders.has(entry.order)) return false;
    ids.add(entry.publicId);
    orders.add(entry.order);
  }
  return entries.every((entry, index) => entry.order === index + 1);
};

export function parseCompanyDirectoryV1(value: unknown): CompanyDirectoryV1 | null {
  if (!isRecord(value) || !hasExactKeys(value, ROOT_KEYS, ROOT_KEYS)) return null;
  if (value.schemaVersion !== 1 || !isRecord(value.company)) return null;
  if (!hasExactKeys(value.company, COMPANY_KEYS, COMPANY_KEYS)) return null;
  if (!isSafeId(value.company.publicId) || !isSafeDisplayText(value.company.displayName)) return null;
  if (!Array.isArray(value.agents) || !Array.isArray(value.meshEntities)) return null;

  const agents: CompanyDirectoryAgentV1[] = [];
  for (const candidate of value.agents) {
    if (!isRecord(candidate)) return null;
    if (!hasExactKeys(candidate, AGENT_KEYS, ["publicId", "displayName", "roleLabel", "order"])) return null;
    if (
      !isSafeId(candidate.publicId) ||
      !isSafeDisplayText(candidate.displayName) ||
      !isSafeDisplayText(candidate.roleLabel) ||
      !isOrder(candidate.order) ||
      (candidate.avatarKey !== undefined && !isSafeId(candidate.avatarKey))
    ) return null;
    agents.push({
      publicId: candidate.publicId,
      displayName: candidate.displayName,
      roleLabel: candidate.roleLabel,
      ...(candidate.avatarKey === undefined ? {} : { avatarKey: candidate.avatarKey }),
      order: candidate.order,
    });
  }

  const meshEntities: CompanyDirectoryMeshEntityV1[] = [];
  for (const candidate of value.meshEntities) {
    if (!isRecord(candidate) || !hasExactKeys(candidate, MESH_KEYS, MESH_KEYS)) return null;
    if (
      !isSafeId(candidate.publicId) ||
      !isSafeDisplayText(candidate.displayName) ||
      !isSafeDisplayText(candidate.roleLabel) ||
      typeof candidate.entityType !== "string" ||
      !ENTITY_TYPES.has(candidate.entityType) ||
      !isOrder(candidate.order)
    ) return null;
    meshEntities.push({
      publicId: candidate.publicId,
      displayName: candidate.displayName,
      entityType: candidate.entityType as CompanyDirectoryMeshEntityV1["entityType"],
      roleLabel: candidate.roleLabel,
      order: candidate.order,
    });
  }

  if (!hasUniqueOrderedIds(agents) || !hasUniqueOrderedIds(meshEntities)) return null;
  const allIds = [...agents, ...meshEntities].map((entry) => entry.publicId);
  if (new Set(allIds).size !== allIds.length) return null;

  return {
    schemaVersion: 1,
    company: {
      publicId: value.company.publicId,
      displayName: value.company.displayName,
    },
    agents,
    meshEntities,
  };
}
