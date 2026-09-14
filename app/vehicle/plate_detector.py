"""License Plate Detector operating on vehicle crops."""

import os
from typing import Optional, Tuple, List
import numpy as np
import cv2

from app.config.settings import settings
from app.utils.logger import logger


class LicensePlateDetector:
    """Detects license plate location within a vehicle crop."""

    def __init__(self, model_path: Optional[str] = None):
        self.model_path = model_path or settings.vehicle.plate_model_path
        self.model = None
        self._load_model()

    def _load_model(self):
        """Loads specialized license plate detection model if present."""
        if os.path.exists(self.model_path):
            try:
                from ultralytics import YOLO
                self.model = YOLO(self.model_path)
                logger.info(f"Loaded dedicated license plate model: {self.model_path}")
            except Exception as e:
                logger.warning(f"Failed loading license plate model: {e}")
                self.model = None

    def detect_plate(self, vehicle_crop: np.ndarray) -> Tuple[bool, Optional[Tuple[int, int, int, int]], Optional[np.ndarray]]:
        """Locates license plate in vehicle crop.
        Returns: (detected, (x1, y1, x2, y2), plate_crop)
        """
        if vehicle_crop is None or vehicle_crop.size == 0:
            return False, None, None

        vh, vw = vehicle_crop.shape[:2]

        # 1. Use custom YOLO model if loaded
        if self.model is not None:
            try:
                preds = self.model(vehicle_crop, conf=0.3, verbose=False)
                if preds and len(preds[0].boxes) > 0:
                    box = preds[0].boxes[0]
                    xyxy = box.xyxy[0].cpu().numpy()
                    x1, y1, x2, y2 = [int(v) for v in xyxy]
                    plate_crop = vehicle_crop[y1:y2, x1:x2]
                    return True, (x1, y1, x2, y2), plate_crop
            except Exception as e:
                logger.error(f"Error during plate model inference: {e}")

        # 2. Computer vision morphological fallback (typical license plate geometry: aspect ratio 2.0 to 5.0 in lower 60% of vehicle)
        lower_region_y = int(vh * 0.4)
        lower_crop = vehicle_crop[lower_region_y:, :]

        gray = cv2.cvtColor(lower_crop, cv2.COLOR_BGR2GRAY)
        # Black hat morphological filter to emphasize dark characters on light plate or light on dark
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (13, 5))
        tophat = cv2.morphologyEx(gray, cv2.MORPH_TOPHAT, kernel)
        blackhat = cv2.morphologyEx(gray, cv2.MORPH_BLACKHAT, kernel)
        comb = cv2.add(tophat, blackhat)

        # Sobel horizontal gradients
        grad_x = cv2.Sobel(comb, ddepth=cv2.CV_32F, dx=1, dy=0, ksize=-1)
        grad_x = np.absolute(grad_x)
        (min_val, max_val) = (np.min(grad_x), np.max(grad_x))
        if max_val > min_val:
            grad_x = (255 * ((grad_x - min_val) / (max_val - min_val))).astype("uint8")
        else:
            grad_x = grad_x.astype("uint8")

        grad_x = cv2.GaussianBlur(grad_x, (5, 5), 0)
        thresh = cv2.morphologyEx(grad_x, cv2.MORPH_CLOSE, kernel)
        _, thresh = cv2.threshold(thresh, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)

        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        best_rect = None
        best_area = 0

        for cnt in contours:
            x, y, w, h = cv2.boundingRect(cnt)
            aspect_ratio = float(w) / float(h)
            area = w * h

            # License plate aspect ratio is typically between 2.0 and 5.5
            if 1.8 <= aspect_ratio <= 5.5 and 800 < area < (vw * vh * 0.4):
                if area > best_area:
                    best_area = area
                    # Map y back to full vehicle crop coordinates
                    best_rect = (x, y + lower_region_y, x + w, y + lower_region_y + h)

        if best_rect is not None:
            x1, y1, x2, y2 = best_rect
            plate_crop = vehicle_crop[y1:y2, x1:x2].copy()
            return True, best_rect, plate_crop

        # If geometric search finds nothing, return center-lower bumper region as candidate crop
        bumper_w = int(vw * 0.4)
        bumper_h = int(vh * 0.18)
        bx1 = int((vw - bumper_w) / 2)
        by1 = int(vh * 0.72)
        plate_candidate = vehicle_crop[by1:min(vh, by1 + bumper_h), bx1:min(vw, bx1 + bumper_w)].copy()
        return False, (bx1, by1, bx1 + bumper_w, by1 + bumper_h), plate_candidate
