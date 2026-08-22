# CardTwin deterministic cutting framework

Version: `cardtwin-semantic-layers/v3`

This framework turns an identity-pinned canonical card PNG into aligned semantic planes. It is a cutting contract, not an art-generation contract. Visible layer RGB must always be the canonical RGB at the same `(x, y)` coordinate.

## Inputs and fail-closed validation

Authoritative inputs:

- `canonical/source-manifest.json`: printing identity, dimensions, and canonical SHA-256.
- `framework/environment-lock.json`: exact Python, SAM2 repository revision, checkpoint path/hash/size, model config, and determinism controls.
- `framework/ontology.v3.json`: semantic classes, required/optional status, depth bands, and provenance policy.
- `framework/prompts/<card-id>.json`: normalized top-left canonical-pixel points/boxes and ordered polygon/morphology refinements.

Run validation before model loading or output writes:

```sh
/mnt/zer0models/project-envs/cardtwin-sam2/bin/python \
  scripts/generate-cardtwin-layers.py --validate-contract
```

Validation rejects the wrong Python, a missing/changed checkpoint, a non-pinned SAM2 checkout, a source hash or dimension mismatch, extra/missing card prompts, non-normalized coordinates, or an unpinned polygon rasterizer.

## Deterministic generation

```sh
export CUBLAS_WORKSPACE_CONFIG=:4096:8
export PYTHONHASHSEED=0
export XDG_CACHE_HOME=/mnt/zer0models/caches/cardtwin-sam2/xdg
export HF_HOME=/mnt/zer0models/caches/cardtwin-sam2/huggingface
export TORCH_HOME=/mnt/zer0models/caches/cardtwin-sam2/torch
/mnt/zer0models/project-envs/cardtwin-sam2/bin/python \
  scripts/generate-cardtwin-layers.py
npm run test -- --run tests/unit/cardTwinCuttingFramework.test.ts tests/unit/cardTwinSemanticLayers.test.ts
```

Fixed parameters are checkpoint/config and seed from `environment-lock.json`, integer canonical-pixel prompts, multimask candidate selection by highest SAM2 score, 5 px morphological close, deterministic hole fill, Canny thresholds 75/150, 13 px edge dilation, OpenCV Telea radius 7, and PNG compression level 9. Prompt or refinement changes require a reviewed metadata diff and new recorded mask hashes.

## Output layout

```text
public/exhibits/pokemon-cards/<card-id>/
  source/<canonical.png>                 unchanged canonical bytes
  manifest.json                          identity, tool, prompt, depth, hashes, metrics
  layers/<layer>-mask.png                full-size binary L mask
  layers/<layer>.png                     full-size canonical-RGB RGBA
  layers/hidden-background-fill.png      hidden-only generated fill RGBA
  layers/hidden-background-fill-mask.png exact inpainted-pixel disclosure mask
artifacts/hitl/cardtwin-semantic-layers/<card-id>/
  contact-sheet.png
  overlap-label-map.png
  occlusion-gap-map.png
  recomposition-difference-heatmap.png
```

The fill alpha is exactly the occlusion-gap mask. It is separate from visible textures and cannot cover canonical pixels remaining visible in the base plane.

## Per-card selection and depth

Choose normally 3–5 visible planes from actual composition. `outer-card/frame`, `far-background`, and `character/hero` are required. Add `mid-background`, foreground effects/foliage/architecture, text, or foil only when the card visibly supports them. Manifest layers are strictly ordered back-to-front according to ontology depth bands. The identity-bearing frame, border, title, rules, and collector number remain intact.

## Contract metrics

Each card-specific task must record and test: printing identity and source hash; source/output dimensions; mask and fill-mask hashes; alpha/mask equality; canonical RGB preservation; nonzero coverage; holes and edge fringes; pairwise non-overlap; required full coverage; border/text preservation; strict semantic depth order; exact recomposition; and evidence artifact existence. A green structural contract does not constitute pixel approval: contact sheets and edge zooms remain a separate fail-closed visual gate.
