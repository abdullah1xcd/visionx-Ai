"""Capture & Analysis service handling frame freezing, crop extraction, and enhancement."""

import os
from datetime import datetime
from typing import Optional, Dict, Any, List
import numpy as np
import cv2

from app.config.settings import CAPTURES_DIR, ENHANCED_DIR
from app.ai.quality_analyzer import QualityAnalyzer, QualityReport
from app.ai.enhancement import ImageEnhancementPipeline, EnhancementResult
from app.vehicle.plate_detector import LicensePlateDetector
from app.vehicle.plate_ocr import LicensePlateOCR, OCRResult
from app.database.repositories import CaptureRepository
from app.database.models import CaptureRecordModel
from app.utils.logger import logger
from app.utils.image_utils import safe_crop


class CaptureService:
    """Manages frozen frame inspection, artifact storage, and on-demand AI enhancement."""

    def __init__(self, repo: Optional[CaptureRepository] = None):
        self.repo = repo or CaptureRepository()
        self.quality_analyzer = QualityAnalyzer()
        self.enhancer = ImageEnhancementPipeline()
        self.plate_detector = LicensePlateDetector()
        self.plate_ocr = LicensePlateOCR()

    def process_capture(
        self,
        camera_id: str,
        frame: np.ndarray,
        detected_objects: List[Dict[str, Any]],
        selected_index: int = 0
    ) -> Dict[str, Any]:
        """Freezes frame, saves original, analyzes selected object crop, enhances, and saves."""
        if frame is None or frame.size == 0:
            return {"success": False, "error": "Empty frame"}

        timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
        orig_filename = f"capture_{camera_id}_{timestamp_str}.jpg"
        orig_path = str(CAPTURES_DIR / orig_filename)

        # Save original full frame
        cv2.imwrite(orig_path, frame)

        selected_obj = None
        crop = None
        quality_report = None
        enhancement_result = None
        plate_crop = None
        ocr_result = None

        if detected_objects and 0 <= selected_index < len(detected_objects):
            selected_obj = detected_objects[selected_index]
            bbox = selected_obj.get("bbox")
            if bbox:
                crop = safe_crop(frame, bbox)
                if crop is not None:
                    # 1. Quality analysis
                    quality_report = self.quality_analyzer.analyze(crop)

                    # 2. Enhancement
                    enhancement_result = self.enhancer.enhance(crop)

                    # Save enhanced crop
                    enhanced_filename = f"enhanced_{camera_id}_{timestamp_str}.jpg"
                    enhanced_path = str(ENHANCED_DIR / enhanced_filename)
                    cv2.imwrite(enhanced_path, enhancement_result.enhanced)

                    # 3. If vehicle, run license plate detection and OCR
                    if selected_obj.get("category", "").lower() == "car":
                        has_plate, plate_box, plate_crop = self.plate_detector.detect_plate(crop)
                        if plate_crop is not None:
                            ocr_result = self.plate_ocr.read_plate(plate_crop)

        # Record into database
        cap_model = CaptureRecordModel(
            id=None,
            timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            camera_id=camera_id,
            original_path=orig_path,
            enhanced_path=str(ENHANCED_DIR / f"enhanced_{camera_id}_{timestamp_str}.jpg") if enhancement_result else None,
            detected_count=len(detected_objects),
            notes=f"Selected: {selected_obj.get('category') if selected_obj else 'None'}"
        )
        self.repo.add_capture(cap_model)

        return {
            "success": True,
            "original_path": orig_path,
            "selected_object": selected_obj,
            "quality_report": quality_report,
            "enhancement_result": enhancement_result,
            "plate_crop": plate_crop,
            "ocr_result": ocr_result,
            "detected_count": len(detected_objects)
        }
