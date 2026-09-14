"""Interactive camera rendering viewport widget with bounding box overlays and click selection."""

from typing import List, Dict, Any, Optional, Tuple
import numpy as np

try:
    from PySide6.QtWidgets import QWidget
    from PySide6.QtGui import QPainter, QImage, QColor, QPen, QBrush, QFont
    from PySide6.QtCore import Qt, Signal, QRectF, QPoint
    PYSIDE_AVAILABLE = True
except ImportError:
    PYSIDE_AVAILABLE = False
    class QWidget:
        pass

from app.utils.image_utils import cv_to_qimage


class CameraViewWidget(QWidget if PYSIDE_AVAILABLE else object):
    """Renders real-time video frames and interactive detection bounding boxes."""

    if PYSIDE_AVAILABLE:
        object_clicked = Signal(dict)  # Emits selected object dictionary

    def __init__(self, parent=None):
        if PYSIDE_AVAILABLE:
            super().__init__(parent)
            self.setMinimumSize(640, 360)
            self.setMouseTracking(True)

        self.current_qimage: Optional[QImage] = None
        self.raw_frame: Optional[np.ndarray] = None
        self.detections: List[Dict[str, Any]] = []
        self.filter_category: str = "ALL"
        self.selected_track_id: Optional[int] = None
        self.scale_x = 1.0
        self.scale_y = 1.0
        self.offset_x = 0
        self.offset_y = 0

    def update_frame(self, bgr_frame: np.ndarray, detections: List[Dict[str, Any]]):
        """Receives new video frame and detections from background inference worker."""
        if not PYSIDE_AVAILABLE:
            return

        self.raw_frame = bgr_frame
        self.detections = detections
        self.current_qimage = cv_to_qimage(bgr_frame)
        self.update()

    def set_filter(self, category: str):
        self.filter_category = category.upper()
        if PYSIDE_AVAILABLE:
            self.update()

    def paintEvent(self, event):
        if not PYSIDE_AVAILABLE or self.current_qimage is None:
            # Draw placeholder when no camera frame
            if PYSIDE_AVAILABLE:
                painter = QPainter(self)
                painter.fillRect(self.rect(), QColor("#0B1D28"))
                painter.setPen(QColor("#6B8290"))
                painter.setFont(QFont("Segoe UI", 12))
                painter.drawText(self.rect(), Qt.AlignCenter, "Waiting for Camera Feed...")
            return

        painter = QPainter(self)
        painter.setRenderHint(QPainter.Antialiasing)

        # Calculate aspect ratio fitting
        widget_w = self.width()
        widget_h = self.height()
        img_w = self.current_qimage.width()
        img_h = self.current_qimage.height()

        scale = min(widget_w / img_w, widget_h / img_h)
        target_w = int(img_w * scale)
        target_h = int(img_h * scale)
        self.offset_x = (widget_w - target_w) // 2
        self.offset_y = (widget_h - target_h) // 2
        self.scale_x = scale
        self.scale_y = scale

        # Draw frame background
        painter.fillRect(self.rect(), QColor("#08141C"))
        target_rect = QRectF(self.offset_x, self.offset_y, target_w, target_h)
        painter.drawImage(target_rect, self.current_qimage)

        # Draw detection overlays
        for det in self.detections:
            cat = det.get("category", "").upper()
            if self.filter_category != "ALL" and cat != self.filter_category:
                continue

            bbox = det.get("bbox")
            if not bbox:
                continue

            x1, y1, x2, y2 = bbox
            vx1 = self.offset_x + x1 * self.scale_x
            vy1 = self.offset_y + y1 * self.scale_y
            vw = (x2 - x1) * self.scale_x
            vh = (y2 - y1) * self.scale_y

            is_selected = (det.get("track_id") == self.selected_track_id)

            # Colors
            box_color = QColor("#DAC072") if is_selected else QColor("#C9A845")
            pen_width = 3 if is_selected else 2
            painter.setPen(QPen(box_color, pen_width))
            painter.setBrush(Qt.NoBrush)
            painter.drawRect(QRectF(vx1, vy1, vw, vh))

            # Header badge: [ PERSON #04 | 96% ]
            t_id = det.get("track_id", 1)
            conf = int(det.get("confidence", 0.9) * 100)
            tag = f" {cat} #{t_id:02d} | {conf}% "

            badge_h = 20
            badge_w = len(tag) * 7.5
            badge_y = max(self.offset_y, vy1 - badge_h)

            painter.setBrush(QBrush(box_color))
            painter.setPen(Qt.NoPen)
            painter.drawRoundedRect(QRectF(vx1, badge_y, badge_w, badge_h), 3, 3)

            painter.setPen(QColor("#0B1D28"))
            painter.setFont(QFont("Segoe UI", 8, QFont.Bold))
            painter.drawText(QRectF(vx1, badge_y, badge_w, badge_h), Qt.AlignCenter, tag)

    def mousePressEvent(self, event):
        if not PYSIDE_AVAILABLE or event.button() != Qt.LeftButton:
            return

        click_x = event.position().x()
        click_y = event.position().y()

        # Check which bounding box was clicked
        for det in self.detections:
            cat = det.get("category", "").upper()
            if self.filter_category != "ALL" and cat != self.filter_category:
                continue

            bbox = det.get("bbox")
            if not bbox:
                continue

            x1, y1, x2, y2 = bbox
            vx1 = self.offset_x + x1 * self.scale_x
            vy1 = self.offset_y + y1 * self.scale_y
            vx2 = vx1 + (x2 - x1) * self.scale_x
            vy2 = vy1 + (y2 - y1) * self.scale_y

            if vx1 <= click_x <= vx2 and vy1 <= click_y <= vy2:
                self.selected_track_id = det.get("track_id")
                self.object_clicked.emit(det)
                self.update()
                return
