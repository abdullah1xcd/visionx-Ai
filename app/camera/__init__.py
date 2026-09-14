"""Camera package for VisionX AI."""
from .video_source import VideoSource
from .webcam import WebcamSource
from .usb_camera import USBCameraSource
from .ip_camera import IPCameraSource
from .camera_manager import CameraManager, SyntheticSource

__all__ = [
    "VideoSource",
    "WebcamSource",
    "USBCameraSource",
    "IPCameraSource",
    "CameraManager",
    "SyntheticSource"
]
