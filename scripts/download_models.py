"""Automated Model Download Script for VisionX AI."""

import os
import sys
from pathlib import Path
import urllib.request

ROOT_DIR = Path(__file__).resolve().parent.parent
DETECTION_DIR = ROOT_DIR / "models" / "detection"
DETECTION_DIR.mkdir(parents=True, exist_ok=True)


def download_yolo():
    """Downloads YOLOv8n weights for standard detection."""
    target_file = DETECTION_DIR / "yolo_model.pt"
    if target_file.exists():
        print(f"Model already exists at: {target_file}")
        return

    url = "https://github.com/ultralytics/assets/releases/download/v8.1.0/yolov8n.pt"
    print(f"Downloading YOLOv8n from {url}...")
    try:
        urllib.request.urlretrieve(url, str(target_file))
        print(f"Successfully downloaded model to: {target_file}")
    except Exception as e:
        print(f"Error downloading model: {e}")
        print("Note: Ultralytics YOLO can also auto-download on first inference.")


if __name__ == "__main__":
    download_yolo()
