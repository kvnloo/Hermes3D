# Presented-frame performance remediation — FAIL CLOSED

Candidate: `a1a7891cbb3813e2e35522cf32b956f9919a7de4`
Runtime: fresh production build, `http://127.0.0.1:3321/office?camera=ORBIT`
Renderer: ANGLE Vulkan, NVIDIA GeForce RTX 3080 Ti; GPU compositing/WebGL/rasterization enabled. No software renderer was accepted.

## What changed in the diagnosis

The prior `Maximum update depth exceeded` errors reproduced only in the overloaded Next development runtime. A fresh production build emitted zero update-depth errors in repeated presented-frame probes. The remaining console error is the existing CSP rejection of a WebAssembly compile path; it is not an update loop.

The new harness `scripts/certify-presented-frames.mjs` consumes Chrome `Display::FrameDisplayed` trace events. It does not use rAF as a presentation proxy, does not use a ring buffer, preserves raw microsecond timestamps, retains all stalls, and computes the operator's exact average FPS and slowest-0.001% low FPS definition plus full tails/jank counts.

## Production smoke

60.05 seconds / 3,573 presented frames:

- average: 59.479 FPS
- 0.001% low: 13.771 FPS
- low/average: 0.23152; gap: 76.848%
- median/p95/p99/p99.9/p99.99/p99.999/worst: 16.608 / 22.811 / 27.479 / 32.654 / 72.618 / 72.618 / 72.618 ms
- >25/>50/>100/>250 ms: 77 / 1 / 0 / 0
- zero Maximum-update-depth errors

This smoke passes the legacy median/p95/p99, >50ms density, and >250ms gates, but is non-certifying under the new >=100,000-presented-frame contract.

## Long-row failure

The first 31m40s attempt filled Chrome's trace buffer after 44,594 presented frames / 781.726 measured seconds. Retained metrics:

- average: 57.044 FPS
- 0.001% low: 9.532 FPS
- low/average: 0.16710; gap: 83.290%
- median/p95/p99/p99.9/p99.99/p99.999/worst: 16.792 / 25.129 / 38.063 / 63.233 / 91.275 / 104.909 / 104.909 ms
- >25/>50/>100/>250 ms: 2,281 / 121 / 1 / 0

The harness was then changed to bounded 10-minute segments within one unchanged page session so Chrome drain gaps are not misrepresented as application stalls. Segment 1 retained 27,985 displayed frames, but the browser target was externally closed before segment 2 under severe host memory pressure (23 GiB RAM, 19 GiB used, 96 GiB swap used at inspection) while protected OBS browser GPU/renderer processes remained active by policy. Thus no >=100,000-frame row exists and no independent repeat is possible in this run.

## Verification

- production build: PASS
- typecheck: PASS
- lint: PASS, 9 inherited warnings
- GitOps: PASS, 13/13
- full Vitest: 1278/1279; sole known parallel timeout passes 22/22 isolated
- production update-depth check: PASS (zero occurrences)
- >=100,000 presented-frame row: FAIL / unavailable
- independent repeat: NOT RUN
- frozen-time visual oracle: prior exact oracle remains unresolved

## Verdict

FAIL CLOSED. Keep `a1a7891` only as an unapproved narrow optimization reference. Do not promote or integrate it as a certified baseline. The new production evidence disproves the claim that Maximum-update-depth is an intrinsic production loop, but the mandatory >=100,000 actually-presented-frame rows and frozen-time visual equivalence remain unmet. A clean-memory window or a trace consumer with live lossless presentation-event streaming is required; OBS/public processes were not stopped or mutated.
