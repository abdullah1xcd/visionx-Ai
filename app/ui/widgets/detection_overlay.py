"""Category filter button group widget ([ALL] [PERSON] [CAR] [BICYCLE] [CAMERA])."""

try:
    from PySide6.QtWidgets import QWidget, QHBoxLayout, QPushButton, QButtonGroup
    from PySide6.QtCore import Signal
    PYSIDE_AVAILABLE = True
except ImportError:
    PYSIDE_AVAILABLE = False
    class QWidget:
        pass


class FilterButtonGroup(QWidget if PYSIDE_AVAILABLE else object):
    """Filter toolbar controlling bounding box visualization visibility."""

    if PYSIDE_AVAILABLE:
        filter_changed = Signal(str)  # Emits "ALL", "PERSON", "CAR", "BICYCLE", "CAMERA"

    def __init__(self, parent=None):
        if PYSIDE_AVAILABLE:
            super().__init__(parent)
            layout = QHBoxLayout(self)
            layout.setContentsMargins(0, 0, 0, 0)
            layout.setSpacing(6)

            self.group = QButtonGroup(self)
            self.group.setExclusive(True)

            categories = ["ALL", "PERSON", "CAR", "BICYCLE", "CAMERA"]
            self.buttons = {}

            for cat in categories:
                btn = QPushButton(cat)
                btn.setCheckable(True)
                btn.setProperty("class", "btn-filter")
                btn.setStyleSheet("""
                    QPushButton {
                        background-color: #12374C;
                        color: #94AAB7;
                        border: 1px solid #1E4B65;
                        border-radius: 5px;
                        padding: 6px 14px;
                        font-weight: 600;
                        font-size: 11px;
                    }
                    QPushButton:hover {
                        border-color: #C9A845;
                        color: #FFFFFF;
                    }
                    QPushButton:checked {
                        background-color: #183D53;
                        color: #C9A845;
                        border: 1px solid #C9A845;
                    }
                """)
                self.group.addButton(btn)
                layout.addWidget(btn)
                self.buttons[cat] = btn

                btn.clicked.connect(lambda checked, c=cat: self.filter_changed.emit(c))

            # Default to ALL
            self.buttons["ALL"].setChecked(True)
