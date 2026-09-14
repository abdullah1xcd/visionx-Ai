"""UI Pages package for VisionX AI."""
from .dashboard_page import DashboardPage
from .cameras_page import CamerasPage
from .statistics_page import StatisticsPage
from .alerts_page import AlertsPage
from .settings_page import SettingsPage

__all__ = [
    "DashboardPage",
    "CamerasPage",
    "StatisticsPage",
    "AlertsPage",
    "SettingsPage"
]
