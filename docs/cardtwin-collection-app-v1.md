# CardTwin Collection App v1

## Scope and architecture

This slice adds `/pokedex`, `/pokedex/[id]`, `/cards`, and `/cards/[id]` around the existing CardTwin exhibit. It does not add ownership, condition, pricing, accounts, scanning, trading, social features, or collection sync.

Catalog access is server-only. `PokemonCatalogProvider` and `CardCatalogProvider` version 1 normalize external records into typed summaries/details with source URL, attribution, and fetch freshness. The shared cached fetcher applies an 8-second timeout, one retry for rate limits/transient upstream errors, and deterministic process-local TTL caching. Browser pages receive only the current 24-item page, so a Pokédex view never creates a 1,025-image request storm.

PokeAPI list records provide stable National Dex IDs. Official artwork URLs use PokeAPI's official-artwork sprite repository. Generation and region are derived from the published National Dex generation boundaries. Type filtering uses one server-side PokeAPI type request, then intersects stable IDs. Detail requests join the Pokémon species record to its evolution-chain endpoint, cache both by stable source identity, and normalize only source-evidenced species in chain order.

TCGdex is the card source. The provider preserves the exact TCGdex ID, local number, set ID/name, rarity when present, and source image URL. CardTwin matching is a separate fail-closed identity table requiring source ID, set name, and number to all match. A source card without that exact tuple stays flat and says `CardTwin depth not available`. Exact matches embed the existing accepted `PokemonCardsPreview` viewer directly; its gyro, Touch, fullscreen, Paper/Glass, damping, and layer interaction code is reused rather than forked.

The Pokémon 3D catalog is separate from PokeAPI records and currently empty by design. Every detail route therefore says `3D model unavailable`; no artwork-derived mesh or unrelated model is substituted. Browser coverage intentionally verifies only this fail-closed path at both target viewports. An available-model journey is inapplicable until an approved versioned local model enters the catalog.

## External sources and terms

- PokeAPI: https://pokeapi.co/docs/v2 and https://pokeapi.co/about
- PokeAPI sprites: https://github.com/PokeAPI/sprites
- TCGdex API: https://tcgdex.dev and https://github.com/tcgdex/cards-database

Pokémon names, card art, and official artwork belong to their respective rights holders. This repository stores no new external Pokémon/card pixels for the collection routes; it references source-hosted URLs. Existing CardTwin private/public material boundaries remain unchanged.

## States and interaction

Search and filter state is addressable in the URL. Invalid pages and filters normalize safely. Empty, upstream/offline, and retry states are explicit. Contextual Back uses browser history when available and falls back to the parent catalog. The fixed navigation includes only functional Pokédex and Cards links; Scan and Profile are disabled and labeled `Later`.

The responsive grid is capped to 24 records per page and tested at 390x844 and 1920x1080. At both viewports, browser journeys submit Cards URL filters, exercise contextual Back from both detail routes, cover CardTwin available/unavailable printings, and cover the deliberately empty 3D catalog. The page reserves bottom safe-area space, allows vertical scrolling, and clips no horizontal content. System dark mode uses the same information hierarchy and red/blue accents.

## Verification

Focused unit coverage:

- URL query parsing and serialization
- generation/region boundaries
- 24-item pagination
- timeout/rate-limit retry and deterministic caching
- PokeAPI and TCGdex normalization
- evidenced evolution-chain normalization
- exact CardTwin identity matching
- fail-closed Pokémon 3D catalog
- existing CardTwin catalog and interaction contracts

Run:

```text
npm run test -- --run tests/unit/cardtwinCollectionCatalog.test.ts tests/unit/cardtwinProviders.test.ts tests/unit/cardTwinCatalog.test.ts tests/unit/cardTwinInteraction.test.ts
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npx playwright test tests/e2e/cardtwin-collection-routes.spec.ts
npm run typecheck
npm run lint -- --quiet
npm run build
```

Browser captures are in `artifacts/cardtwin-v1/`. Runtime assertions reported equal `scrollWidth` and `clientWidth` at 390px mobile and 1920px desktop.

The full inherited suite currently reports 1,358 passing and 15 failing tests. Fourteen failures require private CardTwin source/layer/evidence pixels that are intentionally absent from this public worktree; one unrelated agent-settings timing test failed. The focused CardTwin collection suite is green.

## Known bounded gaps

- Set and rarity controls are exact text filters in v1; source-derived selector inventories are deferred.
- The approved Pokémon 3D catalog has no entries yet.
- Exact CardTwin matches embed the accepted viewer. Its broader exhibit framing remains visible around the reusable stage in v1.
- The local server is a HITL candidate only. It is not a deployment.
