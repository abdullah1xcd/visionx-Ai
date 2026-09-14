"""VisionX AI Application Settings and Configuration."""

import os
from pathlib import Path
from dataclasses import dataclass, field
from typing import List, Dict, Any

# Root Project Directory
ROOT_DIR = Path(__file__).resolve().parent.parent.parent

# Base directories
DATA_DIR = ROOT_DIR / "data"
DATABASE_DIR = DATA_DIR / "database"
CAPTURES_DIR = DATA_DIR / "captures"
ENHANCED_DIR = DATA_DIR / "enhanced"
LOGS_DIR = DATA_DIR / "logs"
MODELS_DIR = ROOT_DIR / "models"
DETECTION_MODELS_DIR = MODELS_DIR / "detection"
PLATE_MODELS_DIR = MODELS_DIR / "license_plate"
ENHANCEMENT_MODELS_DIR = MODELS_DIR / "enhancement"

# Ensure runtime directories exist
for p in [DATABASE_DIR, CAPTURES_DIR, ENHANCED_DIR, LOGS_DIR, DETECTION_MODELS_DIR, PLATE_MODELS_DIR, ENHANCEMENT_MODELS_DIR]:
    p.mkdir(parents=True, exist_ok=True)


@dataclass
class DetectionSettings:
    """Detection engine configuration with class-specific thresholds and inference resolutions."""
    model_name: str = "yolov8n.pt"
    custom_model_path: str = str(DETECTION_MODELS_DIR / "yolo_model.pt")
    # Inference resolution: 640, 960, or 1280
    inference_resolution: int = 640
    # Class-specific confidence thresholds
    person_threshold: float = 0.35
    car_threshold: float = 0.35
    bicycle_threshold: float = 0.30
    camera_threshold: float = 0.30
    default_threshold: float = 0.35
    iou_threshold: float = 0.45
    # Adaptive conditional preprocessing
    enable_conditional_preprocessing: bool = True
    # Target supported classes for VisionX AI V1
    target_classes: List[str] = field(default_factory=lambda: ["person", "car", "bicycle", "camera"])
    target_class_ids: List[int] = field(default_factory=lambda: [0, 1, 2])
    device: str = "auto"  # 'auto', 'cuda', or 'cpu'


@dataclass
class NightVisionSettings:
    """Night Vision mode and image processing parameters."""
    mode: str = "auto"  # 'auto', 'day', 'night'
    auto_luminance_threshold: float = 55.0  # Mean brightness below which auto activates
    gamma: float = 0.60  # Shadow lifting gamma factor
    clahe_clip_limit: float = 2.5
    clahe_tile_grid: int = 8
    denoise_strength: int = 7
    sharpen_weight: float = 1.3
    supports_hardware_ir: bool = False
    hardware_ir_mode: str = "off"  # 'auto', 'on', 'off'


@dataclass
class TrackingSettings:
    """Tracker configuration with temporal smoothing."""
    tracker_type: str = "bytetrack"  # 'bytetrack' or 'botsort'
    track_high_thresh: float = 0.45
    track_low_thresh: float = 0.15
    new_track_thresh: float = 0.50
    track_buffer: int = 45  # Extended persistence to avoid ID flipping during occlusions
    match_thresh: float = 0.70
    bbox_smoothing_factor: float = 0.75  # Exponential moving average for jitter reduction


@dataclass
class VehicleSettings:
    """Vehicle analysis & license plate OCR settings."""
    enable_plate_detection: bool = True
    plate_model_path: str = str(PLATE_MODELS_DIR / "plate_model.pt")
    ocr_engine: str = "paddleocr"  # 'paddleocr' or 'easyocr'
    ocr_confidence_threshold: float = 0.50
    speed_threshold_warning: float = 80.0  # km/h
    # Calibration: meters per pixel displacement per second factor
    speed_calibration_factor: float = 0.08


@dataclass
class QualityEnhancementSettings:
    """Quality analysis and image enhancement settings."""
    blur_threshold: float = 100.0  # Laplacian variance threshold
    low_light_threshold: float = 65.0  # Mean luminance
    auto_enhance_poor_crops: bool = True
    denoise_strength: int = 10
    sharpen_amount: float = 1.5
    contrast_clahe_clip: float = 2.0


@dataclass
class AppSettings:
    """Global VisionX AI configuration."""
    app_name: str = "VISIONX AI"
    subtitle: str = "Intelligent Computer Vision & Object Analysis"
    version: str = "1.0.0"
    database_path: str = str(DATABASE_DIR / "visionx.db")
    theme: str = "dark"
    log_level: str = "INFO"
    fps_limit: int = 30
    
    detection: DetectionSettings = field(default_factory=DetectionSettings)
    night_vision: NightVisionSettings = field(default_factory=NightVisionSettings)
    tracking: TrackingSettings = field(default_factory=TrackingSettings)
    vehicle: VehicleSettings = field(default_factory=VehicleSettings)
    quality: QualityEnhancementSettings = field(default_factory=QualityEnhancementSettings)


# Global singleton instance
settings = AppSettings()
