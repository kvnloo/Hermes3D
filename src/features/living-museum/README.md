# Living Museum feature boundary

Canonical namespace for Kevin's fork only. This scaffold is an architecture contract, not a live feature.

- `core/`: strict exhibit, projection and search contracts.
- `shell/`: visitor journey, camera ownership, activation and rendering composition.
- `exhibits/<slug>/`: self-contained `manifest.ts`, scene, local assets and tests.
- `registry/`: generated output only. Exhibit branches never edit it.
- `tests/`: shared schema, provenance, privacy, performance and visual fixtures.

The initial slugs are `pokemon-game`, `star-wars-game`, `pokemon-cards`, `call-of-duty`, `halo`, and `obsidian-vault`. Franchise names are fan-project labels only. Exhibits use original, procedural, commissioned or project-owned assets and carry no implied affiliation.

`obsidian-vault` is always connector-disabled in v1. No implementation may inspect or enumerate a vault, path, filename, graph, note or attachment. Its public label is `PRIVATE KNOWLEDGE VAULT - CONNECTOR DISABLED`.

The museum is a downstream visual projection. It cannot approve, prioritize or mutate work. See `docs/living-museum/ADR-0001-living-museum-v1.md`.
