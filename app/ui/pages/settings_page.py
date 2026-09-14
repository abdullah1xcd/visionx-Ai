"""Settings Page for configuring inference thresholds, hardware selection, and speed calibration."""

try:
    from PySide6.QtWidgets import (
        QWidget, QVBoxLayout, QHBoxLayout, QLabel, QPushButton,
        QSlider, QComboBox, QLineEdit, QDoubleSpinBox, QFrame, QScrollArea
    )
    from PySide6.QtCore import Qt
    PYSIDE_AVAILABLE = True
except ImportError:
    PYSIDE_AVAILABLE = False
    class QWidget:
        pass

from app.config.settings import settings
from app.utils.performance import detect_compute_device


class SettingsPage(QWidget if PYSIDE_AVAILABLE else object):
    """Application preferences and hardware calibration screen."""

    def __init__(self, parent=None):
        if PYSIDE_AVAILABLE:
            super().__init__(parent)
        self.device, self.device_desc = detect_compute_device()
        if PYSIDE_AVAILABLE:
            self._init_ui()

    def _init_ui(self):
        main_layout = QVBoxLayout(self)
        main_layout.setContentsMargins(20, 20, 20, 20)
        main_layout.setSpacing(14)

        title = QLabel("APPLICATION SETTINGS")
        title.setStyleSheet("font-size: 18px; font-weight: 700; color: #FFFFFF;")
        main_layout.addWidget(title)

        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setStyleSheet("background: transparent; border: none;")

        container = QWidget()
        layout = QVBoxLayout(container)
        layout.setSpacing(16)

        # 1. AI Inference & Hardware Engine
        g1 = self._create_group_box("AI Inference & Hardware Acceleration")
        g1_layout = QVBoxLayout(g1)

        row_hw = QHBoxLayout()
        row_hw.addWidget(QLabel("Compute Engine:"))
        self.combo_engine = QComboBox()
        self.combo_engine.addItem(f"Automatic ({self.device_desc})", "auto")
        self.combo_engine.addItem("NVIDIA CUDA GPU (if available)", "cuda")
        self.combo_engine.addItem("CPU Engine (Fallback)", "cpu")
        row_hw.addWidget(self.combo_engine)
        g1_layout.addLayout(row_hw)

        row_conf = QHBoxLayout()
        self.lbl_conf = QLabel(f"Confidence Threshold: {int(settings.detection.confidence_threshold * 100)}%")
        self.slider_conf = QSlider(Qt.Horizontal)
        self.slider_conf.setRange(20, 95)
        self.slider_conf.setValue(int(settings.detection.confidence_threshold * 100))
        self.slider_conf.valueChanged.connect(lambda v: self.lbl_conf.setText(f"Confidence Threshold: {v}%"))
        row_conf.addWidget(self.lbl_conf)
        row_conf.addWidget(self.slider_conf)
        g1_layout.addLayout(row_conf)

        layout.addWidget(g1)

        # 2. Tracking & Speed Estimation Calibration
        g2 = self._create_group_box("Tracking & Speed Calibration")
        g2_layout = QVBoxLayout(g2)

        row_track = QHBoxLayout()
        row_track.addWidget(QLabel("Tracking Engine:"))
        self.combo_track = QComboBox()
        self.combo_track.addItems(["ByteTrack (Recommended)", "BoT-SORT"])
        row_track.addWidget(self.combo_track)
        g2_layout.addLayout(row_track)

        row_calib = QHBoxLayout()
        row_calib.addWidget(QLabel("Speed Calibration Factor (Meters / Pixel):"))
        self.spin_calib = QDoubleSpinBox()
        self.spin_calib.setRange(0.01, 1.0)
        self.spin_calib.setSingleStep(0.01)
        self.spin_calib.setValue(settings.vehicle.speed_calibration_factor)
        row_calib.addWidget(self.spin_calib)
        g2_layout.addLayout(row_calib)

        row_speed_thresh = QHBoxLayout()
        row_speed_thresh.addWidget(QLabel("Speed Warning Threshold (km/h):"))
        self.spin_thresh = QDoubleSpinBox()
        self.spin_thresh.setRange(20.0, 200.0)
        self.spin_thresh.setValue(settings.vehicle.speed_threshold_warning)
        row_speed_thresh.addWidget(self.spin_thresh)
        g2_layout.addLayout(row_speed_thresh)

        layout.addWidget(g2)

        # 3. Storage & Persistence
        g3 = self._create_group_box("Storage & Paths")
        g3_layout = QVBoxLayout(g3)

        row_db = QHBoxLayout()
        row_db.addWidget(QLabel("SQLite Database:"))
        in_db = QLineEdit(settings.database_path)
        in_db.setReadOnly(True)
        row_db.addWidget(in_db)
        g3_layout.addLayout(row_db)

        layout.addWidget(g3)

        # 4. Safety & Verification Disclaimer (Mandatory)
        notice_box = QFrame()
        notice_box.setStyleSheet("""
            QFrame {
                background-color: #183D53;
                border-left: 4px solid #C9A845;
                border-radius: 6px;
                padding: 12px;
            }
        """)
        n_layout = QVBoxLayout(notice_box)
        n_lbl = QLabel("AI SAFETY & ACCURACY NOTICE:\nAll computer vision and OCR metrics are advisory estimates. AI analysis may contain errors. Always verify critical decisions against the original full-resolution image.")
        n_lbl.setStyleSheet("color: #FFFFFF; font-size: 11px; line-height: 1.4;")
        n_lbl.setWordWrap(True)
        n_layout.addWidget(n_lbl)
        layout.addWidget(notice_box)

        layout.addStretch()
        scroll.setWidget(container)
        main_layout.addWidget(scroll)

    def _create_group_box(self, title_str: str) -> QFrame:
        box = QFrame()
        box.setStyleSheet("""
            QFrame {
                background-color: #12374C;
                border: 1px solid #1E4B65;
                border-radius: 8px;
                padding: 14px;
            }
            QLabel { color: #FFFFFF; font-size: 12px; }
        """)
        lbl = QLabel(title_str.upper())
        lbl.setStyleSheet("color: #C9A845; font-weight: 700; font-size: 12px; border-bottom: 1px solid #1E4B65; padding-bottom: 6px; margin-bottom: 8px;")
        box_layout = QVBoxLayout(box)
        box_layout.addWidget(lbl)
        return box
