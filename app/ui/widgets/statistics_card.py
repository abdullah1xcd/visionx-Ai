"""Statistics summary card widget."""

try:
    from PySide6.QtWidgets import QFrame, QVBoxLayout, QLabel
    PYSIDE_AVAILABLE = True
except ImportError:
    PYSIDE_AVAILABLE = False
    class QFrame:
        pass


class StatisticsCardWidget(QFrame if PYSIDE_AVAILABLE else object):
    """Clean metric presentation card."""

    def __init__(self, label: str, value: str, subtext: str = "", parent=None):
        if PYSIDE_AVAILABLE:
            super().__init__(parent)
            self.setStyleSheet("""
                QFrame {
                    background-color: #12374C;
                    border: 1px solid #1E4B65;
                    border-radius: 8px;
                    padding: 12px;
                }
            """)
            layout = QVBoxLayout(self)
            layout.setContentsMargins(8, 8, 8, 8)
            layout.setSpacing(4)

            self.title_lbl = QLabel(label.upper())
            self.title_lbl.setStyleSheet("color: #94AAB7; font-size: 11px; font-weight: 700;")
            layout.addWidget(self.title_lbl)

            self.value_lbl = QLabel(value)
            self.value_lbl.setStyleSheet("color: #FFFFFF; font-size: 22px; font-weight: 700;")
            layout.addWidget(self.value_lbl)

            if subtext:
                self.sub_lbl = QLabel(subtext)
                self.sub_lbl.setStyleSheet("color: #6B8290; font-size: 11px;")
                layout.addWidget(self.sub_lbl)

    def set_value(self, val: str):
        if PYSIDE_AVAILABLE and hasattr(self, "value_lbl"):
            self.value_lbl.setText(val)
