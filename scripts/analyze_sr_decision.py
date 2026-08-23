#!/usr/bin/env python3
"""Reproducible display-resolution SR cost/identity decision for CardTwin."""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import tempfile
from difflib import SequenceMatcher
from pathlib import Path

import cv2
import numpy as np

VIEWPORT = (390, 844)
THRESHOLDS = {
    "ocrAgreementMin": 0.90,
    "contourIouMin": 0.70,
    "paletteDeltaEMax": 10.0,
    "symbolTemplateMin": 0.80,
}


def normalized_edit_agreement(left: str, right: str) -> float:
    def normalize(value: str) -> str:
        return " ".join(re.findall(r"[a-z0-9]+", value.lower()))

    return SequenceMatcher(None, normalize(left), normalize(right)).ratio()


def _edges(image: np.ndarray) -> np.ndarray:
    gray = image if image.ndim == 2 else cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    return cv2.dilate(cv2.Canny(gray, 80, 160), np.ones((3, 3), np.uint8)) > 0


def contour_iou(left: np.ndarray, right: np.ndarray) -> float:
    if left.shape[:2] != right.shape[:2]:
        right = cv2.resize(right, (left.shape[1], left.shape[0]), interpolation=cv2.INTER_LANCZOS4)
    a, b = _edges(left), _edges(right)
    union = np.logical_or(a, b).sum()
    return float(np.logical_and(a, b).sum() / union) if union else 1.0


def palette_delta_e(left: np.ndarray, right: np.ndarray) -> float:
    if left.shape[:2] != right.shape[:2]:
        right = cv2.resize(right, (left.shape[1], left.shape[0]), interpolation=cv2.INTER_LANCZOS4)
    left_lab = cv2.cvtColor(left, cv2.COLOR_BGR2LAB).astype(np.float32)
    right_lab = cv2.cvtColor(right, cv2.COLOR_BGR2LAB).astype(np.float32)
    return float(np.linalg.norm(left_lab - right_lab, axis=2).mean())


def symbol_template_score(left: np.ndarray, right: np.ndarray) -> float:
    if left.shape[:2] != right.shape[:2]:
        right = cv2.resize(right, (left.shape[1], left.shape[0]), interpolation=cv2.INTER_LANCZOS4)
    a = (left if left.ndim == 2 else cv2.cvtColor(left, cv2.COLOR_BGR2GRAY)).astype(np.float32)
    b = (right if right.ndim == 2 else cv2.cvtColor(right, cv2.COLOR_BGR2GRAY)).astype(np.float32)
    if a.std() == 0 or b.std() == 0:
        return 1.0 if np.array_equal(a, b) else 0.0
    return float(max(0.0, cv2.matchTemplate(a, b, cv2.TM_CCOEFF_NORMED)[0, 0]))


def select_cheapest_eligible(options: list[dict], baseline_sharpness: float) -> dict | None:
    eligible = [
        option for option in options
        if option["structuralIdentityPass"] and option["postDownscaleSharpness"] > baseline_sharpness
    ]
    return min(eligible, key=lambda option: option["gpuWallSeconds"], default=None)


def lanczos_upscale(image: np.ndarray) -> np.ndarray:
    return cv2.resize(image, None, fx=4, fy=4, interpolation=cv2.INTER_LANCZOS4)


def _ocr(image: np.ndarray) -> str:
    with tempfile.NamedTemporaryFile(suffix=".png") as source:
        cv2.imwrite(source.name, image)
        result = subprocess.run(
            ["tesseract", source.name, "stdout", "--psm", "11"],
            check=True,
            capture_output=True,
            text=True,
        )
    return result.stdout


def _sharpness(image: np.ndarray) -> float:
    return float(cv2.Laplacian(cv2.cvtColor(image, cv2.COLOR_BGR2GRAY), cv2.CV_64F).var())


def _symbol_score(reference: np.ndarray, candidate: np.ndarray) -> float:
    height, width = reference.shape[:2]
    regions = (
        (int(width * 0.70), 0, width, int(height * 0.22)),
        (int(width * 0.62), int(height * 0.42), width, int(height * 0.78)),
    )
    return min(symbol_template_score(reference[y1:y2, x1:x2], candidate[y1:y2, x1:x2]) for x1, y1, x2, y2 in regions)


def analyze(canonical_path: Path, candidates: list[tuple[str, Path, float]]) -> dict:
    canonical = cv2.imread(str(canonical_path), cv2.IMREAD_COLOR)
    if canonical is None:
        raise FileNotFoundError(canonical_path)
    lanczos = lanczos_upscale(canonical)
    methods = [("renderer-only + Lanczos", lanczos, 0.0, str(canonical_path))]
    for name, path, seconds in candidates:
        image = cv2.imread(str(path), cv2.IMREAD_COLOR)
        if image is None:
            raise FileNotFoundError(path)
        methods.append((name, image, seconds, str(path)))

    reference_display = cv2.resize(lanczos, VIEWPORT, interpolation=cv2.INTER_LANCZOS4)
    reference_ocr = _ocr(reference_display)
    rows = []
    for name, image, seconds, path in methods:
        display = cv2.resize(image, VIEWPORT, interpolation=cv2.INTER_LANCZOS4)
        structural = {
            "ocrAgreement": normalized_edit_agreement(reference_ocr, _ocr(display)),
            "contourIou": contour_iou(reference_display, display),
            "paletteDeltaE": palette_delta_e(reference_display, display),
            "symbolTemplateMatch": _symbol_score(reference_display, display),
        }
        passed = (
            structural["ocrAgreement"] >= THRESHOLDS["ocrAgreementMin"]
            and structural["contourIou"] >= THRESHOLDS["contourIouMin"]
            and structural["paletteDeltaE"] <= THRESHOLDS["paletteDeltaEMax"]
            and structural["symbolTemplateMatch"] >= THRESHOLDS["symbolTemplateMin"]
        )
        sharpness = _sharpness(display)
        rows.append({
            "method": name,
            "source": path,
            "gpuWallSeconds": seconds,
            "batchGpuHours1000": seconds * 1000 / 3600,
            "postDownscaleSharpness": sharpness,
            "sharpnessGainVsBaseline": 0.0,
            "sharpnessGainPerGpuSecond": None,
            "structuralMetrics": structural,
            "structuralIdentityPass": passed,
        })

    baseline = rows[0]["postDownscaleSharpness"]
    for row in rows:
        gain = row["postDownscaleSharpness"] - baseline
        row["sharpnessGainVsBaseline"] = gain
        row["sharpnessGainPerGpuSecond"] = gain / row["gpuWallSeconds"] if row["gpuWallSeconds"] else None
    selected = select_cheapest_eligible(rows, baseline)
    return {
        "schemaVersion": 2,
        "viewport": list(VIEWPORT),
        "decisionRule": "cheapest option with post-downscale sharpness > Lanczos baseline and passing all structural gates",
        "structuralThresholds": THRESHOLDS,
        "ocrReference": reference_ocr.strip(),
        "methods": rows,
        "decision": selected["method"] if selected else "renderer-only + Lanczos",
        "batchAllowed": selected is not None,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--canonical", type=Path, required=True)
    parser.add_argument("--candidate", action="append", nargs=3, metavar=("NAME", "PATH", "GPU_SECONDS"), default=[])
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--lanczos-output", type=Path)
    args = parser.parse_args()
    report = analyze(args.canonical, [(name, Path(path), float(seconds)) for name, path, seconds in args.candidate])
    if args.lanczos_output:
        canonical = cv2.imread(str(args.canonical), cv2.IMREAD_COLOR)
        args.lanczos_output.parent.mkdir(parents=True, exist_ok=True)
        cv2.imwrite(str(args.lanczos_output), lanczos_upscale(canonical))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
