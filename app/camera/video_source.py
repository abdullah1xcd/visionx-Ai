"""Abstract base class for all video sources in VisionX AI."""

from abc import ABC, abstractmethod
from typing import Tuple, Optional, Dict, Any
import numpy as np


class VideoSource(ABC):
    """Abstract interface that every camera or video stream source must implement."""

    @abstractmethod
    def connect(self) -> bool:
        """Establishes connection to the video stream source."""
        pass

    @abstractmethod
    def disconnect(self) -> None:
        """Closes and releases the underlying capture device/stream."""
        pass

    @abstractmethod
    def is_connected(self) -> bool:
        """Returns True if the source is currently open and providing frames."""
        pass

    @abstractmethod
    def read_frame(self) -> Tuple[bool, Optional[np.ndarray]]:
        """Reads and returns the next (success, bgr_frame) tuple."""
        pass

    @abstractmethod
    def get_properties(self) -> Dict[str, Any]:
        """Returns dictionary with resolution, actual fps, and device backend metadata."""
        pass
