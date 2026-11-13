# Exact-revision headed-browser self-check — REJECTED

- Revision: `e260afbefd8cef333ff8635976eb140a7f158093`
- Branch: `wt/t_407da0ef`
- Runtime: `http://127.0.0.1:3119`
- Browser: isolated headed `/usr/bin/chromium` on `DISPLAY=:1`
- GPU flags: `--ignore-gpu-blocklist --enable-gpu-rasterization --enable-zero-copy`
- Required desktop viewport: `1920x1080`
- Planned mobile viewport: `390x844`
- Capture date: 2026-08-21 CDT

## Verdict

**Visual sanity gate: FAIL / candidate rejected.** Capture stopped fail-closed before producing a misleading full packet or walkthrough.

## Reproduced blockers

1. `/office?room=museum` updates the overlay to “Gallery arrival / Explore the annex”, but the headed-browser pixels remain on the wide office overview. The promised physical annex doorway/threshold, gallery boundaries, arrival sculpture, and continuous office→annex travel are not visible. This is overlay-only continuity, explicitly forbidden by acceptance.
2. A fresh hard navigation to `/office?room=museum&exhibit=pokemon-cards` did not expose the `Living Museum gallery` landmark within 30 seconds. The capture harness reproduced this twice (including a fresh `about:blank` hard-navigation boundary), so exact deep-link activation cannot be certified.
3. Because the first required exhibit deep link failed, desktop/mobile all-exhibit stills, search/back certification, hero-object luminance measurements, and the 60–90 second guided walkthrough were intentionally not completed or represented as passing.
4. Earlier artifacts under `artifacts/hitl/office-museum-repair-headed` are rejected and not reused: literal pixel inspection shows the onboarding wizard occluding office/arrival/exhibit frames.

## Evidence

- `desktop-office.png` — headed browser, onboarding dismissed, exact revision.
- `desktop-arrival.png` — headed browser, overlay says arrival but pixels remain wide office overview; no visible physical annex threshold or arrival object.
- `capture-attempt.log` — process failure transcript is preserved in Kanban run history; Playwright timed out waiting for the real gallery landmark on the first exhibit deep link.

## Pixel/luminance note

FFmpeg `signalstats` on `desktop-arrival.png` (BT.601 limited-range Y): `YMIN=16`, `YLOW=31`, `YAVG=91.0149`, `YHIGH=171`, `YMAX=235`. This frame is not crushed black, but luminance is irrelevant to exhibit acceptance because the required annex/exhibit hero is absent. No central hotspot is visible; the blocking failure is wrong camera/scene state.

## Functional gate context

Upstream exact-revision gates report 1319/1319 unit tests, typecheck, lint (0 errors), build, GitOps, registry, and overlay fixture passing. Those tests do not override this real-browser failure.

## Required next action

Return to implementation: repair initial deep-link activation and ensure the existing office camera arbiter visibly travels through the physical threshold to the annex/selected hero. Then rerun this entire same-revision desktop/mobile/video packet from scratch.
