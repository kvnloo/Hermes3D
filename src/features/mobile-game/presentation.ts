import type { createFixtureTruthAdapter } from "./truthAdapter";

type TruthSnapshot = ReturnType<ReturnType<typeof createFixtureTruthAdapter>["snapshot"]>;

export function describeTruthSource(snapshot: TruthSnapshot) {
  const observed = new Date(snapshot.observedAt);
  const observedLabel = Number.isNaN(observed.valueOf())
    ? snapshot.observedAt
    : `${observed.toISOString().slice(0, 10)} ${observed.toISOString().slice(11, 16)} UTC`;

  return snapshot.stale
    ? {
        label: "Last known state",
        detail: `Observed ${observedLabel} · commands unavailable`,
        commandsAvailable: false,
        stale: true,
      }
    : {
        label: "Synthetic evidence · private",
        detail: `Observed ${observedLabel}`,
        commandsAvailable: true,
        stale: false,
      };
}
