import { describe, expect, it } from "vitest";
import {
  createGameCoordinator,
  parseGameRoute,
  type GameRoute,
} from "@/features/mobile-game/navigation";

describe("mobile game navigation", () => {
  it("validates canonical versioned routes and rejects unknown data", () => {
    expect(parseGameRoute({ version: 1, root: "world", kind: "site", id: "dim0-company" })).toEqual({
      version: 1,
      root: "world",
      kind: "site",
      id: "dim0-company",
    });
    expect(parseGameRoute({ version: 2, root: "world", kind: "root" })).toBeNull();
    expect(parseGameRoute({ version: 1, root: "world", kind: "site", id: "../secret" })).toBeNull();
    expect(parseGameRoute({ version: 1, root: "world", kind: "root", extra: true })).toBeNull();
  });

  it("preserves independent protected root stacks", () => {
    const coordinator = createGameCoordinator();
    const site: GameRoute = { version: 1, root: "world", kind: "site", id: "hermes3d" };
    const agent: GameRoute = { version: 1, root: "agents", kind: "agent", id: "agent-atlas" };

    expect(coordinator.push(site)).toBe(true);
    expect(coordinator.push(agent)).toBe(true);
    expect(coordinator.current()).toEqual(agent);
    expect(coordinator.pop()).toBe(true);
    expect(coordinator.current()).toEqual({ version: 1, root: "agents", kind: "root" });
    expect(coordinator.pop()).toBe(false);
    expect(coordinator.push({ version: 1, root: "world", kind: "root" })).toBe(true);
    expect(coordinator.current()).toEqual(site);
  });
});
