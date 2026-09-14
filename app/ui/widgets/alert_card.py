"""Alert display item card widget."""

try:
    from PySide6.QtWidgets import QFrame, QHBoxLayout, QVBoxLayout, QLabel, QPushButton
    from PySide6.QtCore import Signal
    PYSIDE_AVAILABLE = True
except ImportError:
    PYSIDE_AVAILABLE = False
    class QFrame:
        pass


class AlertCardWidget(QFrame if PYSIDE_AVAILABLE else object):
    """Alert card display for system warnings and threshold events."""

    if PYSIDE_AVAILABLE:
        dismiss_clicked = Signal(int)

    def __init__(self, alert_id: int, severity: str, timestamp: str, message: str, camera_id: str, parent=None):
        if PYSIDE_AVAILABLE:
            super().__init__(parent)
            self.alert_id = alert_id

            badge_color = "#E74C3C" if severity == "CRITICAL" else "#F39C12" if severity == "WARNING" else "#3498DB"

            self.setStyleSheet(f"""
                QFrame {{
                    background-color: #12374C;
                    border: 1px solid #1E4B65;
                    border-left: 4px solid {badge_color};
                    border-radius: 6px;
                    padding: 8px 12px;
                }}
            """)

            layout = QHBoxLayout(self)
            layout.setContentsMargins(8, 8, 8, 8)

            info_layout = QVBoxLayout()
            info_layout.setSpacing(3)

            top_row = QHBoxLayout()
            sev_lbl = QLabel(f"[{severity}]")
            sev_lbl.setStyleSheet(f"color: {badge_color}; font-weight: 700; font-size: 11px;")
            top_row.addWidget(sev_lbl)

            cam_lbl = QLabel(f"Camera: {camera_id}")
            cam_lbl.setStyleSheet("color: #C9A845; font-size: 11px;")
            top_row.addWidget(cam_lbl)

            time_lbl = QLabel(timestamp)
            time_lbl.setStyleSheet("color: #6B8290; font-size: 11px;")
            top_row.addWidget(time_lbl)
            top_row.addStretch()

            info_layout.addLayout(top_row)

            msg_lbl = QLabel(message)
            msg_lbl.setStyleSheet("color: #FFFFFF; font-size: 13px;")
            msg_lbl.setWordWrap(True)
            info_layout.addWidget(msg_lbl)

            layout.addLayout(info_layout, stretch=1)

            dismiss_btn = QPushButton("Acknowledge")
            dismiss_btn.setStyleSheet("""
                QPushButton {
                    background-color: #183D53;
                    color: #94AAB7;
                    border: 1px solid #1E4B65;
                    border-radius: 4px;
                    padding: 6px 10px;
                    font-size: 11px;
                }
                QPushButton:hover {
                    color: #FFFFFF;
                    border-color: #C9A845;
                }
            """)
            dismiss_btn.clicked.connect(lambda: self.dismiss_clicked.emit(self.alert_id))
            layout.addWidget(dismiss_btn)
