"""Camera source selector and status indicator widget."""

try:
    from PySide6.QtWidgets import QWidget, QHBoxLayout, QComboBox, QPushButton, QLabel
    from PySide6.QtCore import Signal
    PYSIDE_AVAILABLE = True
except ImportError:
    PYSIDE_AVAILABLE = False
    class QWidget:
        pass


class CameraSelectorWidget(QWidget if PYSIDE_AVAILABLE else object):
    """Quick switch camera dropdown with connect/reconnect actions."""

    if PYSIDE_AVAILABLE:
        camera_selected = Signal(str)  # camera_id
        reconnect_requested = Signal(str)

    def __init__(self, parent=None):
        if PYSIDE_AVAILABLE:
            super().__init__(parent)
            layout = QHBoxLayout(self)
            layout.setContentsMargins(0, 0, 0, 0)
            layout.setSpacing(8)

            lbl = QLabel("Camera:")
            lbl.setStyleSheet("color: #94AAB7; font-weight: 600;")
            layout.addWidget(lbl)

            self.combo = QComboBox()
            self.combo.setStyleSheet("""
                QComboBox {
                    background-color: #12374C;
                    color: #FFFFFF;
                    border: 1px solid #1E4B65;
                    border-radius: 5px;
                    padding: 5px 10px;
                    min-width: 140px;
                }
            """)
            layout.addWidget(self.combo)

            self.reconnect_btn = QPushButton("Reconnect")
            self.reconnect_btn.setStyleSheet("""
                QPushButton {
                    background-color: #183D53;
                    color: #FFFFFF;
                    border: 1px solid #1E4B65;
                    border-radius: 5px;
                    padding: 5px 12px;
                }
                QPushButton:hover {
                    border-color: #C9A845;
                }
            """)
            layout.addWidget(self.reconnect_btn)

            self.combo.currentTextChanged.connect(self._on_combo_changed)
            self.reconnect_btn.clicked.connect(lambda: self.reconnect_requested.emit(self.combo.currentText().split(" ")[0]))

    def set_cameras(self, camera_list: list):
        if PYSIDE_AVAILABLE and hasattr(self, "combo"):
            self.combo.blockSignals(True)
            self.combo.clear()
            for cam in camera_list:
                self.combo.addItem(f"{cam.id} - {cam.name}", cam.id)
            self.combo.blockSignals(False)

    def _on_combo_changed(self, text: str):
        if PYSIDE_AVAILABLE and text:
            cam_id = text.split(" ")[0]
            self.camera_selected.emit(cam_id)
