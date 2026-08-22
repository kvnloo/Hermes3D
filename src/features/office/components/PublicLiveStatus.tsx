"use client";

import { useEffect, useRef, useState } from "react";
import { rendererHeartbeatIsHealthy } from "@/lib/live/publicDemoState";
import styles from "./PublicLiveStatus.module.css";

export function PublicLiveStatus() {
  const lastFrameAt = useRef<number | null>(null);
  const [healthy, setHealthy] = useState(false);

  useEffect(() => {
    let frameId = 0;
    let previousHealthy = false;
    const sample = () => {
      if (document.visibilityState !== "visible") {
        if (previousHealthy) {
          previousHealthy = false;
          setHealthy(false);
        }
        return;
      }
      frameId = window.requestAnimationFrame((timestamp) => {
        lastFrameAt.current = timestamp;
        const nextHealthy = rendererHeartbeatIsHealthy(lastFrameAt.current, performance.now());
        if (nextHealthy !== previousHealthy) {
          previousHealthy = nextHealthy;
          setHealthy(nextHealthy);
        }
      });
    };
    sample();
    const timerId = window.setInterval(sample, 1_000);
    return () => {
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
