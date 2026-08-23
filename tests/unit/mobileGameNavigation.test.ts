import { describe, expect, it } from "vitest";
import {
  createGameHistoryBridge,
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

  it("restores validated snapshots through browser Back without writing a feedback entry", () => {
    const listeners = new Set<(event: { state: unknown }) => void>();
    const entries: Array<{ state: unknown; url: string }> = [];
    const browser = {
      location: { pathname: "/office/game", search: "?mode=fixture" },
      history: {
        state: { owner: "shell" } as unknown,
        pushState(state: unknown, _unused: string, url: string) {
          this.state = state;
          entries.push({ state, url });
        },
        replaceState(state: unknown, _unused: string, url: string) {
          this.state = state;
          if (entries.length) entries[entries.length - 1] = { state, url };
          else entries.push({ state, url });
        },
      },
      addEventListener(_name: "popstate", listener: (event: { state: unknown }) => void) { listeners.add(listener); },
      removeEventListener(_name: "popstate", listener: (event: { state: unknown }) => void) { listeners.delete(listener); },
    };
    const coordinator = createGameCoordinator();
    const bridge = createGameHistoryBridge(coordinator, browser);
    bridge.start();
    expect((browser.history.state as Record<string, unknown>).owner).toBe("shell");
    expect(coordinator.push({ version: 1, root: "agents", kind: "agent", id: "agent-atlas" })).toBe(true);
    bridge.commit("push");
    const contextualState = browser.history.state;
    expect(entries.at(-1)?.url).toBe("/office/game?mode=fixture#agents/agent/agent-atlas");

    coordinator.push({ version: 1, root: "build", kind: "task", id: "task-mobile-shell" });
    bridge.commit("push");
    const countBeforeBack = entries.length;
    listeners.forEach((listener) => listener({ state: contextualState }));
    expect(coordinator.current()).toEqual({ version: 1, root: "agents", kind: "agent", id: "agent-atlas" });
    expect(entries).toHaveLength(countBeforeBack);
    bridge.stop();
  });
});
