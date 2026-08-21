---
name: hermes3d-repo
description: Repo-specific expert map for safe Hermes3D changes on Kevin's fork.
version: 1.0.0
---

# Hermes3D repository expert

## System map

Hermes3D is a Next.js 16, React 19 and TypeScript frontend plus custom Node Studio server. The backend/gateway is external and authoritative for agents, sessions, approvals and runtime execution.

- App Router composition roots: `src/app`; keep feature logic out of pages.
- Agent workspace: `src/features/agents`.
- Office shell/panels: `src/features/office`.
- Immersive React Three Fiber scene: `src/features/retro-office`.
- Phaser office builder/viewer: `src/features/office/phaser`; it is a separate runtime from the immersive scene.
- Gateway client: `src/lib/gateway/GatewayClient.ts`; same-origin WebSocket proxy is `/api/gateway/ws` via `server/gateway-proxy.js`.
- Studio settings are local UI/connection preferences under server routes. Never create a second runtime source of truth.

## Routes and scene changes

`src/app/office/page.tsx` composes `OfficeScreen`, which composes `RetroOffice3D`. New large product worlds should get a feature slice and thin route rather than expanding the already-large `RetroOffice3D.tsx` switch. Reuse `src/features/retro-office/core/geometry.ts` and navigation helpers only when their office coordinate assumptions fit.

Camera writers live in `src/features/retro-office/systems/cameraLighting.tsx`. Existing modes include preset animation, follow camera, OrbitControls and query-only stream orbit. Preserve exactly one active camera writer. New scenes should use a camera arbiter; child objects publish destinations/anchors and never write the camera independently. Stream query behavior is public-facing and must remain deterministic.

React Three Fiber frame work uses `useFrame`; avoid React state in per-frame loops. Stop callbacks, audio, particles and timers for sleeping/offscreen content. Inspect `graphicsQuality.ts` and software-WebGL handling before adding quality logic. Measure CPU and GPU p95, draw calls, triangles, textures, transfer and resident bytes on pinned conditions.

## Assets

Inspect `public/office-assets` and existing loaders before adding files. Do not assume existing asset provenance applies to new product work. New museum assets require repo-relative path, SHA-256, byte count, media type, creator, origin and explicit license. No ripped models, textures, logos, audio, fonts, game screenshots or card scans. Prefer original procedural primitives or reviewed project-owned assets.

## Gateway, panels and privacy

The browser talks to Studio, then Studio talks to the gateway. Adapt contracts in this repo; do not edit the Hermes backend. Client components never read files. Tokens and private state must not enter persistent browser storage, public projection, scene labels, screenshots or search.

Operational panels consume derived runtime state. Do not present Hermes3D as lifecycle authority. Kanban owns lifecycle; Keel owns authorization/evidence; Mesh owns transport; Boplog owns approved projections; Hermes3D visualizes. Public/product search must use an explicit allowlisted projection, never filesystem/path suggestions, raw databases, gateway transcripts or a broad fallback.

Obsidian work is connector-disabled unless a new Captain-authorized contract exists. Never inspect or enumerate vault paths, filenames, graph, notes or attachments.

## Tests and commands

Use Node 20+ and npm 10+. Run single-shot unit tests with `npm run test -- --run`; plain `npm run test` watches. Baseline gates are `npm run lint`, `npm run typecheck`, `npm run test -- --run`, `npm run build`, and `npm run smoke:dev-server` when server behavior changes. E2E is `npm run e2e` and needs Playwright browsers.

Known baseline issues may exist. Capture exact failures and compare against the branch base; never claim a pass by hiding them. For WebGL work add real-browser desktop/mobile, software/no-WebGL fallback, reduced-motion, visual and measured performance evidence.

## Worktrees, integration and deployment

Check `git status --short --branch` before edits. Do not commit, push or rewrite history unless explicitly tasked. Feature worktrees must honor file ownership; exhibit branches edit only their exhibit directory. Generated registries belong to shell/integration and must regenerate deterministically.

Living Museum and other Kevin product-specific work stays on Kevin's fork. Never open upstream PRs for visual OS, exhibits, search, stream UI, directory, Orbs, camera or content integrations. No live deployment, fork-main merge or publication without explicit Captain approval. A successful build or private preview is not deployment authorization.

## Living Museum contract

Read `docs/living-museum/ADR-0001-living-museum-v1.md`, `GLOBAL_SEARCH_V1.md`, `EXHIBIT_TEMPLATE_AND_ART_REVIEW.md`, `CI_INTEGRATION_PLAN.md`, and `src/features/living-museum/core/MuseumExhibitV1.ts` before museum changes. The museum is an authored creative-studio exhibition, not dashboard boxes in 3D. One hero owns each sightline, search targets authored approach anchors, only one exhibit is active, and Captain art review of exact private walkthrough evidence is mandatory before integration.

## Common pitfalls

- Confusing immersive React Three Fiber office with Phaser builder.
- Adding another imperative camera writer.
- Mutating gateway-owned state locally.
- Putting filesystem logic in a client component.
- Expanding giant scene/screen roots instead of creating a feature slice.
- Keeping offscreen `useFrame` or audio work alive.
- Treating an open listener or HTTP 200 as a complete preview.
- Letting generated registry files become feature-branch merge hotspots.
- Treating schema/CI success as artistic or Captain approval.
