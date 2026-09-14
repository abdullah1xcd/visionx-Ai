"""UI widgets package for VisionX AI."""
from .camera_view import CameraViewWidget
from .object_card import ObjectCardWidget
from .detection_overlay import FilterButtonGroup
from .camera_selector import CameraSelectorWidget
from .statistics_card import StatisticsCardWidget
from .alert_card import AlertCardWidget

__all__ = [
    "CameraViewWidget",
    "ObjectCardWidget",
    "FilterButtonGroup",
    "CameraSelectorWidget",
    "StatisticsCardWidget",
    "AlertCardWidget"
]
