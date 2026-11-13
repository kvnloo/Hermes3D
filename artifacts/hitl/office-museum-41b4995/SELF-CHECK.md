# Office Museum 41b4995 Self-Check

Verdict: REJECTED — implementation and desktop/arrival/exhibit evidence pass, but the required mobile `/office` frame is occluded and cannot certify the office.

## Revision and runtime

- Revision: `41b4995d45a5b18ab4baa1987565bc905a0cc98d`
- Capture runtime: isolated headed `/usr/bin/chromium`, `DISPLAY=:1`, 1920×1080 desktop and 390×844 mobile
- GPU: ANGLE on NVIDIA GeForce RTX 3080 Ti; WebGL context not lost
- Runtime/process ownership: `runtime-report.json`
- Walkthrough: `walkthrough-75s.webm`, VP8 1920×1080 25 fps, 77.88 seconds

## Functional gate

PASS:

- Targeted museum unit: 15/15
- Targeted system-Chromium Playwright: 4/4 (fresh hard navigation across all six exhibit slugs plus 1920×1080, 1440×900, and 390×844 overlay layout)
- Full unit: 189 files, 1321/1321
- Typecheck: pass
- Lint: pass with 0 errors and 9 pre-existing warnings
- Build: pass, 34/34 static pages
- GitOps policy: 13/13
- GitOps validate/public-safety scan: pass
- Museum registry check: pass
- `git diff --check`: pass

## Visual sanity gate

PASS:

- Desktop office visibly shows the physical office and annex wing.
- Desktop arrival visibly shows the authored threshold/corridor/annex architecture.
- All six desktop exhibit states are differentiated; disabled Obsidian is visibly labeled disabled.
- Mobile arrival is visible and nonblank.
- The 77.88-second uninterrupted video progresses from office through annex arrival and exhibit states.
- Video 1 Hz luminance probe: no sampled second below mean 20 and no sampled second above 80% pixels below luma 24.

FAIL:

- `mobile-office.png` is not certifying evidence: mean luma 14.76, 91.9% dark pixels, and the 390×844 viewport is dominated by the public directory/projects, headquarters, and event-console overlays. The 3D office is not visibly readable.
- A fresh exact-revision headed-GPU recapture after dismissing onboarding still opened the gateway connection surface or retained overlapping projection/HQ chrome; it did not yield an honest unobstructed mobile office frame.

## Integrity

- Preserved `artifacts/hitl/office-museum-e260afbe` unchanged.
- No push, promotion, OBS change, Obsidian connection, or Captain approval is claimed.
- Candidate commit remains clean; evidence is untracked post-commit output.
