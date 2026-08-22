# Performance budget and certification plan

Targets below are gates, not measured claims. Promotion waits for reviewed baseline `t_9833aaaf` → `t_58421c00`.

| Tier | Environment | Frame gate | Rendering budget |
|---|---|---|---|
| Desktop Performance | RTX 3080 Ti hardware WebGL, 1440×900 | p95 ≤16.7ms; p99 ≤25ms; no >250ms stall | DPR≤1.5, one Canvas, ≤120 calls, ≤250k triangles |
| Mobile constrained | phone-class browser, required matrix | p95 ≤25ms; p99 ≤40ms; no >250ms stall | DPR≤1.5, ≤70 calls, ≤120k triangles, ≤96MB GPU textures, ≤4MB initial transfer |

Shared: UI ≤10Hz; no per-frame React state; no unbounded particles; one rAF/context; route-cycle heap growth ≤5MB after three cycles; controls ≥48px; interaction response <100ms.

Verify renderer and fail software rasterization. Warm once; capture ≥45s per matrix cell with rAF and long-task data; report median/p95/p99/max, >50ms share, renderer calls/triangles/textures/programs, heap, contexts, and screenshot hash. Repeat final no-recorder runs twice. Never report targets as measurements.
