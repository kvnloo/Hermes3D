# Office Museum 0cae578 final same-revision certification

Verdict: REJECTED / FAIL CLOSED. The committed annex/mobile repair remains technically green, but the exact-revision GPU packet does not meet the visual-motion or frame-time certification bar.

## Revision and ownership

- Candidate: `0cae5782c3c0d22f936b8d8a71be1952d9a4852b` on `wt/t_407da0ef`.
- No performance integration was consumed. Parent `t_58421c00` explicitly authorized no commit/integration after its >=100k presented-frame contract failed.
- Runtime: production `node server/index.js` on `127.0.0.1:3147`, server PID `1312685`.
- Browser: isolated headed `/usr/bin/chromium` on `DISPLAY=:1`.
- GPU: ANGLE NVIDIA GeForce RTX 3080 Ti, 1920×1080 WebGL, context not lost. Exact process inventory is in `runtime-report.json`.
- Preserved `artifacts/hitl/office-museum-e260afbe` unchanged.

## Functional gate — PASS with one isolated flaky full-suite test

- Museum unit: 15/15 pass.
- Headed system-Chromium route/layout/mobile gate: 5/5 pass. This includes fresh hard activation of all six slugs, 1920×1080 / 1440×900 / 390×844 overlay contracts, and mobile office chrome collapse.
- Full Vitest: 1320/1321 in the parallel run; sole failure `exposes_restart_block_state_and_timeout_completion_handlers` passed 1/1 immediately in isolation. No museum test failed.
- Typecheck: pass.
- Lint: pass, 0 errors and 9 inherited warnings.
- Build: pass, 34/34 static pages.
- GitOps policy: 13/13 pass.
- GitOps validation/public-safety scan: pass.
- Museum registry check: pass.
- `git diff --check`: pass.

## Actual-output GPU gate — FAIL

- A real 70.96-second VP8 1920×1080/25 fps uninterrupted recording exists at the path in `video-path.txt`; `video-probe.json` records its duration and codec.
- Automated 1 Hz luminance covers 71 samples: YAVG 84.74–171.87, with zero samples below mean 20 or 30. This proves non-black output only.
- Literal contact-sheet inspection rejects the clip despite non-black telemetry. It begins on an unreadable dark/brown office/transition surface, and the first 7-second cadence samples do not visibly establish the office before annex arrival.
- The corrected in-page exhibit sequence visibly reaches all six labels, including disabled Private Knowledge Vault, but several sampled states show architecture/trees while the promised exhibit hero is absent or still settling. The packet therefore does not certify a continuously readable office → threshold/corridor → annex → hero sequence.
- The first capture was separately rejected because hard-navigation between every exhibit repeatedly produced brown transition frames. It remains in the output directory only as failure evidence; `video-path.txt` points to the corrected second clip.
- A fresh production desktop-office still is readable and visibly includes the annex wing, but the same browser target crashed at the arrival screenshot under current protected-host pressure. This run does not substitute old or mismatched-revision stills for missing final stills.

## Frame-time receipt — FAIL

`frame-time.json` records 1,185 renderer `requestAnimationFrame` intervals during the headed recorded run: median 48.2 ms, p95 79.6 ms, p99 211 ms, p99.9 845.9 ms, max 973.7 ms. This is an honest recorded-run receipt, not a pass. It is also weaker than Chrome `Display::FrameDisplayed`; no performance certification is claimed.

## Integrity

- Candidate code remains committed at `0cae578`; only untracked evidence was added.
- No push, promotion, development merge, OBS change, Obsidian connection, or Captain approval is claimed.
- Required visual and frame-time gates control the verdict: FAIL CLOSED.
