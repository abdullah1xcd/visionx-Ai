"""Unit tests for Multi-Object Tracker (ByteTrack)."""

import unittest
from app.ai.tracker import ByteTracker, calculate_iou
from app.ai.detector import DetectionResult


class TestByteTracker(unittest.TestCase):
    def setUp(self):
        self.tracker = ByteTracker(max_lost_frames=5, iou_thresh=0.3)

    def test_iou_calculation(self):
        box1 = (10, 10, 50, 50)
        box2 = (10, 10, 50, 50)
        iou = calculate_iou(box1, box2)
        self.assertAlmostEqual(iou, 1.0, places=3)

        box3 = (100, 100, 150, 150)
        self.assertEqual(calculate_iou(box1, box3), 0.0)

    def test_track_continuity(self):
        det1 = [DetectionResult(category="car", confidence=0.9, bbox=(50, 50, 100, 100), class_id=2)]
        res1 = self.tracker.update(det1)
        self.assertEqual(len(res1), 1)
        id_1 = res1[0].track_id
        self.assertIsNotNone(id_1)

        # Move slightly in next frame
        det2 = [DetectionResult(category="car", confidence=0.92, bbox=(55, 52, 105, 102), class_id=2)]
        res2 = self.tracker.update(det2)
        self.assertEqual(len(res2), 1)
        id_2 = res2[0].track_id

        # Stable ID must be preserved
        self.assertEqual(id_1, id_2)


if __name__ == "__main__":
    unittest.main()
