export const BUILD_STAGES = [
  "DISCOVER",
  "FRAME",
  "GEOMETRY",
  "MATERIALS",
  "LIGHTING",
  "INTEGRATE",
  "VERIFY",
  "READY",
] as const;

export type BuildStage = (typeof BUILD_STAGES)[number];
export type BuildEventType =
  | "build.start"
  | "build.progress"
  | "asset.stage"
  | "build.complete"
  | "build.fail"
  | "build.stale";

export type PublicBuildEvent = {
  version: 1;
  type: BuildEventType;
  buildId: string;
  projectLabel: string;
  assetLabel: string;
  stage: BuildStage;
  progress: number | null;
  revision: string;
  timestamp: string;
  agentCount: number;
  componentIds?: string[];
};

export type BuildSceneState = PublicBuildEvent & {
  status: "building" | "failed" | "stale" | "ready";
  finishedVisible: boolean;
};

const EVENT_KEYS = new Set([
  "version",
  "type",
  "buildId",
  "projectLabel",
  "assetLabel",
  "stage",
  "progress",
  "revision",
  "timestamp",
  "agentCount",
  "componentIds",
]);
const EVENT_TYPES: readonly string[] = [
  "build.start",
  "build.progress",
  "asset.stage",
  "build.complete",
  "build.fail",
  "build.stale",
];
const SAFE_ID = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/;
const SAFE_LABEL = /^[a-zA-Z0-9][a-zA-Z0-9 ()&+.,'_-]{0,63}$/;
const SHORT_REVISION = /^[a-f0-9]{7,12}$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function parsePublicBuildEvent(value: unknown): PublicBuildEvent {
  if (!isRecord(value)) throw new Error("Build event must be an object");
  for (const key of Object.keys(value)) {
    if (!EVENT_KEYS.has(key)) throw new Error(`Unknown public build event field: ${key}`);
  }
  if (value.version !== 1) throw new Error("Unsupported build event version");
  if (typeof value.type !== "string" || !EVENT_TYPES.includes(value.type)) {
    throw new Error("Invalid build event type");
  }
  if (typeof value.buildId !== "string" || !SAFE_ID.test(value.buildId)) {
    throw new Error("Invalid build ID");
  }
  if (typeof value.projectLabel !== "string" || !SAFE_LABEL.test(value.projectLabel)) {
    throw new Error("Invalid safe label");
  }
  if (typeof value.assetLabel !== "string" || !SAFE_LABEL.test(value.assetLabel)) {
    throw new Error("Invalid safe label");
  }
  if (typeof value.stage !== "string" || !BUILD_STAGES.includes(value.stage as BuildStage)) {
    throw new Error("Invalid build stage");
  }
  if (
    value.progress !== null &&
    (typeof value.progress !== "number" ||
      !Number.isFinite(value.progress) ||
      value.progress < 0 ||
      value.progress > 100)
  ) {
    throw new Error("Invalid build progress");
  }
  if (typeof value.revision !== "string" || !SHORT_REVISION.test(value.revision)) {
    throw new Error("Invalid revision");
  }
  if (typeof value.timestamp !== "string" || !Number.isFinite(Date.parse(value.timestamp))) {
    throw new Error("Invalid timestamp");
  }
  if (
    typeof value.agentCount !== "number" ||
    !Number.isInteger(value.agentCount) ||
    value.agentCount < 0 ||
    value.agentCount > 99
  ) {
    throw new Error("Invalid agent aggregate");
  }
  if (
    value.componentIds !== undefined &&
    (!Array.isArray(value.componentIds) ||
      value.componentIds.length > 32 ||
      !value.componentIds.every((id) => typeof id === "string" && SAFE_ID.test(id)))
  ) {
    throw new Error("Invalid component IDs");
  }
  return value as PublicBuildEvent;
}

export function applyBuildEvent(
  current: BuildSceneState | null,
  input: unknown,
): BuildSceneState {
  const event = parsePublicBuildEvent(input);
  if (event.type === "build.start") {
    return { ...event, status: "building", finishedVisible: false };
  }
  if (!current || event.buildId !== current.buildId) return current ?? {
    ...event,
    status: "stale",
    finishedVisible: false,
  };
  if (event.revision !== current.revision) {
    return { ...current, timestamp: event.timestamp, status: "stale", finishedVisible: false };
  }
  if (event.type === "build.stale") {
    return { ...event, status: "stale", finishedVisible: false };
  }
  if (event.type === "build.fail") {
    return { ...event, status: "failed", finishedVisible: false };
  }
  if (event.type === "build.complete") {
    const verified = current.stage === "VERIFY" && event.stage === "READY";
    return {
      ...event,
      status: verified ? "ready" : "stale",
      finishedVisible: verified,
    };
  }
  const currentIndex = BUILD_STAGES.indexOf(current.stage);
  const nextIndex = BUILD_STAGES.indexOf(event.stage);
  if (nextIndex < currentIndex) return current;
  return { ...event, status: "building", finishedVisible: false };
}
