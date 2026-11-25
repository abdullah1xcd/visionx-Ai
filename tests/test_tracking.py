"""Tests for VisionX's native ByteTrack metadata adapter."""

import unittest
from app.ai.tracker import ByteTracker
from app.ai.detector import DetectionResult


class TestByteTrackerAdapter(unittest.TestCase):
    def setUp(self):
        self.tracker = ByteTracker(max_lost_frames=2, smoothing_factor=1.0)

    def detection(self, track_id, bbox=(10, 10, 50, 50), category="person"):
        return DetectionResult(
            category=category,
            confidence=0.9,
            bbox=bbox,
            class_id=0,
            track_id=track_id,
        )

    def test_preserves_ids_assigned_by_ultralytics(self):
        first = self.tracker.update([self.detection(17)])
        second = self.tracker.update([self.detection(17, (12, 10, 52, 50))])
        self.assertEqual(first[0].track_id, 17)
        self.assertEqual(second[0].track_id, 17)

    def test_does_not_invent_ids_for_untracked_detections(self):
        self.assertEqual(self.tracker.update([self.detection(None)]), [])

    def test_active_counts_and_expiration(self):
        self.tracker.update([self.detection(4)])
        self.assertEqual(self.tracker.get_active_count()["person"], 1)
        self.tracker.update([])
        self.assertEqual(self.tracker.get_active_count()["person"], 0)
        self.tracker.update([])
        self.tracker.update([])
        self.assertNotIn(4, self.tracker.tracks)

    def test_direction_and_bbox_telemetry(self):
        self.tracker.update([self.detection(8, (0, 0, 20, 20))])
        result = self.tracker.update([self.detection(8, (20, 0, 40, 20))])
        self.assertEqual(result[0].bbox, (20, 0, 40, 20))
        self.assertEqual(self.tracker.tracks[8].direction, "East")


if __name__ == "__main__":
    unittest.main()
