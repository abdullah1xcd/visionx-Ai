"""Unit tests for Image Enhancement and Quality Assessment."""

import unittest
import numpy as np
from app.ai.quality_analyzer import QualityAnalyzer
from app.ai.enhancement import ImageEnhancementPipeline


class TestEnhancementAndQuality(unittest.TestCase):
    def setUp(self):
        self.quality = QualityAnalyzer()
        self.enhancer = ImageEnhancementPipeline()

    def test_quality_analysis(self):
        # Create test blurry image
        img = np.zeros((200, 200, 3), dtype=np.uint8)
        report = self.quality.analyze(img)
        self.assertIn(report.rating, ["Good", "Acceptable", "Poor"])
        self.assertIn(report.blur_level, ["Low", "Moderate", "High"])

    def test_enhancement_non_destructive(self):
        crop = np.random.randint(0, 255, (50, 50, 3), dtype=np.uint8)
        res = self.enhancer.enhance(crop, target_min_size=100)

        # Original crop must not be modified
        self.assertEqual(res.original.shape, (50, 50, 3))
        # Enhanced crop should be scaled up
        self.assertGreaterEqual(res.enhanced.shape[0], 100)
        self.assertGreater(len(res.applied_operations), 0)


if __name__ == "__main__":
    unittest.main()
