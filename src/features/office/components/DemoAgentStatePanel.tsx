"use client";

import { useEffect, useMemo, useState } from "react";
import type { CompanyDirectoryAgentV1 } from "@/lib/public-directory/companyDirectoryV1";
import { syntheticStateAt, type DemoAgentState } from "@/lib/live/publicDemoState";
import styles from "./PublicLiveStatus.module.css";

const STATE_LABELS: Record<DemoAgentState, string> = {
  idle: "IDLE",
  thinking: "THINKING",
  waiting: "WAITING",
  offline: "OFFLINE",
};

function DemoOrb({ state }: { state: DemoAgentState }) {
  const offline = state === "offline";
  return (
    <span className="relative flex h-8 w-8 shrink-0 items-center justify-center" aria-hidden="true">
      {state === "thinking" ? <span className={`absolute inset-0 rounded-full border border-cyan-300/25 border-t-cyan-200 ${styles.thinkingRing}`} /> : null}
      <span className={`h-4 w-4 rounded-full border ${offline ? "border-slate-500/50 bg-slate-600/50" : state === "idle" ? "border-cyan-300/20 bg-cyan-300/25" : state === "waiting" ? `border-cyan-200/30 bg-cyan-300/35 ${styles.waitingOrb}` : `border-cyan-100/50 bg-cyan-300/65 ${styles.livePulse}`}`} />
    </span>
  );
}

export function DemoAgentStatePanel({ roles }: { roles: CompanyDirectoryAgentV1[] }) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const safeRoles = useMemo(() => roles.slice(0, 5), [roles]);

  useEffect(() => {
    const startedAt = performance.now();
    const timerId = window.setInterval(() => setElapsedMs(performance.now() - startedAt), 1_000);
    return () => window.clearInterval(timerId);
  }, []);

  return (
    <section className="h-full overflow-y-auto px-3 py-3" aria-label="Synthetic demo agent states">
      <div className="rounded-md border border-cyan-300/15 bg-cyan-300/5 p-2.5">
        <p className="font-mono text-[10px] font-semibold tracking-[0.16em] text-cyan-100">DEMO AGENT STATE</p>
        <p className="mt-1 text-[10px] leading-4 text-white/55">Synthetic visualization. No live agent activity.</p>
      </div>
      <ul className="mt-3 space-y-2">
        {safeRoles.map((role, index) => {
          const state = syntheticStateAt(elapsedMs, index);
          return (
            <li key={role.publicId} className="flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-2 py-2">
              <DemoOrb state={state} />
              <div className="min-w-0">
                <p className="truncate text-[11px] font-semibold text-white/85">{role.displayName}</p>
                <p className="font-mono text-[9px] tracking-[0.1em] text-white/45">{STATE_LABELS[state]} - SYNTHETIC</p>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 font-mono text-[8px] leading-3 text-white/35">Public role categories only. Mesh entities excluded.</p>
    </section>
  );
}
