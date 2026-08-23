# CardTwin validated pipeline

## Baseline contract

The `cardtwin-milestone-1-working-parallax` tag preserves the first accepted working CardTwin parallax state. Future work should make small, independently verified changes from this baseline rather than replacing the process wholesale.

Card pixels are private material. The public Hermes3D tree stores code, tests, documentation, metadata/plan structures, and synthetic placeholders only. Authorized source, layer, mask, and pixel-bearing evidence files live in the private `kvnloo/cardtwin-card-materials` submodule at `private/cardtwin-card-materials`. Its paths mirror this repository, and public runtime paths are symlinks into that checkout.

Bootstrap an authorized checkout with:

    git submodule update --init --recursive private/cardtwin-card-materials

## End-to-end process

### 1. Canonical HD

Choose one highest-quality rights-reviewed source as the immutable identity authority. Record its SHA-256 digest, dimensions, provenance, and acquisition notes. Keep all derived planes in canonical coordinates; never resize layers independently. Identity-bearing visible RGB must remain byte-exact at neutral assembly.

If super-resolution is required, FLUX SR is a disclosed derivative, never the canonical source. Record the model/workflow, input hash, output hash, dimensions, and review decision. A generated SR result may support hidden continuation or an explicitly approved derivative workflow; it must not silently replace visible canonical pixels.

### 2. Occlusion graph

Plan depth before cutting. Every visual island receives a stable component ID, semantic group, depth rank, parent occluder, registration anchor, and confidence. Split an object wherever anatomy, architecture, effects, or scenery cross depth. Ambiguous contours fail closed for review.

The checked-in JSON plan is the structural contract. Pixel-bearing masks and sources remain in the private materials repository.

### 3. Cut

Cut rear fields first, then middle forms, subject masses, forward anatomy/props, and micro-accents. Boundaries must follow printed line art, value edges, or explicit occlusion. Preserve text, symbols, borders, and uninterrupted identity-critical regions. Store semantic ownership separately from connected-component ownership so unrelated islands are never merged merely because they share a broad label.

### 4. Hidden fill

For each removed foreground region, build hidden continuation beneath the occluder with bleed covering the entire approved motion envelope. Fill may extend only into pixels hidden at neutral pose. It must not alter visible canonical pixels. Inspect maximum tilt against both light and dark backgrounds for holes, seams, halos, and exposed fill.

### 5. Assemble

Assemble deterministically back-to-front by explicit depth rank, never filename order. The backing remains the registration datum. Use strictly ordered rigid planes with the certified minimum Z separation, deterministic polygon offsets, depth-writing alpha cuts, and the renderer depth settings required by the CardTwin depth contract.

At neutral pose, composite all planes and compare against the canonical source. Reject missing or duplicated features, cross-card contamination, transparent pinholes, seams, and layer inversion.

### 6. Animate

Move the card/camera as one rigid inspection system. Derive relative parallax from depth and perspective; do not make islands float independently. Pointer and permission-gated device orientation share the same bounded, damped tilt route. Neutral calibration and screen-rotation mapping remain explicit. Verify the full accepted tilt envelope for z-fighting, holes, halos, inversion, and fill exposure.

## Exact-pixel verifier

The verifier is fail-closed and printing-specific:

1. Verify canonical file digest and dimensions against the manifest.
2. Verify each mask and texture digest.
3. Assert every layer matches canonical width and height.
4. Assert visible texture RGB comes from the same canonical source wherever alpha is nonzero.
5. Assert texture alpha equals its mask.
6. Recompose the neutral assembly in canonical coordinates.
7. Require exact equality in protected/visible regions and emit a difference heatmap for any failure.
8. Run wrong-source and cross-card checks so plausible pixels from another printing cannot pass.

A visually convincing browser capture cannot override an exact-pixel failure.

## Craft-study gates

Before accepting a re-cut, apply the gates in `CRAFT-STUDY.md`:

- canonical source/provenance;
- complete depth plan and occlusion parents;
- contour-supported boundaries;
- hidden-fill coverage over the motion envelope;
- exact neutral nesting;
- deterministic plane separation;
- restrained rigid motion without flicker or holes;
- disclosed provenance for every generated derivative, including FLUX SR.

## Required evidence per card

Record source/material commit, public code commit, manifests and hashes, occlusion-plan revision, exact-pixel report, focused unit/e2e results, typecheck, production build, neutral comparison, exploded assembly, and tilt capture. Pixel-bearing evidence is committed only to the private materials repository. Public reports may state hashes and outcomes but must not embed card imagery.

## Incremental roadmap

The next accepted changes are deliberately small: slightly stronger bounded parallax and richer, occlusion-graph-driven masks. Fullscreen inspect remains the top UX follow-up (`t_e9950281`). Residual depth-fighting work continues under `t_632ab166`. Each tweak must rerun exact-pixel, CardTwin tests, typecheck, and production build before promotion.
