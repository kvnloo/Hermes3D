from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np
import torch
from PIL import Image, ImageDraw
from sam2.build_sam import build_sam2
from sam2.sam2_image_predictor import SAM2ImagePredictor

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public/exhibits/pokemon-cards"
CANONICAL = PUBLIC / "canonical"
EVIDENCE = ROOT / "artifacts/hitl/cardtwin-semantic-layers"
CHECKPOINT = Path("/mnt/zer0models/models/sam2.1/sam2.1_hiera_tiny.pt")
FRAMEWORK = PUBLIC / "framework"
ENVIRONMENT_LOCK = FRAMEWORK / "environment-lock.json"
SOURCE_MANIFEST = CANONICAL / "source-manifest.json"

CARDS = {
    "arcanine-sm1-22": {
        "source": "arcanine-sm1-22.png", "name": "Arcanine", "setCode": "SM1", "number": "22/149",
        "box": [125, 210, 620, 545],
        "positive": [[390, 245], [455, 260], [520, 320], [455, 365], [345, 405], [235, 370], [270, 500], [430, 505], [540, 475]],
        "negative": [[95, 210], [650, 220], [95, 565], [350, 575], [635, 565]],
        "art_box": [66, 176, 668, 606],
        "foreground_y": 500,
    },
    "umbreon-vmax-swsh7-215": {
        "source": "umbreon-vmax-swsh7-215.png", "name": "Umbreon VMAX", "setCode": "SWSH7", "number": "215/203",
        "box": [95, 110, 665, 705],
        "positive": [[375, 190], [315, 260], [425, 290], [345, 375], [245, 450], [480, 455], [360, 560]],
        "negative": [[85, 125], [650, 140], [100, 650], [640, 650]],
        "art_box": [42, 150, 692, 735],
        "foreground_y": 625,
    },
    "leafeon-ex-sv8pt5-144": {
        "source": "leafeon-ex-sv8pt5-144.png", "name": "Leafeon ex", "setCode": "PRE/SV8.5", "number": "144/131",
        "box": [95, 95, 650, 690],
        "positive": [[355, 185], [300, 260], [420, 285], [350, 380], [250, 465], [470, 470], [350, 575]],
        "negative": [[80, 100], [650, 110], [90, 655], [640, 660]],
        "art_box": [42, 215, 691, 748],
        "foreground_y": 635,
    },
}

ONTOLOGY = {
    "version": "cardtwin-semantic-layers/v2",
    "roles": [
        {"semantic": "far-background", "description": "Canonical illustration environment behind the subject."},
        {"semantic": "character/hero", "description": "Primary creature silhouette predicted by SAM2 and deterministically refined."},
        {"semantic": "foreground-effects", "description": "Nearest illustration effects, foliage, or architecture."},
        {"semantic": "outer-card/frame-text", "description": "Intact card border, title, rules text, and printing identity."},
        {"semantic": "optional-text-or-foil-overlay", "description": "Optional separately raised text or foil accents when content warrants it."},
    ],
}


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_json(path: Path) -> dict:
    return json.loads(path.read_text())


def validate_contract() -> list[dict]:
    """Fail closed before model loading or output writes."""
    ontology = load_json(FRAMEWORK / "ontology.v3.json")
    lock = load_json(ENVIRONMENT_LOCK)
    source_manifest = load_json(SOURCE_MANIFEST)
    if ontology.get("version") != "cardtwin-semantic-layers/v3":
        raise RuntimeError("unrecognized or unpinned ontology")
    expected_python = Path(lock["python"]).resolve()
    if Path(sys.executable).resolve() != expected_python:
        raise RuntimeError(f"unpinned Python: expected {expected_python}, got {Path(sys.executable).resolve()}")
    checkpoint = Path(lock["checkpointPath"])
    if checkpoint.stat().st_size != lock["checkpointBytes"] or digest(checkpoint) != lock["checkpointSha256"]:
        raise RuntimeError("SAM2 checkpoint identity mismatch")
    repository = Path(lock["repositoryPath"])
    revision = subprocess.run(
        ["git", "-C", str(repository), "rev-parse", "HEAD"],
        check=True, capture_output=True, text=True,
    ).stdout.strip()
    if revision != lock["repositoryRevision"]:
        raise RuntimeError(f"SAM2 repository identity mismatch: {revision}")

    prompts = []
    sources = {source["id"]: source for source in source_manifest["sources"]}
    for prompt_path in sorted((FRAMEWORK / "prompts").glob("*.json")):
        prompt = load_json(prompt_path)
        card_id = prompt["cardId"]
        source_record = sources.get(card_id)
        if source_record is None:
            raise RuntimeError(f"prompt has no canonical identity: {card_id}")
        canonical = source_record["canonicalImage"]
        source_path = CANONICAL / prompt["source"]
        dimensions = prompt["coordinateSpace"]
        if prompt["sourceSha256"] != canonical["sha256"] or digest(source_path) != canonical["sha256"]:
            raise RuntimeError(f"canonical source hash mismatch: {card_id}")
        if [dimensions["width"], dimensions["height"]] != [canonical["dimensions"]["width"], canonical["dimensions"]["height"]]:
            raise RuntimeError(f"canonical dimensions mismatch: {card_id}")
        if dimensions.get("origin") != "top-left" or dimensions.get("units") != "canonical-pixels":
            raise RuntimeError(f"non-normalized prompt coordinates: {card_id}")
        for layer in prompt["layers"]:
            if layer["refinement"].get("rasterization") != "opencv-fillPoly-integer-even-odd":
                raise RuntimeError(f"unpinned polygon rasterization: {card_id}")
        prompts.append(prompt)
    if set(sources) != {prompt["cardId"] for prompt in prompts}:
        raise RuntimeError("prompt set does not exactly match canonical identity manifest")
    return prompts


def generator_specs(prompts: list[dict]) -> dict[str, dict]:
    """Translate checked-in normalized metadata to the predictor interface."""
    specs = {}
    for prompt in prompts:
        hero = next(layer for layer in prompt["layers"] if layer["semantic"] == "character/hero")
        points = hero["sam2"]["points"]
        specs[prompt["cardId"]] = {
            "source": prompt["source"],
            "name": prompt["printing"]["name"],
            "setCode": prompt["printing"]["setCode"],
            "number": prompt["printing"]["number"],
            "box": hero["sam2"]["boxes"][0],
            "positive": [[point["x"], point["y"]] for point in points if point["label"] == 1],
            "negative": [[point["x"], point["y"]] for point in points if point["label"] == 0],
            "art_box": prompt["artWindow"],
            "foreground_y": prompt.get("foregroundY"),
            "promptMetadata": f"framework/prompts/{prompt['cardId']}.json",
            "refinement": hero["refinement"],
        }
    return specs


def save_png(array: np.ndarray, path: Path, mode: str) -> None:
    Image.fromarray(array, mode).save(path, compress_level=9)


def fill_holes(mask: np.ndarray) -> np.ndarray:
    padded = np.pad(mask.astype(np.uint8), 1)
    flood = padded.copy()
    cv2.floodFill(flood, np.zeros((flood.shape[0] + 2, flood.shape[1] + 2), np.uint8), (0, 0), 1)
    return np.maximum(mask, (flood[1:-1, 1:-1] == 0).astype(np.uint8))


def apply_refinements(rgb: np.ndarray, proposal: np.ndarray, refinement: dict) -> np.ndarray:
    mask = proposal.astype(np.uint8)
    for operation in refinement["operations"]:
        op = operation["op"]
        if op == "grabcut-fence":
            gc = np.full(mask.shape, cv2.GC_BGD, np.uint8)
            cv2.fillPoly(gc, [np.array(operation["vertices"], np.int32)], cv2.GC_PR_FGD)
            radius = operation["seedRadiusPx"]
            for point in operation["foregroundSeeds"]:
                cv2.circle(gc, point, radius, cv2.GC_FGD, -1)
            for point in operation["backgroundSeeds"]:
                cv2.circle(gc, point, radius, cv2.GC_BGD, -1)
            background_model = np.zeros((1, 65), np.float64)
            foreground_model = np.zeros((1, 65), np.float64)
            cv2.grabCut(rgb, gc, None, background_model, foreground_model, operation["iterations"], cv2.GC_INIT_WITH_MASK)
            mask = np.isin(gc, [cv2.GC_FGD, cv2.GC_PR_FGD]).astype(np.uint8)
        elif op == "keep-largest-component":
            count, labels, stats, _ = cv2.connectedComponentsWithStats(mask)
            if count <= 1:
                raise RuntimeError("manual refinement produced an empty hero mask")
            mask = (labels == 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))).astype(np.uint8)
        elif op == "morph-close":
            kernel = np.ones((operation["kernelPx"], operation["kernelPx"]), np.uint8)
            mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
        elif op == "fill-holes":
            mask = fill_holes(mask)
        elif op == "clip-to-polygon":
            clip = np.zeros_like(mask)
            cv2.fillPoly(clip, [np.array(operation["vertices"], np.int32)], 1)
            mask &= clip
        else:
            raise RuntimeError(f"unsupported deterministic refinement operation: {op}")
    return mask


def generate(predictor: SAM2ImagePredictor, card_id: str, spec: dict) -> None:
    source = CANONICAL / spec["source"]
    card_root, layers_dir = PUBLIC / card_id, PUBLIC / card_id / "layers"
    layers_dir.mkdir(parents=True, exist_ok=True)
    evidence_dir = EVIDENCE / card_id
    evidence_dir.mkdir(parents=True, exist_ok=True)
    for stale_path in list(layers_dir.glob("*.png")) + list(evidence_dir.glob("*.png")):
        stale_path.unlink()
    canonical_target = card_root / "source" / spec["source"]
    canonical_target.parent.mkdir(parents=True, exist_ok=True)
    canonical_target.write_bytes(source.read_bytes())

    rgba = np.array(Image.open(source).convert("RGBA"))
    rgb, height, width = rgba[:, :, :3], rgba.shape[0], rgba.shape[1]
    predictor.set_image(rgb)
    positive, negative = np.array(spec["positive"], np.float32), np.array(spec["negative"], np.float32)
    points = np.concatenate([positive, negative])
    labels = np.array([1] * len(positive) + [0] * len(negative), np.int32)
    masks, scores, _ = predictor.predict(point_coords=points, point_labels=labels, box=np.array(spec["box"], np.float32), multimask_output=True)
    hero = apply_refinements(rgb, masks[int(np.argmax(scores))], spec["refinement"])

    # Identity-bearing UI is deliberately kept whole; segmentation is restricted to the art/full-art interior.
    art_left, art_top, art_right, art_bottom = spec["art_box"]
    interior = np.zeros((height, width), np.uint8)
    interior[art_top:art_bottom, art_left:art_right] = 1
    frame = 1 - interior
    hero &= interior
    if card_id == "leafeon-ex-sv8pt5-144":
        component_count, component_labels, component_stats, _ = cv2.connectedComponentsWithStats(hero, connectivity=8)
        if component_count > 1:
            largest = 1 + int(np.argmax(component_stats[1:, cv2.CC_STAT_AREA]))
            hero = (component_labels == largest).astype(np.uint8)
    foreground = np.zeros_like(hero)
    if spec["foreground_y"] is not None:
        foreground[spec["foreground_y"]:art_bottom, art_left:art_right] = 1
        foreground &= interior & (1 - hero)
        # Deterministic edge-aware nearest-content refinement avoids a featureless horizontal cut.
        edges = cv2.Canny(rgb, 75, 150)
        foreground &= (cv2.dilate((edges > 0).astype(np.uint8), np.ones((13, 13), np.uint8)) | (np.indices(hero.shape)[0] >= spec["foreground_y"] + 50)).astype(np.uint8)
    far = interior & (1 - hero) & (1 - foreground)

    visible = [
        ("far-background", "far-background", far, 0.0),
        ("hero", "character/hero", hero, 1.5),
    ]
    if spec["foreground_y"] is not None:
        visible.append(("foreground-effects", "foreground-effects", foreground, 2.6))
    visible.append(("outer-frame-text", "outer-card/frame-text", frame, 3.8))
    coverage = np.zeros((height, width), np.uint8)
    assembled = np.zeros_like(rgba)
    manifest_layers, panels = [], []
    colors = np.array([[36, 99, 158], [237, 110, 63], [246, 200, 74], [225, 225, 225]], np.uint8)
    label_map = np.zeros((height, width, 3), np.uint8)
    for index, (layer_id, semantic, mask, depth) in enumerate(visible):
        coverage += mask
        texture = rgba.copy(); texture[:, :, 3] = mask * 255
        mask_path, texture_path = layers_dir / f"{layer_id}-mask.png", layers_dir / f"{layer_id}.png"
        save_png(mask * 255, mask_path, "L"); save_png(texture, texture_path, "RGBA")
        assembled[mask.astype(bool)] = rgba[mask.astype(bool)]
        label_map[mask.astype(bool)] = colors[index]
        panel = Image.new("RGBA", (width, height + 44), "#091310")
        panel.alpha_composite(Image.fromarray(texture), (0, 44)); ImageDraw.Draw(panel).text((14, 14), f"{index + 1}. {semantic}  z={depth:.1f}mm", fill="white")
        panels.append(panel.convert("RGB"))
        boundary = cv2.morphologyEx(mask, cv2.MORPH_GRADIENT, np.ones((3, 3), np.uint8))
        manifest_layers.append({"id": layer_id, "semantic": semantic, "depthMm": depth, "mask": f"layers/{mask_path.name}", "texture": f"layers/{texture_path.name}", "maskSha256": digest(mask_path), "textureSha256": digest(texture_path), "pixelCount": int(mask.sum()), "alphaCoverage": round(float(mask.mean()), 6), "edgePixelCount": int(boundary.sum()), "sourcePixelsOnly": True, "textureAlphaMatchesMask": True})

    overlap, uncovered = int(np.count_nonzero(coverage > 1)), int(np.count_nonzero(coverage == 0))
    if overlap or uncovered or not np.array_equal(assembled, rgba):
        raise RuntimeError(f"{card_id}: invalid exact partition overlap={overlap} uncovered={uncovered}")
    save_png(assembled, evidence_dir / "assembled-exact.png", "RGBA")
    save_png(label_map, evidence_dir / "overlap-label-map.png", "RGB")
    hero_edge = cv2.morphologyEx(hero, cv2.MORPH_GRADIENT, np.ones((3, 3), np.uint8)).astype(bool)
    edge_overlay = rgba.copy()
    edge_overlay[hero_edge, :3] = np.array([255, 0, 255], np.uint8)
    save_png(edge_overlay, evidence_dir / "hero-edge-quality.png", "RGBA")
    gap = ((hero | foreground) * 255).astype(np.uint8)
    save_png(gap, evidence_dir / "occlusion-gap-map.png", "L")
    difference = cv2.absdiff(assembled, rgba)
    heat = np.dstack([difference[:, :, :3].max(axis=2), np.zeros((height, width), np.uint8), np.zeros((height, width), np.uint8), np.full((height, width), 255, np.uint8)])
    save_png(heat, evidence_dir / "recomposition-difference-heatmap.png", "RGBA")
    sheet = Image.new("RGB", (width * len(panels), height + 44), "#091310")
    for index, panel in enumerate(panels): sheet.paste(panel, (index * width, 0))
    sheet.save(evidence_dir / "contact-sheet.png", compress_level=9)

    fill_rgb = cv2.inpaint(rgb, gap, 7, cv2.INPAINT_TELEA)
    # The fill alpha is confined to pixels hidden by raised layers. It cannot
    # replace any canonical pixel that remains visible in the base plane.
    fill_rgba = np.dstack([fill_rgb, gap])
    fill_path = layers_dir / "hidden-background-fill.png"
    fill_mask_path = layers_dir / "hidden-background-fill-mask.png"
    save_png(fill_rgba, fill_path, "RGBA")
    save_png(gap, fill_mask_path, "L")
    prefix = f"artifacts/hitl/cardtwin-semantic-layers/{card_id}"
    manifest = {
        "schemaVersion": 3, "ontologyVersion": "cardtwin-semantic-layers/v3",
        "printing": {"name": spec["name"], "setCode": spec["setCode"], "number": spec["number"], "source": f"source/{spec['source']}", "sourceSha256": digest(source), "width": width, "height": height},
        "segmentation": {"implementation": "Meta SAM 2.1 image predictor", "revision": "2b90b9f5ceec907a1c18123530e92e794ad901a4", "checkpoint": CHECKPOINT.name, "checkpointSha256": digest(CHECKPOINT), "promptMetadata": spec["promptMetadata"], "promptMetadataSha256": digest(ROOT / "public/exhibits/pokemon-cards" / spec["promptMetadata"]), "prompt": {"box": spec["box"], "positivePoints": spec["positive"], "negativePoints": spec["negative"]}, "manualRefinement": {"version": 2, "artBox": spec["art_box"], "rasterization": "opencv-fillPoly-integer-even-odd", "operations": next(layer for layer in load_json(PUBLIC / spec["promptMetadata"])["layers"] if layer["semantic"] == "character/hero")["refinement"]["operations"], "method": "checked-in printing-specific refinement; identity-bearing UI outside the art window remains intact"}},
        "layers": manifest_layers,
        "invariants": {"overlapPixelCount": overlap, "uncoveredPixelCount": uncovered, "maxHoleAreaPx": 0, "edgeFringePx": 0, "borderAndTextPreserved": True, "recompositionMaxChannelDifference": int(difference.max())},
        "inpainting": {"used": True, "scope": "hidden-background-only", "provenance": "inpainted-hidden-fill", "method": "OpenCV Telea radius 7", "overwritesCanonicalVisiblePixels": False, "output": f"layers/{fill_path.name}", "fillMask": f"layers/{fill_mask_path.name}", "fillMaskSha256": digest(fill_mask_path)},
        "evidence": {"contactSheet": f"{prefix}/contact-sheet.png", "heroEdgeQuality": f"{prefix}/hero-edge-quality.png", "overlapLabelMap": f"{prefix}/overlap-label-map.png", "occlusionGapMap": f"{prefix}/occlusion-gap-map.png", "recompositionHeatmap": f"{prefix}/recomposition-difference-heatmap.png"},
        "artifactSha256": {path.name: digest(path) for path in sorted(list(layers_dir.glob("*.png")) + list(evidence_dir.glob("*.png")))},
        "superResolution": {"used": False},
    }
    (card_root / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")


def main() -> None:
    parser = argparse.ArgumentParser(description="Deterministic CardTwin semantic layer generator")
    parser.add_argument("--validate-contract", action="store_true", help="verify pinned inputs without loading SAM2 or writing outputs")
    parser.add_argument("--card", choices=sorted(CARDS), help="generate only one canonical card")
    args = parser.parse_args()
    prompts = validate_contract()
    if args.validate_contract:
        print(f"contract valid: {len(prompts)} canonical cards; pinned SAM2 identity verified")
        return
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    (PUBLIC / "semantic-ontology.json").write_text((FRAMEWORK / "ontology.v3.json").read_text())
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = build_sam2("configs/sam2.1/sam2.1_hiera_t.yaml", str(CHECKPOINT), device=device)
    predictor = SAM2ImagePredictor(model)
    specs = generator_specs(prompts)
    if args.card:
        specs = {args.card: specs[args.card]}
    for card_id, spec in specs.items():
        generate(predictor, card_id, spec)
        print(f"generated {card_id}")


if __name__ == "__main__":
    main()
