"""VisionX AI Desktop Application Entry Point (Windows 10/11)."""

import sys
import os
from pathlib import Path

# Ensure application root is in python path
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.utils.logger import logger
from app.config.settings import settings


def setup_high_dpi():
    """Configures modern Windows High-DPI scaling policies."""
    os.environ["QT_AUTO_SCREEN_SCALE_FACTOR"] = "1"
    os.environ["QT_ENABLE_HIGHDPI_SCALING"] = "1"


def handle_unhandled_exception(exc_type, exc_value, exc_traceback):
    """Global exception handler preventing ungraceful crashes and logging details."""
    if issubclass(exc_type, KeyboardInterrupt):
        sys.__excepthook__(exc_type, exc_value, exc_traceback)
        return
    logger.critical("Unhandled Exception occurred:", exc_info=(exc_type, exc_value, exc_traceback))


def main():
    """Main execution bootstrap."""
    logger.info(f"Starting {settings.app_name} - {settings.subtitle} v{settings.version}")
    sys.excepthook = handle_unhandled_exception
    setup_high_dpi()

    # Check CLI or test flags
    if "--test" in sys.argv or "--headless" in sys.argv:
        print(f"{settings.app_name} Headless Mode: Core modules initialized successfully.")
        return 0

    try:
        from PySide6.QtWidgets import QApplication
        from PySide6.QtCore import Qt
        from PySide6.QtGui import QIcon
        from app.ui.main_window import MainWindow

        # Configure High DPI scaling policy
        QApplication.setHighDpiScaleFactorRoundingPolicy(
            Qt.HighDpiScaleFactorRoundingPolicy.PassThrough
        )

        app = QApplication(sys.argv)
        app.setApplicationName(settings.app_name)
        app.setApplicationVersion(settings.version)
        app.setOrganizationName("VisionX AI Systems")

        window = MainWindow()
        window.show()

        logger.info("VisionX AI Qt Main Event Loop started")
        return app.exec()

    except ImportError as e:
        logger.error(f"PySide6 GUI framework is required for desktop execution: {e}")
        print(f"Error: PySide6 is required. Please install via 'pip install -r requirements.txt'")
        return 1
    except Exception as e:
        logger.critical(f"Fatal error during application startup: {e}", exc_info=True)
        return 1


if __name__ == "__main__":
    sys.exit(main())
