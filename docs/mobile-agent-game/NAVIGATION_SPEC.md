# Navigation specification

World, Agents, Build, Review each own a protected stack. Selecting a root reveals its last context instead of destroying it. Root entries cannot pop/replace. Context kinds are root-bound: `site`→World, `agent`→Agents, `task`→Build, `review`→Review.

Descriptors are JSON-safe `{version:1, root, kind, id?}`. `navigation.ts` rejects unknown fields, incompatible versions, prototypes, arrays, traversal-like IDs, and cross-root kinds, returning canonical copies.

The production history bridge will namespace `history.state.hermes3dGame`, preserve unrelated keys, use `pushState` for genuine pushes, and restore `popstate` without writes. URL derives from validated current route. Scroll/world camera are keyed by canonical href and restored after commit. Duplicate routes do not alter history/scroll.

The prototype dock/sheet exercises IA but does not yet claim full History integration; promotion requires fake-history unit tests and real Back/Forward proof.

Tap selects; one-finger bounded orbit and pinch zoom are Canvas-local; no joystick. Every world object needs an equivalent dock/list path. Contextual Back closes the sheet first. Desktop uses the same routes in a right inspector. Controls are ≥48px and focus-visible.
