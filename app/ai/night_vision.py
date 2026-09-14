"""Night Vision Processing Pipeline (Software Night Vision & Hardware IR Support)."""

from typing import Tuple, Optional, Dict, Any
import numpy as np
import cv2

from app.config.settings import settings
from app.utils.logger import logger


class NightVisionProcessor:
    """Professional surveillance night visibility processor.
    
    Transforms dark, low-contrast, or nighttime footage into high-visibility
    monochrome surveillance video without using cheap synthetic green filters.
    """

    def __init__(
        self,
        mode: str = "auto",
        auto_threshold: float = 55.0,
        gamma: float = 0.60,
        clahe_clip: float = 2.5
    ):
        self.mode = mode.lower()  # 'auto', 'day', 'night'
        self.auto_threshold = auto_threshold
        self.gamma = gamma
        self.clahe_clip = clahe_clip
        self.clahe = cv2.createCLAHE(clipLimit=clahe_clip, tileGridSize=(8, 8))
        self.gamma_table = self._build_gamma_table(self.gamma)
        self.last_is_active = False
        self.last_mean_luminance = 128.0

    @staticmethod
    def _build_gamma_table(gamma: float) -> np.ndarray:
        """Builds lookup table for fast 8-bit gamma correction."""
        inv_gamma = 1.0 / max(0.1, gamma)
        table = np.array([((i / 255.0) ** inv_gamma) * 255 for i in range(256)]).astype("uint8")
        return table

    def set_mode(self, mode: str):
        """Sets active night vision mode: 'auto', 'day', 'night'."""
        self.mode = mode.lower()

    def process_frame(self, frame: np.ndarray) -> Tuple[np.ndarray, bool, Dict[str, Any]]:
        """Processes camera frame according to mode and illumination analysis.
        
        Returns:
            processed_frame (np.ndarray): The enhanced monochrome or passthrough frame.
            is_night_vision_active (bool): True if night vision enhancement was applied.
            telemetry (dict): Information on luminance, mode, and operations applied.
        """
        if frame is None or frame.size == 0:
            return frame, False, {}

        # 1. Analyze frame luminance (brightness in HSV / YCrCb)
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        mean_luminance = float(np.mean(gray))
        self.last_mean_luminance = mean_luminance

        should_activate = False
        if self.mode == "night":
            should_activate = True
        elif self.mode == "auto":
            should_activate = (mean_luminance < self.auto_threshold)
        else:  # 'day'
            should_activate = False

        self.last_is_active = should_activate

        telemetry = {
            "mode": self.mode.upper(),
            "active": should_activate,
            "mean_luminance": round(mean_luminance, 1),
            "type": "Hardware IR" if settings.night_vision.supports_hardware_ir else "Software Night Vision"
        }

        if not should_activate:
            return frame, False, telemetry

        # 2. Execute Software Night Vision Pipeline:
        # Step A: Non-linear Gamma Expansion to lift deep shadows
        gamma_corrected = cv2.LUT(gray, self.gamma_table)

        # Step B: Local Contrast Equalization (CLAHE)
        contrast_enhanced = self.clahe.apply(gamma_corrected)

        # Step C: Bilateral Denoising to suppress sensor noise while preserving sharp boundaries
        denoised = cv2.bilateralFilter(contrast_enhanced, d=5, sigmaColor=35, sigmaSpace=35)

        # Step D: Controlled Unsharp Masking for crisp edge definition
        gaussian = cv2.GaussianBlur(denoised, (0, 0), 2.0)
        sharpened = cv2.addWeighted(denoised, 1.35, gaussian, -0.35, 0)

        # Step E: Convert back to 3-channel monochrome representation for downstream YOLO inference
        result_bgr = cv2.cvtColor(sharpened, cv2.COLOR_GRAY2BGR)

        return result_bgr, True, telemetry
