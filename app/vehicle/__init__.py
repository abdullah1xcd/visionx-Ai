"""Vehicle analytics package (plate detector, OCR, speed estimation)."""
from .plate_detector import LicensePlateDetector
from .plate_ocr import LicensePlateOCR, OCRResult
from .speed_estimator import SpeedEstimator

__all__ = [
    "LicensePlateDetector",
    "LicensePlateOCR",
    "OCRResult",
    "SpeedEstimator"
]
