import sys
import unittest
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

from analyze_sr_decision import (  # noqa: E402
    contour_iou,
    lanczos_upscale,
    normalized_edit_agreement,
    palette_delta_e,
    select_cheapest_eligible,
    symbol_template_score,
)


class StructuralMetricTests(unittest.TestCase):
    def test_lanczos_baseline_is_four_times_canonical_dimensions(self):
        image = np.zeros((8, 12, 3), dtype=np.uint8)
        self.assertEqual(lanczos_upscale(image).shape, (32, 48, 3))

    def test_ocr_agreement_ignores_case_and_spacing(self):
        self.assertEqual(normalized_edit_agreement("Arcanine 120 HP", "  arcanine   120 hp "), 1.0)
        self.assertLess(normalized_edit_agreement("Arcanine 120 HP", "Arcanine 170 HP"), 1.0)

    def test_contour_iou_is_one_for_identical_edges(self):
        image = np.zeros((32, 32), dtype=np.uint8)
        cv2.rectangle(image, (4, 4), (27, 27), 255, 1)
        self.assertEqual(contour_iou(image, image), 1.0)

    def test_palette_delta_is_zero_for_identical_images(self):
        image = np.full((16, 16, 3), (20, 80, 160), dtype=np.uint8)
        self.assertAlmostEqual(palette_delta_e(image, image), 0.0, places=6)

    def test_symbol_template_score_is_one_for_identical_regions(self):
        symbol = np.zeros((24, 24), dtype=np.uint8)
        cv2.circle(symbol, (12, 12), 7, 255, -1)
        self.assertAlmostEqual(symbol_template_score(symbol, symbol), 1.0, places=6)

    def test_decision_chooses_cheapest_structurally_passing_sharpness_gain(self):
        options = [
            {"method": "baseline", "gpuWallSeconds": 0, "postDownscaleSharpness": 100, "structuralIdentityPass": True},
            {"method": "slow", "gpuWallSeconds": 20, "postDownscaleSharpness": 120, "structuralIdentityPass": True},
            {"method": "cheap", "gpuWallSeconds": 5, "postDownscaleSharpness": 101, "structuralIdentityPass": True},
            {"method": "broken", "gpuWallSeconds": 1, "postDownscaleSharpness": 140, "structuralIdentityPass": False},
        ]
        self.assertEqual(select_cheapest_eligible(options, baseline_sharpness=100)["method"], "cheap")


if __name__ == "__main__":
    unittest.main()
