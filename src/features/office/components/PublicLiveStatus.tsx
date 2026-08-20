"use client";

import { useEffect, useRef, useState } from "react";
import { rendererHeartbeatIsHealthy } from "@/lib/live/publicDemoState";
import styles from "./PublicLiveStatus.module.css";

export function PublicLiveStatus() {
  const lastFrameAt = useRef<number | null>(null);
  const [healthy, setHealthy] = useState(false);

  useEffect(() => {
    let frameId = 0;
    let active = true;
    const onFrame = (timestamp: number) => {
      lastFrameAt.current = timestamp;
      if (active) frameId = window.requestAnimationFrame(onFrame);
    };
    frameId = window.requestAnimationFrame(onFrame);
    const timerId = window.setInterval(() => {
      const now = performance.now();
      setHealthy(document.visibilityState === "visible" && rendererHeartbeatIsHealthy(lastFrameAt.current, now));
    }, 1_000);
    return () => {
      active = false;
      window.cancelAnimationFrame(frameId);
      window.clearInterval(timerId);
    };
  }, []);

  const label = healthy ? "STREAM HEARTBEAT HEALTHY" : "STREAM HEARTBEAT OFFLINE";
  return (
    <div className="pointer-events-none fixed right-14 top-3 z-20 rounded-md border border-white/15 bg-[#05090d]/88 px-3 py-2 font-mono shadow-xl backdrop-blur-md" role="status" aria-live="polite" aria-label={`Hermes Live demo. ${label}`}>
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${healthy ? `bg-cyan-300 ${styles.livePulse}` : "bg-slate-500"}`} aria-hidden="true" />
        <span className="text-[10px] font-semibold tracking-[0.16em] text-white">HERMES LIVE</span>
        <span className="rounded border border-white/15 px-1 py-0.5 text-[8px] tracking-[0.12em] text-white/60">· DEMO</span>
      </div>
      <p className="mt-1 text-[8px] tracking-[0.08em] text-white/50">{label}</p>
    </div>
  );
}
