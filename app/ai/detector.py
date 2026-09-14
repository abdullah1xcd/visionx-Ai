"""Ultralytics YOLO Object Detection Engine with GPU acceleration, CPU fallback,
class-specific confidence thresholds, and adaptive conditional preprocessing.
"""

from dataclasses import dataclass, field
from typing import List, Tuple, Optional, Dict, Any
import numpy as np
import cv2
import os

from app.config.settings import settings
from app.utils.logger import logger
from app.utils.performance import detect_compute_device


@dataclass
class DetectionResult:
    """Standardized detection result for VisionX AI."""
    category: str  # 'person', 'car', 'bicycle', 'camera'
    confidence: float
    bbox: Tuple[int, int, int, int]  # x1, y1, x2, y2
    class_id: int
    track_id: Optional[int] = None
    extra: Dict[str, Any] = field(default_factory=dict)


class ObjectDetector:
    """Wraps Ultralytics YOLO for automatic real-time detection of Person, Car, Bicycle, Camera."""

    # Standard COCO class mappings
    COCO_TARGET_MAP = {
        0: "person",
        1: "bicycle",
        2: "car",
    }

    def __init__(self, model_path: Optional[str] = None):
        self.model_path = model_path or settings.detection.custom_model_path
        self.model = None
        self.device, self.device_desc = detect_compute_device()
        self.is_ready = False
        self.inference_size = settings.detection.inference_resolution  # 640, 960, or 1280

        # Class-specific confidence thresholds
        self.thresholds = {
            "person": settings.detection.person_threshold,
            "car": settings.detection.car_threshold,
            "bicycle": settings.detection.bicycle_threshold,
            "camera": settings.detection.camera_threshold,
        }
        self.default_threshold = settings.detection.default_threshold

        self._initialize_model()

    def set_threshold(self, category: str, threshold: float):
        """Allows dynamic configuration of class-specific threshold."""
        cat = category.lower()
        if cat in self.thresholds:
            self.thresholds[cat] = float(np.clip(threshold, 0.15, 0.95))

    def set_inference_resolution(self, res: int):
        """Sets YOLO inference resolution: 640, 960, or 1280."""
        if res in [640, 960, 1280]:
            self.inference_size = res
            logger.info(f"Updated YOLO inference resolution to {res}x{res}")

    def _initialize_model(self):
        """Attempts to load custom model or standard lightweight YOLOv8n."""
        try:
            from ultralytics import YOLO
            if os.path.exists(self.model_path):
                logger.info(f"Loading custom YOLO weights from {self.model_path}")
                self.model = YOLO(self.model_path)
            else:
                logger.info("Using standard YOLOv8n model for inference")
                self.model = YOLO("yolov8n.pt")

            # Transfer to detected device
            if self.device == "cuda":
                try:
                    self.model.to("cuda")
                    logger.info("YOLO model successfully loaded onto NVIDIA CUDA GPU")
                except Exception as e:
                    logger.warning(f"CUDA transfer failed ({e}), falling back to CPU")
                    self.device = "cpu"
                    self.device_desc = "CPU Engine"
                    self.model.to("cpu")
            else:
                self.model.to("cpu")
                logger.info("YOLO model running on CPU Engine")

            self.is_ready = True
        except ImportError:
            logger.warning("Ultralytics package not available; running in synthetic detection mode")
            self.is_ready = False
        except Exception as e:
            logger.error(f"Error loading YOLO model: {e}")
            self.is_ready = False

    def _conditional_preprocess(self, frame: np.ndarray) -> np.ndarray:
        """Applies gentle preprocessing ONLY if frame quality requires it (low contrast / dark)."""
        if not settings.detection.enable_conditional_preprocessing:
            return frame

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        mean_lum = float(np.mean(gray))
        contrast = float(np.std(gray))

        # Only enhance if frame is very dark (< 45) or flat contrast (< 28)
        if mean_lum < 45.0 or contrast < 28.0:
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
            l_channel, a_channel, b_channel = cv2.split(lab)
            cl = clahe.apply(l_channel)
            merged = cv2.merge((cl, a_channel, b_channel))
            return cv2.cvtColor(merged, cv2.COLOR_LAB2BGR)

        return frame

    def detect(self, frame: np.ndarray) -> List[DetectionResult]:
        """Runs automatic detection on an OpenCV frame with class-specific thresholds.
        
        Detection is completely automatic when camera runs; categories do not need
        to be pre-selected.
        """
        if frame is None or frame.size == 0:
            return []

        if not self.is_ready or self.model is None:
            return []

        results = []
        try:
            # 1. Optional conditional frame enhancement for difficult lighting
            inference_frame = self._conditional_preprocess(frame)

            # 2. Run inference at configured resolution with minimum threshold floor
            min_thresh = min(self.thresholds.values())
            preds = self.model(
                inference_frame,
                conf=min_thresh,
                imgsz=self.inference_size,
                verbose=False,
                device=self.device
            )

            if not preds or len(preds) == 0:
                return []

            boxes = preds[0].boxes
            if boxes is None:
                return []

            for box in boxes:
                cls_id = int(box.cls[0].item())
                conf = float(box.conf[0].item())
                xyxy = box.xyxy[0].cpu().numpy()
                x1, y1, x2, y2 = [int(v) for v in xyxy]

                category: Optional[str] = None
                if cls_id in self.COCO_TARGET_MAP:
                    category = self.COCO_TARGET_MAP[cls_id]
                elif cls_id == 67:  # Cell phone / handheld camera proxy
                    category = "camera"

                if not category:
                    continue

                # 3. Class-specific confidence filtering
                cat_threshold = self.thresholds.get(category, self.default_threshold)
                if conf < cat_threshold:
                    continue

                # Small object handling / boundary validation
                w = x2 - x1
                h = y2 - y1
                if w < 10 or h < 10:
                    continue

                results.append(DetectionResult(
                    category=category,
                    confidence=round(conf, 2),
                    bbox=(x1, y1, x2, y2),
                    class_id=cls_id,
                    extra={"inference_res": self.inference_size}
                ))

        except Exception as e:
            logger.error(f"Detection inference error: {e}")

        return results

    def calculate_quality_status(self, frame: np.ndarray, detections: List[DetectionResult], fps: float) -> str:
        """Calculates authentic AI detection quality indicator based on real metrics.
        
        Returns:
            'Excellent' | 'Good' | 'Low Quality' | 'Poor Visibility'
        """
        if frame is None or frame.size == 0:
            return "Poor Visibility"

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        laplacian_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        mean_lum = float(np.mean(gray))

        # Check for poor visibility
        if mean_lum < 20 or mean_lum > 240 or laplacian_var < 30.0:
            return "Poor Visibility"

        # Check for low quality
        if laplacian_var < 70.0 or fps < 10.0:
            return "Low Quality"

        # Check average confidence of detections
        if detections:
            avg_conf = sum(d.confidence for d in detections) / len(detections)
            if avg_conf >= 0.70 and laplacian_var >= 100.0 and fps >= 20.0:
                return "Excellent"
            else:
                return "Good"

        # If no objects but scene is sharp and well-lit
        if laplacian_var >= 90.0 and 50 <= mean_lum <= 200 and fps >= 20.0:
            return "Good"

        return "Low Quality"
