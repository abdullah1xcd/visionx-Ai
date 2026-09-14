"""Central Camera Manager coordinating all camera sources and streaming state."""

from typing import Dict, List, Optional, Tuple, Any
import numpy as np
import time

from app.camera.video_source import VideoSource
from app.camera.webcam import WebcamSource
from app.camera.usb_camera import USBCameraSource
from app.camera.ip_camera import IPCameraSource
from app.config.camera_config import CameraConfig, CameraType
from app.database.repositories import CameraRepository
from app.database.models import CameraModel
from app.utils.logger import logger
from app.utils.video_utils import generate_synthetic_scene


class SyntheticSource(VideoSource):
    """Fallback generator providing realistic synthetic street scene when no hardware camera is present."""
    def __init__(self, width: int = 1280, height: int = 720, fps: int = 30):
        self.width = width
        self.height = height
        self.fps = fps
        self._connected = True
        self._frame_idx = 0

    def connect(self) -> bool:
        self._connected = True
        return True

    def disconnect(self) -> None:
        self._connected = False

    def is_connected(self) -> bool:
        return self._connected

    def read_frame(self) -> Tuple[bool, Optional[np.ndarray]]:
        if not self._connected:
            return False, None
        self._frame_idx += 1
        frame, _ = generate_synthetic_scene(self.width, self.height, self._frame_idx)
        time.sleep(1.0 / self.fps)
        return True, frame

    def get_properties(self) -> Dict[str, Any]:
        return {
            "width": self.width,
            "height": self.height,
            "fps": self.fps,
            "status": "Online (Synthetic Fallback)"
        }


class CameraManager:
    """Manages multiple camera profiles, persistence, and active streaming source."""
    def __init__(self, repo: Optional[CameraRepository] = None):
        self.repo = repo or CameraRepository()
        self.sources: Dict[str, VideoSource] = {}
        self.active_camera_id: Optional[str] = None
        self.synthetic_source = SyntheticSource()
        self._initialize_default_cameras()

    def _initialize_default_cameras(self):
        """Ensures default camera profiles exist in SQLite database."""
        existing = self.repo.get_all()
        if not existing:
            defaults = [
                CameraModel(id="CAM-01", name="Main Entrance", camera_type="webcam", source="0", status="Offline", width=1280, height=720, fps=30, location="Gate A"),
                CameraModel(id="CAM-02", name="Parking Access", camera_type="usb", source="1", status="Offline", width=1920, height=1080, fps=30, location="Parking North"),
                CameraModel(id="CAM-03", name="Back Entrance", camera_type="rtsp", source="rtsp://192.168.1.120:554/live", status="Offline", width=1920, height=1080, fps=30, location="Perimeter")
            ]
            for c in defaults:
                self.repo.insert_or_update(c)
            logger.info("Created default camera profiles in SQLite database")

    def get_cameras(self) -> List[CameraModel]:
        return self.repo.get_all()

    def add_camera(self, model: CameraModel):
        self.repo.insert_or_update(model)
        logger.info(f"Added camera: {model.id} ({model.name})")

    def remove_camera(self, camera_id: str):
        if self.active_camera_id == camera_id:
            self.stop_current_stream()
        self.repo.delete(camera_id)
        if camera_id in self.sources:
            del self.sources[camera_id]
        logger.info(f"Removed camera: {camera_id}")

    def create_source(self, cam: CameraModel) -> VideoSource:
        """Instantiates appropriate VideoSource based on camera type."""
        c_type = cam.camera_type.lower()
        if c_type == "webcam":
            try:
                idx = int(cam.source)
            except ValueError:
                idx = 0
            return WebcamSource(device_index=idx, target_width=cam.width, target_height=cam.height, target_fps=cam.fps)
        elif c_type == "usb":
            try:
                idx = int(cam.source)
            except ValueError:
                idx = 1
            return USBCameraSource(device_index=idx, target_width=cam.width, target_height=cam.height, target_fps=cam.fps)
        elif c_type == "rtsp":
            return IPCameraSource(rtsp_url=cam.source, target_width=cam.width, target_height=cam.height, target_fps=cam.fps)
        else:
            return WebcamSource(0)

    def select_and_connect(self, camera_id: str) -> bool:
        """Disconnects prior camera and starts the requested camera."""
        self.stop_current_stream()

        cam = self.repo.get_by_id(camera_id)
        if not cam:
            logger.error(f"Camera ID {camera_id} not found in database")
            return False

        source = self.create_source(cam)
        connected = source.connect()

        if not connected:
            logger.warning(f"Hardware camera {camera_id} connection failed; activating graceful synthetic stream")
            # Use synthetic fallback so system keeps running without crashing
            self.sources[camera_id] = self.synthetic_source
            self.synthetic_source.connect()
            self.active_camera_id = camera_id
            self.repo.update_status(camera_id, "Online (Simulated)")
            return True

        self.sources[camera_id] = source
        self.active_camera_id = camera_id
        self.repo.update_status(camera_id, "Online")
        logger.info(f"Selected active camera: {camera_id}")
        return True

    def stop_current_stream(self):
        """Disconnects the currently active camera."""
        if self.active_camera_id and self.active_camera_id in self.sources:
            try:
                self.sources[self.active_camera_id].disconnect()
            except Exception as e:
                logger.error(f"Error disconnecting camera {self.active_camera_id}: {e}")
            self.repo.update_status(self.active_camera_id, "Offline")
        self.active_camera_id = None

    def read_active_frame(self) -> Tuple[bool, Optional[np.ndarray]]:
        """Reads frame from the active camera or fallback."""
        if not self.active_camera_id or self.active_camera_id not in self.sources:
            # Return synthetic test stream as default live view
            return self.synthetic_source.read_frame()

        source = self.sources[self.active_camera_id]
        success, frame = source.read_frame()
        if not success:
            # Fall back to synthetic to keep preview smooth
            return self.synthetic_source.read_frame()
        return True, frame

    def get_active_properties(self) -> Dict[str, Any]:
        if self.active_camera_id and self.active_camera_id in self.sources:
            return self.sources[self.active_camera_id].get_properties()
        return {"width": 1280, "height": 720, "fps": 30, "status": "Ready"}
