# CardTwin collection production UX audit

Base candidate: `146cd6db0accfb010a549d3c08b1ff5ea1a49100`

## Executive summary

Three confirmed production defects were reproduced and repaired with RED→GREEN coverage. The highest-severity defect let an exact card identity trigger the WebGL viewer even when private reconstruction textures were absent. Requests for the missing textures were redirected to `/office`, producing repeated HTTPS protocol errors, a React hydration mismatch, texture-loader exceptions, and finally the global client error page. The repaired route verifies the complete local asset contract before rendering the viewer and truthfully discloses when approved assets are not installed.

The deterministic matrix now executes 37 browser journeys across 320×844, 360×844, 390×844, 412×915, 844×390 landscape, and 1920×1080. The latest full run passed 35/37; the two remaining cases were non-deterministic dev-server navigation failures and each passed in focused correction/prior viewport runs. A seeded 27-transition independent exercise passed with no application runtime errors. Twelve full-page catalog screenshots and preserved logs are under this artifact directory. The verified production build was deployed privately to durable port 8464; no public publication or merge was performed.

## Findings

### CT-001 — Card detail crashes when matched CardTwin assets are absent

- Severity: Critical
- Category: Functional / Console / Resilience
- Route: `/cards/sm1-22`
- Viewports: 390×844, 1920×1080
- Action: Open an exact printing whose identity exists but whose semantic-layer PNGs are not installed.
- Expected: Viewer only renders when its full immutable asset set is available; otherwise show a truthful unavailable state.
- Actual before repair: Missing texture requests redirected to `/office`; console emitted `ERR_SSL_PROTOCOL_ERROR`, hydration mismatch, and `Could not load ... hidden-background-fill.png`; the page ended in the global client exception state.
- Repair: Added a fail-closed server-side asset contract requiring canonical, hidden-fill, and every semantic layer before embedding WebGL. The unavailable explanation distinguishes an unmatched printing from a matched reconstruction absent on this deployment.
- Regression evidence: `cardTwinAssetAvailability.test.ts`; mobile/desktop card-detail journey with `pageerror` assertion.

### CT-002 — Active filters have no one-step reset

- Severity: Medium
- Category: UX / Functional
- Routes: `/pokedex`, `/cards`
- Viewports: 390×844, 1920×1080
- Action: Apply several filters, then attempt to return to the complete catalog.
- Expected: A clear, keyboard-accessible reset requiring one action.
- Actual before repair: Users had to manually clear every field or infer that the bottom navigation link resets state.
- Repair: Conditional `Clear filters` links now return to the clean parent URL and expose a 44px minimum target.
- Regression evidence: mobile/desktop URL and field-value journey.

### CT-003 — Invalid deep links return a generic not-found experience

- Severity: Medium
- Category: UX / Error recovery
- Routes: `/pokedex/999999`, `/cards/not-a-real-card`
- Viewports: 390×844, 1920×1080
- Action: Open an invalid ID directly.
- Expected: Domain-specific explanation and an obvious route back to the relevant catalog.
- Actual before repair: Generic framework not-found UI with no collection context.
- Repair: Route-local not-found states preserve CardTwin navigation and provide `Return to Pokédex` / `Return to cards` links.
- Regression evidence: mobile/desktop invalid-deep-link journey.

## Adversarial UX filter

Persona: “Mara,” a busy collector using one hand on a phone who will abandon the app after one crash or if undoing a search requires field-by-field cleanup.

- RED: “I opened the card and the whole app died.” CT-001; fixed.
- RED: “Why do I have to erase three boxes to get my list back?” CT-002; fixed.
- RED: “This dead link doesn’t even tell me how to get back to cards.” CT-003; fixed.
- WHITE: Scan/Profile are not implemented. They are already native disabled buttons, visibly labeled `Later`, and omitted from the tab order; no ticket.
- YELLOW: Set and rarity remain exact text filters rather than source-derived selectors. Valid but bounded and already truthfully documented; not expanded in this task.

## Verification notes

- Deterministic fixtures: `CARDTWIN_TEST_FIXTURES=1`; browser tests do not depend on mutable provider totals.
- Browser behaviors exercised: URL-preserving search/filter submit, clear, detail navigation, contextual Back, direct invalid URLs, exact CardTwin asset-unavailable state, horizontal overflow, safe-area padding, and page errors.
- Unit behaviors exercised: URL parsing/serialization, provider normalization/caching/retry, identity matching, CardTwin interactions, and complete asset availability.
- Runtime root-cause capture observed the exact hydration and texture exceptions before repair.
- The expanded crawl exposed a concurrent Living Encounter SSR defect (`window is not defined`). The browser log is preserved; a hydration-safe `useSyncExternalStore` preference boundary now passes its focused SSR/unit coverage.
- RED evidence is preserved in `logs/playwright-matrix-red.log`; focused unit and browser GREEN evidence is preserved alongside it. The first browser-launch environment failure is retained separately and is not defect evidence.
- Reproducible browser tests use isolated `CARDTWIN_NEXT_DIST_DIR=.next-cardtwin-playwright`, avoiding the production service's `.next` lock.
- Private deployment: `cardtwin-collection-8464.service` active; `/pokedex` and `/cards/sm1-22` returned HTTP 200 after deployment verification. This is a Tailnet/local durable deployment, not a public release.

## Candidate isolation

The approved base is `146cd6db0accfb010a549d3c08b1ff5ea1a49100`. Concurrent Living Encounter commits `3e760bb`, `4aeeac5`, and `e626ec7` landed in the shared worktree during this gauntlet. The intended collection repair remains an explicit uncommitted delta on exact dependency HEAD `e626ec77e6ac57b332ab800d543017e44a072db3`; `candidate-manifest.txt` and `repair-on-e626ec7.patch` bound that review surface. `repair-on-3e760bb-with-concurrent-dependency.patch` preserves the earlier combined snapshot for provenance without pretending mutable HEAD is the approved base.
