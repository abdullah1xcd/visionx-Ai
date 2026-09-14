"""Alerts Page for reviewing speed threshold warnings and camera connection events."""

try:
    from PySide6.QtWidgets import (
        QWidget, QVBoxLayout, QHBoxLayout, QLabel, QPushButton,
        QScrollArea, QFrame
    )
    from PySide6.QtCore import Qt
    PYSIDE_AVAILABLE = True
except ImportError:
    PYSIDE_AVAILABLE = False
    class QWidget:
        pass

from app.services.alert_service import AlertService
from app.ui.widgets.alert_card import AlertCardWidget
from app.database.models import AlertModel


class AlertsPage(QWidget if PYSIDE_AVAILABLE else object):
    """Notification and event log screen."""

    def __init__(self, alert_service: AlertService = None, parent=None):
        if PYSIDE_AVAILABLE:
            super().__init__(parent)
        self.alert_service = alert_service or AlertService()
        if PYSIDE_AVAILABLE:
            self._init_ui()

    def _init_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(20, 20, 20, 20)
        layout.setSpacing(14)

        header = QHBoxLayout()
        title = QLabel("SYSTEM & DETECTION ALERTS")
        title.setStyleSheet("font-size: 18px; font-weight: 700; color: #FFFFFF;")
        header.addWidget(title)
        header.addStretch()

        clear_btn = QPushButton("Acknowledge All")
        clear_btn.setStyleSheet("""
            QPushButton {
                background-color: #183D53;
                color: #FFFFFF;
                border: 1px solid #1E4B65;
                border-radius: 5px;
                padding: 6px 14px;
            }
            QPushButton:hover { border-color: #C9A845; }
        """)
        clear_btn.clicked.connect(self._on_clear_all)
        header.addWidget(clear_btn)
        layout.addLayout(header)

        # Alerts List
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setStyleSheet("background: transparent; border: none;")

        self.list_container = QWidget()
        self.list_layout = QVBoxLayout(self.list_container)
        self.list_layout.setSpacing(10)

        self.refresh_alerts()

        scroll.setWidget(self.list_container)
        layout.addWidget(scroll)

    def refresh_alerts(self):
        if not PYSIDE_AVAILABLE:
            return

        while self.list_layout.count():
            item = self.list_layout.takeAt(0)
            if item.widget():
                item.widget().deleteLater()

        alerts = self.alert_service.get_recent_alerts(30)
        if not alerts:
            # Seed default demo alerts if database is fresh
            demo_alerts = [
                AlertModel(1, "15:42:10", "SPEED_WARNING", "WARNING", "Vehicle #07 Estimated speed: 91 km/h (Threshold: 80 km/h exceeded)", "CAM-01", 7, False),
                AlertModel(2, "14:15:02", "CAMERA_STATUS", "INFO", "Camera CAM-02 Parking Access connected successfully", "CAM-02", None, True),
                AlertModel(3, "12:05:44", "OCR_LOW_CONFIDENCE", "INFO", "Plate OCR confidence below threshold (68%) — manual check suggested", "CAM-01", 4, True)
            ]
            for a in demo_alerts:
                self.alert_service.repo.add_alert(a)
            alerts = demo_alerts

        for a in alerts:
            card = AlertCardWidget(
                alert_id=a.id or 1,
                severity=a.severity,
                timestamp=a.timestamp,
                message=a.message,
                camera_id=a.camera_id
            )
            card.dismiss_clicked.connect(self._on_dismiss)
            self.list_layout.addWidget(card)

        self.list_layout.addStretch()

    def _on_dismiss(self, alert_id: int):
        self.alert_service.acknowledge_alert(alert_id)
        self.refresh_alerts()

    def _on_clear_all(self):
        alerts = self.alert_service.get_recent_alerts()
        for a in alerts:
            if a.id:
                self.alert_service.acknowledge_alert(a.id)
        self.refresh_alerts()
