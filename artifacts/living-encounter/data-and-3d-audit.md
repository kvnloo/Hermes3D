# Living Encounter data and 3D promotion audit

Date: 2026-08-23
Catalog contract: `Pokemon3DAssetCatalog` v2 (promotion-only, currently zero entries)

## Verified PokeAPI detail fields

Live records were checked against `https://pokeapi.co/api/v2/pokemon/25` and `https://pokeapi.co/api/v2/pokemon-species/25`.

- Official artwork: `sprites.other.official-artwork.front_default`
- Truthful shiny control source: `sprites.other.official-artwork.front_shiny` when non-null
- Animated 2D sprite: `sprites.other.showdown.front_default` when non-null
- Cry: `cries.latest` (OGG); audio remains preload-none and off until explicit user enablement
- Types: `types[].type.name`
- Forms/varieties: species `varieties[]`, each with exact Pokémon endpoint ID and `is_default`
- Habitat: species `habitat.name` (nullable)
- Color: species `color.name`
- Generation: species `generation.name`; the app retains its existing National Dex generation mapping for list consistency
- Evolution: species `evolution_chain.url`

Exact Pikachu evidence URLs returned by the live API included:

- `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png`
- `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/25.png`
- `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/25.gif`
- `https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/25.ogg`

Attribution remains: “Data and artwork from PokeAPI. Pokémon names and artwork belong to their respective owners.” Null assets fail down the deterministic model → animated sprite → official artwork → missing ladder.

## Existing private 3D candidate audit

Canonical process reviewed:

- `/workspace/zer0/products/pokemon/docs/CREATURE-ASSET-EXPERIMENT-LAB.md`
- `/workspace/zer0/products/pokemon/docs/MESH-PIPELINE.md`

Fourteen private derivative GLBs exist under `/mnt/zer0models/pokemon_anime/`. Existence is not approval. No source plate was copied or linked into this app.

### Kanto starter candidates

The three decimated candidates pass only the coarse whole-mesh health script:

| Candidate | Faces | volume / bbox | min / max extent | Promotion result |
|---|---:|---:|---:|---|
| Bulbasaur `_8k` | 8,000 | 0.452 | 0.602 | REJECT: no component-level QA, blue-clay front/side/rear review, labels-hidden identity jury, material/rig/clip evidence, browser runtime/performance promotion, or promotion sidecar |
| Charmander `_8k` | 8,000 | 0.082 | 0.802 | REJECT: same missing ladder evidence |
| Squirtle `_8k` | 7,999 | 0.000 | 0.694 | REJECT: non-volume result plus same missing ladder evidence |

### Wooloo candidates

- `hero_v2_shape_8k.glb`: 8,000 faces, min/max extent 0.008. Mechanically rejected as paper-thin (`< 0.12`).
- Four current matched/multiview shapes: 989,316–1,039,508 faces, non-watertight/non-volume reports and over the documented 12k–20k LOD0 runtime target. They are reconstruction hypotheses, not conditioned runtime assets.
- The blind reconstruction directory has a labels-hidden manifest but no completed ballot at the expected path; a hidden grid alone is not an identity approval.
- Existing docs explicitly identify contaminated/boxy Wooloo baselines and state raw shape-only GLBs are not game-ready.

## Decision

Promoted entries: **0**.

The Living Encounter therefore truthfully exercises animated Showdown sprites where exposed by PokeAPI and falls back to official artwork otherwise. The v2 catalog requires a promoted derivative hash, promotion record, license, attribution, and app-local derivative URL; it cannot reference private source media. A future 3D entry must complete the existing component QA → fixed-view blue-clay renders → labels-hidden identity decision → conditioning/material/rig → browser performance ladder before registration.
