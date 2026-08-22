from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import torch
from PIL import Image, ImageDraw
from sam2.build_sam import build_sam2
from sam2.sam2_image_predictor import SAM2ImagePredictor

DEFAULT_REPO = Path("/mnt/zer0models/repos/sam2")
DEFAULT_CHECKPOINT = Path("/mnt/zer0models/models/sam2.1/sam2.1_hiera_tiny.pt")
DEFAULT_OUTPUT = Path("/mnt/zer0models/project-artifacts/cardtwin-sam2-smoke")
CONFIG = "configs/sam2.1/sam2.1_hiera_t.yaml"


def save_outputs(image: np.ndarray, mask: np.ndarray, output: Path, stem: str) -> None:
    if mask.shape != image.shape[:2]:
        raise RuntimeError(f"unaligned {stem} mask: {mask.shape} != {image.shape[:2]}")
    binary = (mask.astype(np.uint8) * 255)
    Image.fromarray(binary, "L").save(output / f"{stem}-mask.png")
    rgba = np.dstack([image, binary])
    Image.fromarray(rgba, "RGBA").save(output / f"{stem}-rgba.png")


def main() -> None:
    parser = argparse.ArgumentParser(description="Smoke-test official SAM 2.1 image point and box prompts")
    parser.add_argument("--repo", type=Path, default=DEFAULT_REPO)
    parser.add_argument("--checkpoint", type=Path, default=DEFAULT_CHECKPOINT)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    if not torch.cuda.is_available():
        raise RuntimeError("CUDA is required for the target-hardware smoke test")
    args.output.mkdir(parents=True, exist_ok=True)

    source = Image.new("RGB", (640, 480), "#c9d9e8")
    draw = ImageDraw.Draw(source)
    draw.rounded_rectangle((160, 90, 480, 390), radius=55, fill="#d65043", outline="#61251f", width=12)
    draw.ellipse((250, 165, 390, 305), fill="#ffd166")
    source_path = args.output / "input.png"
    source.save(source_path)
    image = np.array(source, copy=True)

    torch.cuda.empty_cache()
    torch.cuda.reset_peak_memory_stats()
    model = build_sam2(CONFIG, str(args.checkpoint), device="cuda")
    predictor = SAM2ImagePredictor(model)
    predictor.set_image(image)

    point_masks, point_scores, _ = predictor.predict(
        point_coords=np.array([[320, 240]], dtype=np.float32),
        point_labels=np.array([1], dtype=np.int32),
        multimask_output=True,
    )
    point_index = int(np.argmax(point_scores))
    save_outputs(image, point_masks[point_index], args.output, "point")

    box_masks, box_scores, _ = predictor.predict(
        box=np.array([145, 75, 495, 405], dtype=np.float32),
        multimask_output=True,
    )
    box_index = int(np.argmax(box_scores))
    save_outputs(image, box_masks[box_index], args.output, "box")

    report = {
        "implementation": "official Meta SAM 2.1 image predictor",
        "device": torch.cuda.get_device_name(0),
        "checkpoint": str(args.checkpoint),
        "inputDimensions": [640, 480],
        "point": {"score": float(point_scores[point_index]), "foregroundPixels": int(point_masks[point_index].sum())},
        "box": {"score": float(box_scores[box_index]), "foregroundPixels": int(box_masks[box_index].sum())},
        "peakGpuMemoryBytes": int(torch.cuda.max_memory_allocated()),
        "outputs": str(args.output),
    }
    report_path = args.output / "report.json"
    report_path.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
