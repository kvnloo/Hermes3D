# CardTwin cross-card verification report

**Verdict: GREEN — 3/3 cards pass.**

This report audits canonical identity, full-resolution alignment, binary masks, exact mask hashes, alpha/mask equality, exclusive complete coverage, documented hole/fringe gates, strict depth order, exact canonical visible pixels, exact recomposition, preserved border/text assertions, and separately disclosed hidden-only inpainting.

## Reproduction

- Clean generation command: `see aggregate/clean-regeneration.log`
- Verification command: `scripts/verify-cardtwin-cross-card.py --output artifacts/hitl/cardtwin-semantic-layers/aggregate/test-verification-report.md`
- Pinned environment: `/mnt/zer0models/project-envs/cardtwin-sam2`
- RED baseline: `artifacts/hitl/cardtwin-semantic-layers/aggregate/red-before-reconciliation.log`
- GREEN result: `artifacts/hitl/cardtwin-semantic-layers/aggregate/green-cross-card.log`
- Targeted suite: `artifacts/hitl/cardtwin-semantic-layers/aggregate/targeted-tests.log` (17/17)
- Full suite rerun: `artifacts/hitl/cardtwin-semantic-layers/aggregate/full-test-rerun.log` (1334/1334)
- Repository gates: lint, typecheck, and production build pass; logs are in this aggregate directory.
- Visual evidence: each regenerated contact/edge packet below is byte-identical to the card-worker-approved packet because the clean rerun reproduced all recorded artifact hashes.

## arcanine-sm1-22 — PASS

- Identity: Arcanine SM1 22/149 · `763abeb960a5c5e362bf49b6e4e1210b8b3d6a483384a85de372d19ea848ed1c` · 734x1024
- Partition: overlap 0; uncovered 0; visible-pixel max difference 0
- Edge gates: max hole area 0 px; fringe 0 px
- Hidden fill: `inpainted-hidden-fill` / `hidden-background-only` / mask `468ffa40ca19eff7d7d5a9fac3624a5a26f6ecb606aeb85c47bac0a3dabb4e23`
- Masks:
  - far-background: coverage 0.141079; `8627b9707ed577036a6950f2f60f0aab7cade34ae43f14fe1078c35737346848`
  - hero: coverage 0.10983; `e80f9b57f9483e084b93b53941e90177d02d02529a92c79605a155b0d9f81fca`
  - foreground-effects: coverage 0.069973; `476ddbd2067920ca16f2b3b09466fc1665ab271619e62c44534cca5e4df89fbd`
  - outer-frame-text: coverage 0.679118; `6a5b1d4bed49cb92acfb32e3257892782dcce1d19ff6c251208b97e17b2e1fcc`
- Evidence:
  - contactSheet: `artifacts/hitl/cardtwin-semantic-layers/arcanine-sm1-22/contact-sheet.png`
  - heroEdgeQuality: `artifacts/hitl/cardtwin-semantic-layers/arcanine-sm1-22/hero-edge-quality.png`
  - overlapLabelMap: `artifacts/hitl/cardtwin-semantic-layers/arcanine-sm1-22/overlap-label-map.png`
  - occlusionGapMap: `artifacts/hitl/cardtwin-semantic-layers/arcanine-sm1-22/occlusion-gap-map.png`
  - recompositionHeatmap: `artifacts/hitl/cardtwin-semantic-layers/arcanine-sm1-22/recomposition-difference-heatmap.png`

## umbreon-vmax-swsh7-215 — PASS

- Identity: Umbreon VMAX SWSH7 215/203 · `0588afac1c3dee4c8a039d5ff9d0cff2ec4abfbcadedbb62b573750b8f772d92` · 734x1024
- Partition: overlap 0; uncovered 0; visible-pixel max difference 0
- Edge gates: max hole area 0 px; fringe 0 px
- Hidden fill: `inpainted-hidden-fill` / `hidden-background-only` / mask `90826d26cfcd984254f52c867cc80f2ab74093dca52a03d76270d1b4f3c71e1a`
- Masks:
  - far-background: coverage 0.267464; `3220e88dcf9d9973d17ce364bea756e9de8e961232c9ebb3dc76b3285e594b32`
  - hero: coverage 0.083873; `5d93e7aeebe13d4717aedb2b8a000ef1c2ca57edf15d09e87714bacc48d34630`
  - foreground-architecture: coverage 0.065645; `d056b94aca17043105fabdd875bc97f023b220f9eb037d05ef8a43b9d0f24255`
  - outer-card-frame: coverage 0.583018; `17f2ae22cb271290c57cae1e19bc013e88104722d8d83ef3e95317ed7abf358b`
- Evidence:
  - assembledExact: `artifacts/hitl/cardtwin-semantic-layers/umbreon-vmax-swsh7-215/assembled-exact.png`
  - contactSheet: `artifacts/hitl/cardtwin-semantic-layers/umbreon-vmax-swsh7-215/contact-sheet.png`
  - edgeQualitySheet: `artifacts/hitl/cardtwin-semantic-layers/umbreon-vmax-swsh7-215/edge-quality-sheet.png`
  - overlapLabelMap: `artifacts/hitl/cardtwin-semantic-layers/umbreon-vmax-swsh7-215/overlap-label-map.png`
  - occlusionGapMap: `artifacts/hitl/cardtwin-semantic-layers/umbreon-vmax-swsh7-215/occlusion-gap-map.png`
  - recompositionHeatmap: `artifacts/hitl/cardtwin-semantic-layers/umbreon-vmax-swsh7-215/recomposition-difference-heatmap.png`

## leafeon-ex-sv8pt5-144 — PASS

- Identity: Leafeon ex PRE/SV8.5 144/131 · `f00547340035daf54ba086ee1f4c6d907476ae2772030517b68605a9ebd9842f` · 733x1024
- Partition: overlap 0; uncovered 0; visible-pixel max difference 0
- Edge gates: max hole area 0 px; fringe 0 px
- Hidden fill: `inpainted-hidden-fill` / `hidden-background-only` / mask `8888e5a12b6baf95e36b1d7228faea00ca28d99c841077d50a232b044eafbfd9`
- Masks:
  - far-background: coverage 0.407433; `490538a74b5cc6312be9dbd9c41ec35c9eb3d9f659e5b594aed37b6a88bc9923`
  - hero: coverage 0.053426; `8888e5a12b6baf95e36b1d7228faea00ca28d99c841077d50a232b044eafbfd9`
  - outer-frame-text: coverage 0.539141; `47a361cc3d7933c4183aec6a5fd54911d3c6094801e16b67ac27319d6ff8848f`
- Evidence:
  - contactSheet: `artifacts/hitl/cardtwin-semantic-layers/leafeon-ex-sv8pt5-144/contact-sheet.png`
  - heroEdgeQuality: `artifacts/hitl/cardtwin-semantic-layers/leafeon-ex-sv8pt5-144/hero-edge-quality.png`
  - overlapLabelMap: `artifacts/hitl/cardtwin-semantic-layers/leafeon-ex-sv8pt5-144/overlap-label-map.png`
  - occlusionGapMap: `artifacts/hitl/cardtwin-semantic-layers/leafeon-ex-sv8pt5-144/occlusion-gap-map.png`
  - recompositionHeatmap: `artifacts/hitl/cardtwin-semantic-layers/leafeon-ex-sv8pt5-144/recomposition-difference-heatmap.png`

## No-invented-art audit

Every visible RGBA pixel was compared directly with the same-position canonical source pixel and every visible alpha channel with its binary mask. The visible masks form an exact, non-overlapping, full-frame partition. Inpainted pixels exist only in separately named hidden-background-fill artifacts, carry explicit `inpainted-hidden-fill` provenance, and are not referenced as visible layers.
