"""Main Application Window for VisionX AI (PySide6)."""

import sys
from typing import Optional

try:
    from PySide6.QtWidgets import (
        QMainWindow, QWidget, QHBoxLayout, QVBoxLayout, QPushButton,
        QStackedWidget, QLabel, QFrame, QButtonGroup, QApplication, QMessageBox
    )
    from PySide6.QtCore import Qt
    from PySide6.QtGui import QIcon, QFont
    PYSIDE_AVAILABLE = True
except ImportError:
    PYSIDE_AVAILABLE = False
    class QMainWindow:
        pass

from app.ui.styles import GLOBAL_QSS, NAVY_DARK
from app.ui.pages.dashboard_page import DashboardPage
from app.ui.pages.cameras_page import CamerasPage
from app.ui.pages.statistics_page import StatisticsPage
from app.ui.pages.alerts_page import AlertsPage
from app.ui.pages.settings_page import SettingsPage

from app.camera.camera_manager import CameraManager
from app.services.detection_service import DetectionWorker
from app.utils.logger import logger


class MainWindow(QMainWindow if PYSIDE_AVAILABLE else object):
    """VisionX AI Main Window coordinating sidebar navigation and video inference worker."""

    def __init__(self):
        if PYSIDE_AVAILABLE:
            super().__init__()

        self.camera_manager = CameraManager()
        self.worker: Optional[DetectionWorker] = None

        if PYSIDE_AVAILABLE:
            self._init_window()
            self._init_pages()
            self._start_worker()

    def _init_window(self):
        self.setWindowTitle("VisionX AI — Intelligent Computer Vision & Object Analysis")
        self.setMinimumSize(1200, 720)
        self.resize(1366, 820)
        self.setStyleSheet(GLOBAL_QSS)

        # Central Root Widget
        root = QWidget()
        self.setCentralWidget(root)
        root_layout = QHBoxLayout(root)
        root_layout.setContentsMargins(0, 0, 0, 0)
        root_layout.setSpacing(0)

        # 1. Left Sidebar
        sidebar = self._build_sidebar()
        root_layout.addWidget(sidebar)

        # 2. Right Content Area (Header + Stacked Pages)
        content_area = QWidget()
        content_layout = QVBoxLayout(content_area)
        content_layout.setContentsMargins(0, 0, 0, 0)
        content_layout.setSpacing(0)

        # Top App Title Bar
        header_bar = QFrame()
        header_bar.setStyleSheet("background-color: #0E2331; border-bottom: 1px solid #1E4B65; min-height: 48px; max-height: 48px;")
        h_layout = QHBoxLayout(header_bar)
        h_layout.setContentsMargins(20, 0, 20, 0)

        title_lbl = QLabel("VISIONX AI  |  Intelligent Computer Vision & Object Analysis")
        title_lbl.setStyleSheet("color: #FFFFFF; font-weight: 700; font-size: 13px; letter-spacing: 0.5px;")
        h_layout.addWidget(title_lbl)
        h_layout.addStretch()

        ver_lbl = QLabel("v1.0.0 (Windows x64)")
        ver_lbl.setStyleSheet("color: #6B8290; font-size: 11px;")
        h_layout.addWidget(ver_lbl)

        content_layout.addWidget(header_bar)

        # Multi-page Stack
        self.stack = QStackedWidget()
        content_layout.addWidget(self.stack, stretch=1)

        root_layout.addWidget(content_area, stretch=1)

    def _build_sidebar(self) -> QFrame:
        sidebar = QFrame()
        sidebar.setObjectName("Sidebar")
        sidebar.setStyleSheet("""
            #Sidebar {
                background-color: #103245;
                border-right: 1px solid #1E4B65;
                min-width: 220px;
                max-width: 220px;
            }
        """)
        layout = QVBoxLayout(sidebar)
        layout.setContentsMargins(0, 0, 0, 16)
        layout.setSpacing(4)

        # Brand header
        brand_lbl = QLabel("VISIONX AI")
        brand_lbl.setObjectName("SidebarBrand")
        brand_lbl.setStyleSheet("font-size: 18px; font-weight: 800; color: #C9A845; padding: 18px 20px 2px 20px; letter-spacing: 1.5px;")
        layout.addWidget(brand_lbl)

        sub_lbl = QLabel("Intelligent Vision V1")
        sub_lbl.setStyleSheet("font-size: 11px; color: #94AAB7; padding: 0px 20px 18px 20px; border-bottom: 1px solid #1E4B65;")
        layout.addWidget(sub_lbl)

        layout.addSpacing(10)

        # Navigation button group
        self.nav_group = QButtonGroup(self)
        self.nav_group.setExclusive(True)

        nav_items = [
            ("Dashboard", 0, "▣"),
            ("Cameras", 1, "🎥"),
            ("Statistics", 2, "📊"),
            ("Alerts", 3, "⚠️"),
            ("Settings", 4, "⚙️")
        ]

        for text, index, icon in nav_items:
            btn = QPushButton(f"  {icon}  {text}")
            btn.setCheckable(True)
            btn.setProperty("class", "nav-button")
            btn.setStyleSheet("""
                QPushButton {
                    background-color: transparent;
                    color: #94AAB7;
                    border: none;
                    border-left: 3px solid transparent;
                    text-align: left;
                    padding: 12px 20px;
                    font-size: 13px;
                    font-weight: 600;
                }
                QPushButton:hover {
                    background-color: #183D53;
                    color: #FFFFFF;
                }
                QPushButton:checked {
                    background-color: #183D53;
                    color: #C9A845;
                    border-left: 3px solid #C9A845;
                    font-weight: 700;
                }
            """)
            self.nav_group.addButton(btn, index)
            layout.addWidget(btn)
            btn.clicked.connect(lambda _, idx=index: self.stack.setCurrentIndex(idx))

            if index == 0:
                btn.setChecked(True)

        layout.addStretch()

        # Bottom Hardware Badge
        hw_box = QFrame()
        hw_box.setStyleSheet("background-color: #0B1D28; border: 1px solid #1E4B65; border-radius: 6px; margin: 0 16px; padding: 10px;")
        hw_layout = QVBoxLayout(hw_box)
        hw_layout.setContentsMargins(6, 6, 6, 6)
        hw_layout.setSpacing(2)

        hw_title = QLabel("INFERENCE ENGINE")
        hw_title.setStyleSheet("color: #6B8290; font-size: 9px; font-weight: 700;")
        hw_layout.addWidget(hw_title)

        hw_val = QLabel("CUDA / CPU Active")
        hw_val.setStyleSheet("color: #C9A845; font-size: 11px; font-weight: 600;")
        hw_layout.addWidget(hw_val)

        layout.addWidget(hw_box)
        return sidebar

    def _init_pages(self):
        # 0: Dashboard
        self.dashboard_page = DashboardPage(self.camera_manager)
        self.stack.addWidget(self.dashboard_page)

        # 1: Cameras
        self.cameras_page = CamerasPage(self.camera_manager)
        self.cameras_page.camera_switched.connect(self._on_camera_switched)
        self.stack.addWidget(self.cameras_page)

        # 2: Statistics
        self.stats_page = StatisticsPage()
        self.stack.addWidget(self.stats_page)

        # 3: Alerts
        self.alerts_page = AlertsPage()
        self.stack.addWidget(self.alerts_page)

        # 4: Settings
        self.settings_page = SettingsPage()
        self.stack.addWidget(self.settings_page)

    def _start_worker(self):
        """Starts background detection inference worker thread."""
        try:
            self.worker = DetectionWorker(self.camera_manager)
            self.worker.frame_ready.connect(self.dashboard_page.update_telemetry)
            self.worker.status_updated.connect(self.dashboard_page.update_status)
            self.worker.start()
            logger.info("Detection worker background thread launched successfully")
        except Exception as e:
            logger.error(f"Error launching background worker: {e}")

    def _on_camera_switched(self, cam_id: str):
        logger.info(f"Switched active camera to {cam_id}")
        self.stack.setCurrentIndex(0)
        btn = self.nav_group.button(0)
        if btn:
            btn.setChecked(True)

    def closeEvent(self, event):
        """Gracefully shuts down background worker thread before exit."""
        if self.worker is not None:
            self.worker.stop()
        self.camera_manager.stop_current_stream()
        logger.info("VisionX AI closed cleanly")
        event.accept()
