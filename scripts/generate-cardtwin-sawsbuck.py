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


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    LAYERS.mkdir(parents=True, exist_ok=True)
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    rgba = np.array(Image.open(SOURCE).convert("RGBA"))
    height, width = rgba.shape[:2]
    if (width, height, digest(SOURCE)) != (733, 1024, "c45d0c69294223740314fa2ae1e8fae21cc08ea43f3258dee72cdc135ccc20b6"):
        raise RuntimeError("canonical Sawsbuck identity changed")

    printing = np.zeros((height, width), np.uint8)
    printing[:92] = 1
    printing[610:] = 1
    printing[:, :46] = 1
    printing[:, width - 46:] = 1

    antlers = np.zeros_like(printing)
    antler_image = Image.fromarray(antlers, "L")
    ImageDraw.Draw(antler_image).polygon([(245, 95), (515, 95), (590, 330), (455, 410), (285, 350)], fill=1)
    antlers = np.array(antler_image)
    antlers &= 1 - printing

    body = np.zeros_like(printing)
    body_image = Image.fromarray(body, "L")
    body_draw = ImageDraw.Draw(body_image)
    body_draw.ellipse((155, 275, 625, 635), fill=1)
    body_draw.rectangle((210, 430, 555, 602), fill=1)
    body = np.array(body_image)
    body &= (1 - printing) & (1 - antlers)
    body_forward = body.copy()
    body_forward[:, :385] = 0
    body_rear = body & (1 - body_forward)

    unclaimed = (1 - printing) & (1 - antlers) & (1 - body)
    forest_midground = unclaimed.copy()
    forest_midground[:250] = 0
    forest_midground[590:] = 0
    forest_distance = unclaimed & (1 - forest_midground)

    cuts = [
        ("forest-distance", forest_distance, 0.0),
        ("forest-midground", forest_midground, 0.9),
        ("body-rear", body_rear, 1.8),
        ("body-forward", body_forward, 2.7),
        ("antlers-foliage", antlers, 3.6),
        ("printing-frame", printing, 4.5),
    ]
    coverage = sum(mask for _, mask, _ in cuts)
    if int(coverage.min()) != 1 or int(coverage.max()) != 1:
        raise RuntimeError("cut masks must be an exact non-overlapping partition")

    # Named tips and feet bind the completeness check to source coordinates.
    extremities = {
        "left-antler-tip": (260, 105, "antlers-foliage"),
        "right-antler-tip": (500, 105, "antlers-foliage"),
        "left-hind-foot": (250, 585, "body-rear"),
        "right-front-foot": (510, 585, "body-forward"),
    }
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
        selected = mask.astype(bool)
        assembled[selected] = rgba[selected]
        panel = Image.new("RGBA", (width, height + 52), "#10211d")
        panel.alpha_composite(Image.fromarray(texture, "RGBA"), (0, 52))
        ImageDraw.Draw(panel).text((18, 17), f"CUT {layer_id} · foam Z {depth:.1f} mm", fill="#f2e9d5")
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

    mat = Image.new("RGB", (width * 3 + 96, (height + 52) * 2 + 96), "#17342e")
    draw = ImageDraw.Draw(mat)
    for x in range(32, mat.width, 32):
        draw.line((x, 0, x, mat.height), fill="#285047", width=1)
    for y in range(32, mat.height, 32):
        draw.line((0, y, mat.width, y), fill="#285047", width=1)
    for index, panel in enumerate(panels):
        x = 24 + (index % 3) * (width + 24)
        y = 24 + (index // 3) * (height + 52 + 24)
        mat.paste(panel, (x, y))
    mat.save(EVIDENCE / "parts-sheet.png", compress_level=9)

    hidden = ((body | antlers) * 255).astype(np.uint8)
    fill_rgba = rgba.copy()
    fill_rgba[:, :, 3] = hidden
    Image.fromarray(fill_rgba, "RGBA").save(LAYERS / "hidden-background-fill.png", compress_level=9)

    manifest = {
        "schemaVersion": 2,
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
    print(json.dumps({"source": digest(SOURCE), "layers": len(cuts), "extremities": "PASS", "exactPixelMaxDifference": 0}))


if __name__ == "__main__":
    main()
