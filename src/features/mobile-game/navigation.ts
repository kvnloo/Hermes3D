export const GAME_ROOTS = ["world", "agents", "build", "review"] as const;
export type GameRoot = (typeof GAME_ROOTS)[number];

type RootRoute = { version: 1; root: GameRoot; kind: "root" };
type ContextRoute =
  | { version: 1; root: "world"; kind: "site"; id: string }
  | { version: 1; root: "agents"; kind: "agent"; id: string }
  | { version: 1; root: "build"; kind: "task"; id: string }
  | { version: 1; root: "review"; kind: "review"; id: string };
export type GameRoute = RootRoute | ContextRoute;

const ID_PATTERN = /^[a-z0-9](?:[a-z0-9_-]{0,62}[a-z0-9])?$/;
const rootSet = new Set<string>(GAME_ROOTS);
const contextKind: Record<GameRoot, ContextRoute["kind"]> = {
  world: "site",
  agents: "agent",
  build: "task",
  review: "review",
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;

export function parseGameRoute(value: unknown): GameRoute | null {
  if (!isRecord(value) || value.version !== 1 || typeof value.root !== "string" || !rootSet.has(value.root)) return null;
  const root = value.root as GameRoot;
  if (value.kind === "root") {
    if (Object.keys(value).length !== 3) return null;
    return { version: 1, root, kind: "root" };
  }
  if (value.kind !== contextKind[root] || typeof value.id !== "string" || !ID_PATTERN.test(value.id)) return null;
  if (Object.keys(value).length !== 4) return null;
  return { version: 1, root, kind: value.kind, id: value.id } as GameRoute;
}

const rootRoute = (root: GameRoot): RootRoute => ({ version: 1, root, kind: "root" });
const routeEqual = (a: GameRoute, b: GameRoute) => JSON.stringify(a) === JSON.stringify(b);

export type GameNavigationSnapshot = {
  version: 1;
  selected: GameRoot;
  stacks: Record<GameRoot, GameRoute[]>;
};

function parseSnapshot(value: unknown): GameNavigationSnapshot | null {
  if (!isRecord(value) || value.version !== 1 || typeof value.selected !== "string" || !rootSet.has(value.selected) || !isRecord(value.stacks)) return null;
  if (Object.keys(value).length !== 3 || Object.keys(value.stacks).length !== GAME_ROOTS.length) return null;
  const stacks = {} as Record<GameRoot, GameRoute[]>;
  for (const root of GAME_ROOTS) {
    const input = value.stacks[root];
    if (!Array.isArray(input) || input.length === 0) return null;
    const routes = input.map(parseGameRoute);
    if (routes.some((route) => !route) || routes[0]?.kind !== "root" || routes[0]?.root !== root || routes.some((route) => route?.root !== root)) return null;
    stacks[root] = routes as GameRoute[];
  }
  return { version: 1, selected: value.selected as GameRoot, stacks };
}

export function createGameCoordinator() {
  const stacks = Object.fromEntries(GAME_ROOTS.map((root) => [root, [rootRoute(root)]])) as Record<GameRoot, GameRoute[]>;
  let selected: GameRoot = "world";

  return {
    current: (): GameRoute => ({ ...stacks[selected].at(-1)! }),
    push(input: unknown): boolean {
      const route = parseGameRoute(input);
      if (!route) return false;
      const wasSelected = selected === route.root;
      selected = route.root;
      if (route.kind === "root") return !wasSelected;
      const top = stacks[selected].at(-1)!;
      if (routeEqual(top, route)) return false;
      stacks[selected].push(route);
      return true;
    },
    pop(): boolean {
      if (stacks[selected].length === 1) return false;
      stacks[selected].pop();
      return true;
    },
    restore(input: unknown): boolean {
      const snapshot = parseSnapshot(input);
      if (!snapshot) return false;
      selected = snapshot.selected;
      for (const root of GAME_ROOTS) stacks[root] = snapshot.stacks[root].map((route) => ({ ...route }));
      return true;
    },
    snapshot() {
      return {
        version: 1 as const,
        selected,
        stacks: Object.fromEntries(GAME_ROOTS.map((root) => [root, stacks[root].map((route) => ({ ...route }))])),
      };
    },
  };
}

type GameCoordinator = ReturnType<typeof createGameCoordinator>;
type HistoryBrowser = {
  location: { pathname: string; search: string };
  history: {
    state: unknown;
    pushState(state: unknown, unused: string, url: string): void;
    replaceState(state: unknown, unused: string, url: string): void;
  };
  addEventListener(name: "popstate", listener: (event: { state: unknown }) => void): void;
  removeEventListener(name: "popstate", listener: (event: { state: unknown }) => void): void;
};

const HISTORY_KEY = "hermesMobileGame";
const routeHash = (route: GameRoute) => route.kind === "root" ? `#${route.root}` : `#${route.root}/${route.kind}/${route.id}`;

export function createGameHistoryBridge(coordinator: GameCoordinator, browser: HistoryBrowser, onRestore: () => void = () => undefined) {
  const stateWithSnapshot = () => ({ ...(isRecord(browser.history.state) ? browser.history.state : {}), [HISTORY_KEY]: coordinator.snapshot() });
  const url = () => `${browser.location.pathname}${browser.location.search}${routeHash(coordinator.current())}`;
  const onPopState = (event: { state: unknown }) => {
    const state = isRecord(event.state) ? event.state[HISTORY_KEY] : null;
    if (coordinator.restore(state)) onRestore();
  };
  return {
    start() {
      const state = isRecord(browser.history.state) ? browser.history.state[HISTORY_KEY] : null;
      if (coordinator.restore(state)) onRestore();
      else browser.history.replaceState(stateWithSnapshot(), "", url());
      browser.addEventListener("popstate", onPopState);
    },
    commit(mode: "push" | "replace") {
      browser.history[mode === "push" ? "pushState" : "replaceState"](stateWithSnapshot(), "", url());
    },
    stop() { browser.removeEventListener("popstate", onPopState); },
  };
}
