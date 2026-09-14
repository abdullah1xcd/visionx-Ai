"""Object counter display card widget."""

try:
    from PySide6.QtWidgets import QFrame, QVBoxLayout, QLabel, QHBoxLayout
    from PySide6.QtCore import Qt
    from PySide6.QtGui import QFont
    PYSIDE_AVAILABLE = True
except ImportError:
    PYSIDE_AVAILABLE = False
    class QFrame:
        pass


class ObjectCardWidget(QFrame if PYSIDE_AVAILABLE else object):
    """Clean metric card showing category title and live detected counter."""

    def __init__(self, title: str, initial_count: int = 0, icon_str: str = "◈", parent=None):
        if PYSIDE_AVAILABLE:
            super().__init__(parent)
            self.setProperty("class", "card")
            self.setStyleSheet("""
                QFrame.card {
                    background-color: #12374C;
                    border: 1px solid #1E4B65;
                    border-radius: 8px;
                    padding: 10px 14px;
                }
            """)

            layout = QVBoxLayout(self)
            layout.setContentsMargins(8, 8, 8, 8)
            layout.setSpacing(4)

            # Header row
            header_layout = QHBoxLayout()
            self.title_label = QLabel(title.upper())
            self.title_label.setStyleSheet("color: #94AAB7; font-size: 11px; font-weight: 700; letter-spacing: 0.5px;")
            header_layout.addWidget(self.title_label)

            icon_lbl = QLabel(icon_str)
            icon_lbl.setStyleSheet("color: #C9A845; font-size: 13px;")
            header_layout.addWidget(icon_lbl, alignment=Qt.AlignRight)
            layout.addLayout(header_layout)

            # Count row
            self.count_label = QLabel(str(initial_count))
            self.count_label.setStyleSheet("color: #FFFFFF; font-size: 26px; font-weight: 700;")
            layout.addWidget(self.count_label)

    def set_count(self, count: int):
        if PYSIDE_AVAILABLE and hasattr(self, "count_label"):
            self.count_label.setText(str(count))
