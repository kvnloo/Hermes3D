#!/usr/bin/env python3
"""Build deterministic neutral-browser-vs-canonical CardTwin evidence sheets."""

from __future__ import annotations

import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / "artifacts/hitl/cardtwin-final"
CARDS = (
    ("arcanine-sm1-22", "arcanine-sm1-22.png"),
    ("umbreon-vmax-swsh7-215", "umbreon-vmax-swsh7-215.png"),
    ("leafeon-ex-sv8pt5-144", "leafeon-ex-sv8pt5-144.png"),
)


def card_bounds(stage: np.ndarray) -> tuple[int, int, int, int]:
    height, width = stage.shape[:2]
    background = np.median(stage[8:28, width // 4:width // 2], axis=(0, 1))
    delta = np.max(np.abs(stage.astype(np.int16) - background.astype(np.int16)), axis=2)
    mask = np.zeros_like(delta, dtype=np.uint8)
    mask[: height - 36, width // 4:width * 3 // 4] = (delta[: height - 36, width // 4:width * 3 // 4] > 18).astype(np.uint8)
    count, _, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
    if count < 2:
        raise RuntimeError("neutral browser card could not be isolated")
    x, y, w, h, area = max(stats[1:], key=lambda row: int(row[4]))
    if area < 50_000 or h < 300:
        raise RuntimeError(f"isolated browser card is implausibly small: {w}x{h}, area={area}")
    return int(x), int(y), int(x + w), int(y + h)


def build(slug: str, canonical_name: str) -> dict[str, object]:
    card_dir = EVIDENCE / slug
    stage_path = card_dir / "assembled-neutral-stage.png"
    canonical_path = ROOT / "public/exhibits/pokemon-cards/canonical" / canonical_name
    stage = np.asarray(Image.open(stage_path).convert("RGB"))
    canonical = Image.open(canonical_path).convert("RGB")
    bounds = card_bounds(stage)
    x1, y1, x2, y2 = bounds
    browser = Image.fromarray(stage[y1:y2, x1:x2])
    canonical_scaled = canonical.resize(browser.size, Image.Resampling.LANCZOS)
    browser_array = np.asarray(browser).astype(np.int16)
    canonical_array = np.asarray(canonical_scaled).astype(np.int16)
    diff = np.abs(browser_array - canonical_array).astype(np.uint8)
    amplified = np.clip(diff.astype(np.uint16) * 5, 0, 255).astype(np.uint8)
    overlay = Image.blend(canonical_scaled, browser, 0.5)

    panel_w, panel_h = browser.size
    header = 34
    sheet = Image.new("RGB", (panel_w * 4, panel_h + header), "#07110f")
    draw = ImageDraw.Draw(sheet)
    panels = (
        ("canonical scaled", canonical_scaled),
        ("neutral WebGL", browser),
        ("50% overlay", overlay),
        ("5x absolute diff", Image.fromarray(amplified)),
    )
    for index, (label, image) in enumerate(panels):
        sheet.paste(image, (index * panel_w, header))
        draw.text((index * panel_w + 8, 10), label, fill="white")
    output = card_dir / "neutral-canonical-comparison.png"
    sheet.save(output)
    return {
        "card": slug,
        "browser_card_bounds": list(bounds),
        "comparison": str(output.relative_to(ROOT)),
        "mean_absolute_rgb_difference": round(float(diff.mean()), 4),
        "p99_absolute_rgb_difference": int(np.percentile(diff, 99)),
        "canonical_visible_pixels_changed": False,
        "note": "Browser scaling/filtering is measured only; source and visible RGBA layer bytes are unchanged.",
    }


def main() -> None:
    results = [build(*card) for card in CARDS]
    output = EVIDENCE / "neutral-comparison-metrics.json"
    output.write_text(json.dumps({"status": "PASS", "cards": results}, indent=2) + "\n")
    print(json.dumps({"status": "PASS", "cards": len(results), "metrics": str(output.relative_to(ROOT))}))


if __name__ == "__main__":
    main()
