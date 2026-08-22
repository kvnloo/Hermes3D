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
ASSET = ROOT / "public/exhibits/pokemon-cards/arcanine-sm1-22"
SOURCE = ASSET / "source/arcanine-sm1-22.png"
OUT = ASSET / "layers"
EVIDENCE = ROOT / "artifacts/hitl/cardtwin-arcanine"
MAKER = Path("/mnt/zer0models/project-artifacts/cardtwin-maker-blog")
CHECKPOINT = Path("/mnt/zer0models/models/sam2.1/sam2.1_hiera_small.pt")
REPO = Path("/mnt/zer0models/repos/sam2")

def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    rgba = np.array(Image.open(SOURCE).convert("RGBA"))
    rgb = rgba[:, :, :3]
    height, width = rgb.shape[:2]

    device = "cuda" if torch.cuda.is_available() else "cpu"
    if device == "cuda":
        torch.cuda.reset_peak_memory_stats()
    model = build_sam2("configs/sam2.1/sam2.1_hiera_s.yaml", str(CHECKPOINT), device=device)
    predictor = SAM2ImagePredictor(model)
    predictor.set_image(rgb)
    # Dense prompts deliberately cover the complete silhouette: ears/crown/mane,
    # face, tail, torso and each leg. Negatives pin sky, shore and foliage gaps.
    points = np.array([
        # Positive silhouette anchors: tail, back, crown/ears, muzzle, mane,
        # torso, all four visible legs and paws.
        [105, 225], [150, 185], [220, 175], [315, 185], [380, 145],
        [430, 145], [485, 170], [540, 205], [475, 255], [420, 300],
        [350, 310], [285, 325], [225, 360], [185, 400], [270, 425],
        [350, 390], [430, 410], [500, 385], [545, 430], [385, 455],
        # Negative anchors: sky/ocean/coastline and lower/side foliage.
        [85, 185], [335, 125], [590, 170], [610, 255], [570, 305],
        [590, 365], [650, 420], [610, 470], [470, 470], [300, 480],
        [120, 460], [75, 390],
    ], dtype=np.float32)
    labels = np.array([1] * 20 + [0] * 12, dtype=np.int32)
    masks, scores, _ = predictor.predict(
        point_coords=points,
        point_labels=labels,
        box=np.array([70, 120, 615, 475], dtype=np.float32),
        multimask_output=True,
    )
    # SAM's predicted IoU can prefer the whole illustration over the prompted
    # subject. Deterministically rank candidates by the checked-in point labels
    # first, then use predicted IoU only as the tie-breaker.
    prompt_fit = []
    for candidate in masks:
        sampled = candidate[points[:, 1].astype(int), points[:, 0].astype(int)]
        prompt_fit.append(int(np.count_nonzero(sampled == labels)))
    candidate_areas = [int(np.count_nonzero(candidate)) for candidate in masks]
    # One additional matched prompt is not worth swallowing a large connected
    # region of ocean/coast. The fixed 40k-pixel tradeoff is recorded here so
    # reruns do not depend on a human choosing among model candidates.
    selected = max(range(len(masks)), key=lambda index: (prompt_fit[index] * 40_000 - candidate_areas[index], float(scores[index])))
    hero = masks[selected].astype(np.uint8)
    candidate_sheet = Image.new("RGB", (width * len(masks), height), "#08100f")
    for index, candidate in enumerate(masks):
        preview = rgba.copy()
        preview[:, :, 3] = candidate.astype(np.uint8) * 255
        panel = Image.new("RGBA", (width, height), "#08100f")
        panel.alpha_composite(Image.fromarray(preview, "RGBA"))
        ImageDraw.Draw(panel).text((16, 16), f"candidate {index} fit={prompt_fit[index]}/{len(labels)} iou={scores[index]:.3f}", fill="white")
        candidate_sheet.paste(panel.convert("RGB"), (index * width, 0))
    candidate_sheet.save(EVIDENCE / "sam-candidate-sheet.png", compress_level=9)
    # Discard disconnected scenery fragments: a retained component must contain
    # at least one checked-in positive subject anchor.
    component_count, component_labels = cv2.connectedComponents(hero)
    retained = np.zeros_like(hero)
    for component in range(1, component_count):
        if any(component_labels[int(y), int(x)] == component for x, y in points[:20]):
            retained[component_labels == component] = 1
    hero = cv2.morphologyEx(retained, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
    # A paper cutout cannot contain accidental transparent islands.
    flood = hero.copy()
    padded = np.pad(flood, 1)
    ff = padded.copy()
    cv2.floodFill(ff, np.zeros((ff.shape[0] + 2, ff.shape[1] + 2), np.uint8), (0, 0), 1)
    hero = np.maximum(hero, (ff[1:-1, 1:-1] == 0).astype(np.uint8))

    art = np.zeros((height, width), dtype=np.uint8)
    art[176:606, 66:668] = 1
    hero &= art
    foreground_points = np.array([[120, 555], [235, 566], [590, 555], [350, 570], [350, 455], [460, 430]], dtype=np.float32)
    foreground_labels = np.array([1, 1, 1, 1, 0, 0], dtype=np.int32)
    foreground_masks, foreground_scores, _ = predictor.predict(
        point_coords=foreground_points,
        point_labels=foreground_labels,
        box=np.array([68, 475, 666, 604], dtype=np.float32),
        multimask_output=True,
    )
    foreground = foreground_masks[int(np.argmax(foreground_scores))].astype(np.uint8) & art & (1 - hero)
    foreground = cv2.morphologyEx(foreground, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    foreground &= art & (1 - hero)
    remaining = art & (1 - hero) & (1 - foreground)
    sky = remaining.copy()
    sky[355:, :] = 0
    ground = remaining.copy()
    ground[:355, :] = 0
    ground[:, :115] = 0
    ground[:, 620:] = 0
    trees = remaining & (1 - sky) & (1 - ground)
    frame = 1 - art

    visible_layers = [
        ("deepest-sky-base", sky, 0.0),
        ("snow-ground", ground, 0.9),
        ("edge-trees", trees, 1.8),
        ("hero", hero, 2.8),
        ("nearest-foreground", foreground, 3.6),
        ("outer-frame-text", frame, 4.2),
    ]
    fill_mask = ((hero | foreground) * 255).astype(np.uint8)
    filled_rgb = cv2.inpaint(rgb, fill_mask, 7, cv2.INPAINT_TELEA)
    filled_rgba = np.dstack([filled_rgb, np.full((height, width), 255, dtype=np.uint8)])
    filled_rgba[:, :, 3] = art * 255
    fill_path = OUT / "hidden-background-fill.png"
    Image.fromarray(filled_rgba, "RGBA").save(fill_path, compress_level=9)
    manifest_layers = []
    assembled = np.zeros_like(rgba)
    coverage = np.zeros((height, width), dtype=np.uint8)
    panels = []
    for layer_id, mask, depth in visible_layers:
        coverage += mask
        texture = rgba.copy()
        texture_alpha = mask * 255
        texture[:, :, 3] = texture_alpha
        mask_path = OUT / f"{layer_id}-mask.png"
        texture_path = OUT / f"{layer_id}.png"
        Image.fromarray(mask * 255, "L").save(mask_path, compress_level=9)
        Image.fromarray(texture, "RGBA").save(texture_path, compress_level=9)
        assembled[mask.astype(bool)] = rgba[mask.astype(bool)]
        panel = Image.new("RGBA", (width, height + 54), "#08100f")
        panel.alpha_composite(Image.fromarray(texture), (0, 54))
        draw = ImageDraw.Draw(panel)
        draw.text((18, 17), f"{layer_id}  z={depth:.1f}mm", fill="white")
        panels.append(panel.convert("RGB"))
        manifest_layers.append({
            "id": layer_id,
            "depthMm": depth,
            "mask": f"layers/{mask_path.name}",
            "texture": f"layers/{texture_path.name}",
            "maskSha256": digest(mask_path),
            "alphaCoverage": round(float(mask.mean()), 6),
            "sourcePixelsOnly": True,
            "textureAlphaMatchesMask": bool(np.array_equal(texture_alpha > 0, mask > 0)),
        })

    if coverage.min() != 1 or coverage.max() != 1:
        raise RuntimeError(f"Layer partition invalid: range {coverage.min()}..{coverage.max()}")
    if not np.array_equal(assembled, rgba):
        raise RuntimeError("Assembled semantic layers do not reproduce exact source pixels")
    Image.fromarray(assembled).save(EVIDENCE / "assembled-exact.png", compress_level=9)
    gap = (hero | foreground).astype(np.uint8) * 255
    Image.fromarray(gap, "L").save(EVIDENCE / "occlusion-gap-map.png", compress_level=9)
    sheet = Image.new("RGB", (width * len(panels), height + 54), "#08100f")
    for index, panel in enumerate(panels):
        sheet.paste(panel, (index * width, 0))
    sheet.save(EVIDENCE / "exploded-layers.png", compress_level=9)
    label_colors = np.array([[35, 84, 150], [105, 173, 215], [47, 123, 74], [231, 112, 60], [246, 205, 67], [220, 220, 220]], dtype=np.uint8)
    label_map = np.zeros((height, width, 3), dtype=np.uint8)
    for index, (_, mask, _) in enumerate(visible_layers):
        label_map[mask.astype(bool)] = label_colors[index]
    overlap_path = EVIDENCE / "overlap-label-map.png"
    Image.fromarray(label_map, "RGB").save(overlap_path, compress_level=9)

    # One approval packet: maker sequence | canonical | six numbered cuts,
    # followed by native-coordinate crown/mane/ear edge zooms and exact diff.
    col_w, row_h = 734, 1024
    packet = Image.new("RGB", (col_w * 3, row_h + 340), "#08100f")
    maker_strip = Image.new("RGB", (col_w, row_h), "#161616")
    for i in range(1, 8):
        ref = Image.open(MAKER / f"step-{i:02d}.jpg").convert("RGB")
        ref.thumbnail((col_w // 2 - 12, row_h // 4 - 12))
        maker_strip.paste(ref, (((i - 1) % 2) * col_w // 2, ((i - 1) // 2) * row_h // 4))
    packet.paste(maker_strip, (0, 0))
    packet.paste(Image.fromarray(rgb, "RGB"), (col_w, 0))
    cuts = Image.new("RGB", (col_w, row_h), "#08100f")
    for i, panel in enumerate(panels):
        thumb = panel.copy(); thumb.thumbnail((col_w // 3, row_h // 2))
        cuts.paste(thumb, ((i % 3) * col_w // 3, (i // 3) * row_h // 2))
    packet.paste(cuts, (col_w * 2, 0))
    zoom_boxes = [(340, 215, 470, 345), (430, 260, 590, 420), (300, 225, 460, 365)]
    hero_rgba = Image.open(OUT / "hero.png").convert("RGBA")
    for i, box in enumerate(zoom_boxes):
        zoom = hero_rgba.crop(box).resize((300, 300), Image.Resampling.NEAREST)
        bg = Image.new("RGBA", zoom.size, "#1a2523"); bg.alpha_composite(zoom)
        packet.paste(bg.convert("RGB"), (30 + i * 330, row_h + 20))
    difference = cv2.absdiff(assembled, rgba)
    heat = np.zeros((height, width, 4), dtype=np.uint8)
    heat[:, :, 0] = difference[:, :, :3].max(axis=2)
    heat[:, :, 3] = 255
    heatmap_path = EVIDENCE / "recomposition-difference-heatmap.png"
    Image.fromarray(heat, "RGBA").save(heatmap_path, compress_level=9)
    packet.paste(Image.fromarray(assembled, "RGBA").convert("RGB").resize((220, 307)), (col_w * 2 - 470, row_h + 20))
    packet.paste(Image.fromarray(heat, "RGBA").convert("RGB").resize((220, 307)), (col_w * 2 - 230, row_h + 20))
    packet.save(EVIDENCE / "maker-sequence-approval-packet.png", compress_level=9)

    manifest = {
        "schemaVersion": 1,
        "ontologyVersion": "cardtwin-semantic-layers/v1",
        "printing": {
            "name": "Arcanine", "set": "Sun & Moon", "setCode": "SM1", "number": "22/149",
            "canonicalUrl": "https://images.pokemontcg.io/sm1/22_hires.png",
            "sourceSha256": digest(SOURCE), "width": width, "height": height,
        },
        "segmentation": {
            "implementation": "Meta SAM 2.1 image predictor", "repository": "https://github.com/facebookresearch/sam2",
            "revision": "2b90b9f5ceec907a1c18123530e92e794ad901a4", "license": "Apache-2.0",
            "checkpoint": CHECKPOINT.name, "checkpointSha256": digest(CHECKPOINT),
            "checkpointBytes": CHECKPOINT.stat().st_size, "device": device,
            "prompt": {"box": [70, 120, 615, 475], "points": points.tolist(), "labels": labels.tolist()},
            "selectedCandidate": selected, "candidatePromptFit": prompt_fit, "candidateAreasPx": candidate_areas,
            "peakGpuMemoryBytes": int(torch.cuda.max_memory_allocated()) if device == "cuda" else 0,
            "foregroundPrompt": {"box": [68, 475, 666, 604], "points": foreground_points.tolist(), "labels": foreground_labels.tolist()},
            "manualRefinement": "Deterministic art-window partition after separate SAM hero and foreground predictions; 1px alpha feather retains canonical RGB.",
        },
        "layers": manifest_layers,
        "makerReference": {"source": "https://ameblo.jp/trtyin715/entry-12679345427.html", "manifestSha256": digest(MAKER / "manifest.json"), "roles": [item[0] for item in visible_layers]},
        "semanticPartition": {"overlapPixelCount": int(np.count_nonzero(coverage > 1)), "overlapLabelMap": "artifacts/hitl/cardtwin-arcanine/overlap-label-map.png"},
        "inpainting": {"used": True, "scope": "hidden-background-only", "method": "OpenCV Telea radius 7", "output": f"layers/{fill_path.name}", "overwritesCanonicalVisiblePixels": False},
        "superResolution": {"used": False},
        "occlusionGapMap": "artifacts/hitl/cardtwin-arcanine/occlusion-gap-map.png",
        "recomposition": {"maxChannelDifference": int(difference.max()), "heatmap": "artifacts/hitl/cardtwin-arcanine/recomposition-difference-heatmap.png"},
        "reducedMotion": {"tiltScale": 0},
    }
    (ASSET / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")

if __name__ == "__main__":
    main()
