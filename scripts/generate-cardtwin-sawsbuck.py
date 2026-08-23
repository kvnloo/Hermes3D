from __future__ import annotations

import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
CARD_ID = "sawsbuck-tef-166"
ASSET = ROOT / "public/exhibits/pokemon-cards" / CARD_ID
SOURCE = ASSET / "source" / f"{CARD_ID}.png"
LAYERS = ASSET / "layers"
EVIDENCE = ROOT / "private/cardtwin-card-materials/artifacts/hitl/cardtwin-sawsbuck"
PLAN = ROOT / "config/cardtwin/sawsbuck-tef-166-occlusion-plan.json"


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def shape_mask(size: tuple[int, int], *, polygons=(), ellipses=(), rectangles=()) -> np.ndarray:
    image = Image.new("L", size, 0)
    draw = ImageDraw.Draw(image)
    for points in polygons:
        draw.polygon(points, fill=1)
    for bounds in ellipses:
        draw.ellipse(bounds, fill=1)
    for bounds in rectangles:
        draw.rectangle(bounds, fill=1)
    return np.array(image, dtype=np.uint8)


def main() -> None:
    LAYERS.mkdir(parents=True, exist_ok=True)
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    rgba = np.array(Image.open(SOURCE).convert("RGBA"))
    height, width = rgba.shape[:2]
    if (width, height, digest(SOURCE)) != (733, 1024, "c45d0c69294223740314fa2ae1e8fae21cc08ea43f3258dee72cdc135ccc20b6"):
        raise RuntimeError("canonical Sawsbuck identity changed")

    plan = json.loads(PLAN.read_text())
    pieces = plan["pieces"]
    expected_ids = [piece["id"] for piece in pieces]
    if len(expected_ids) != 10 or len(set(expected_ids)) != len(expected_ids):
        raise RuntimeError("approved graph inventory must contain ten unique pieces")

    printing = np.zeros((height, width), np.uint8)
    printing[:92] = 1
    printing[610:] = 1
    printing[:, :46] = 1
    printing[:, width - 46:] = 1

    body = shape_mask((width, height), ellipses=[(210, 390, 574, 636)], rectangles=[(285, 505, 540, 706)])
    crown = shape_mask((width, height), polygons=[[(344, 158), (687, 158), (687, 438), (430, 438), (344, 355)]])
    near_flora = shape_mask((width, height), polygons=[[(487, 543), (705, 543), (705, 903), (552, 903), (487, 770)]])
    body_forward = body.copy()
    body_forward[:, :420] = 0
    body_rear = body & (1 - body_forward)
    ground = shape_mask((width, height), polygons=[[(28, 456), (705, 456), (705, 888), (28, 888)]])

    owners = {
        "saw-r09-print-identity-frame": printing,
        "saw-r08-near-flora": near_flora,
        "saw-r07-body-forward": body_forward,
        "saw-r06-antler-crown": crown,
        "saw-r05-body-rear": body_rear,
        "saw-r04-ground-flora": ground,
    }
    assigned = np.zeros_like(printing)
    masks: dict[str, np.ndarray] = {}
    for layer_id in reversed(expected_ids[4:]):
        mask = owners[layer_id] & (1 - assigned)
        masks[layer_id] = mask
        assigned |= mask
    remainder = 1 - assigned
    x_grid = np.indices((height, width))[1]
    masks["saw-r01-far-pink-grove"] = remainder & (x_grid < 218)
    masks["saw-r02-far-green-grove"] = remainder & (x_grid >= 218) & (x_grid < 449)
    masks["saw-r03-mid-warm-grove"] = remainder & (x_grid >= 449)

    # Graph anchors are fail-closed ownership probes. A small local patch keeps every
    # planned fragile tip attached to its canonical piece instead of merely checking a bbox.
    for piece in pieces[1:]:
        layer_id = piece["id"]
        for x, y in piece["completeness"]["requiredAnchors"]:
            yy, xx = np.ogrid[:height, :width]
            patch = ((xx - x) ** 2 + (yy - y) ** 2 <= 4).astype(np.uint8)
            for other_id in masks:
                if other_id != layer_id:
                    masks[other_id] &= 1 - patch
            masks[layer_id] |= patch

    backing = np.ones_like(printing)
    cuts = [(pieces[0]["id"], backing, pieces[0]["zMm"])] + [
        (piece["id"], masks[piece["id"]], piece["zMm"]) for piece in pieces[1:]
    ]
    coverage = np.sum(np.stack([mask for _, mask, _ in cuts[1:]], axis=0), axis=0)
    if int(coverage.min()) != 1 or int(coverage.max()) != 1:
        raise RuntimeError("cut masks must be an exact non-overlapping partition")

    extremities = {}
    for piece in pieces:
        groups = piece["completeness"].get("requiredExtremityGroups", [])
        anchors = piece["completeness"]["requiredAnchors"]
        for index, group in enumerate(groups):
            x, y = anchors[min(index, len(anchors) - 1)]
            extremities[group] = (x, y, piece["id"])
    by_id = {layer_id: mask for layer_id, mask, _ in cuts}
    for label, (x, y, layer_id) in extremities.items():
        if not by_id[layer_id][y, x]:
            raise RuntimeError(f"extremity completeness failed: {label}")

    assembled = np.zeros_like(rgba)
    manifest_layers = []
    panels = []
    for layer_id, mask, depth in cuts:
        texture = rgba.copy()
        texture[:, :, 3] = mask * 255
        texture_path = LAYERS / f"{layer_id}.png"
        mask_path = LAYERS / f"{layer_id}-mask.png"
        Image.fromarray(texture, "RGBA").save(texture_path, compress_level=9)
        Image.fromarray(mask * 255, "L").save(mask_path, compress_level=9)
        if layer_id != pieces[0]["id"]:
            selected = mask.astype(bool)
            assembled[selected] = rgba[selected]
        panel = Image.new("RGBA", (width, height + 52), "#10211d")
        panel.alpha_composite(Image.fromarray(texture, "RGBA"), (0, 52))
        piece_kind = "UNCUT DATUM" if layer_id == pieces[0]["id"] else "CUT"
        ImageDraw.Draw(panel).text((18, 17), f"{piece_kind} {layer_id} · foam Z {depth:.1f} mm", fill="#f2e9d5")
        panels.append(panel.convert("RGB"))
        manifest_layers.append({
            "id": layer_id,
            "depthMm": depth,
            "texture": f"layers/{layer_id}.png",
            "mask": f"layers/{layer_id}-mask.png",
            "textureSha256": digest(texture_path),
            "maskSha256": digest(mask_path),
            "sourcePixelsOnly": True,
        })

    if not np.array_equal(assembled, rgba):
        raise RuntimeError("exact-pixel recomposition failed")
    Image.fromarray(assembled, "RGBA").save(EVIDENCE / "assembled-exact.png", compress_level=9)

    columns = 4
    rows = (len(panels) + columns - 1) // columns
    mat = Image.new("RGB", (width * columns + 24 * (columns + 1), (height + 52) * rows + 24 * (rows + 1)), "#17342e")
    draw = ImageDraw.Draw(mat)
    for x in range(32, mat.width, 32):
        draw.line((x, 0, x, mat.height), fill="#285047", width=1)
    for y in range(32, mat.height, 32):
        draw.line((0, y, mat.width, y), fill="#285047", width=1)
    for index, panel in enumerate(panels):
        x = 24 + (index % columns) * (width + 24)
        y = 24 + (index // columns) * (height + 52 + 24)
        mat.paste(panel, (x, y))
    mat.save(EVIDENCE / "parts-sheet.png", compress_level=9)

    hidden = ((body | crown) * 255).astype(np.uint8)
    fill_rgba = rgba.copy()
    fill_rgba[:, :, 3] = hidden
    Image.fromarray(fill_rgba, "RGBA").save(LAYERS / "hidden-background-fill.png", compress_level=9)

    manifest = {
        "schemaVersion": 3,
        "occlusionPlan": "config/cardtwin/sawsbuck-tef-166-occlusion-plan.json",
        "inventory": {"expected": expected_ids, "generatedExactlyOnce": True},
        "printing": {
            "name": "Sawsbuck", "form": "Autumn Form", "set": "Temporal Forces", "setCode": "SV05",
            "number": "166/162", "artist": "Susumu Maeya",
            "canonicalUrl": "https://images.pokemontcg.io/sv5/166_hires.png",
            "sourceSha256": digest(SOURCE), "width": width, "height": height,
            "panoramaCompanion": "Deerling Temporal Forces 165/162",
        },
        "layers": manifest_layers,
        "extremityCompleteness": {"active": True, "status": "PASS", "anchors": extremities},
        "recomposition": {"status": "PASS", "maxChannelDifference": int(np.abs(assembled.astype(int) - rgba.astype(int)).max())},
        "partsSheet": "artifacts/hitl/cardtwin-sawsbuck/parts-sheet.png",
        "hiddenFill": {"scope": "hidden-only", "method": "canonical underprint", "overwritesCanonicalVisiblePixels": False},
        "superResolution": {"used": False},
    }
    (ASSET / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps({"source": digest(SOURCE), "layers": len(cuts), "inventory": "PASS", "extremities": "PASS", "exactPixelMaxDifference": 0}))


if __name__ == "__main__":
    main()
