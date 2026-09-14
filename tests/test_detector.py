"""Unit tests for YOLO Object Detector."""

import unittest
import numpy as np
from app.ai.detector import ObjectDetector, DetectionResult
from app.utils.video_utils import generate_synthetic_scene


class TestObjectDetector(unittest.TestCase):
    def setUp(self):
        self.detector = ObjectDetector()

    def test_detector_initialization(self):
        self.assertIsNotNone(self.detector)
        self.assertIn(self.detector.device, ["cpu", "cuda"])

    def test_detect_empty_frame(self):
        results = self.detector.detect(None)
        self.assertEqual(results, [])

    def test_detect_synthetic_frame(self):
        frame, _ = generate_synthetic_scene(640, 480, 10)
        results = self.detector.detect(frame)
        self.assertIsInstance(results, list)


if __name__ == "__main__":
    unittest.main()
