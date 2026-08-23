# Mobile UX audit

Date: 2026-08-22. Scope: source audit plus deterministic `/office` and prototype pixel captures.

## Confirmed findings

1. Root viewport was desktop-biased: `h-screen` at `src/app/layout.tsx:44`; builder repeats it at `src/app/office/builder/page.tsx:17`. Prototype root now uses `h-dvh`.
2. Responsiveness is fragmented. `AgentsPageScreen.tsx` has Fleet/Chat mobile panes, while CSS search found only one existing media query (`PublicLiveStatus.module.css`) and no systematic safe-area/touch contract.
3. Navigation is mostly local React state: seven page routes, `/agents` redirects, and office immersive modes lack durable protected stacks.
4. 3D ownership is split: `RetroOffice3D.tsx` owns office Canvas; avatar preview mounts another. Isolated game route mounts one.
5. GitHub review and Kanban are dense mutation surfaces; they must not be squeezed into the sheet or bound live.
6. Office loading is labeled (`src/app/office/page.tsx:16-32`), but coherent stale/offline game projection and list fallback remain absent.
7. The six committed `/office` captures (`evidence/office-*.png`) confirm the source-level concern. At 390×844, OCR resolves the desktop information architecture simultaneously: Headquarters/Public Directory, Add Agent/Build Company, governance roles, Agents/Inbox/History/Kanban/Playbook, topology, agent-state rows, and console controls. This is a desktop control room squeezed into portrait rather than a glanceable mobile journey. Labels collide or truncate, columns remain visible at unreadable density, and console controls compete with the primary agent list. The 320×720, 360×800, 412×915, and 844×390 images show the same class; 1440×900 is the intended readable density. These receipts are intentionally diagnostic and do not claim the existing office is mobile-ready.

## Required pixel matrix

Capture `/office` and `/office/game` at 320×720, 360×800, 390×844, 412×915, 844×390, 1440×900. Inspect pixels for safe areas, dock/title/sheet clipping, 48px controls, text scale, silhouettes, gestures, focus, keyboard viewport, Back, reduced motion, loading/stale/offline, and frame time.

The prototype CSS supplies `100dvh`, safe-area env values, 48px targets, one sheet, portrait/short-landscape rules, focus rings, reduced motion, and Canvas-local touch containment. Status uses label + geometry and the fixture displays provenance/time. Existing-office screenshots have exact required pixel dimensions (verified with ImageMagick); the headless browser became unstable while collecting DOM metrics from the heavy office after all six PNGs were written, so no office frame-time or touch-size claim is made.

## Prototype matrix evidence

Playwright captured the private route at every required viewport under `docs/mobile-agent-game/evidence/`; `contact-sheet.png` composes the six states and `matrix.json` records exact geometry. All six loaded the correct title with zero page/console errors, exactly one Canvas, no horizontal overflow, and a 53.75px minimum measured control target. Shell height equaled the viewport at 320×720, 360×800, 390×844, 412×915, 844×390, and 1440×900. The first landscape run exposed a clipped 573px minimum-height bug; removing that floor produced the recorded 390px pass. These are layout/pixel receipts, not phone GPU performance certification or complete existing `/office` audit.

The explicit stale-source proof is available at `/office/game?source=stale`: it retains the last-known task, labels the observation time, and disables command issuance rather than silently queueing it. The adjacent “Use list view” control supplies the non-3D alternative with the same site, agent, status, and provenance selections. A 390×844 capture is retained as `evidence/stale-list-390x844.png`; the browser probe measured zero horizontal overflow and a 53.75px minimum button target. This is fixture evidence only, not a live connectivity claim.

## Interaction walkthrough

`evidence/walkthrough-390x844.webm` is a 29.4-second deterministic portrait walkthrough (390×844, 770,812 bytes). It opens Build, issues the safe fixture-only assignment, applies synthetic running then review evidence, selects Agents, uses browser Back to restore the prior Build context, switches to the non-3D settlement list, and opens the Dim0 worksite provenance sheet. `evidence/walkthrough-final-390x844.png` records the final state. The capture proves navigation and projection behavior only; it does not authorize live mutations or certify GPU performance.

## Performance promotion verdict

The required parent certification `t_58421c00` completed fail-closed. Its fresh production smoke retained 3,573 presented frames and passed legacy tails, but the mandatory ≥100,000 actually-presented-frame row was not obtained: Chrome retained 44,594 frames before trace-buffer saturation and the segmented retry closed under severe protected-host memory pressure. No baseline integration or performance promotion is authorized. This prototype remains private and non-certified.
