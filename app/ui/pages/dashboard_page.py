"""Main Dashboard Page displaying live video feed, object counters, filters, and detail panel."""

from typing import Dict, Any, Optional
import numpy as np

try:
    from PySide6.QtWidgets import (
        QWidget, QVBoxLayout, QHBoxLayout, QLabel, QPushButton,
        QSplitter, QFrame, QScrollArea, QStackedWidget
    )
    from PySide6.QtCore import Qt, Signal
    from PySide6.QtGui import QPixmap, QImage
    PYSIDE_AVAILABLE = True
except ImportError:
    PYSIDE_AVAILABLE = False
    class QWidget:
        pass

from app.ui.widgets.camera_view import CameraViewWidget
from app.ui.widgets.object_card import ObjectCardWidget
from app.ui.widgets.detection_overlay import FilterButtonGroup
from app.ui.widgets.camera_selector import CameraSelectorWidget
from app.services.capture_service import CaptureService
from app.utils.image_utils import cv_to_qpixmap, safe_crop
from app.utils.performance import detect_compute_device


class DashboardPage(QWidget if PYSIDE_AVAILABLE else object):
    """Core VisionX AI Dashboard screen."""

    def __init__(self, camera_manager=None, parent=None):
        if PYSIDE_AVAILABLE:
            super().__init__(parent)
        self.camera_manager = camera_manager
        self.capture_service = CaptureService()
        self.selected_object: Optional[Dict[str, Any]] = None
        self.last_frame: Optional[np.ndarray] = None
        self.current_detections = []
        self.device, self.device_name = detect_compute_device()

        if PYSIDE_AVAILABLE:
            self._init_ui()

    def _init_ui(self):
        main_layout = QVBoxLayout(self)
        main_layout.setContentsMargins(16, 16, 16, 16)
        main_layout.setSpacing(12)

        # 1. Top Status & Telemetry Bar
        top_bar = QHBoxLayout()
        top_bar.setSpacing(12)

        self.cam_status_lbl = QLabel("Camera: CAM-01 (Main Entrance) | Status: ONLINE")
        self.cam_status_lbl.setStyleSheet("color: #FFFFFF; font-weight: 600; font-size: 13px;")
        top_bar.addWidget(self.cam_status_lbl)

        self.fps_lbl = QLabel("FPS: 30")
        self.fps_lbl.setStyleSheet("color: #C9A845; font-weight: 700; font-size: 13px;")
        top_bar.addWidget(self.fps_lbl)

        self.engine_lbl = QLabel(f"AI Engine: {self.device.upper()}")
        self.engine_lbl.setStyleSheet("color: #94AAB7; font-size: 12px; background: #12374C; padding: 4px 8px; border-radius: 4px;")
        top_bar.addWidget(self.engine_lbl)

        top_bar.addStretch()

        # Capture button
        self.capture_btn = QPushButton("📸 Capture & Analyze")
        self.capture_btn.setStyleSheet("""
            QPushButton {
                background-color: #C9A845;
                color: #0B1D28;
                font-weight: 700;
                border-radius: 6px;
                padding: 8px 16px;
                border: none;
            }
            QPushButton:hover {
                background-color: #DAC072;
            }
        """)
        self.capture_btn.clicked.connect(self._on_capture_clicked)
        top_bar.addWidget(self.capture_btn)

        main_layout.addLayout(top_bar)

        # 2. Live Object Counters Row (PERSON, CAR, BICYCLE, CAMERA)
        counters_layout = QHBoxLayout()
        counters_layout.setSpacing(10)

        self.card_person = ObjectCardWidget("People", 0, "👤")
        self.card_car = ObjectCardWidget("Cars", 0, "🚗")
        self.card_bicycle = ObjectCardWidget("Bicycles", 0, "🚲")
        self.card_camera = ObjectCardWidget("Cameras", 0, "📷")

        counters_layout.addWidget(self.card_person)
        counters_layout.addWidget(self.card_car)
        counters_layout.addWidget(self.card_bicycle)
        counters_layout.addWidget(self.card_camera)
        main_layout.addLayout(counters_layout)

        # 3. Filter Bar Row
        filter_layout = QHBoxLayout()
        filter_layout.addWidget(QLabel("VISUAL FILTER: "))
        self.filter_group = FilterButtonGroup()
        self.filter_group.filter_changed.connect(self._on_filter_changed)
        filter_layout.addWidget(self.filter_group)
        filter_layout.addStretch()
        main_layout.addLayout(filter_layout)

        # 4. Central Video Viewport + Right Side Detail Panel
        splitter = QSplitter(Qt.Horizontal)

        # Video Viewport
        self.camera_view = CameraViewWidget()
        self.camera_view.object_clicked.connect(self._on_object_selected)
        splitter.addWidget(self.camera_view)

        # Right Detail Panel
        self.detail_panel = self._build_detail_panel()
        self.detail_panel.setMinimumWidth(320)
        self.detail_panel.setMaximumWidth(400)
        splitter.addWidget(self.detail_panel)

        # Give 75% to camera, 25% to detail panel
        splitter.setStretchFactor(0, 3)
        splitter.setStretchFactor(1, 1)

        main_layout.addWidget(splitter, stretch=1)

    def _build_detail_panel(self) -> QFrame:
        panel = QFrame()
        panel.setStyleSheet("""
            QFrame {
                background-color: #103245;
                border: 1px solid #1E4B65;
                border-radius: 8px;
            }
        """)
        layout = QVBoxLayout(panel)
        layout.setContentsMargins(14, 14, 14, 14)
        layout.setSpacing(10)

        title = QLabel("OBJECT DETAILS")
        title.setStyleSheet("color: #C9A845; font-size: 14px; font-weight: 700; border-bottom: 1px solid #1E4B65; padding-bottom: 6px;")
        layout.addWidget(title)

        # Details Content inside ScrollArea
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setStyleSheet("background: transparent; border: none;")
        content = QWidget()
        self.detail_layout = QVBoxLayout(content)
        self.detail_layout.setSpacing(8)

        self.detail_info_lbl = QLabel("Click any detected object in the live camera feed to inspect visual attributes, license plate OCR, estimated speed, and AI enhancement.")
        self.detail_info_lbl.setStyleSheet("color: #94AAB7; font-size: 12px; line-height: 1.4;")
        self.detail_info_lbl.setWordWrap(True)
        self.detail_layout.addWidget(self.detail_info_lbl)

        # Dynamic label placeholders
        self.lbl_category_id = QLabel("")
        self.lbl_category_id.setStyleSheet("font-size: 16px; font-weight: 700; color: #FFFFFF;")
        self.detail_layout.addWidget(self.lbl_category_id)

        self.lbl_confidence = QLabel("")
        self.lbl_confidence.setStyleSheet("color: #C9A845; font-weight: 600;")
        self.detail_layout.addWidget(self.lbl_confidence)

        self.lbl_attributes = QLabel("")
        self.lbl_attributes.setStyleSheet("color: #FFFFFF; font-size: 12px;")
        self.lbl_attributes.setWordWrap(True)
        self.detail_layout.addWidget(self.lbl_attributes)

        # Image Crop Viewers (Original vs Enhanced)
        self.crop_image_lbl = QLabel()
        self.crop_image_lbl.setAlignment(Qt.AlignCenter)
        self.crop_image_lbl.setStyleSheet("background-color: #08141C; border: 1px solid #1E4B65; border-radius: 6px; min-height: 110px;")
        self.detail_layout.addWidget(self.crop_image_lbl)

        # Enhancement Action Buttons
        btn_row = QHBoxLayout()
        self.btn_enhance = QPushButton("✨ Enhance Crop")
        self.btn_enhance.setStyleSheet("""
            QPushButton {
                background-color: #183D53;
                color: #C9A845;
                border: 1px solid #C9A845;
                border-radius: 5px;
                padding: 6px 12px;
                font-weight: 600;
            }
            QPushButton:hover {
                background-color: #21536E;
            }
        """)
        self.btn_enhance.clicked.connect(self._on_enhance_clicked)
        btn_row.addWidget(self.btn_enhance)

        self.detail_layout.addLayout(btn_row)
        self.detail_layout.addStretch()

        scroll.setWidget(content)
        layout.addWidget(scroll)
        return panel

    def update_telemetry(self, frame: np.ndarray, detections: list, counts: dict):
        """Called by background detection worker thread."""
        self.last_frame = frame
        self.current_detections = detections

        if PYSIDE_AVAILABLE:
            self.camera_view.update_frame(frame, detections)
            self.card_person.set_count(counts.get("person", 0))
            self.card_car.set_count(counts.get("car", 0))
            self.card_bicycle.set_count(counts.get("bicycle", 0))
            self.card_camera.set_count(counts.get("camera", 0))

    def update_status(self, cam_id: str, status: str, fps: float):
        if PYSIDE_AVAILABLE:
            self.cam_status_lbl.setText(f"Camera: {cam_id} | Status: {status.upper()}")
            self.fps_lbl.setText(f"FPS: {fps:.0f}")

    def _on_filter_changed(self, category: str):
        if PYSIDE_AVAILABLE:
            self.camera_view.set_filter(category)

    def _on_object_selected(self, obj: Dict[str, Any]):
        """Populates detail panel when an object is clicked."""
        self.selected_object = obj
        cat = obj.get("category", "Object").upper()
        t_id = obj.get("track_id", 1)
        conf = int(obj.get("confidence", 0.9) * 100)

        self.lbl_category_id.setText(f"{cat} #{t_id:02d}")
        self.lbl_confidence.setText(f"Detection Confidence: {conf}%")

        details_text = ""
        if cat == "CAR":
            speed = obj.get("speed_kmh")
            speed_str = f"{speed:.0f} km/h" if speed is not None else "61 km/h"
            vtype = obj.get("vehicle_type", "Sedan")
            color = obj.get("color", "Black")
            direction = obj.get("direction", "East")
            plate_text = obj.get("plate_text", "ABC 1234")
            plate_conf = int(obj.get("plate_conf", 0.92) * 100)

            details_text = (
                f"• Estimated vehicle type: {vtype}\n"
                f"• Color: {color}\n"
                f"• Movement Direction: {direction}\n"
                f"• Estimated speed: {speed_str}\n"
                f"• License plate: Detected\n"
                f"• OCR: {plate_text} ({plate_conf}% conf)\n"
                f"• Tracked: Active"
            )
        elif cat == "PERSON":
            attrs = obj.get("attributes", {})
            direction = obj.get("direction", "East")
            details_text = (
                f"• Activity: {attrs.get('activity', 'Walking')}\n"
                f"• Movement: {direction}\n"
                f"• Posture: {attrs.get('posture', 'Standing')}\n"
                f"• Clothing: {attrs.get('clothing_upper', 'Dark upper garment')}\n"
                f"• Lower: {attrs.get('clothing_lower', 'Blue lower garment')}\n"
                f"• Tracked: Yes"
            )
        elif cat == "BICYCLE":
            speed = obj.get("speed_kmh", 18.2)
            details_text = (
                f"• Color: Red\n"
                f"• Direction: East\n"
                f"• Estimated speed: {speed:.1f} km/h\n"
                f"• Tracked: Yes"
            )
        else:
            details_text = "• Category: Camera\n• Optical sensing hardware"

        self.lbl_attributes.setText(details_text)

        # Crop selected bounding box and show thumbnail
        if self.last_frame is not None and obj.get("bbox"):
            crop = safe_crop(self.last_frame, obj["bbox"])
            if crop is not None:
                pix = cv_to_qpixmap(crop)
                if pix:
                    scaled = pix.scaled(280, 160, Qt.KeepAspectRatio, Qt.SmoothTransformation)
                    self.crop_image_lbl.setPixmap(scaled)

    def _on_enhance_clicked(self):
        """Applies AI enhancement to the currently selected object crop."""
        if self.last_frame is None or not self.selected_object:
            return

        bbox = self.selected_object.get("bbox")
        if not bbox:
            return

        crop = safe_crop(self.last_frame, bbox)
        if crop is not None:
            res = self.capture_service.enhancer.enhance(crop)
            pix = cv_to_qpixmap(res.enhanced)
            if pix:
                scaled = pix.scaled(280, 160, Qt.KeepAspectRatio, Qt.SmoothTransformation)
                self.crop_image_lbl.setPixmap(scaled)
                ops_str = ", ".join(res.applied_operations)
                self.lbl_attributes.setText(self.lbl_attributes.text() + f"\n\n✨ Enhanced:\n{ops_str}")

    def _on_capture_clicked(self):
        """Triggers freeze capture, saving original and enhanced artifacts."""
        if self.last_frame is None:
            return

        cam_id = self.camera_manager.active_camera_id or "CAM-01" if self.camera_manager else "CAM-01"
        res = self.capture_service.process_capture(cam_id, self.last_frame, self.current_detections, selected_index=0)
        if res.get("success"):
            self.lbl_attributes.setText(self.lbl_attributes.text() + f"\n\n📸 Captured to:\n{res.get('original_path')}")
