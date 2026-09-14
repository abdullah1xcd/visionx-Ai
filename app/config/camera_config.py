"""Configuration models for camera sources in VisionX AI."""

from dataclasses import dataclass
from enum import Enum
from typing import Optional


class CameraType(str, Enum):
    WEBCAM = "webcam"
    USB = "usb"
    RTSP = "rtsp"
    VIDEO_FILE = "file"


@dataclass
class CameraConfig:
    """Represents a configured camera source."""
    id: str
    name: str
    camera_type: CameraType
    source: str  # e.g., "0", "1", "rtsp://192.168.1.100:554/live", or file path
    enabled: bool = True
    width: int = 1280
    height: int = 720
    fps: int = 30
    location: str = "Main Zone"
    status: str = "Offline"  # "Online", "Offline", "Error", "Connecting"
