# Living Museum CI, worktree and integration plan

## Branch ownership

All work remains on Kevin's fork. Suggested branch names:

- `product/living-museum-shell-v1`
- `product/exhibit-<slug>-v1`
- `product/living-museum-integration-v1`

Each worktree starts from the architecture commit. Shell owns core, shell, route, generator, generated registry mechanism and search. Each exhibit owns only its exhibit directory and local tests. Integration owns merges, registry generation, lockfile reconciliation, evidence and preview. No upstream PR and no live auto-deploy.

## Integration order

1. Architecture commit.
2. Shell/search branch.
3. Exhibits in lexical slug order: `call-of-duty`, `halo`, `obsidian-vault`, `pokemon-cards`, `pokemon-game`, `star-wars-game`.
4. Generate registry once.
5. Run full gates and build private preview artifact.
6. Independent review and exact-pack Captain art approval.
7. Captain separately authorizes fork-main merge and any publication/deployment.

## Required gates

Baseline repo gates: `npm run lint`, `npm run typecheck`, `npm run test -- --run`, and `npm run build`.

Museum gates add:

- strict schema and unknown-field rejection;
- slug/id and registry collision checks;
- deterministic clean registry regeneration;
- asset existence, size, SHA-256, media type, origin, creator and license;
- denylisted extensions and franchise/ripped-asset audit;
- privacy scan of manifests, generated index, bundles, sourcemaps and screenshots;
- explicit Obsidian no-read test with filesystem APIs mocked to throw;
- bounds, authored anchor, LOD hysteresis, one-active-exhibit and sleep/offscreen tests;
- static query corpus and strict search result/XSS/deep-link/keyboard tests;
- Playwright desktop 1440x900 and mobile 390x844 visitor journeys;
- real WebGL smoke plus software/no-WebGL fallback;
- visual snapshots for arrival, approach, detail, orbit and exit, reviewed for intentional changes;
- measured CPU/GPU frame p95, triangles, draw calls, textures, transfer and resident bytes;
- private preview artifact only, with no deployment step and no public URL output.

CI fails closed on unavailable WebGL/perf instrumentation rather than reporting a pass. Performance runs use pinned hardware/browser/viewport/DPR/quality and archive raw traces. Existing repo failures must be recorded separately; museum changes may not add new failures or use the baseline as a waiver.

## Exact child acceptance handoff

Every implementation child must report an exact commit and changed-file list, prove ownership boundaries, and run focused unit tests plus baseline lint/typecheck/build where applicable. It must show:

- manifest parses with `parseMuseumExhibitV1` and fails for unknown/private fields;
- assets are original/procedural/project-owned and hash/license verified;
- no ripped franchise assets, logos, audio, fonts, card scans or screenshots;
- fan-project/no-affiliation copy is present for franchise labels;
- all five authored camera anchors exist and search targets approach;
- hero/near/far/sleep LOD and deterministic inactive suspension work;
- declared budget does not exceed architecture ceilings;
- public process/milestone content has evidence or remains absent;
- mobile/reduced-motion/WebGL fallback preserves composition;
- no central/generated file edits from an exhibit branch;
- no live deploy, fork-main merge, public push or upstream PR.

The Obsidian child additionally proves no vault/path/file/name/graph/note/attachment inspection and renders only the connector-disabled placeholder. The shell child proves corpus adapters are closed to filesystem, Kanban/Boplog DB, gateway events and private fallbacks. Integration additionally supplies the private 12-angle contact sheet, 60-90 second tour, mobile/fallback evidence, measurement traces and exact sealed pack for Captain review.
