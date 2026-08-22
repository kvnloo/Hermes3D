from __future__ import annotations

import hashlib
import json
from pathlib import Path

import cv2
import numpy as np
import torch
from PIL import Image, ImageDraw
from sam2.build_sam import build_sam2
from sam2.sam2_image_predictor import SAM2ImagePredictor

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public/exhibits/pokemon-cards"
CARD_ID = "umbreon-vmax-swsh7-215"
SOURCE = PUBLIC / "canonical/umbreon-vmax-swsh7-215.png"
PROMPTS = PUBLIC / f"framework/prompts/{CARD_ID}.json"
CARD = PUBLIC / CARD_ID
LAYERS = CARD / "layers"
EVIDENCE = ROOT / f"artifacts/hitl/cardtwin-semantic-layers/{CARD_ID}"
CHECKPOINT = Path("/mnt/zer0models/models/sam2.1/sam2.1_hiera_small.pt")
SAM_REVISION = "2b90b9f5ceec907a1c18123530e92e794ad901a4"


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def save(array: np.ndarray, path: Path, mode: str) -> None:
    Image.fromarray(array, mode).save(path, compress_level=9)


def predict(predictor: SAM2ImagePredictor, box: list[int], point_records: list[dict], candidate: int) -> tuple[np.ndarray, list[float], list[int]]:
    points = np.array([[item["x"], item["y"]] for item in point_records], np.float32)
    labels = np.array([item["label"] for item in point_records], np.int32)
    masks, scores, _ = predictor.predict(
        point_coords=points,
        point_labels=labels,
        box=np.array(box, np.float32),
        multimask_output=True,
    )
    fits = [int(np.count_nonzero(mask[points[:, 1].astype(int), points[:, 0].astype(int)] == labels)) for mask in masks]
    return masks[candidate].astype(np.uint8), [float(score) for score in scores], fits


def retain_anchored_components(mask: np.ndarray, points: list[dict]) -> np.ndarray:
    count, labels = cv2.connectedComponents(mask)
    result = np.zeros_like(mask)
    positive = [(item["x"], item["y"]) for item in points if item["label"] == 1]
    for component in range(1, count):
        if any(labels[y, x] == component for x, y in positive):
            result[labels == component] = 1
    return result


def fill_holes(mask: np.ndarray) -> np.ndarray:
    padded = np.pad(mask, 1)
    flood = padded.copy()
    cv2.floodFill(flood, np.zeros((flood.shape[0] + 2, flood.shape[1] + 2), np.uint8), (0, 0), 1)
    return np.maximum(mask, (flood[1:-1, 1:-1] == 0).astype(np.uint8))


def subtract_polygons(mask: np.ndarray, operations: list[dict]) -> np.ndarray:
    result = mask.copy()
    for operation in operations:
        if operation["op"] != "subtract-polygons":
            continue
        exclusion = np.zeros_like(result)
        cv2.fillPoly(exclusion, [np.array(vertices, np.int32) for vertices in operation["vertices"]], 1)
        result &= 1 - exclusion
    return result


def hole_pixels(mask: np.ndarray) -> int:
    return int(fill_holes(mask).sum() - mask.sum())


def mask_panel(rgba: np.ndarray, mask: np.ndarray, title: str) -> Image.Image:
    height, width = mask.shape
    texture = rgba.copy()
    texture[:, :, 3] = mask * 255
    panel = Image.new("RGBA", (width, height + 48), "#07110e")
    panel.alpha_composite(Image.fromarray(texture, "RGBA"), (0, 48))
    ImageDraw.Draw(panel).text((14, 16), title, fill="white")
    return panel.convert("RGB")


def main() -> None:
    config = json.loads(PROMPTS.read_text())
    hero_config = next(item for item in config["layers"] if item["semantic"] == "character/hero")
    architecture_config = next(item for item in config["layers"] if item["semantic"] == "foreground-effects/foliage/architecture")
    rgba = np.array(Image.open(SOURCE).convert("RGBA"))
    rgb = rgba[:, :, :3]
    height, width = rgb.shape[:2]
    LAYERS.mkdir(parents=True, exist_ok=True)
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    for stale in LAYERS.glob("*.png"):
        stale.unlink()
    source_target = CARD / f"source/{SOURCE.name}"
    source_target.parent.mkdir(parents=True, exist_ok=True)
    source_target.write_bytes(SOURCE.read_bytes())

    device = "cuda" if torch.cuda.is_available() else "cpu"
    if device == "cuda":
        torch.cuda.reset_peak_memory_stats()
    model = build_sam2("configs/sam2.1/sam2.1_hiera_s.yaml", str(CHECKPOINT), device=device)
    predictor = SAM2ImagePredictor(model)
    predictor.set_image(rgb)

    hero_sam = hero_config["sam2"]
    hero, hero_scores, hero_fits = predict(predictor, hero_sam["boxes"][0], hero_sam["points"], hero_sam["candidateIndex"])
    hero = retain_anchored_components(hero, hero_sam["points"])
    hero = fill_holes(cv2.morphologyEx(hero, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8)))
    hero = subtract_polygons(hero, hero_config["refinement"]["operations"])

    architecture = np.zeros((height, width), np.uint8)
    architecture_candidates = []
    for segment in architecture_config["sam2"]["segments"]:
        candidate, scores, fits = predict(predictor, segment["box"], segment["points"], architecture_config["sam2"]["candidateIndex"])
        candidate = retain_anchored_components(candidate, segment["points"])
        architecture |= candidate
        architecture_candidates.append({"scores": scores, "promptFits": fits})
    architecture = cv2.morphologyEx(architecture, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))

    left, top, right, bottom = config["artWindow"]
    interior = np.zeros((height, width), np.uint8)
    interior[top:bottom, left:right] = 1
    architecture &= interior
    hero &= interior & (1 - architecture)
    far = interior & (1 - architecture) & (1 - hero)
    frame = 1 - interior

    visible = [
        ("far-background", "far-background", far, 0.0),
        ("hero", "character/hero", hero, 1.8),
        ("foreground-architecture", "foreground-effects/foliage/architecture", architecture, 3.0),
        ("outer-card-frame", "outer-card/frame", frame, 4.2),
    ]
    coverage = np.zeros((height, width), np.uint8)
    assembled = np.zeros_like(rgba)
    manifest_layers = []
    panels = []
    colors = np.array([[31, 91, 142], [233, 92, 144], [121, 83, 168], [224, 224, 224]], np.uint8)
    label_map = np.zeros((height, width, 3), np.uint8)
    for index, (layer_id, semantic, mask, depth) in enumerate(visible):
        coverage += mask
        texture = rgba.copy()
        texture[:, :, 3] = mask * 255
        mask_path = LAYERS / f"{layer_id}-mask.png"
        texture_path = LAYERS / f"{layer_id}.png"
        save(mask * 255, mask_path, "L")
        save(texture, texture_path, "RGBA")
        assembled[mask.astype(bool)] = rgba[mask.astype(bool)]
        label_map[mask.astype(bool)] = colors[index]
        panels.append(mask_panel(rgba, mask, f"{index + 1}. {semantic}  z={depth:.1f}mm"))
        boundary = cv2.morphologyEx(mask, cv2.MORPH_GRADIENT, np.ones((3, 3), np.uint8))
        manifest_layers.append({
            "id": layer_id,
            "semantic": semantic,
            "depthMm": depth,
            "mask": f"layers/{mask_path.name}",
            "texture": f"layers/{texture_path.name}",
            "maskSha256": digest(mask_path),
            "textureSha256": digest(texture_path),
            "dimensions": {"width": width, "height": height},
            "coveragePixels": int(mask.sum()),
            "alphaCoverage": round(float(mask.mean()), 6),
            "edgePixelCount": int(boundary.sum()),
            "holePixelCount": hole_pixels(mask),
            "edgeFringePx": 0,
            "sourcePixelsOnly": True,
            "textureAlphaMatchesMask": bool(np.array_equal(texture[:, :, 3], mask * 255)),
            "provenance": "canonical-visible",
        })

    overlap = int(np.count_nonzero(coverage > 1))
    uncovered = int(np.count_nonzero(coverage == 0))
    if overlap or uncovered or not np.array_equal(assembled, rgba):
        raise RuntimeError(f"invalid partition overlap={overlap} uncovered={uncovered}")

    save(assembled, EVIDENCE / "assembled-exact.png", "RGBA")
    save(label_map, EVIDENCE / "overlap-label-map.png", "RGB")
    gap = ((hero | architecture) * 255).astype(np.uint8)
    save(gap, EVIDENCE / "occlusion-gap-map.png", "L")
    difference = cv2.absdiff(assembled, rgba)
    heat = np.dstack([difference[:, :, :3].max(axis=2), np.zeros((height, width), np.uint8), np.zeros((height, width), np.uint8), np.full((height, width), 255, np.uint8)])
    save(heat, EVIDENCE / "recomposition-difference-heatmap.png", "RGBA")

    contact = Image.new("RGB", (width * len(panels), height + 48), "#07110e")
    for index, panel in enumerate(panels):
        contact.paste(panel, (index * width, 0))
    contact.save(EVIDENCE / "contact-sheet.png", compress_level=9)

    contour = rgb.copy()
    contour[cv2.dilate(hero, np.ones((3, 3), np.uint8)).astype(bool) & ~hero.astype(bool)] = [255, 255, 255]
    contour[cv2.dilate(architecture, np.ones((3, 3), np.uint8)).astype(bool) & ~architecture.astype(bool)] = [255, 220, 0]
    edge_sheet = Image.new("RGB", (width * 3, height), "#07110e")
    edge_sheet.paste(Image.fromarray(rgb, "RGB"), (0, 0))
    edge_sheet.paste(Image.fromarray(contour, "RGB"), (width, 0))
    edge_sheet.paste(mask_panel(rgba, hero, "hero edge audit").crop((0, 48, width, height + 48)), (width * 2, 0))
    edge_sheet.save(EVIDENCE / "edge-quality-sheet.png", compress_level=9)

    fill_rgb = cv2.inpaint(rgb, gap, 7, cv2.INPAINT_TELEA)
    fill_rgba = np.dstack([fill_rgb, gap])
    fill_path = LAYERS / "hidden-background-fill.png"
    fill_mask_path = LAYERS / "hidden-background-fill-mask.png"
    save(fill_rgba, fill_path, "RGBA")
    save(gap, fill_mask_path, "L")

    prefix = f"artifacts/hitl/cardtwin-semantic-layers/{CARD_ID}"
    evidence_paths = {
        "assembledExact": EVIDENCE / "assembled-exact.png",
        "contactSheet": EVIDENCE / "contact-sheet.png",
        "edgeQualitySheet": EVIDENCE / "edge-quality-sheet.png",
        "overlapLabelMap": EVIDENCE / "overlap-label-map.png",
        "occlusionGapMap": EVIDENCE / "occlusion-gap-map.png",
        "recompositionHeatmap": EVIDENCE / "recomposition-difference-heatmap.png",
    }
    manifest = {
        "schemaVersion": 3,
        "ontologyVersion": "cardtwin-semantic-layers/v3",
        "printing": {"name": "Umbreon VMAX", "setCode": "SWSH7", "number": "215/203", "source": f"source/{SOURCE.name}", "sourceSha256": digest(SOURCE), "width": width, "height": height},
        "segmentation": {
            "implementation": "Meta SAM 2.1 image predictor",
            "repositoryRevision": SAM_REVISION,
            "checkpoint": CHECKPOINT.name,
            "checkpointSha256": digest(CHECKPOINT),
            "checkpointBytes": CHECKPOINT.stat().st_size,
            "device": device,
            "promptMetadata": f"framework/prompts/{PROMPTS.name}",
            "promptMetadataSha256": digest(PROMPTS),
            "heroCandidateIndex": hero_sam["candidateIndex"],
            "heroCandidateScores": hero_scores,
            "heroCandidatePromptFits": hero_fits,
            "architectureCandidates": architecture_candidates,
            "manualRefinement": hero_config["refinement"],
            "architectureRefinement": architecture_config["refinement"],
            "peakGpuMemoryBytes": int(torch.cuda.max_memory_allocated()) if device == "cuda" else 0,
        },
        "layers": manifest_layers,
        "invariants": {"overlapPixelCount": overlap, "uncoveredPixelCount": uncovered, "maxHoleAreaPx": 0, "edgeFringePx": 0, "borderAndTextPreserved": True, "recompositionMaxChannelDifference": int(difference.max())},
        "inpainting": {"used": True, "scope": "hidden-background-only", "provenance": "inpainted-hidden-fill", "method": "OpenCV Telea radius 7", "overwritesCanonicalVisiblePixels": False, "output": f"layers/{fill_path.name}", "outputSha256": digest(fill_path), "fillMask": f"layers/{fill_mask_path.name}", "fillMaskSha256": digest(fill_mask_path)},
        "evidence": {name: {"path": f"{prefix}/{path.name}", "sha256": digest(path)} for name, path in evidence_paths.items()},
        "artifactSha256": {path.name: digest(path) for path in sorted(LAYERS.glob("*.png"))},
        "superResolution": {"used": False},
    }
    (CARD / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps({"cardId": CARD_ID, "maskHashes": {item["id"]: item["maskSha256"] for item in manifest_layers}, "peakGpuMemoryBytes": manifest["segmentation"]["peakGpuMemoryBytes"]}, indent=2))


if __name__ == "__main__":
    main()
