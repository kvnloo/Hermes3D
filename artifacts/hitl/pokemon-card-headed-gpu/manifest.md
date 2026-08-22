# Headed GPU Exhibit Evidence Manifest — PASSING

- Parent revision: `01430986e2c92ff4453080ddc59cc856906f3833`; these recaptures include the immediately following Second Mate mobile/inspection repair commit.
- Branch: `feat/pokemon-card-exhibit-preview`
- Runtime: system Chromium, headed on `DISPLAY=:1`
- GPU display: NVIDIA GeForce RTX 3080 Ti, direct rendering; browser readback in `capture-state.json` is `ANGLE (NVIDIA Corporation, NVIDIA GeForce RTX 3080 Ti/PCIe/SSE2, OpenGL 4.5.0)`.
- Isolated profile: unique temporary profile created by `capture.mjs` (`/tmp/pokemon-headed-gpu-repair-*`); never a shared or user browser profile
- Exact route: `http://127.0.0.1:3211/exhibits/pokemon-cards?evidence=1`
- Capture method: 64 full-viewport frames captured directly from the headed Chromium page at 1920×1080 and encoded losslessly in geometry to VP9. This bypasses the rejected XWayland/Playwright recorder path that produced a half-frame field while preserving the real headed, NVIDIA-rendered browser frames.

## Functional gate

PASS.

- `PLAYWRIGHT_PORT=3211 PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npx playwright test tests/e2e/pokemon-cards-exhibit.spec.ts --config=playwright.config.ts --reporter=line` — 10/10 passed.
- The E2E contract counts exactly nine literal `<img data-card-face="true">` canonical faces, not metadata/navigation stand-ins, at both 1920×1080 and 390×844.
- The gallery→inspection test clicks the in-place control, observes `moving` then `settled`, and verifies the URL did not change.
- `npm run typecheck` — pass.
- `npm run lint` — pass with existing warnings only.
- `npm run build` — pass.

## Full-resolution visual gate

PASS.

- `desktop-1920x1080.png` — nine uncropped canonical faces visible alongside the exact layered hero, tactile slab, and plinth.
- `mobile-390x844.png` — nine uncropped canonical faces visible in a compact 3×3 gallery above, rather than overlapping, the fully framed mounted hero; measured runtime state reports `cardFaces=9`, viewport `390×844`, and `scrollWidth=390`.
- `inspection-1920x1080.png` — settled isolated inspection framing hides gallery/ledger distractions and enlarges the readable face while retaining the slab and plinth.
- `gallery-to-inspection-1920x1080.webm` — VP9, 1920×1080, 8.0 seconds; includes pointer-driven light response and the continuous in-page camera move.
- `passing-motion-contact-sheet.png` — eight one-second full-frame samples from the passing video.
- `pixel-inspection.json` — both halves of every sampled frame contain substantial image variation. Right-half standard deviation remains 31.90–33.07 (not a persistent gray field); left-half standard deviation remains 43.28–52.50.
- The restrained response is visible in two independent layers: a low-opacity iridescent physical material over the exact layered hero, and a separate low-opacity moving gallery sheen. Canonical source pixels are uncropped and unchanged beneath the response.

## Safety and provenance

No canonical CardTwin textures or semantic layer assets were changed. No SR, generated replacement art, live OBS, live Hermes, shared Chromium profile, user browser state, merge, push, or promotion was used. Rejected prior captures were moved out of the passing artifact directory.
