# CardTwin Arcanine vertical-slice receipt

Private evaluation slice for the exact `Arcanine — Sun & Moon — 22/149` printing.

- Canonical flat image: `https://images.pokemontcg.io/sm1/22_hires.png`
- Canonical source SHA-256: `763abeb960a5c5e362bf49b6e4e1210b8b3d6a483384a85de372d19ea848ed1c`
- Canonical source dimensions: 734 × 1024 RGBA; no upscaling or recompression before cutting
- Physical reference: CardTwin attachment `ref-01.jpg`, SHA-256 `f5efd9059730a9ad42f93df52b6444ccb32ff65b07a4bf74892d5a1760ff200d`
- Segmenter: official Meta SAM 2 repository, revision `2b90b9f5ceec907a1c18123530e92e794ad901a4`
- SAM 2 license: Apache-2.0
- Checkpoint: official SAM 2.1 Hiera Tiny, 156,008,466 bytes, SHA-256 `7402e0d864fa82708a20fbd15bc84245c2f26dff0eb43a4b5b93452deb34be69`
- Layer ontology: `cardtwin-semantic-layers/v1`
- Visible semantic planes: far background, mid background, hero, outer frame/text/foreground
- Refinement: deterministic art-window partition and bottom foreground strip after SAM hero prediction
- Inpainting: none
- Super-resolution: none
- Invented visible pixels: none

`manifest.json` records exact prompts, alpha coverage, per-mask hashes, depth order, and model provenance. `scripts/generate-cardtwin-arcanine.py` reproduces the masks using model/cache paths under `/mnt/zer0models`.

Pokémon imagery is retained only as private evaluation evidence in this local, unpublished prototype. Rights for distribution are not asserted.
