# CardTwin final verification and evidence index

## Verdict

**PASS — all three exact printings pass the strict asset, runtime, responsive, reduced-motion, and visual sanity gates.**

Revision scope: `feat/pokemon-card-exhibit-preview`, captured from the final pre-commit worktree and committed by task `t_c0a29444`, then corrected after independent review to load each manifest-disclosed hidden-only Telea fill behind the moving exact-pixel planes. The viewer uses exact canonical visible pixels cut into mutually exclusive RGBA planes. No SR, synthetic replacement art, SAM3D, mesh reconstruction, or visible inpainting is used. The fill assets never overwrite canonical visible pixels and prevent separation gaps from exposing a primitive backing.

## Exact printings

| Card | Printing | Canonical SHA-256 | Planes |
| --- | --- | --- | ---: |
| Arcanine | SM1 22/149 | `763abeb960a5c5e362bf49b6e4e1210b8b3d6a483384a85de372d19ea848ed1c` | 4 |
| Umbreon VMAX | SWSH7 215/203 | `0588afac1c3dee4c8a039d5ff9d0cff2ec4abfbcadedbb62b573750b8f772d92` | 4 |
| Leafeon ex | PRE/SV8.5 144/131 | `f00547340035daf54ba086ee1f4c6d907476ae2772030517b68605a9ebd9842f` | 3 |

Canonical source/rights/no-SR disclosure: `public/exhibits/pokemon-cards/canonical/PROVENANCE.md` and `source-manifest.json`.

## Model and environment provenance

- Official Meta SAM 2.1 repository: `https://github.com/facebookresearch/sam2.git`
- Repository revision: `2b90b9f5ceec907a1c18123530e92e794ad901a4`
- License: Apache-2.0
- Checkpoint: `sam2.1_hiera_tiny.pt`, 156,008,466 bytes
- Checkpoint SHA-256: `7402e0d864fa82708a20fbd15bc84245c2f26dff0eb43a4b5b93452deb34be69`
- Umbreon checkpoint: `sam2.1_hiera_small.pt`, 184,416,285 bytes
- Umbreon checkpoint SHA-256: `6d1aa6f30de5c92224f8172114de081d104bbd23dd9dc5c58996f0cad5dc4d38`
- Per-printing checkpoint usage is pinned in `public/exhibits/pokemon-cards/framework/environment-lock.json` and each manifest.
- Pinned environment: `/mnt/zer0models/project-envs/cardtwin-sam2`
- GPU smoke target: NVIDIA GeForce RTX 3080 Ti 12GB; peak allocated 625,829,376 bytes
- Reproduction details: `docs/cardtwin-sam2.md`
- Frozen packages: `requirements/cardtwin-sam2-pip-freeze.txt`
- No model weights, caches, virtual environments, credentials, or `.env` files are tracked.

## Automated gates

| Gate | Command | Result | Log |
| --- | --- | --- | --- |
| Cross-card pixel contract | `/mnt/zer0models/project-envs/cardtwin-sam2/bin/python scripts/verify-cardtwin-cross-card.py --output artifacts/hitl/cardtwin-final/cross-card-verification.md` | PASS, 3/3 | `logs/cross-card-verification.log` |
| Full Vitest | `npm run test -- --run --retry 2` | PASS, 197 files / 1,336 tests | `logs/full-vitest.log` |
| CardTwin/exhibit Playwright | `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npx playwright test tests/e2e/cardtwin-arcanine.spec.ts tests/e2e/pokemon-cards-exhibit.spec.ts --reporter=line` | PASS, 17/17 | `logs/cardtwin-e2e.log` |
| ESLint | `npm run lint` | PASS, 0 errors / 9 pre-existing warnings | `logs/lint.log` |
| TypeScript | `npm run typecheck` | PASS | `logs/typecheck.log` |
| Production build | `npm run build` | PASS | `logs/build.log` |
| Whitespace | `git diff --check` | PASS | `logs/git-diff-check.log` |

The first two no-retry full-suite attempts each exposed a different unrelated pre-existing timing flake (`agentEditorModal` timeout, then `useAgentSettingsMutationController`). The required retry-enabled full run is green; no CardTwin test failed in any full run. The RED baseline and prior GREEN reconciliation are retained under `artifacts/hitl/cardtwin-semantic-layers/aggregate/`.

## Visual evidence by card

Each card directory under `artifacts/hitl/cardtwin-final/<card-id>/` contains:

- `assembled-neutral-stage.png` — neutral reduced-motion WebGL front;
- `desktop-assembled.png` — full desktop page;
- `mobile-assembled.png` — 390×844 responsive page with no horizontal overflow;
- `exploded-stage.png` — every visible semantic plane separated;
- `neutral-canonical-comparison.png` — canonical scaled, neutral WebGL crop, 50% overlay, and amplified absolute diff;
- `tilt-parallax.webm` — trimmed motion-only VP8 proof;
- `tilt-contact-sheet.png` — deterministic full-clip frame sheet;
- `capture-session.webm` — untrimmed browser capture including initial reveal.

Machine-readable comparison metrics: `neutral-comparison-metrics.json`. Browser differences are filtering/downscaling measurements, not source mutation. The stricter native-resolution verifier proves visible-pixel max difference 0, overlap 0, uncovered pixels 0, max hole area 0, and fringe 0 for all cards in `cross-card-verification.md`.

### Arcanine SM1 22/149

- Neutral and overlay: exact identity and composition preserved; full border, illustration, attacks, collector number, and footer remain visible; no holes, clipping, or layer misregistration.
- Exploded: four nonblank planes are separately visible and unclipped.
- Motion: relative-plane offsets are asserted by Playwright and visible across the trimmed motion sheet without ghost duplication.
- Physical reference: compared against Kevin's exact Arcanine shadowbox at `artifacts/hitl/cardtwin-arcanine/physical-reference.jpg`. The runtime follows its relief principle—environment behind hero, lower foliage in front, intact UI/frame on top—without copying reconstructed hidden pixels into visible planes.

### Umbreon VMAX SWSH7 215/203

- Neutral and overlay: exact identity and full-card composition preserved; no invented art, wrong printing, missing border/text, clipping, or blank surface.
- Exploded: moonlit distance, Umbreon hero, tower architecture, and foil/frame planes are all visible and separate.
- Motion: depth-relative movement is visible and contract offsets are distinct.
- Shadowbox craft comparison: follows the same physical-reference principle of subject/environment/foreground/frame separation; no claim is made that Kevin supplied an exact Umbreon physical build.

### Leafeon ex PRE/SV8.5 144/131

- Neutral and overlay: exact identity and full-card composition preserved; no invented art, wrong printing, missing border/text, clipping, or blank surface.
- Exploded: forest distance, Leafeon hero, and intact outer frame/text are all visible and separate.
- Motion: depth-relative movement is visible and contract offsets are distinct.
- Shadowbox craft comparison: follows the same physical-reference relief principle; no claim is made that Kevin supplied an exact Leafeon physical build.

## Literal rejection checklist

Inspected all neutral, exploded, desktop/mobile, overlay/diff, and motion sheets. Rejected states checked: wrong identity, invented/replacement art, primitive geometry substitution, excessive flatness, edge halos, mask leakage, clipping, holes, blank/wrong surfaces, lost border/text, duplicate-image ghosts, static non-parallax motion, mobile card/ledger overlap, and horizontal overflow. A captured blank Arcanine front and mobile ledger/card overlap were rejected during the gate; the final evidence was recaptured after waiting for real texture readiness and moving the mobile ledger below the card.

## Reproduction

1. Confirm the canonical hashes: `sha256sum -c` using `public/exhibits/pokemon-cards/canonical/source-manifest.json` values.
2. Validate pinned inputs: `/mnt/zer0models/project-envs/cardtwin-sam2/bin/python scripts/generate-cardtwin-layers.py --validate-contract`.
3. Regenerate the three ontology-v3 cuts using the commands in `artifacts/hitl/cardtwin-semantic-layers/aggregate/verification-report.md`.
4. Run the automated gates above.
5. Rebuild neutral comparison sheets: `/mnt/zer0models/project-envs/cardtwin-sam2/bin/python scripts/build-cardtwin-final-evidence.py`.
6. Inspect every indexed image and the three trimmed clips before accepting the revision.
