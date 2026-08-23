"use client";

import { useEffect, useState } from "react";
import {
  applyBuildEvent,
  type BuildSceneState,
  parsePublicBuildEvent,
} from "./buildContract";
import { loadPersistedBuildState, persistBuildState } from "./buildStore";

export function useBuildSceneState(): BuildSceneState | null {
  const [state, setState] = useState<BuildSceneState | null>(() => loadPersistedBuildState());

  useEffect(() => {
    const enabled = process.env.NEXT_PUBLIC_BUILD_EVENTS_ENABLED === "true";
    const synthetic = new URLSearchParams(window.location.search).get("buildEvidence") === "1";
    if (!enabled && !synthetic) return;

    const source = new EventSource(
      synthetic ? "/api/build-events?mode=synthetic" : "/api/build-events",
    );
    const receive = (message: MessageEvent<string>) => {
      try {
        const event = parsePublicBuildEvent(JSON.parse(message.data));
        setState((current) => {
          const next = applyBuildEvent(current, event);
          if (next !== current) persistBuildState(next);
          return next;
        });
      } catch {
        // Invalid/unapproved events never become visible scene state.
      }
    };
    source.addEventListener("build", receive as EventListener);
    return () => source.close();
  }, []);

  return state;
}
