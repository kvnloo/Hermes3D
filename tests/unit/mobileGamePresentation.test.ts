import { describe, expect, it } from "vitest";
import { createFixtureTruthAdapter } from "@/features/mobile-game/truthAdapter";
import { describeTruthSource } from "@/features/mobile-game/presentation";

describe("mobile game truth presentation", () => {
  it("marks a stale snapshot and disables commands without hiding last-known work", () => {
    const snapshot = createFixtureTruthAdapter({
      stale: true,
      observedAt: "2026-08-22T17:42:00Z",
    }).snapshot();

    expect(describeTruthSource(snapshot)).toEqual({
      label: "Last known state",
      detail: "Observed 2026-08-22 17:42 UTC · commands unavailable",
      commandsAvailable: false,
      stale: true,
    });
    expect(snapshot.tasks).toHaveLength(1);
  });

  it("keeps fixture commands available while the source is fresh", () => {
    const snapshot = createFixtureTruthAdapter({
      observedAt: "2026-08-22T18:00:00Z",
    }).snapshot();

    expect(describeTruthSource(snapshot)).toMatchObject({
      label: "Synthetic evidence · private",
      commandsAvailable: true,
      stale: false,
    });
  });
});
