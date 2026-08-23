# Corrected Arcanine SR decision (display-resolution + structural identity)

**Decision: renderer-only + Lanczos. No SR batch is allowed.**

This supersedes registered-pixel-change as the SR identity gate. Pixel change is expected after resampling; the corrected contract measures OCR agreement, edge/contour IoU, mean CIE Lab palette distance, and worst symbol-region template correlation. Every candidate is reduced through the same Lanczos filter to the requested 390×844 phone display before sharpness and identity measurement.

## Decision math

| Method | GPU s/card | GPU h/1000 | Laplacian @ 390×844 | Gain vs Lanczos | Gain/GPU s | OCR agreement | Contour IoU | Palette ΔE | Symbol match | Structural identity |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| renderer-only + Lanczos | 0.000 | 0.000 | 4326.008 | 0.000 | n/a | 1.000 | 1.000 | 0.000 | 1.000 | PASS |
| RealESRGAN x4plus | 31.726 | 8.813 | 5797.886 | +1471.878 | 46.393 | 0.717 | 0.860 | 7.677 | 0.976 | FAIL (OCR) |
| FLUX.2 Klein 4B FP8 | 193.162 | 53.656 | 8175.662 | +3849.653 | 19.930 | 0.074 | 0.472 | 34.327 | 0.727 | FAIL (all gates) |

Thresholds: OCR ≥ 0.90; contour IoU ≥ 0.70; palette ΔE ≤ 10.0; symbol match ≥ 0.80. All gates are conjunctive and fail closed.

Both learned methods retain measurable sharpness after phone downscale, so their display-resolution gain is not zero. RealESRGAN is 2.33× more efficient than FLUX by sharpness gain/GPU-second, but it fails the corrected OCR identity contract. FLUX is sharper but costs 6.09× more GPU time per card than RealESRGAN and fails every structural identity gate, including severe OCR disagreement consistent with hallucinated/altered printed content.

The adoption rule is: choose the cheapest candidate whose post-downscale sharpness exceeds the renderer/Lanczos baseline and passes every structural gate. Neither learned candidate qualifies. The zero-GPU renderer/Lanczos path is therefore retained; Umbreon and Leafeon remain unprocessed.

## Reproduction

```text
/mnt/zer0models/project-envs/cardtwin-sam2/bin/python scripts/analyze_sr_decision.py \
  --canonical public/exhibits/pokemon-cards/arcanine-sm1-22/source/arcanine-sm1-22.png \
  --candidate RealESRGAN public/exhibits/pokemon-cards/arcanine-sm1-22/derivatives/realesrgan-x4plus-baseline.png 31.72600071100169 \
  --candidate FLUX.2-Klein public/exhibits/pokemon-cards/arcanine-sm1-22/derivatives/flux2-klein-sr-seed220149.png 193.16154636699866 \
  --output public/exhibits/pokemon-cards/arcanine-sm1-22/derivatives/sr-decision-v2.json \
  --lanczos-output public/exhibits/pokemon-cards/arcanine-sm1-22/derivatives/lanczos-x4-baseline.png
```

Machine-readable measurements and the OCR reference are in `public/exhibits/pokemon-cards/arcanine-sm1-22/derivatives/sr-decision-v2.json`.
