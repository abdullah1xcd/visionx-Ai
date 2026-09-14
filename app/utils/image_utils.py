"""Image utility functions for VisionX AI (conversions, cropping, color sampling)."""

from typing import Tuple, Optional, List
import numpy as np
import cv2

try:
    from PySide6.QtGui import QImage, QPixmap
except ImportError:
    QImage = None
    QPixmap = None


def cv_to_qimage(cv_img: np.ndarray) -> Optional["QImage"]:
    """Converts an OpenCV BGR numpy image to QImage safely."""
    if cv_img is None or cv_img.size == 0 or QImage is None:
        return None

    height, width = cv_img.shape[:2]
    if len(cv_img.shape) == 2:
        # Grayscale
        bytes_per_line = width
        return QImage(cv_img.data, width, height, bytes_per_line, QImage.Format.Format_Grayscale8).copy()
    elif cv_img.shape[2] == 3:
        # BGR -> RGB
        rgb_img = cv2.cvtColor(cv_img, cv2.COLOR_BGR2RGB)
        bytes_per_line = 3 * width
        return QImage(rgb_img.data, width, height, bytes_per_line, QImage.Format.Format_RGB888).copy()
    elif cv_img.shape[2] == 4:
        # BGRA -> RGBA
        rgba_img = cv2.cvtColor(cv_img, cv2.COLOR_BGRA2RGBA)
        bytes_per_line = 4 * width
        return QImage(rgba_img.data, width, height, bytes_per_line, QImage.Format.Format_RGBA8888).copy()
    return None


def cv_to_qpixmap(cv_img: np.ndarray) -> Optional["QPixmap"]:
    """Converts an OpenCV BGR numpy image to QPixmap."""
    qimg = cv_to_qimage(cv_img)
    if qimg is not None and QPixmap is not None:
        return QPixmap.fromImage(qimg)
    return None


def safe_crop(image: np.ndarray, bbox: Tuple[int, int, int, int], padding: int = 5) -> Optional[np.ndarray]:
    """Safely crops a bounding box (x1, y1, x2, y2) from an image with optional padding."""
    if image is None or image.size == 0:
        return None

    h, w = image.shape[:2]
    x1, y1, x2, y2 = bbox

    # Apply padding
    x1 = max(0, int(x1) - padding)
    y1 = max(0, int(y1) - padding)
    x2 = min(w, int(x2) + padding)
    y2 = min(h, int(y2) + padding)

    if x2 <= x1 or y2 <= y1:
        return None

    return image[y1:y2, x1:x2].copy()


def estimate_dominant_color(bgr_crop: np.ndarray) -> str:
    """Estimates the dominant color of a vehicle or object crop using HSV color spaces."""
    if bgr_crop is None or bgr_crop.size == 0:
        return "Unknown"

    try:
        # Resize to thumbnail to speed up analysis and smooth noise
        thumb = cv2.resize(bgr_crop, (50, 50), interpolation=cv2.INTER_AREA)
        # Center-weighted crop to avoid background surroundings
        h, w = thumb.shape[:2]
        center = thumb[int(h * 0.2):int(h * 0.8), int(w * 0.2):int(w * 0.8)]
        hsv = cv2.cvtColor(center, cv2.COLOR_BGR2HSV)

        # Average HSV
        avg_h = np.median(hsv[:, :, 0])
        avg_s = np.median(hsv[:, :, 1])
        avg_v = np.median(hsv[:, :, 2])

        if avg_v < 45:
            return "Black"
        if avg_v > 210 and avg_s < 35:
            return "White"
        if avg_s < 45:
            return "Silver / Gray"

        # Hue intervals (OpenCV Hue is 0..179)
        if avg_h < 10 or avg_h >= 170:
            return "Red"
        elif 10 <= avg_h < 25:
            return "Orange"
        elif 25 <= avg_h < 35:
            return "Yellow"
        elif 35 <= avg_h < 85:
            return "Green"
        elif 85 <= avg_h < 130:
            return "Blue"
        elif 130 <= avg_h < 160:
            return "Purple"
        else:
            return "Dark Tone"
    except Exception:
        return "Unknown"
