# Mobile UX audit

Date: 2026-08-22. Scope: source audit plus prototype matrix pending deterministic browser capture.

## Confirmed findings

1. Root viewport was desktop-biased: `h-screen` at `src/app/layout.tsx:44`; builder repeats it at `src/app/office/builder/page.tsx:17`. Prototype root now uses `h-dvh`.
2. Responsiveness is fragmented. `AgentsPageScreen.tsx` has Fleet/Chat mobile panes, while CSS search found only one existing media query (`PublicLiveStatus.module.css`) and no systematic safe-area/touch contract.
3. Navigation is mostly local React state: seven page routes, `/agents` redirects, and office immersive modes lack durable protected stacks.
4. 3D ownership is split: `RetroOffice3D.tsx` owns office Canvas; avatar preview mounts another. Isolated game route mounts one.
5. GitHub review and Kanban are dense mutation surfaces; they must not be squeezed into the sheet or bound live.
6. Office loading is labeled (`src/app/office/page.tsx:16-32`), but coherent stale/offline game projection and list fallback remain absent.

## Required pixel matrix

Capture `/office` and `/office/game` at 320×720, 360×800, 390×844, 412×915, 844×390, 1440×900. Inspect pixels for safe areas, dock/title/sheet clipping, 48px controls, text scale, silhouettes, gestures, focus, keyboard viewport, Back, reduced motion, loading/stale/offline, and frame time.

The prototype CSS supplies `100dvh`, safe-area env values, 48px targets, one sheet, portrait/short-landscape rules, focus rings, reduced motion, and Canvas-local touch containment. Status uses label + geometry and the fixture displays provenance/time.

## Prototype matrix evidence

Playwright captured the private route at every required viewport under `docs/mobile-agent-game/evidence/`; `contact-sheet.png` composes the six states and `matrix.json` records exact geometry. All six loaded the correct title with zero page/console errors, exactly one Canvas, no horizontal overflow, and a 53.75px minimum measured control target. Shell height equaled the viewport at 320×720, 360×800, 390×844, 412×915, 844×390, and 1440×900. The first landscape run exposed a clipped 573px minimum-height bug; removing that floor produced the recorded 390px pass. These are layout/pixel receipts, not phone GPU performance certification or complete existing `/office` audit.
