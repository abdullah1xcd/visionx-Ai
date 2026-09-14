"""Camera Management Page (Add, Edit, Reconnect, Test, Remove)."""

try:
    from PySide6.QtWidgets import (
        QWidget, QVBoxLayout, QHBoxLayout, QLabel, QPushButton,
        QScrollArea, QFrame, QDialog, QLineEdit, QComboBox, QMessageBox
    )
    from PySide6.QtCore import Qt, Signal
    PYSIDE_AVAILABLE = True
except ImportError:
    PYSIDE_AVAILABLE = False
    class QWidget:
        pass

from app.camera.camera_manager import CameraManager
from app.database.models import CameraModel


class AddCameraDialog(QDialog if PYSIDE_AVAILABLE else object):
    """Modal dialog to register a new webcam, external USB camera, or RTSP stream."""

    def __init__(self, parent=None):
        if PYSIDE_AVAILABLE:
            super().__init__(parent)
            self.setWindowTitle("Add Camera Source")
            self.setMinimumWidth(380)
            self.setStyleSheet("""
                QDialog {
                    background-color: #103245;
                    color: #FFFFFF;
                }
                QLabel { color: #FFFFFF; }
                QLineEdit, QComboBox {
                    background-color: #0B1D28;
                    color: #FFFFFF;
                    border: 1px solid #1E4B65;
                    padding: 6px;
                    border-radius: 4px;
                }
            """)
            layout = QVBoxLayout(self)
            layout.setSpacing(10)

            layout.addWidget(QLabel("Camera ID (e.g. CAM-04):"))
            self.in_id = QLineEdit("CAM-04")
            layout.addWidget(self.in_id)

            layout.addWidget(QLabel("Camera Name:"))
            self.in_name = QLineEdit("Perimeter North")
            layout.addWidget(self.in_name)

            layout.addWidget(QLabel("Source Type:"))
            self.in_type = QComboBox()
            self.in_type.addItems(["webcam", "usb", "rtsp"])
            layout.addWidget(self.in_type)

            layout.addWidget(QLabel("Device Index or RTSP Stream URL:"))
            self.in_source = QLineEdit("rtsp://192.168.1.150:554/live")
            layout.addWidget(self.in_source)

            btn_box = QHBoxLayout()
            save_btn = QPushButton("Add Camera")
            save_btn.setStyleSheet("background-color: #C9A845; color: #0B1D28; font-weight: 700; padding: 6px 12px;")
            save_btn.clicked.connect(self.accept)
            btn_box.addWidget(save_btn)

            cancel_btn = QPushButton("Cancel")
            cancel_btn.clicked.connect(self.reject)
            btn_box.addWidget(cancel_btn)

            layout.addLayout(btn_box)

    def get_camera_model(self) -> CameraModel:
        return CameraModel(
            id=self.in_id.text().strip(),
            name=self.in_name.text().strip(),
            camera_type=self.in_type.currentText(),
            source=self.in_source.text().strip(),
            status="Offline",
            width=1920,
            height=1080,
            fps=30
        )


class CamerasPage(QWidget if PYSIDE_AVAILABLE else object):
    """Camera list management and hardware status view."""

    if PYSIDE_AVAILABLE:
        camera_switched = Signal(str)

    def __init__(self, camera_manager: CameraManager = None, parent=None):
        if PYSIDE_AVAILABLE:
            super().__init__(parent)
        self.camera_manager = camera_manager or CameraManager()
        if PYSIDE_AVAILABLE:
            self._init_ui()

    def _init_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(20, 20, 20, 20)
        layout.setSpacing(14)

        # Header
        header_layout = QHBoxLayout()
        title = QLabel("CAMERA MANAGEMENT")
        title.setStyleSheet("font-size: 18px; font-weight: 700; color: #FFFFFF;")
        header_layout.addWidget(title)
        header_layout.addStretch()

        add_btn = QPushButton("+ Add Camera")
        add_btn.setStyleSheet("""
            QPushButton {
                background-color: #C9A845;
                color: #0B1D28;
                font-weight: 700;
                border-radius: 6px;
                padding: 8px 16px;
            }
            QPushButton:hover { background-color: #DAC072; }
        """)
        add_btn.clicked.connect(self._on_add_camera)
        header_layout.addWidget(add_btn)
        layout.addLayout(header_layout)

        # Scrollable list of cameras
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setStyleSheet("background: transparent; border: none;")
        self.container = QWidget()
        self.cards_layout = QVBoxLayout(self.container)
        self.cards_layout.setSpacing(12)

        self.refresh_cameras_list()

        scroll.setWidget(self.container)
        layout.addWidget(scroll)

    def refresh_cameras_list(self):
        if not PYSIDE_AVAILABLE:
            return

        # Clear existing
        while self.cards_layout.count():
            item = self.cards_layout.takeAt(0)
            if item.widget():
                item.widget().deleteLater()

        cameras = self.camera_manager.get_cameras()
        for cam in cameras:
            card = self._create_camera_card(cam)
            self.cards_layout.addWidget(card)
        self.cards_layout.addStretch()

    def _create_camera_card(self, cam: CameraModel) -> QFrame:
        card = QFrame()
        card.setStyleSheet("""
            QFrame {
                background-color: #12374C;
                border: 1px solid #1E4B65;
                border-radius: 8px;
                padding: 14px;
            }
        """)
        row = QHBoxLayout(card)

        info = QVBoxLayout()
        name_lbl = QLabel(f"{cam.id} — {cam.name}")
        name_lbl.setStyleSheet("font-size: 15px; font-weight: 700; color: #FFFFFF;")
        info.addWidget(name_lbl)

        is_online = "online" in cam.status.lower()
        badge_color = "#2ECC71" if is_online else "#E74C3C"
        status_lbl = QLabel(f"● {cam.status.upper()} | Type: {cam.camera_type.upper()} | Source: {cam.source} | {cam.width}x{cam.height} @ {cam.fps} FPS")
        status_lbl.setStyleSheet(f"color: {badge_color}; font-size: 12px; font-weight: 600;")
        info.addWidget(status_lbl)

        row.addLayout(info, stretch=1)

        # Action buttons
        open_btn = QPushButton("Open Feed")
        open_btn.setStyleSheet("background-color: #183D53; color: #C9A845; border: 1px solid #C9A845; padding: 6px 14px; border-radius: 5px; font-weight: 600;")
        open_btn.clicked.connect(lambda _, cid=cam.id: self._select_cam(cid))
        row.addWidget(open_btn)

        del_btn = QPushButton("Remove")
        del_btn.setStyleSheet("background-color: #183D53; color: #94AAB7; border: 1px solid #1E4B65; padding: 6px 12px; border-radius: 5px;")
        del_btn.clicked.connect(lambda _, cid=cam.id: self._remove_cam(cid))
        row.addWidget(del_btn)

        return card

    def _on_add_camera(self):
        if not PYSIDE_AVAILABLE:
            return
        dlg = AddCameraDialog(self)
        if dlg.exec():
            model = dlg.get_camera_model()
            self.camera_manager.add_camera(model)
            self.refresh_cameras_list()

    def _select_cam(self, cam_id: str):
        self.camera_manager.select_and_connect(cam_id)
        if PYSIDE_AVAILABLE:
            self.camera_switched.emit(cam_id)
            self.refresh_cameras_list()

    def _remove_cam(self, cam_id: str):
        self.camera_manager.remove_camera(cam_id)
        self.refresh_cameras_list()
