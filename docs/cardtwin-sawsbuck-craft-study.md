# Sawsbuck TEF 166/162 — pre-cut CRAFT-STUDY

Status: **PASS — candidate cutting authorized; assembly remains blocked pending Kevin’s Parts Sheet and mask-overlay approval.**

This study is private-safe: it records structure, coordinates, hashes, and acceptance rules without embedding card pixels. The canonical source remains immutable in the private materials repository (`733×1024`, SHA-256 `c45d0c69294223740314fa2ae1e8fae21cc08ea43f3258dee72cdc135ccc20b6`).

## Composition read

The image is not a six-slab background/subject/foreground stack. Its forest separates into a distant pink left grove, a recessed green center grove, a warmer right midground, a ground/flower band, and a nearer right/bottom flora island. Sawsbuck crosses those bands: rear torso and hind anatomy sit behind the head/chest/front-leg mass; its antler stalks and autumn crown pass in front of the forest but behind the ears/head. Print and identity regions remain a separately locked front frame.

The normative, machine-readable contract is `config/cardtwin/sawsbuck-tef-166-occlusion-plan.json`. It defines ten stable pieces (`saw-r00` through `saw-r09`), contiguous depth ranks, source-coordinate bounds/ownership, explicit graph edges, donor-card continuation, edge inspections, Z destinations, foam-shadow rules, and fail-closed completeness checks.

## Back-to-front build

1. `saw-r00-backing-datum` — uncut canonical donor and registration datum.
2. `saw-r01-far-pink-grove` — left atmospheric grove.
3. `saw-r02-far-green-grove` — center green/teal forest recess.
4. `saw-r03-mid-warm-grove` — right orange/red trunk wall.
5. `saw-r04-ground-flora` — middle ground and vegetation behind legs.
6. `saw-r05-body-rear` — tail, rump, belly, hind legs and hind hooves.
7. `saw-r06-antler-crown` — both antler stalks/tips plus autumn crown and dangling leaves.
8. `saw-r07-body-forward` — ears, face, muzzle, neck, chest ruff, shoulder, front legs and hooves.
9. `saw-r08-near-flora` — nearest right/bottom flowers, leaves and stalks.
10. `saw-r09-print-identity-frame` — border, header, typography, symbols and legal/collector identity.

The assembly uses strict 0.6 mm increments from the backing datum through the identity frame. Each lifted plane receives a bounded receiver-clipped shadow as the foam-tape analogue; shadows never alter canonical RGB.

## Boundary and donor rules

- Forest cuts follow printed value seams, trunk silhouettes, canopy scallops, and vegetation skylines. Background regions bleed 8–12 px beneath known occluders using overlapping donor-card content.
- The rear/forward body split follows the printed shoulder/torso value seam. It never crosses the eye or muzzle. The forward donor overlaps the rear mass only in hidden shoulder/chest regions.
- Antler bases continue behind ears/head; the crown owns every lobe, dangling leaf, thin stalk, and terminal tip. Local bridges are permitted only where later pieces hide them.
- Ground donor content must continue behind all four hoof apertures. Near flora is split at print-bar occlusion rather than bridged through UI text.
- Visible source pixels are copied exactly. Hidden restoration comes only from registered donor-card overlap in this phase; no generative fill may overwrite visible canonical pixels.

## Edge inspection

Every named contour in each piece’s `edgeInspection` array requires a mask-overlay crop at 200%; feet, ear tips, antler tips, narrow antler stalks, chest-ruff spikes, flower petals, and foliage tips require 400%. Inspect alpha against both light and dark checkerboards. Reject one-pixel necks, clipped tips, border contact by non-frame pieces, holes, halos, duplicate ownership, and any contour that disappears after a radius-1 morphological opening.

Pixel-bearing overlays and Parts Sheet evidence remain only under `private/cardtwin-card-materials/artifacts/hitl/cardtwin-sawsbuck/`. Public evidence may report hashes and gate outcomes only.

## Fail-closed pre-cut gates

- IDs are unique; depth ranks are exactly `0..9`; Z is strictly increasing.
- Every piece declares a source region, ownership, occlusion relationships, donor restoration, cut boundary, edge inspections, completeness contract, and assembly destination.
- Every graph edge points from a lower to a higher rank and the graph is acyclic.
- Every fragile extremity group has named source-coordinate anchors, nonzero alpha, at least a two-pixel mask margin, and a surviving contour after radius-1 opening.
- Generated visible masks (excluding the uncut backing datum) must partition visible canonical pixels exactly once.
- Neutral recomposition must have maximum RGBA channel difference `0`.
- Parts Sheet must reconcile exactly one non-overlapping, fully inspectable silhouette per stable ID and explicitly label the backing datum as uncut.
- Any failure aborts generation and withholds Parts Sheet and assembly authorization.

## Gate decision

`CRAFT-STUDY`: **PASS**

`DEPTH-PLAN`: **PASS_BEFORE_CUT**

`BOUNDARY-PLAN`: **PASS_FOR_CANDIDATE_CUT**

`CUT-MASKS`: **NOT AUTHORED BY THIS TASK**

`ASSEMBLY`: **BLOCKED_PENDING_KEVIN_CUTOUT_APPROVAL**

This task authorizes the next worker to produce candidate masks and a Parts Sheet under the graph. It does not accept the already-existing candidate cuts and does not authorize final assembly acceptance.
