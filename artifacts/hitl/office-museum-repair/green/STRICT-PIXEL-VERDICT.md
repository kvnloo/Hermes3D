# Museum overlay fixture — strict pixel verdict

Revision: 50391e74eb9de2bba21e48172a0f33dd0e507b8b
Scope: deterministic production-component fixture only; integrated `/office` certification belongs to the downstream integration gate per Captain sequencing.

## 1920 × 1080 — PASS

Actual PNG: `museum-1920x1080.png` (1920×1080 RGB, 1,743 colors, entropy 0.643252). OCR confirms the compact Office Annex / Living Museum bar, Gallery Arrival hierarchy, exhibit controls including the connector-disabled label, and CHAT control are rendered. DOM geometry and pixel snapshot regression pass: no panel intersections, at least 16px gaps, bounded occupancy, viewport containment, 8px positioning grid, and z-index sequence 40/40/20/30.

## 1440 × 900 — PASS

Actual PNG: `museum-1440x900.png` (1440×900 RGB, 1,949 colors, entropy 0.642077). OCR confirms Living Museum, Find an exhibit, Gallery Arrival, Explore the annex, and CHAT remain present at native scale. DOM geometry and pixel snapshot regression pass with the same collision, gap, density, containment, grid, overflow, and layering gates.

## 390 × 844 — PASS

Actual PNG: `museum-390x844.png` (390×844 RGB, 1,444 colors, entropy 0.678571). OCR confirms the compact Living Museum / Office header, Gallery Arrival / Explore the annex hierarchy, horizontally contained exhibit controls, and CHAT. DOM geometry and pixel snapshot regression pass; office-left and event-console fixtures are suppressed, controls remain in viewport, and no horizontal overflow occurs.

## Evidence limitation

This is an explicit overlay-layout PASS, not a 3D annex or integrated-route PASS. The fixture uses the real `OfficeMuseumOverlay` and production CSS but a deterministic scene surface and representative office controls. Same-revision `/office` route reconciliation, real 3D pixels, and headed-GPU evidence remain fail-closed downstream requirements.
