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
    <div className="pointer-events-none fixed right-12 top-2 z-20 rounded-md border border-white/15 bg-[#05090d]/88 px-2 py-1.5 font-mono shadow-xl backdrop-blur-md sm:right-14 sm:top-3 sm:px-3 sm:py-2" role="status" aria-live="polite" aria-label={`Hermes Live demo. ${label}`}>
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${healthy ? `bg-cyan-300 ${styles.livePulse}` : "bg-slate-500"}`} aria-hidden="true" />
        <span className="text-[10px] font-semibold tracking-[0.16em] text-white">HERMES LIVE</span>
        <span className="rounded border border-white/15 px-1 py-0.5 text-[8px] tracking-[0.12em] text-white/60">· DEMO</span>
      </div>
      <p className="mt-1 hidden text-[8px] tracking-[0.08em] text-white/50 sm:block">{label}</p>
    </div>
  );
}
