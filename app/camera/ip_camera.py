"""IP / CCTV camera video source supporting RTSP/HTTP streams with low latency."""

import os
import cv2
import numpy as np
from typing import Tuple, Optional, Dict, Any
from app.camera.video_source import VideoSource
from app.utils.logger import logger


class IPCameraSource(VideoSource):
    """Handles RTSP and HTTP IP camera network streams."""
    def __init__(self, rtsp_url: str, target_width: int = 1920, target_height: int = 1080, target_fps: int = 30):
        self.rtsp_url = rtsp_url.strip()
        self.target_width = target_width
        self.target_height = target_height
        self.target_fps = target_fps
        self.cap: Optional[cv2.VideoCapture] = None
        self._is_connected = False

    def connect(self) -> bool:
        try:
            self.disconnect()
            # Set ffmpeg RTSP transport to TCP for maximum stability and packet loss prevention
            os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp|max_delay;500000|buffer_size;1024000"

            self.cap = cv2.VideoCapture(self.rtsp_url, cv2.CAP_FFMPEG)
            # Reduce internal frame buffer to 1 for live real-time analysis
            self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

            if not self.cap.isOpened():
                logger.warning(f"Failed to open IP camera stream: {self.rtsp_url}")
                self._is_connected = False
                return False

            ret, _ = self.cap.read()
            self._is_connected = ret
            if ret:
                logger.info(f"Successfully connected to RTSP stream: {self.rtsp_url}")
            return self._is_connected
        except Exception as e:
            logger.error(f"Error opening RTSP IP camera {self.rtsp_url}: {e}")
            self._is_connected = False
            return False

    def disconnect(self) -> None:
        if self.cap is not None:
            try:
                self.cap.release()
            except Exception:
                pass
            self.cap = None
        self._is_connected = False

    def is_connected(self) -> bool:
        return self._is_connected and self.cap is not None and self.cap.isOpened()

    def read_frame(self) -> Tuple[bool, Optional[np.ndarray]]:
        if not self.is_connected():
            return False, None
        try:
            ret, frame = self.cap.read()
            if not ret or frame is None:
                self._is_connected = False
                return False, None
            return True, frame
        except Exception as e:
            logger.error(f"Error reading RTSP frame: {e}")
            self._is_connected = False
            return False, None

    def get_properties(self) -> Dict[str, Any]:
        if not self.is_connected():
            return {"width": 0, "height": 0, "fps": 0, "status": "Offline"}
        w = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH)) or self.target_width
        h = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) or self.target_height
        fps = int(self.cap.get(cv2.CAP_PROP_FPS)) or self.target_fps
        return {"width": w, "height": h, "fps": fps, "status": "Online"}
