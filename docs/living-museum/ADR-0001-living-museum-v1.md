# ADR-0001: Living Museum v1 architecture

Status: Accepted architecture for Kevin's fork. No live deployment authorization.

## Context and sources

The canonical idea states that exhibits consume only redacted typed projections, sleep deterministically when inactive, and remain downstream of Kanban and repository evidence. Repo inspection confirms Next.js App Router composition roots under `src/app`, feature slices under `src/features`, React Three Fiber in `src/features/retro-office`, gateway transport in `src/lib/gateway`, and a separate Phaser builder. `RetroOffice3D.tsx` is a large existing scene root; the museum must not be inserted into that file as another central switch.

The named `LIVING_MUSEUM_V0_PLAN.md` was not present at the canonical product or repository paths during this architecture run. The task contract and operator art-direction note are therefore the controlling plan inputs. No Obsidian vault content was inspected.

## Decision

### Product and authority boundary

Living Museum, global search, exhibits, stream UI, directory, Orbs, camera and content integrations are Kevin-fork-only product work. Do not open upstream PRs. Fork main and integration branches are product source, but deployment, merge and publication remain Captain-gated.

Hermes3D is the visual OS and visitor projection. It is never lifecycle authority:

| System | Authority |
| --- | --- |
| Kanban | work lifecycle and dependencies |
| Keel | authorization and sealed evidence |
| Mesh | transport and agent coordination |
| Boplog | approved public/company projection |
| Hermes3D | visual navigation and presentation |

The museum may consume a public projection. It may not infer acceptance, write lifecycle state, or read raw Kanban, Boplog databases, host files, logs, messages, secrets or private artifacts.

### Namespace and route

Use `src/features/living-museum/` with `core`, `shell`, `exhibits`, `registry`, and `tests`. Add a thin `/museum` App Router composition root only in the shell branch. Keep it separate from `/office` and the Phaser `/office/builder`. Shared helpers move to `src/lib` only after a second real consumer exists.

Each exhibit owns only:

```text
src/features/living-museum/exhibits/<slug>/
  manifest.ts
  ExhibitScene.tsx
  assets/
  tests/
```

The generated registry scans exact `exhibits/*/manifest.ts` paths in lexical slug order, validates each manifest, rejects duplicate IDs/slugs, and writes `registry/generated.ts`. Generated output is created only on the shell/integration branch and CI verifies a clean regeneration. Exhibit branches never edit central registry, route, shell, shared schema, package scripts or generated files.

### Strict contract

`src/features/living-museum/core/MuseumExhibitV1.ts` is normative. Parsing rejects unknown and missing fields at every object boundary. Semantic validation additionally requires:

- exact slug/id pairing and the six allowlisted slugs;
- finite bounds with `min < max` on each axis;
- five authored anchors: establishing, approach, detail, orbit and exit;
- search destination exactly `approach`;
- ordered `hero`, `near`, `far`, `sleep` LOD tiers with hysteresis;
- SHA-256 lowercase hex, positive byte counts, repo-relative asset paths and exact byte/hash match;
- origin limited to procedural, project-owned or original-commission;
- explicit creator and license, with no unreviewed or unknown license;
- public URLs limited to `https:` and no credentials, localhost, IP literals, query secrets or fragments;
- only `verifiedMilestone`, `milestoneUrl`, and `updatedAt` in the public projection;
- milestone absent unless backed by a public URL or sealed Captain-approved projection;
- no keys or values matching private-path, secret, task/log/status, database or internal-host deny rules.

### IP, provenance and privacy

No ripped game models, textures, logos, music, fonts, card scans or copyrighted screenshots. Franchise exhibits use original abstract geometry and project-owned public metadata with a visible fan-project/no-affiliation notice. Every asset is hash-pinned and licensed in its exhibit manifest.

`obsidian-vault` is a disabled architectural placeholder. Its only product statement is `PRIVATE KNOWLEDGE VAULT - CONNECTOR DISABLED`. No code path, build step, registry generator, test fixture, search index or preview may inspect or enumerate vault paths, filenames, graph data, notes or attachments. Any future connector is a new Captain-authorized ADR with an explicit path allowlist, redaction contract and read-only projection.

### Curatorial thesis and visitor journey

The museum presents a body of work from a creative studio, not operational dashboards in 3D. The curatorial thesis is: original worlds become legible through artifacts, process and verified evolution.

The shell authors a five-part journey:

1. Arrival and orientation: one thesis, one establishing view, no status wall.
2. Thematic rooms: games, collections and private-future boundary, joined by coherent materials and lighting.
3. Hero works: one dominant exhibit per sightline and one active hero globally.
4. Process and details: progressively disclosed public studies, rejects and provenance, subordinate to the artifact.
5. Reflection and exit: a quiet authored exit anchor that returns spatial context.

Composition uses original geometry with compression and reveal, intentional negative space, scale changes, occlusion, lighting transitions, material rhythm and bounded sound zones. It must not repeat identical cards, vitrines or dashboard boxes. Each exhibit has its own visual language while sharing one museum floor/wall material family, light temperature range, label typography and transition grammar.

Every exhibit tells this sequence: title and one-line intent, hero artifact/diorama, why it matters, public process/evolution/rejected studies, an interactive detail or ambient motion, provenance/credits/public link, and a verified current public milestone only when evidence permits. Labels are progressive disclosure and visually subordinate to art.

### Camera and activation ownership

There is exactly one camera writer per mode. Existing repo camera systems already coordinate OrbitControls, preset animation, follow mode and a query-only stream orbit; museum work must add a museum camera arbiter rather than allow exhibits to call `camera.position` independently. An exhibit publishes anchors, never writes the camera. Search deep-links resolve the `approach` anchor. Establishing, detail, orbit and exit are authored alternatives, not computed arbitrary centers.

Only one exhibit is active globally. Inactive exhibits render far/sleep LOD, stop frame hooks, audio, particles and timers, and dim deterministically. Offscreen exhibits are suspended. Milestone spectacle is opt-in, has a duration and cooldown, can be manually suppressed, and cannot activate a second hero.

### Measured budgets

Budgets are gates, not aesthetic targets. Integration records a baseline on the same pinned browser, viewport, DPR, quality preset and hardware before adding exhibits. Each exhibit declares tighter values, bounded by these v1 ceilings:

| Metric | Per active exhibit ceiling | Whole museum integration target |
| --- | ---: | ---: |
| Initial compressed asset bytes | 1.5 MiB | 4 MiB route initial transfer |
| Deferred asset bytes | 6 MiB | 24 MiB resident cache |
| Triangles | 180,000 | 450,000 visible |
| Draw calls | 90 | 180 visible |
| Textures | 12 | 32 resident |
| Texture edge | 2048 px | 2048 px |
| CPU frame p95 | 8 ms | 10 ms |
| GPU frame p95 | 10 ms | 12 ms |

Desktop target is p95 at or below 16.7 ms at 60 Hz. Mobile target is p95 at or below 33.3 ms at 30 Hz with composition-preserving fallback. Report CPU/GPU separately where timer queries are available. Software WebGL and reduced-motion paths use static hero framing, no spectacle and conservative LOD. A budget can only tighten on feature branches; raising a ceiling requires a new reviewed ADR with measurements.

## Consequences

The architecture favors authored composition and privacy over automatic ingestion. New exhibits can integrate without central merge collisions. Search and scene data are intentionally narrower than internal product records. Visual acceptance requires evidence beyond schema and CI.
