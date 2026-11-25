"""Tests for the standard YOLOv8 COCO class-to-category mapping."""

import unittest

from app.ai.detector import ObjectDetector


class TestCocoClassMapping(unittest.TestCase):
    def test_person_mapping(self):
        self.assertEqual(ObjectDetector._category_for_class(0), "person")

    def test_bicycle_mapping(self):
        self.assertEqual(ObjectDetector._category_for_class(1), "bicycle")

    def test_car_bus_and_truck_map_to_vehicle(self):
        for class_id in (2, 5, 7):
            with self.subTest(class_id=class_id):
                self.assertEqual(ObjectDetector._category_for_class(class_id), "car")

    def test_cell_phone_is_not_misclassified_as_camera(self):
        # COCO class 67 is cell phone; the standard model has no camera class.
        self.assertIsNone(ObjectDetector._category_for_class(67))


if __name__ == "__main__":
    unittest.main()
