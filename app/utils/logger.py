"""VisionX AI Centralized Logging Facility."""

import os
import sys
import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path
from app.config.settings import LOGS_DIR


def get_logger(name: str = "VisionX") -> logging.Logger:
    """Configures and returns a logger instance with console and file rotation."""
    logger = logging.getLogger(name)
    if logger.handlers:
        return logger

    logger.setLevel(logging.INFO)
    formatter = logging.Formatter(
        "[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    console_handler.setLevel(logging.INFO)
    logger.addHandler(console_handler)

    # Rotating file handler
    try:
        log_file = LOGS_DIR / "visionx.log"
        file_handler = RotatingFileHandler(
            str(log_file),
            maxBytes=5 * 1024 * 1024,  # 5 MB
            backupCount=5,
            encoding="utf-8"
        )
        file_handler.setFormatter(formatter)
        file_handler.setLevel(logging.DEBUG)
        logger.addHandler(file_handler)
    except Exception as e:
        print(f"Warning: Could not initialize file logging handler: {e}")

    return logger


logger = get_logger("VisionX")
