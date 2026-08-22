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
    snapshot() {
      return {
        version: 1 as const,
        selected,
        stacks: Object.fromEntries(GAME_ROOTS.map((root) => [root, stacks[root].map((route) => ({ ...route }))])),
      };
    },
  };
}
