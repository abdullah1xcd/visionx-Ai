"""AI Image Enhancement Pipeline (Denoising, CLAHE, Sharpening, Super-Resolution)."""

from dataclasses import dataclass
from typing import Optional, Tuple
import numpy as np
import cv2
from app.utils.logger import logger


@dataclass
class EnhancementResult:
    """Container holding original and enhanced crops along with enhancement logs."""
    original: np.ndarray
    enhanced: np.ndarray
    applied_operations: list[str]
    scale_factor: float
    disclaimer: str = "AI enhancement improves edge contrast and readability. It does not generate invented details."


class ImageEnhancementPipeline:
    """Modular enhancement engine for poor-quality crops and license plates."""

    def __init__(
        self,
        enable_clahe: bool = True,
        enable_denoise: bool = True,
        enable_sharpen: bool = True,
        enable_upscale: bool = True
    ):
        self.enable_clahe = enable_clahe
        self.enable_denoise = enable_denoise
        self.enable_sharpen = enable_sharpen
        self.enable_upscale = enable_upscale

        # Create CLAHE operator for luminance channel in LAB color space
        self.clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))

    def enhance(self, crop: np.ndarray, target_min_size: int = 120) -> EnhancementResult:
        """Processes an image crop through non-destructive modular enhancement."""
        if crop is None or crop.size == 0:
            dummy = np.zeros((64, 64, 3), dtype=np.uint8)
            return EnhancementResult(original=dummy, enhanced=dummy, applied_operations=[], scale_factor=1.0)

        original = crop.copy()
        working = crop.copy()
        operations = []
        h, w = working.shape[:2]
        scale_factor = 1.0

        # 1. Upscale if crop is too small for OCR or visual inspection
        min_dim = min(h, w)
        if self.enable_upscale and min_dim < target_min_size:
            scale_factor = max(2.0, float(target_min_size) / float(min_dim))
            new_w = int(w * scale_factor)
            new_h = int(h * scale_factor)
            working = cv2.resize(working, (new_w, new_h), interpolation=cv2.INTER_CUBIC)
            operations.append(f"Cubic Upscale ({scale_factor:.1f}x)")

        # 2. Denoising (Fast Bilateral Filtering to preserve edges)
        if self.enable_denoise:
            working = cv2.bilateralFilter(working, d=7, sigmaColor=50, sigmaSpace=50)
            operations.append("Bilateral Edge-Preserving Denoise")

        # 3. Contrast Limited Adaptive Histogram Equalization (CLAHE) in LAB Space
        if self.enable_clahe and len(working.shape) == 3:
            lab = cv2.cvtColor(working, cv2.COLOR_BGR2LAB)
            l_channel, a_channel, b_channel = cv2.split(lab)
            l_equalized = self.clahe.apply(l_channel)
            lab_equalized = cv2.merge((l_equalized, a_channel, b_channel))
            working = cv2.cvtColor(lab_equalized, cv2.COLOR_LAB2BGR)
            operations.append("Adaptive Contrast (CLAHE)")

        # 4. Sharpening via Unsharp Masking
        if self.enable_sharpen:
            gaussian = cv2.GaussianBlur(working, (0, 0), sigmaX=2.0)
            # Unsharp mask formula: original + amount * (original - blurred)
            working = cv2.addWeighted(working, 1.4, gaussian, -0.4, 0)
            operations.append("Unsharp Edge Sharpening")

        return EnhancementResult(
            original=original,
            enhanced=working,
            applied_operations=operations,
            scale_factor=scale_factor
        )
