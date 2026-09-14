"""Built-in webcam video source implementation using OpenCV."""

import cv2
import numpy as np
from typing import Tuple, Optional, Dict, Any
from app.camera.video_source import VideoSource
from app.utils.logger import logger


class WebcamSource(VideoSource):
    """Handles standard laptop built-in webcam captures."""
    def __init__(self, device_index: int = 0, target_width: int = 1280, target_height: int = 720, target_fps: int = 30):
        self.device_index = int(device_index)
        self.target_width = target_width
        self.target_height = target_height
        self.target_fps = target_fps
        self.cap: Optional[cv2.VideoCapture] = None
        self._is_connected = False

    def connect(self) -> bool:
        try:
            self.disconnect()
            # On Windows cv2.CAP_DSHOW provides fast, reliable camera initialization
            self.cap = cv2.VideoCapture(self.device_index, cv2.CAP_ANY)
            if not self.cap.isOpened():
                logger.warning(f"Unable to open built-in webcam at index {self.device_index}")
                self._is_connected = False
                return False

            self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.target_width)
            self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.target_height)
            self.cap.set(cv2.CAP_PROP_FPS, self.target_fps)

            # Test frame read
            ret, _ = self.cap.read()
            self._is_connected = ret
            if ret:
                logger.info(f"Connected to built-in webcam [index={self.device_index}]")
            else:
                logger.warning(f"Webcam [index={self.device_index}] opened but failed reading test frame")
            return self._is_connected
        except Exception as e:
            logger.error(f"Exception connecting to webcam index {self.device_index}: {e}")
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
            logger.error(f"Error reading frame from webcam: {e}")
            self._is_connected = False
            return False, None

    def get_properties(self) -> Dict[str, Any]:
        if not self.is_connected():
            return {"width": 0, "height": 0, "fps": 0, "status": "Disconnected"}
        w = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        h = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps = int(self.cap.get(cv2.CAP_PROP_FPS)) or self.target_fps
        return {
            "width": w,
            "height": h,
            "fps": fps,
            "status": "Online"
        }
