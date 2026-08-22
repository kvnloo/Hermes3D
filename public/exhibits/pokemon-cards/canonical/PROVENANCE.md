# Pokémon card printing identity and source provenance

Retrieved: 2026-08-22T00:14:44-05:00

## Result

All three supplied finished-card references are accounted for and match an exact English printing at high confidence. The flat files in this directory were downloaded directly from the Pokémon TCG API image CDN and preserved byte-for-byte. No redraw, synthetic replacement, screenshot substitution, recompression, inpainting, or super-resolution was used.

| Reference | Exact printing | Variant / finish | Canonical file |
|---|---|---|---|
| Arcanine shadowbox | Arcanine — Sun & Moon (SM1) 22/149, English, 2017 | Rare Holo; holofoil artwork window | `arcanine-sm1-22.png` |
| Umbreon shadowbox | Umbreon VMAX — Sword & Shield—Evolving Skies (SWSH7) 215/203, English, 2021 | Alternate Art Secret / Special Full Art; textured holofoil | `umbreon-vmax-swsh7-215.png` |
| Leafeon shadowbox | Leafeon ex — Scarlet & Violet—Prismatic Evolutions (PRE / SV8.5) 144/131, English, 2025 | Special Illustration Rare Tera Pokémon ex; textured holofoil | `leafeon-ex-sv8pt5-144.png` |

## Match evidence

### Arcanine

The physical reference and flat source share Arcanine, HP 130, the Growlithe evolution badge, identical kodama coast artwork, Searing Flame 60, Firestorm 190, English text, and collector number 22/149. The visible holographic artwork window agrees with the official Rare Holo classification. This is not the reverse-holo variant.

### Umbreon VMAX

The physical reference and flat source share Umbreon VMAX, HP 310, Single Strike branding, Dynamax label, KEIICHIRO ITO moon-and-tower art, Dark Signal, Max Darkness 160, English text, and 215/203. The number and art exclude Evolving Skies 095/203, Japanese Eevee Heroes 095/069, rainbow, and later trainer-gallery printings.

### Leafeon ex

The physical reference and flat source share Leafeon ex, HP 270, Tera label, crystalline Jiro Sasumo foliage artwork, Verdant Storm, Moss Agate 230, English text, and PRE EN 144/131. The footer excludes English 006/131 and Japanese Terastal Fest ex 200/187.

## Byte integrity

Reproduce hashes from the repository root:

```sh
sha256sum public/exhibits/pokemon-cards/canonical/*.png
```

Expected:

- `763abeb960a5c5e362bf49b6e4e1210b8b3d6a483384a85de372d19ea848ed1c` — Arcanine, 734×1024, 681465 bytes, image/png
- `0588afac1c3dee4c8a039d5ff9d0cff2ec4abfbcadedbb62b573750b8f772d92` — Umbreon VMAX, 734×1024, 792631 bytes, image/png
- `f00547340035daf54ba086ee1f4c6d907476ae2772030517b68605a9ebd9842f` — Leafeon ex, 733×1024, 780956 bytes, image/png

The existing Arcanine segmentation source at `../arcanine-sm1-22/source/arcanine-sm1-22.png` is byte-identical to the canonical Arcanine file.

## Sources and confidence

Identity metadata was cross-checked against the official Pokémon card database where available and printing-specific TCGplayer records. Flat images came from:

- https://images.pokemontcg.io/sm1/22_hires.png
- https://images.pokemontcg.io/swsh7/215_hires.png
- https://images.pokemontcg.io/sv8pt5/144_hires.png

The exact source URLs, reference hashes, dimensions, byte counts, evidence, and confidence are recorded in `source-manifest.json`.

## Rights and use constraints

Pokémon names, card layouts, illustrations, and scans are copyrighted/trademarked material owned by their respective rightsholders. Pokémon TCG API/CDN availability is not a license or permission grant. These files are suitable only for this private identity/segmentation prototype and internal evaluation unless separate rights are obtained. Do not publish, redistribute, commercialize, or imply affiliation. Marketplace shadowbox photos remain private references and are not copied into this repository.

No optional super-resolution derivatives were created. If one is created later, it must live outside the untouched canonical files, carry its own hash and method/model disclosure, and be labeled as invented pixels rather than canonical source.
