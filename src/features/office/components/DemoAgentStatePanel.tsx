"use client";

import { useEffect, useMemo, useState } from "react";
import { ThinkingOrb, type OrbState } from "thinking-orbs";
import type { CompanyDirectoryAgentV1 } from "@/lib/public-directory/companyDirectoryV1";
import { syntheticStateAt, type DemoAgentState } from "@/lib/live/publicDemoState";

const STATE_LABELS: Record<DemoAgentState, string> = {
  idle: "IDLE",
  thinking: "THINKING",
  waiting: "WAITING",
  offline: "OFFLINE",
};

const ORB_STATE: Record<DemoAgentState, OrbState> = {
  idle: "breathing",
  thinking: "working",
  waiting: "connecting",
  offline: "shaping",
};

function DemoOrb({ state, roleName }: { state: DemoAgentState; roleName: string }) {
  const paused = state === "idle" || state === "offline";
  return (
    <span
      className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-md border bg-[#07131a] ${
        state === "thinking"
          ? "border-cyan-200/55"
          : state === "waiting"
            ? "border-cyan-300/25 opacity-75"
            : state === "offline"
              ? "border-slate-500/20 opacity-35 grayscale"
              : "border-white/10 opacity-65"
      }`}
    >
      <ThinkingOrb
        state={ORB_STATE[state]}
        size={64}
        theme="dark"
        speed={state === "waiting" ? 0.45 : 1}
        paused={paused}
        aria-label={`${roleName}: ${STATE_LABELS[state].toLowerCase()} synthetic agent state`}
      />
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
              <DemoOrb state={state} roleName={role.displayName} />
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
