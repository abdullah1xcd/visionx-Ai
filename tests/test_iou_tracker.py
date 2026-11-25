"""Unit tests for the Greedy IoU comparison baseline."""
import unittest

from app.ai.detector import DetectionResult
from scripts.tracking_comparison import GreedyIoUTracker


def det(box, category="person"):
    return DetectionResult(category, 0.9, box, 0)


class TestGreedyIoUTracker(unittest.TestCase):
    def test_keeps_id_for_overlapping_same_class_detection(self):
        tracker = GreedyIoUTracker(match_threshold=0.2)
        first = tracker.update([det((0, 0, 40, 40))])
        second = tracker.update([det((3, 0, 43, 40))])
        self.assertEqual(first[0].track_id, second[0].track_id)

    def test_does_not_match_different_classes(self):
        tracker = GreedyIoUTracker(match_threshold=0.1)
        first = tracker.update([det((0, 0, 40, 40), "person")])
        second = tracker.update([det((0, 0, 40, 40), "car")])
        self.assertNotEqual(first[0].track_id, second[0].track_id)

    def test_assigns_new_id_after_non_overlap(self):
        tracker = GreedyIoUTracker(match_threshold=0.5)
        first = tracker.update([det((0, 0, 20, 20))])
        second = tracker.update([det((100, 100, 120, 120))])
        self.assertNotEqual(first[0].track_id, second[0].track_id)

    def test_track_expires_after_max_lost(self):
        tracker = GreedyIoUTracker(max_lost=1)
        first = tracker.update([det((0, 0, 20, 20))])
        track_id = first[0].track_id
        tracker.update([])
        tracker.update([])
        self.assertNotIn(track_id, tracker.tracks)


if __name__ == "__main__":
    unittest.main()
