# CardTwin craft study: hand-cut layered trading cards

## Scope and evidence standard

This is a process study, not an asset recipe. No reference frame, crop, trace, or pixel from either reel is included here or in CardTwin output.

The two supplied reels were retrieved directly and reviewed as moving footage. The first is a `mr.shadowbox` build whose caption reports more than 400 separately cut parts, many donor cards, 108 hours of labor, and substantial work deciding the correct depths.[1] The second is 3Devious Art's Alakazam EX reveal; its caption reports roughly 200 pieces and about 20 hours of work.[2]

Important limitation: these are edited reveal/process reels, not a continuous bench recording. They establish the finished construction language and show selected operations, but do not expose every adhesive placement or the exact thickness of every spacer. Instagram profile enumeration was unavailable without an authenticated backend, so this document does **not** claim a complete survey of every public reel. Any item below marked **craft inference** is a conservative construction requirement derived from visible geometry, not an asserted hidden action by either artist.

## The central lesson

The physical object is not a stack of full-card rectangles. It is a nested relief sculpture built from many local islands. A character can occupy several depths at once: rear silhouette, torso, forward limb, facial feature, highlight, and effect fragments. Backgrounds are likewise split into independently recessed regions. Depth follows occlusion and form, not semantic labels such as “subject” and “background.” The reported 200–400-plus part counts are consistent with this fine-grained construction rather than a three-plane parallax card.[1][2]

For CardTwin, the faithful abstraction is therefore:

- one untouched canonical card as the registration and identity authority;
- many masks or connected components, each with an explicit occlusion parent and depth rank;
- hidden continuation behind foreground cuts so motion never reveals holes;
- rigid assembly first, restrained motion second;
- no generated replacement of visible canonical pixels.

## Observed construction language

### 1. Plan the depth graph before cutting

The build is resolved as an occlusion problem: which contour passes in front, which continues behind it, and where a form changes depth. The `mr.shadowbox` caption explicitly calls out the difficulty of determining the correct depths.[1] The finished reveals show depth decisions inside major subjects and effects, not only between a subject and a flat background.

**Pipeline mapping — canonical HD → cut**

1. Lock the canonical HD image and card geometry.
2. Annotate an occlusion graph, not merely a list of named objects.
3. Give every planned island a stable ID, depth rank, parent occluder, and registration anchor.
4. Split a semantic object wherever its anatomy or effect crosses depth.
5. Fail closed on ambiguous contours; review them instead of smoothing across them.

### 2. Preserve a full-card registration/backing plane

The outer card remains the visual datum while inner artwork rises from it. The intact rectangle controls border shape, typography alignment, and the common coordinate system. **Craft inference:** a physical build needs a stable backing/reference even when upper donor cards are cut away.

**Pipeline mapping — canonical HD**

- Keep one immutable, full-resolution canonical source.
- Treat border, text, symbols, and other identity-critical pixels as protected by default.
- Generate all masks in canonical coordinates; never resize layers independently.
- Record source hash and dimensions with every derived plane.

### 3. Cut large windows and rear fields before tiny foreground islands

The useful physical order is back-to-front: establish broad rear apertures/fields, then middle forms, then small foreground accents. This protects fragile pieces from repeated handling and lets each new cut be test-fitted against already-established occlusion boundaries. The finished works’ many small nested islands require such registration discipline; the captions’ part counts set the scale of that requirement.[1][2]

**Pipeline mapping — cut**

- Produce masks in depth-rank order, rear to front.
- Separate broad environment fields from the subject silhouette.
- Then subdivide subject anatomy, props, energy/effect fragments, and highlights.
- Preserve narrow bridges only when they belong to the visible printed shape; otherwise make separate connected components.
- Store both the semantic group and connected-component ID so “one layer” never silently merges unrelated islands.

### 4. Follow printed occlusion boundaries, including internal ones

The strongest illusion comes from cutting where the illustration already says one form overlaps another: limb over torso, face feature over head, effect over hand, foreground debris over scene. The cut line should disappear into an existing contour rather than inventing a new outline through visible art.

**Pipeline mapping — cut**

- Prefer boundaries supported by line art, value edges, or explicit occlusion.
- Do not cut across text, symbols, or uninterrupted gradients merely to create more motion.
- Require a contour review at 1× and enlarged scale.
- Keep visible RGB from the canonical source byte-identical under each accepted mask.

### 5. Treat backgrounds as nested scenery, not one rear sheet

A convincing shadowbox separates near framing elements, midground scenery, distant field, and sky/void. Gaps between those regions create readable parallax while keeping the subject integrated with its setting. Background separation is subordinate to the illustration’s own perspective cues.

**Pipeline mapping — cut → fill**

- Divide background by occlusion band and perspective role, not by color clustering alone.
- Keep near environmental fragments capable of passing in front of parts of the subject.
- Reconstruct hidden background continuation underneath removed foreground shapes.
- Add a bleed margin beyond every mask edge, large enough for the maximum approved tilt.

### 6. Finish exposed cut edges so raw stock does not flash

Physical layered-card craft commonly darkens or color-matches exposed paper edges; in the supplied reveals, the relief reads as a continuous image rather than bright raw-cardboard outlines. The exact marker/paint medium is not established by these edited reels, so medium choice remains **uncertain**.

**Pipeline mapping — fill → assemble**

- Interpret edge treatment as an edge-bleed problem, not as repainting visible source pixels.
- Extend nearby color only into hidden/reveal margins.
- Never apply a global dark stroke around alpha masks; that would create a digital sticker outline unlike a carefully finished physical edge.
- Test edges against light and dark backgrounds at maximum tilt.

### 7. Use spacers locally, away from visible contours

The relief has discrete air gaps rather than a uniformly extruded slab. **Craft inference:** foam tape or equivalent spacers must sit behind sufficiently broad, hidden portions of a piece; tiny islands either need very small supports or must bridge to a larger carrier. Spacer location cannot be read exactly from the finished front-facing footage.

**Pipeline mapping — assemble**

- Model every plane with a strictly ordered Z value; no coplanar duplicates.
- Use a minimum separation invariant rather than arbitrary per-frame offsets.
- Keep support/anchor metadata separate from visible alpha.
- Group tiny fragments onto a shared depth carrier only when their relative depth and motion are identical.
- Do not thicken a mask boundary to make support easier; preserve the contour and solve support behind it.

### 8. Dry-fit and register before permanent assembly

With hundreds of parts, small alignment errors compound. Physical pieces must nest back into the original printed composition: surrounding contours act as registration cues, while overlaps conceal seams. **Craft inference:** repeated dry-fitting is necessary for a build of the reported complexity, although the reels do not document every fit cycle.[1][2]

**Pipeline mapping — assemble**

- Composite all planes at neutral pose and compare against canonical HD.
- At neutral pose, demand exact registration of visible canonical pixels.
- Run cross-card and wrong-source checks so an apparently plausible island cannot come from another card.
- Verify parent-before-child occlusion and connected-component ownership.
- Reject halos, duplicated features, seams, transparent pinholes, and exposed fill.

### 9. Assemble back-to-front, then add micro-relief

The stable sequence is backing/rear scenery → middle scenery → main body masses → forward anatomy/props → small effects and highlights. Small foreground pieces are the most fragile and the least tolerant of registration error, so they belong late in the physical sequence.

**Pipeline mapping — assemble**

- Sort by explicit depth rank, never filename order.
- Separate coarse depth bands from micro-relief offsets.
- Reserve the nearest ranks for small accents only when the illustration supports them.
- Verify every pair has deterministic depth ordering and enough separation to avoid z-fighting.

### 10. Let viewing motion reveal construction; do not make pieces float

The physical works are rigid sculptures. Motion comes primarily from the viewer/camera changing angle, which reveals occlusion, edge depth, and shadows. CardTwin animation should imitate that inspection behavior, not independently drift every cutout.

**Pipeline mapping — animate**

- Move the assembled card/camera as one system first.
- Keep relative layer motion derived from depth and perspective.
- Use small, damped tilt with a neutral calibrated pose.
- Avoid per-island bobbing, elastic scaling, or phase-offset “breathing” unless a separate authored magical effect explicitly calls for it.
- At all accepted tilts, verify no holes, fill seams, layer inversion, or surface flicker.

## Human process → CardTwin stage map

| Human craft step | Canonical HD | Cut | Fill | Assemble | Animate |
|---|---|---|---|---|---|
| Select clean donor/reference cards | immutable source, hash, dimensions | — | — | — | — |
| Read composition and plan depths | protected identity zones | occlusion graph and ranks | anticipate hidden regions | depth budget | approved tilt envelope |
| Establish backing and rear apertures | full-card datum | broad rear masks | rear hidden continuation | backing at rank 0 | rigid datum |
| Separate background bands | canonical-coordinate registration | near/mid/far masks | bleed beneath occluders | ordered scenery planes | perspective-only parallax |
| Cut main subject masses | preserve printed RGB | contour-supported masks | hidden anatomy/background | mid/foreground ranks | no independent float |
| Cut internal anatomy/effects | preserve tiny identity details | connected components and parent links | local hidden continuation | micro-relief ranks | restrained reveal |
| Finish exposed edges | visible pixels unchanged | clean alpha boundary | hidden color bleed | halo check | maximum-tilt edge check |
| Place foam/spacers | — | do not alter contour for support | — | strict local Z/support metadata | separation invariant |
| Dry-fit/nest pieces | canonical neutral reference | revise only failed masks | close pinholes | neutral exact-pixel composite | tilt inspection |
| Final back-to-front assembly | provenance retained | frozen accepted masks | frozen accepted fills | deterministic rank order | rigid physical response |

## Acceptance gates before any re-cut

1. **Canonical gate:** source hash/dimensions recorded; no visible source overwrite.
2. **Depth-plan gate:** every island has a semantic group, component ID, depth rank, occlusion parent, and confidence.
3. **Boundary gate:** every cut follows visible evidence or is explicitly reviewed as ambiguous.
4. **Fill gate:** hidden continuation covers the full motion envelope without changing visible canonical pixels.
5. **Nest gate:** neutral composite matches canonical registration; no duplicate or missing feature.
6. **Separation gate:** all rendered planes have deterministic, strictly separated depth.
7. **Motion gate:** tilt reveals relief without holes, halos, z-fighting, or independent sticker-like drift.
8. **Provenance gate:** generated SR/masks remain disclosed derivatives beside, never instead of, canonical sources.

## What not to copy from the physical medium

- Do not simulate depth by adding a uniform dark outline to every digital cutout.
- Do not flatten hundreds of local decisions into “background / subject / foreground.”
- Do not use generative fill on pixels that are visible in the canonical neutral composition.
- Do not infer spacer thickness from the reel’s lens perspective.
- Do not add autonomous layer animation merely because the digital medium permits it.
- Do not treat high piece count as a target by itself; each split must carry an occlusion or form reason.

## Decision for the next CardTwin pass

Before re-cutting any asset, create the occlusion graph and depth-ranked component inventory for one card. Review that inventory as the digital equivalent of the artist’s pre-cut depth plan. Only after approval should the pipeline execute `canonical HD → cut → fill → assemble → animate`. This preserves the key physical insight: depth is designed first, then embodied by cuts and spacing; it is not added afterward by spreading a few whole-image planes.

## Sources

[1] [mr.shadowbox layered-card reel](https://www.instagram.com/reel/DTrCMWSiAKE)

[2] [3Devious Art Alakazam EX reel](https://www.instagram.com/reel/DPXJINojumu)
