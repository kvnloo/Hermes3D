"use client";
import { useEffect, useState } from "react";
import { applyBuildEvent, type BuildSceneState, parsePublicBuildEvent } from "./buildContract";
import { loadPersistedBuildState, persistBuildState } from "./buildStore";
export function useBuildSceneState(): BuildSceneState | null {
  const [state, setState] = useState<BuildSceneState | null>(() => loadPersistedBuildState());
  useEffect(() => { if (process.env.NEXT_PUBLIC_BUILD_EVENTS_ENABLED !== "true") return; const source = new EventSource("/api/build-events"); const receive = (message: MessageEvent<string>) => { try { const event = parsePublicBuildEvent(JSON.parse(message.data)); setState((current) => { const next = applyBuildEvent(current, event); persistBuildState(next); return next; }); } catch { /* Fail closed. */ } }; source.addEventListener("build", receive as EventListener); return () => source.close(); }, []);
  return state;
}
