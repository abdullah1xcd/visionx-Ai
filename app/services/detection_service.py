"""Detection Service managing background video capture, Night Vision, and AI inference threading."""

from typing import Dict, Any, List, Optional, Tuple
import time
import numpy as np

try:
    from PySide6.QtCore import QThread, Signal, QObject
    PYSIDE_AVAILABLE = True
except ImportError:
    PYSIDE_AVAILABLE = False
    class QThread:
        pass
    class QObject:
        pass

from app.camera.camera_manager import CameraManager
from app.ai.detector import ObjectDetector, DetectionResult
from app.ai.tracker import ByteTracker
from app.ai.night_vision import NightVisionProcessor
from app.ai.classifier import VehicleClassifier
from app.ai.attribute_analyzer import AttributeAnalyzer
from app.vehicle.speed_estimator import SpeedEstimator
from app.services.alert_service import AlertService
from app.utils.logger import logger
from app.utils.performance import FPSMeter
from app.config.settings import settings


class DetectionWorker(QThread if PYSIDE_AVAILABLE else object):
    """Background worker thread decoupling video capture and heavy AI inference from UI thread."""

    if PYSIDE_AVAILABLE:
        # Signals emitted to UI thread
        # (frame, detections_list, counts_dict, night_vision_telemetry, quality_status)
        frame_ready = Signal(object, list, dict, dict, str)
        status_updated = Signal(str, str, float)  # (camera_id, status_str, fps)
        alert_emitted = Signal(object)           # AlertModel

    def __init__(self, camera_manager: CameraManager, detector: Optional[ObjectDetector] = None):
        if PYSIDE_AVAILABLE:
            super().__init__()
        self.camera_manager = camera_manager
        self.detector = detector or ObjectDetector()
        self.tracker = ByteTracker(
            max_lost_frames=settings.tracking.track_buffer,
            iou_thresh=settings.tracking.match_thresh,
            smoothing_factor=settings.tracking.bbox_smoothing_factor
        )
        self.night_vision = NightVisionProcessor(
            mode=settings.night_vision.mode,
            auto_threshold=settings.night_vision.auto_luminance_threshold,
            gamma=settings.night_vision.gamma,
            clahe_clip=settings.night_vision.clahe_clip_limit
        )
        self.speed_estimator = SpeedEstimator()
        self.alert_service = AlertService()
        self.fps_meter = FPSMeter()
        self.running = False
        self.filter_category: str = "ALL"  # "ALL", "PEOPLE", "CARS", "BICYCLES", "CAMERAS"

    def set_filter(self, category: str):
        """Sets the visual filter category without stopping detection engine."""
        self.filter_category = category.upper()

    def set_night_vision_mode(self, mode: str):
        """Switches Night Vision mode: 'auto', 'day', 'night'."""
        self.night_vision.set_mode(mode)
        settings.night_vision.mode = mode.lower()

    def set_inference_resolution(self, resolution: int):
        """Adjusts inference resolution: 640, 960, 1280."""
        self.detector.set_inference_resolution(resolution)
        settings.detection.inference_resolution = resolution

    def set_class_threshold(self, category: str, threshold: float):
        """Configures individual category confidence threshold."""
        self.detector.set_threshold(category, threshold)

    def run(self):
        """Main background loop."""
        self.running = True
        logger.info("Starting detection worker thread loop")

        while self.running:
            start_time = time.time()
            ret, raw_frame = self.camera_manager.read_active_frame()

            if not ret or raw_frame is None:
                time.sleep(0.03)
                continue

            fps = self.fps_meter.update()

            # 1. Night Vision Processing (Software Monochrome or Auto-detection)
            processed_frame, nv_active, nv_telemetry = self.night_vision.process_frame(raw_frame)

            # 2. Automatic object detection with class-specific thresholds
            raw_detections = self.detector.detect(processed_frame)

            # 3. Tracking: assign stable IDs and apply temporal smoothing
            tracked_detections = self.tracker.update(raw_detections)

            # 4. Calculate authentic AI detection quality indicator
            quality_status = self.detector.calculate_quality_status(raw_frame, tracked_detections, fps)

            # 5. Enrich detections with vehicle speed, classification, and person attributes
            enriched_list: List[Dict[str, Any]] = []
            active_track_ids = []

            for det in tracked_detections:
                t_id = det.track_id or 1
                active_track_ids.append(t_id)

                speed_kmh = None
                direction = "Stationary"
                vehicle_type = None
                attributes = {}

                if t_id in self.tracker.tracks:
                    track = self.tracker.tracks[t_id]
                    direction = track.direction

                if det.category == "car":
                    speed_kmh = self.speed_estimator.update(t_id, det.bbox)
                    vehicle_type = VehicleClassifier.classify_vehicle_type(None, det.bbox)
                    if speed_kmh is not None and speed_kmh > settings.vehicle.speed_threshold_warning:
                        alert = self.alert_service.check_speed_alert(
                            self.camera_manager.active_camera_id or "CAM-01",
                            t_id,
                            speed_kmh
                        )
                        if alert and PYSIDE_AVAILABLE:
                            self.alert_emitted.emit(alert)

                elif det.category == "person":
                    attributes = AttributeAnalyzer.analyze_person(None, None, direction)

                enriched_list.append({
                    "category": det.category,
                    "confidence": det.confidence,
                    "bbox": det.bbox,
                    "track_id": t_id,
                    "speed_kmh": speed_kmh,
                    "direction": direction,
                    "vehicle_type": vehicle_type,
                    "attributes": attributes
                })

            self.speed_estimator.cleanup(active_track_ids)
            live_counts = self.tracker.get_active_count()

            # 6. Emit to UI thread
            if PYSIDE_AVAILABLE:
                # Deliver original or night-vision frame along with detections and quality status
                display_frame = processed_frame if nv_active else raw_frame
                self.frame_ready.emit(display_frame, enriched_list, live_counts, nv_telemetry, quality_status)
                cam_id = self.camera_manager.active_camera_id or "CAM-01"
                self.status_updated.emit(cam_id, "Online", round(fps, 1))

            # Maintain sensible frame pace (~30 FPS max)
            elapsed = time.time() - start_time
            sleep_time = max(0.005, (1.0 / 30.0) - elapsed)
            time.sleep(sleep_time)

    def stop(self):
        """Stops the worker thread cleanly."""
        self.running = False
        if PYSIDE_AVAILABLE and hasattr(self, "wait"):
            self.wait(1000)
        logger.info("Detection worker stopped")
