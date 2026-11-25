"""Ultralytics YOLO detector with native ByteTrack multi-object tracking."""

from dataclasses import dataclass, field
from pathlib import Path
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
    category: str
    confidence: float
    bbox: Tuple[int, int, int, int]
    class_id: int
    track_id: Optional[int] = None
    extra: Dict[str, Any] = field(default_factory=dict)


class ObjectDetector:
    """YOLO detector and Ultralytics ByteTrack integration."""

    COCO_TARGET_MAP = {0: "person", 1: "bicycle", 2: "car"}

    def __init__(self, model_path: Optional[str] = None):
        self.model_path = model_path or settings.detection.custom_model_path
        self.model = None
        self.device, self.device_desc = detect_compute_device()
        self.is_ready = False
        self.inference_size = settings.detection.inference_resolution
        self.thresholds = {
            "person": settings.detection.person_threshold,
            "car": settings.detection.car_threshold,
            "bicycle": settings.detection.bicycle_threshold,
            "camera": settings.detection.camera_threshold,
        }
        self.default_threshold = settings.detection.default_threshold
        self.tracker_config_path = str(Path(__file__).resolve().parents[1] / "config" / "bytetrack.yaml")
        self._initialize_model()

    def set_threshold(self, category: str, threshold: float):
        cat = category.lower()
        if cat in self.thresholds:
            self.thresholds[cat] = float(np.clip(threshold, 0.15, 0.95))

    def set_inference_resolution(self, res: int):
        if res in [640, 960, 1280]:
            self.inference_size = res
            logger.info(f"Updated YOLO inference resolution to {res}x{res}")

    def _initialize_model(self):
        try:
            from ultralytics import YOLO
            if os.path.exists(self.model_path):
                logger.info(f"Loading custom YOLO weights from {self.model_path}")
                self.model = YOLO(self.model_path)
            else:
                logger.info("Using standard YOLOv8n model for inference")
                self.model = YOLO("yolov8n.pt")

            if self.device == "cuda":
                try:
                    self.model.to("cuda")
                    logger.info("YOLO model successfully loaded onto NVIDIA CUDA GPU")
                except Exception as exc:
                    logger.warning(f"CUDA transfer failed ({exc}), falling back to CPU")
                    self.device = "cpu"
                    self.device_desc = "CPU Engine"
                    self.model.to("cpu")
            else:
                self.model.to("cpu")
                logger.info("YOLO model running on CPU Engine")
            self.is_ready = True
        except ImportError:
            logger.warning("Ultralytics package not available; detection is disabled")
            self.is_ready = False
        except Exception as exc:
            logger.error(f"Error loading YOLO model: {exc}")
            self.is_ready = False

    def _conditional_preprocess(self, frame: np.ndarray) -> np.ndarray:
        if not settings.detection.enable_conditional_preprocessing:
            return frame
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        mean_lum = float(np.mean(gray))
        contrast = float(np.std(gray))
        if mean_lum < 45.0 or contrast < 28.0:
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
            l_channel, a_channel, b_channel = cv2.split(lab)
            merged = cv2.merge((clahe.apply(l_channel), a_channel, b_channel))
            return cv2.cvtColor(merged, cv2.COLOR_LAB2BGR)
        return frame

    @staticmethod
    def _category_for_class(class_id: int) -> Optional[str]:
        if class_id in ObjectDetector.COCO_TARGET_MAP:
            return ObjectDetector.COCO_TARGET_MAP[class_id]
        # COCO class 67 is "cell phone", not a camera. The standard
        # YOLOv8 COCO model has no dedicated camera class.
        return None

    def _convert_boxes(self, boxes, require_track_id: bool) -> List[DetectionResult]:
        detections = []
        if boxes is None:
            return detections

        ids = boxes.id if require_track_id else None
        for index, box in enumerate(boxes):
            class_id = int(box.cls[0].item())
            confidence = float(box.conf[0].item())
            category = self._category_for_class(class_id)
            if category is None:
                continue

            # Apply display thresholds only AFTER ByteTrack has associated low-score boxes.
            if confidence < self.thresholds.get(category, self.default_threshold):
                continue

            coords = box.xyxy[0].cpu().numpy()
            x1, y1, x2, y2 = [int(value) for value in coords]
            if x2 - x1 < 10 or y2 - y1 < 10:
                continue

            track_id = None
            if ids is not None:
                track_id = int(ids[index].item())
            if require_track_id and track_id is None:
                continue

            detections.append(DetectionResult(
                category=category,
                confidence=round(confidence, 4),
                bbox=(x1, y1, x2, y2),
                class_id=class_id,
                track_id=track_id,
                extra={"inference_res": self.inference_size, "tracker": "Ultralytics ByteTrack"},
            ))
        return detections

    def detect(self, frame: np.ndarray) -> List[DetectionResult]:
        """Run standalone detection (no identity association)."""
        if frame is None or frame.size == 0 or not self.is_ready or self.model is None:
            return []
        try:
            inference_frame = self._conditional_preprocess(frame)
            min_thresh = min(self.thresholds.values())
            predictions = self.model(
                inference_frame, conf=min_thresh, imgsz=self.inference_size,
                verbose=False, device=self.device
            )
            if not predictions:
                return []
            return self._convert_boxes(predictions[0].boxes, require_track_id=False)
        except Exception as exc:
            logger.error(f"Detection inference error: {exc}")
            return []

    def reset_tracking(self) -> None:
        """Reset Ultralytics tracker state when the active camera changes."""
        predictor = getattr(self.model, "predictor", None)
        trackers = getattr(predictor, "trackers", None)
        if trackers:
            for tracker in trackers:
                reset = getattr(tracker, "reset", None)
                if callable(reset):
                    reset()

    def track(self, frame: np.ndarray) -> List[DetectionResult]:
        """Run YOLO + persistent Ultralytics ByteTrack on one video frame.

        A low detector confidence floor is intentional: ByteTrack needs low-score
        detections for its second association stage. VisionX's category-specific
        display thresholds are applied after the tracker has processed the frame.
        """
        if frame is None or frame.size == 0 or not self.is_ready or self.model is None:
            return []
        try:
            inference_frame = self._conditional_preprocess(frame)
            predictions = self.model.track(
                source=inference_frame,
                persist=True,
                tracker=self.tracker_config_path,
                conf=0.05,
                iou=settings.detection.iou_threshold,
                imgsz=self.inference_size,
                verbose=False,
                device=self.device,
            )
            if not predictions:
                return []
            return self._convert_boxes(predictions[0].boxes, require_track_id=True)
        except Exception as exc:
            logger.error(f"ByteTrack inference error: {exc}")
            return []

    def calculate_quality_status(self, frame: np.ndarray, detections: List[DetectionResult], fps: float) -> str:
        if frame is None or frame.size == 0:
            return "Poor Visibility"
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        laplacian_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        mean_lum = float(np.mean(gray))
        if mean_lum < 20 or mean_lum > 240 or laplacian_var < 30.0:
            return "Poor Visibility"
        if laplacian_var < 70.0 or fps < 10.0:
            return "Low Quality"
        if detections:
            avg_conf = sum(det.confidence for det in detections) / len(detections)
            return "Excellent" if avg_conf >= 0.70 and laplacian_var >= 100.0 and fps >= 20.0 else "Good"
        if laplacian_var >= 90.0 and 50 <= mean_lum <= 200 and fps >= 20.0:
            return "Good"
        return "Low Quality"
