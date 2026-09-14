"""Database data structures and entity models for VisionX AI."""

from dataclasses import dataclass
from typing import Optional


@dataclass
class CameraModel:
    id: str
    name: str
    camera_type: str
    source: str
    status: str = "Offline"
    width: int = 1280
    height: int = 720
    fps: int = 30
    location: str = "Main"
    created_at: Optional[str] = None


@dataclass
class DetectionEventModel:
    id: Optional[int]
    camera_id: str
    timestamp: str
    category: str
    track_id: int
    confidence: float
    speed_kmh: Optional[float] = None
    plate_text: Optional[str] = None
    plate_conf: Optional[float] = None
    color: Optional[str] = None
    direction: Optional[str] = None
    crop_path: Optional[str] = None


@dataclass
class AlertModel:
    id: Optional[int]
    timestamp: str
    alert_type: str
    severity: str  # "INFO", "WARNING", "CRITICAL"
    message: str
    camera_id: str
    track_id: Optional[int] = None
    acknowledged: bool = False


@dataclass
class CaptureRecordModel:
    id: Optional[int]
    timestamp: str
    camera_id: str
    original_path: str
    enhanced_path: Optional[str] = None
    detected_count: int = 0
    notes: Optional[str] = None
