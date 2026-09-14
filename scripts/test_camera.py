"""Diagnostic tool to test video devices and RTSP streams."""

import sys
import time
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.camera.camera_manager import CameraManager


def run_camera_test():
    print("========================================")
    print("VisionX AI - Camera Diagnostics")
    print("========================================")

    manager = CameraManager()
    cameras = manager.get_cameras()
    print(f"Configured cameras in database: {len(cameras)}")
    for cam in cameras:
        print(f" • {cam.id}: {cam.name} [{cam.camera_type}] -> {cam.source}")

    print("\nAttempting to connect to active stream...")
    active_cam = cameras[0].id if cameras else "CAM-01"
    success = manager.select_and_connect(active_cam)
    print(f"Active Camera Connection result: {success}")

    props = manager.get_active_properties()
    print(f"Properties: {props}")

    print("Reading 30 test frames...")
    frames_read = 0
    t0 = time.time()
    for _ in range(30):
        ret, frame = manager.read_active_frame()
        if ret and frame is not None:
            frames_read += 1

    elapsed = time.time() - t0
    measured_fps = frames_read / elapsed if elapsed > 0 else 0
    print(f"Frames Read: {frames_read}/30")
    print(f"Throughput FPS: {measured_fps:.1f}")
    manager.stop_current_stream()
    print("Camera test completed successfully.")


if __name__ == "__main__":
    run_camera_test()
