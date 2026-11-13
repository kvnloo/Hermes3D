from pathlib import Path
import json
root = Path("output/performance-certification")
labels = [
    "baseline-a1-parent", "candidate-full-orbit", "candidate-static",
    "candidate-overlays-hidden", "candidate-orbs-disabled", "candidate-boplog-disabled",
    "candidate-company-overlays-disabled", "candidate-production-dpr",
    "candidate-shadows-post-low-diagnostic", "candidate-remount-90s",
    "final-no-recorder-1", "final-no-recorder-2", "final-recorder-diagnostic",
]
rows = []
for label in labels:
    data = json.loads((root / f"{label}.json").read_text())
    rows.append(f"| {label} | {data['durationMs']/1000:.0f} | {data['median']:.1f} | {data['p95']:.1f} | {data['p99']:.1f} | {data['max']:.1f} | {data['over50Pct']:.2f}% | {len(data['errors'])} |")
remount = json.loads((root / "candidate-remount-90s.json").read_text())
visual = json.loads((root / "visual-equivalence.json").read_text())
report = f"""# Hermes3D performance certification — FAIL CLOSED

Source candidate: `a1a7891cbb3813e2e35522cf32b956f9919a7de4`
Renderer: `{remount['webgl']['renderer']}` (`{remount['webgl']['version']}`)
Browser: `/usr/bin/google-chrome-stable`, headless Ozone, ANGLE Vulkan, 1920x1080. Only the largest production scene canvas was queried for WebGL diagnostics; unrelated canvases were not probed.

Budgets: median <=18.5 ms, p95 <=25 ms, p99 <=40 ms, >50 ms <1%, no >250 ms stall.

| run | seconds | median ms | p95 ms | p99 ms | max ms | >50 ms | console errors |
|---|---:|---:|---:|---:|---:|---:|---:|
{chr(10).join(rows)}

## Verdict

FAIL. Neither repeated 90-second no-recorder run passed. Run 1 was the best but still failed p95, p99, >50 ms, and maximum-stall gates; run 2 was substantially worse. The recorder trace run also failed. No integration commit is authorized.

The exact candidate materially improved the matched parent baseline (median 133.4 -> 50.0 ms; p95 333.3 -> 133.3 ms), but variance is too high to certify individual diagnostic deltas. OBS browser GPU/renderer processes consumed roughly 230% aggregate CPU during capture and the live OBS process remained active by policy. The app also repeatedly emitted React `Maximum update depth exceeded`, an intrinsic correctness/performance blocker independent of host load.

## Camera/remount

A real in-memory Canvas remount occurred at 45 seconds without document reload. Angle advanced monotonically `{remount['beforeRemount']['angle']:.6f} -> {remount['afterRemount']['angle']:.6f} -> {remount['camera']['angle']:.6f}`; radius stayed `{remount['camera']['radius']:.6f}`, height stayed `{remount['camera']['height']:.6f}`, values were finite, and collision lists were empty before, after, and at 90 seconds. This gate passed. Hidden-tab continuity was not certifiable in headed mode because no X server was available; headless Chromium remained foreground-timer enabled.

## Visual equivalence

FAIL/indeterminate. Fixed static captures differed by MAE `{visual['mean_absolute_channel_error']:.3f}`, RMS `{visual['rms_channel_error']:.3f}`, and `{visual['changed_pixel_percent']:.2f}%` changed pixels. The scene is not time-frozen, so this cannot attribute a material visual regression to the two overlay-only changes; it nevertheless fails the exact-pixel contract and blocks promotion.

## CI

- `npm run lint`: pass, 9 existing warnings.
- `npm run typecheck`: pass.
- `npm run test -- --run`: 1278/1279; sole timeout-sensitive `exposes_restart_block_state_and_timeout_completion_handlers` failure passed 22/22 isolated.
- `npm run build`: attempted; worktree build could not resolve shared `node_modules`, and isolated-copy Turbopack rejected the external node_modules symlink. Parent receipt already records a clean a1 build, but this run does not claim a fresh build pass.

## Integration guidance

Do not cherry-pick PR23 and do not promote a1a7891 beyond its existing narrow status. Keep `a1a7891` as the only candidate optimization reference. Before retrying certification: eliminate the React maximum-update-depth loop with a minimal attributable fix; provide a clean protected GPU/CPU window without mutating the public stream; run a deterministic time-frozen visual oracle; then repeat the same matrix and two 90-second finals. Diagnostic query toggles and the remount hook were exercised only in the temporary certification copy and were restored from production source afterward.
"""
(root / "CERTIFICATION.md").write_text(report)
print(report)
