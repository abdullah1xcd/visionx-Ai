"""Image Quality Analyzer evaluating blur, noise, brightness, contrast, and resolution."""

from dataclasses import dataclass
from typing import Tuple, Dict, Any, Optional
import numpy as np
import cv2


@dataclass
class QualityReport:
    """Quality metrics and assessment for a video frame or cropped object."""
    rating: str  # "Good", "Acceptable", "Poor"
    resolution: str  # e.g., "1920x1080"
    blur_level: str  # "Low", "Moderate", "High"
    blur_score: float  # Laplacian variance
    brightness_level: str  # "Dark / Underexposed", "Optimal", "Overexposed"
    brightness_score: float  # Mean pixel luminance (0..255)
    contrast_score: float  # Standard deviation of luminance
    contrast_level: str  # "Low", "Normal", "High"
    noise_estimate: float
    recommend_enhancement: bool


class QualityAnalyzer:
    """Evaluates frame or crop quality to determine if enhancement is warranted."""

    def __init__(self, blur_threshold: float = 100.0, low_brightness_thresh: float = 65.0, high_brightness_thresh: float = 200.0):
        self.blur_threshold = blur_threshold
        self.low_brightness_thresh = low_brightness_thresh
        self.high_brightness_thresh = high_brightness_thresh

    def analyze(self, image: np.ndarray) -> QualityReport:
        """Computes objective quality metrics on an image (BGR format)."""
        if image is None or image.size == 0:
            return QualityReport(
                rating="Poor",
                resolution="0x0",
                blur_level="High",
                blur_score=0.0,
                brightness_level="Dark / Underexposed",
                brightness_score=0.0,
                contrast_score=0.0,
                contrast_level="Low",
                noise_estimate=0.0,
                recommend_enhancement=True
            )

        h, w = image.shape[:2]
        resolution_str = f"{w}x{h}"

        # Convert to Grayscale for luminance metrics
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image

        # 1. Blur evaluation via variance of Laplacian
        laplacian_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        if laplacian_var < 50.0:
            blur_level = "High"
        elif laplacian_var < self.blur_threshold:
            blur_level = "Moderate"
        else:
            blur_level = "Low"

        # 2. Brightness evaluation
        brightness = float(np.mean(gray))
        if brightness < self.low_brightness_thresh:
            brightness_level = "Dark / Underexposed"
        elif brightness > self.high_brightness_thresh:
            brightness_level = "Overexposed"
        else:
            brightness_level = "Optimal"

        # 3. Contrast evaluation (Standard Deviation)
        contrast = float(np.std(gray))
        if contrast < 35.0:
            contrast_level = "Low"
        elif contrast > 75.0:
            contrast_level = "High"
        else:
            contrast_level = "Normal"

        # 4. Noise estimation using high-frequency residual
        # Difference between original and median-filtered image
        median_filtered = cv2.medianBlur(gray, 3)
        noise_residual = np.mean(np.abs(gray.astype(np.float32) - median_filtered.astype(np.float32)))

        # 5. Composite rating
        score_penalties = 0
        if blur_level == "High":
            score_penalties += 2
        elif blur_level == "Moderate":
            score_penalties += 1

        if brightness_level != "Optimal":
            score_penalties += 1

        if contrast_level == "Low":
            score_penalties += 1

        if score_penalties >= 3:
            rating = "Poor"
            recommend_enhancement = True
        elif score_penalties >= 1:
            rating = "Acceptable"
            recommend_enhancement = (blur_level != "Low" or brightness_level != "Optimal")
        else:
            rating = "Good"
            recommend_enhancement = False

        return QualityReport(
            rating=rating,
            resolution=resolution_str,
            blur_level=blur_level,
            blur_score=round(laplacian_var, 1),
            brightness_level=brightness_level,
            brightness_score=round(brightness, 1),
            contrast_score=round(contrast, 1),
            contrast_level=contrast_level,
            noise_estimate=round(float(noise_residual), 2),
            recommend_enhancement=recommend_enhancement
        )
