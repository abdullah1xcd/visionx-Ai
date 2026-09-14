"""Unit tests for License Plate OCR."""

import unittest
import numpy as np
import cv2
from app.vehicle.plate_ocr import LicensePlateOCR


class TestLicensePlateOCR(unittest.TestCase):
    def setUp(self):
        self.ocr = LicensePlateOCR()

    def test_empty_crop(self):
        res = self.ocr.read_plate(None)
        self.assertFalse(res.is_valid)

    def test_plate_synthetic_read(self):
        # Generate clean plate image with text
        plate = np.ones((60, 200, 3), dtype=np.uint8) * 255
        cv2.putText(plate, "ABC 1234", (10, 42), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 0, 0), 2)

        res = self.ocr.read_plate(plate)
        self.assertIsNotNone(res.text)
        self.assertGreater(res.confidence, 0.0)


if __name__ == "__main__":
    unittest.main()
