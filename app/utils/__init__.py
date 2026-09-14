"""Utilities package for VisionX AI."""
from .logger import logger, get_logger
from .performance import FPSMeter, SystemMonitor, detect_compute_device
from .image_utils import cv_to_qimage, cv_to_qpixmap, safe_crop, estimate_dominant_color
from .video_utils import draw_detection_box, generate_synthetic_scene

__all__ = [
    "logger",
    "get_logger",
    "FPSMeter",
    "SystemMonitor",
    "detect_compute_device",
    "cv_to_qimage",
    "cv_to_qpixmap",
    "safe_crop",
    "estimate_dominant_color",
    "draw_detection_box",
    "generate_synthetic_scene"
]
