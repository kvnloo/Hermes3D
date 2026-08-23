import type { BuildSceneState } from "./buildContract";
import { parsePublicBuildEvent } from "./buildContract";

const STORAGE_KEY = "hermes3d.build-state.v1";

export function persistBuildState(state: BuildSceneState): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage can be unavailable in hardened/private browser contexts. The
    // server replay remains the persistence fallback and rendering continues.
  }
}

export function loadPersistedBuildState(): BuildSceneState | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const { status, finishedVisible, ...eventValue } = parsed;
    const event = parsePublicBuildEvent(eventValue);
    if (
      !["building", "failed", "stale", "ready"].includes(String(status)) ||
      typeof finishedVisible !== "boolean"
    ) {
      return null;
    }
    return { ...event, status, finishedVisible } as BuildSceneState;
  } catch {
    return null;
  }
}

export function clearPersistedBuildState(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Best-effort test/debug reset in storage-restricted contexts.
  }
}
