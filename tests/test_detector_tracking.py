"""Integration-contract tests for ObjectDetector's Ultralytics ByteTrack call."""

import unittest
from types import SimpleNamespace

import numpy as np

from app.ai.detector import ObjectDetector


class FakeScalar:
    def __init__(self, value):
        self.value = value

    def item(self):
        return self.value


class FakeCoordinate:
    def __init__(self, values):
        self.values = np.asarray(values)

    def cpu(self):
        return self

    def numpy(self):
        return self.values


class FakeBox:
    def __init__(self, class_id=0, confidence=0.9, bbox=(10, 10, 80, 90)):
        self.cls = [FakeScalar(class_id)]
        self.conf = [FakeScalar(confidence)]
        self.xyxy = [FakeCoordinate(bbox)]


class FakeBoxes(list):
    def __init__(self, boxes, ids=None):
        super().__init__(boxes)
        self.id = None if ids is None else [FakeScalar(value) for value in ids]


class FakeModel:
    def __init__(self, result):
        self.result = result
        self.calls = []

    def track(self, **kwargs):
        self.calls.append(kwargs)
        return [self.result]


class TestObjectDetectorByteTrackContract(unittest.TestCase):
    def make_detector(self, boxes):
        detector = ObjectDetector.__new__(ObjectDetector)
        detector.is_ready = True
        detector.model = FakeModel(SimpleNamespace(boxes=boxes))
        detector.tracker_config_path = "app/config/bytetrack.yaml"
        detector.inference_size = 640
        detector.device = "cpu"
        detector.thresholds = {
            "person": 0.30,
            "car": 0.30,
            "bicycle": 0.30,
            "camera": 0.30,
        }
        detector.default_threshold = 0.30
        detector._conditional_preprocess = lambda frame: frame
        return detector

    def test_track_calls_ultralytics_with_persistent_bytetrack_and_low_confidence_floor(self):
        detector = self.make_detector(FakeBoxes([FakeBox()], ids=[23]))
        frame = np.zeros((100, 100, 3), dtype=np.uint8)

        detections = detector.track(frame)

        self.assertEqual(len(detections), 1)
        self.assertEqual(detections[0].track_id, 23)
        self.assertEqual(detections[0].category, "person")
        call = detector.model.calls[0]
        self.assertIs(call["persist"], True)
        self.assertEqual(call["tracker"], "app/config/bytetrack.yaml")
        self.assertEqual(call["conf"], 0.05)
        self.assertIs(call["source"], frame)

    def test_track_does_not_create_ids_when_ultralytics_returns_none(self):
        detector = self.make_detector(FakeBoxes([FakeBox()], ids=None))
        frame = np.zeros((100, 100, 3), dtype=np.uint8)

        self.assertEqual(detector.track(frame), [])

    def test_display_threshold_is_applied_after_tracker_result(self):
        detector = self.make_detector(FakeBoxes([FakeBox(confidence=0.20)], ids=[23]))
        frame = np.zeros((100, 100, 3), dtype=np.uint8)

        self.assertEqual(detector.track(frame), [])
        self.assertEqual(detector.model.calls[0]["conf"], 0.05)

    def test_empty_frame_does_not_call_model(self):
        detector = self.make_detector(FakeBoxes([FakeBox()], ids=[23]))

        self.assertEqual(detector.track(np.empty((0, 0, 3), dtype=np.uint8)), [])
        self.assertEqual(detector.model.calls, [])


if __name__ == "__main__":
    unittest.main()
