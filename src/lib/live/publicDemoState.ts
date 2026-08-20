export const DEMO_AGENT_STATES = ["idle", "thinking", "waiting", "offline"] as const;

export type DemoAgentState = (typeof DEMO_AGENT_STATES)[number];

export type PublicDemoAgentState = {
  state: DemoAgentState;
  synthetic: true;
};

const EXACT_KEYS = new Set(["state", "synthetic"]);

export function parsePublicDemoAgentState(value: unknown): PublicDemoAgentState | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (Object.keys(record).some((key) => !EXACT_KEYS.has(key))) return null;
  if (record.synthetic !== true) return null;
  if (!DEMO_AGENT_STATES.includes(record.state as DemoAgentState)) return null;
  return { state: record.state as DemoAgentState, synthetic: true };
}

export const SYNTHETIC_STATE_INTERVALS_MS = [7_000, 11_000, 13_000, 17_000] as const;

export function syntheticStateAt(elapsedMs: number, roleIndex: number): DemoAgentState {
  const safeElapsed = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  const interval = SYNTHETIC_STATE_INTERVALS_MS[roleIndex % SYNTHETIC_STATE_INTERVALS_MS.length];
  const step = Math.floor(safeElapsed / interval) + roleIndex;
  return DEMO_AGENT_STATES[step % DEMO_AGENT_STATES.length];
}

export const RENDERER_HEARTBEAT_STALE_MS = 3_000;

export function rendererHeartbeatIsHealthy(lastFrameAt: number | null, now: number): boolean {
  return lastFrameAt !== null && now >= lastFrameAt && now - lastFrameAt <= RENDERER_HEARTBEAT_STALE_MS;
}
