"""Statistics Page displaying aggregated daily computer vision metrics and charts."""

try:
    from PySide6.QtWidgets import (
        QWidget, QVBoxLayout, QHBoxLayout, QLabel, QFrame, QGridLayout, QScrollArea
    )
    from PySide6.QtCore import Qt
    PYSIDE_AVAILABLE = True
except ImportError:
    PYSIDE_AVAILABLE = False
    class QWidget:
        pass

from app.services.statistics_service import StatisticsService
from app.ui.widgets.statistics_card import StatisticsCardWidget


class StatisticsPage(QWidget if PYSIDE_AVAILABLE else object):
    """Historical and aggregated detection metrics screen."""

    def __init__(self, stats_service: StatisticsService = None, parent=None):
        if PYSIDE_AVAILABLE:
            super().__init__(parent)
        self.stats_service = stats_service or StatisticsService()
        if PYSIDE_AVAILABLE:
            self._init_ui()

    def _init_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(20, 20, 20, 20)
        layout.setSpacing(16)

        title = QLabel("DETECTION STATISTICS & ANALYTICS")
        title.setStyleSheet("font-size: 18px; font-weight: 700; color: #FFFFFF;")
        layout.addWidget(title)

        summary = self.stats_service.get_dashboard_summary()
        today = summary["today_counts"]
        speeds = summary["speed_metrics"]

        # Metric Cards Grid
        grid = QGridLayout()
        grid.setSpacing(12)

        card_people = StatisticsCardWidget("Total People Detected", f"{today['people']:,}", "Active pedestrian counts")
        card_cars = StatisticsCardWidget("Total Cars Detected", f"{today['cars']:,}", "Automotive detections")
        card_bicycles = StatisticsCardWidget("Total Bicycles Detected", f"{today['bicycles']:,}", "Cyclist movements")
        card_cameras = StatisticsCardWidget("Total Cameras Detected", f"{today['cameras']:,}", "Optical devices")

        card_avg_speed = StatisticsCardWidget("Estimated Avg Vehicle Speed", f"{speeds['avg_speed_kmh']} km/h", "Calibrated trajectory factor")
        card_max_speed = StatisticsCardWidget("Maximum Estimated Speed", f"{speeds['max_speed_kmh']} km/h", "Peak speed event")
        card_alerts = StatisticsCardWidget("System Alerts Logged", "7", "Threshold warnings")
        card_status = StatisticsCardWidget("Detection Uptime", "99.8%", "Continuous stream analysis")

        grid.addWidget(card_people, 0, 0)
        grid.addWidget(card_cars, 0, 1)
        grid.addWidget(card_bicycles, 0, 2)
        grid.addWidget(card_cameras, 0, 3)

        grid.addWidget(card_avg_speed, 1, 0)
        grid.addWidget(card_max_speed, 1, 1)
        grid.addWidget(card_alerts, 1, 2)
        grid.addWidget(card_status, 1, 3)

        layout.addLayout(grid)

        # Activity Distribution Chart Frame
        chart_frame = QFrame()
        chart_frame.setStyleSheet("""
            QFrame {
                background-color: #12374C;
                border: 1px solid #1E4B65;
                border-radius: 8px;
                padding: 16px;
            }
        """)
        chart_layout = QVBoxLayout(chart_frame)

        c_title = QLabel("HOURLY TRAFFIC & PEDESTRIAN DISTRIBUTION")
        c_title.setStyleSheet("color: #C9A845; font-size: 13px; font-weight: 700; margin-bottom: 8px;")
        chart_layout.addWidget(c_title)

        # Hourly breakdown row
        bars_row = QHBoxLayout()
        bars_row.setSpacing(4)

        for item in summary["hourly_trends"][-12:]:
            col = QVBoxLayout()
            col.setAlignment(Qt.AlignBottom)

            # Vehicle height bar
            v_val = min(120, item["vehicles"] * 2)
            bar_v = QFrame()
            bar_v.setFixedHeight(v_val)
            bar_v.setStyleSheet("background-color: #C9A845; border-radius: 2px;")
            col.addWidget(bar_v)

            # Hour label
            lbl = QLabel(item["hour"].split(":")[0])
            lbl.setStyleSheet("color: #6B8290; font-size: 10px;")
            lbl.setAlignment(Qt.AlignCenter)
            col.addWidget(lbl)

            bars_row.addLayout(col)

        chart_layout.addLayout(bars_row)
        layout.addWidget(chart_frame)
        layout.addStretch()
