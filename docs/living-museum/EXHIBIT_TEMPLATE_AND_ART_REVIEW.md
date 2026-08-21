# Exhibit design template and art review

## Curatorial template

An exhibit proposal must answer before scene work begins:

1. Title and one-line intent.
2. Why the work belongs in the museum and why it matters.
3. The single hero artifact or diorama that owns its sightline.
4. The approach sequence: what is hidden, compressed, revealed and held.
5. Public process material: evolution and rejected studies only where publication is authorized.
6. One interactive detail or ambient animation and what it communicates.
7. Reflection prompt and exit transition.
8. Provenance, credits, license and public links.
9. Verified current public milestone, or explicitly none.
10. Fan-project/no-affiliation notice where a franchise label is used.

## Spatial and sensory template

Declare room footprint, hero scale, negative-space ratio, primary/secondary sightlines, five camera anchors, occluders, light hierarchy, shared museum materials, exhibit-specific material accent, sound-zone bounds and transition to neighbors. One hero must read in silhouette at far LOD. Labels may not compete with the artifact. Avoid repeated boxes, cards, equal vitrines, ornamental clutter and raw operational UI.

Motion must be ambient by default. State what hierarchy, story, feedback or transition each movement communicates. Declare sleep behavior, far/near/hero LOD, active state, milestone spectacle duration/cooldown and reduced-motion/static fallback.

Mobile fallback must preserve the hero silhouette, reveal order, label hierarchy and approach composition. It may reduce particles, textures, geometry, sound and secondary studies, but it may not collapse into dashboard cards.

## Scaffold generator contract

A future `npm run museum:new -- <slug>` command may create only an absent `src/features/living-museum/exhibits/<slug>/` directory from an immutable template. It must validate the slug, refuse overwrite, create `manifest.ts`, `ExhibitScene.tsx`, `assets/.gitkeep`, and `tests/manifest.test.ts`, and never edit the registry or route. It emits no franchise assets and defaults every milestone to null. Generator implementation belongs to the shell task, not this architecture card.

## Art review evidence gate

Before integration, the integration worker produces a private evidence pack bound to exact commit and manifest hash:

- 12-angle contact sheet: arrival, establishing view, each thematic transition, every hero sightline, at least two detail views, reflection and exit;
- 60-90 second guided tour video at representative desktop quality with an uncut visitor journey;
- mobile stills at 390x844 for arrival, approach, detail and exit;
- WebGL fallback and reduced-motion stills;
- frame-time trace and declared-versus-measured budget table;
- asset/provenance manifest and generated-registry hash.

Captain reviews the exact pack for:

| Dimension | Pass condition |
| --- | --- |
| Thesis | The body of work reads as one authored exhibition, not a feature catalog. |
| Narrative | Arrival, rooms, hero, process, reflection and exit form a legible journey. |
| Composition | One hero per sightline, purposeful negative space, scale and reveal. |
| Originality | Original geometry and visual language; no ripped or imitation franchise assets. |
| Coherence | Exhibit identities differ while museum materials, lighting and transitions unify them. |
| Information | Labels support the art through progressive disclosure; no dashboard feel. |
| Motion and pacing | Ambient motion has purpose; one active hero; tour pacing has breath and focus. |
| Mobile | Curatorial hierarchy survives fallback. |
| Evidence and privacy | Public claims are verified; provenance complete; no private leakage. |
| Performance | Measurements pass declared and global ceilings on pinned conditions. |

This gate is binary and Captain-owned. Builders and integration CI cannot self-certify artistry. Failure returns actionable notes; it does not loosen schema, privacy, provenance or performance gates.
