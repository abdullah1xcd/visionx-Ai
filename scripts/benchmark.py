"""Performance and inference latency benchmark."""

import sys
import time
from pathlib import Path
import numpy as np

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.ai.detector import ObjectDetector
from app.ai.tracker import ByteTracker
from app.ai.quality_analyzer import QualityAnalyzer
from app.ai.enhancement import ImageEnhancementPipeline
from app.utils.performance import detect_compute_device, SystemMonitor
from app.utils.video_utils import generate_synthetic_scene


def run_benchmark():
    print("========================================")
    print("VisionX AI - System Performance Benchmark")
    print("========================================")

    device, device_name = detect_compute_device()
    print(f"Active Compute Device: {device.upper()} ({device_name})")

    metrics = SystemMonitor.get_metrics()
    print(f"System RAM: {metrics.get('ram_used_mb', 0):.0f} MB ({metrics.get('ram_percent', 0)}%)")

    detector = ObjectDetector()
    tracker = ByteTracker()
    quality = QualityAnalyzer()
    enhancer = ImageEnhancementPipeline()

    frame, _ = generate_synthetic_scene(1280, 720, 100)

    # 1. Benchmark Detection
    print("\nBenchmarking Object Detection (50 iterations)...")
    t0 = time.time()
    for _ in range(50):
        dets = detector.detect(frame)
    det_time = (time.time() - t0) / 50 * 1000
    print(f"Mean Detection Latency: {det_time:.2f} ms")

    # 2. Benchmark Tracking
    print("Benchmarking ByteTracker Association (50 iterations)...")
    t0 = time.time()
    for _ in range(50):
        tracker.update(dets)
    track_time = (time.time() - t0) / 50 * 1000
    print(f"Mean Tracking Latency: {track_time:.2f} ms")

    # 3. Benchmark Quality Analysis
    print("Benchmarking Quality Analysis (50 iterations)...")
    t0 = time.time()
    for _ in range(50):
        q_report = quality.analyze(frame)
    quality_time = (time.time() - t0) / 50 * 1000
    print(f"Mean Quality Assessment Latency: {quality_time:.2f} ms")

    # 4. Benchmark Enhancement
    test_crop = frame[100:250, 100:250]
    print("Benchmarking Crop AI Enhancement (50 iterations)...")
    t0 = time.time()
    for _ in range(50):
        res = enhancer.enhance(test_crop)
    enh_time = (time.time() - t0) / 50 * 1000
    print(f"Mean Enhancement Latency: {enh_time:.2f} ms")

    total_pipeline_time = det_time + track_time + quality_time
    max_fps = 1000.0 / total_pipeline_time if total_pipeline_time > 0 else 0
    print(f"\nEstimated Real-time Throughput: {max_fps:.1f} FPS")
    print("Benchmark complete.")


if __name__ == "__main__":
    run_benchmark()
