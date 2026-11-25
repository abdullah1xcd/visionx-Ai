"""Reproducible video benchmark for VisionX YOLO + native Ultralytics ByteTrack.

Usage:
    python scripts/benchmark_tracking.py --video path/to/video.mp4
    python scripts/benchmark_tracking.py --video clip.mp4 --max-frames 600 --save-video runs/annotated.mp4

Reported identity metrics are descriptive only. Without ground-truth track annotations,
IDF1, HOTA, MOTA, and true ID-switch counts cannot be calculated.
"""

from __future__ import annotations

import argparse
import csv
import json
import statistics
import sys
import time
from collections import Counter
from pathlib import Path
from typing import Any

import cv2

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.ai.detector import ObjectDetector
from app.ai.tracker import ByteTracker


def percentile(values: list[float], percent: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    index = min(len(ordered) - 1, max(0, round((percent / 100) * (len(ordered) - 1))))
    return ordered[index]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Benchmark VisionX tracking on a recorded video.")
    parser.add_argument("--video", required=True, help="Path to an input video file.")
    parser.add_argument("--max-frames", type=int, default=0, help="Maximum processed frames; 0 means all.")
    parser.add_argument("--stride", type=int, default=1, help="Process every Nth decoded frame.")
    parser.add_argument("--warmup", type=int, default=5, help="Warm-up frames excluded from timing.")
    parser.add_argument("--csv", dest="csv_path", default="tracking_benchmark_frames.csv")
    parser.add_argument("--json", dest="json_path", default="tracking_benchmark_summary.json")
    parser.add_argument("--save-video", default="", help="Optional path for annotated output video.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    video_path = Path(args.video)
    if not video_path.is_file():
        print(f"ERROR: video file not found: {video_path}")
        return 2
    if args.stride < 1 or args.max_frames < 0 or args.warmup < 0:
        print("ERROR: stride must be >= 1; max-frames and warmup must be >= 0.")
        return 2

    capture = cv2.VideoCapture(str(video_path))
    if not capture.isOpened():
        print(f"ERROR: could not open video: {video_path}")
        return 2

    source_fps = float(capture.get(cv2.CAP_PROP_FPS) or 0.0)
    source_frames = int(capture.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
    height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)

    detector = ObjectDetector()
    if not detector.is_ready:
        capture.release()
        print("ERROR: detector is not ready. Check Ultralytics/model installation.")
        return 3
    telemetry = ByteTracker()

    output_path = Path(args.save_video) if args.save_video else None
    writer = None
    rows: list[dict[str, Any]] = []
    latencies_ms: list[float] = []
    seen_track_ids: set[int] = set()
    track_categories: dict[int, str] = {}
    category_counts: Counter[str] = Counter()
    decoded_index = 0
    processed = 0
    warmup_done = 0
    processing_started = None

    if output_path:
        output_path.parent.mkdir(parents=True, exist_ok=True)

    try:
        while args.max_frames == 0 or processed < args.max_frames:
            ok, frame = capture.read()
            if not ok:
                break
            current_index = decoded_index
            decoded_index += 1
            if current_index % args.stride:
                continue

            start = time.perf_counter()
            detections = detector.track(frame)
            tracked = telemetry.update(detections)
            elapsed_ms = (time.perf_counter() - start) * 1000.0
            processed += 1

            ids = [int(item.track_id) for item in tracked if item.track_id is not None]
            for item in tracked:
                if item.track_id is not None:
                    seen_track_ids.add(int(item.track_id))
                    track_categories[int(item.track_id)] = item.category
                    category_counts[item.category] += 1

            if warmup_done < args.warmup:
                warmup_done += 1
            else:
                if processing_started is None:
                    processing_started = time.perf_counter()
                latencies_ms.append(elapsed_ms)
                rows.append({
                    "frame_index": current_index,
                    "latency_ms": round(elapsed_ms, 3),
                    "tracked_detections": len(tracked),
                    "track_ids": ";".join(map(str, ids)),
                })

            if output_path:
                if writer is None:
                    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
                    writer = cv2.VideoWriter(str(output_path), fourcc, source_fps or 25.0, (width, height))
                    if not writer.isOpened():
                        raise RuntimeError(f"Could not create output video: {output_path}")
                for item in tracked:
                    x1, y1, x2, y2 = item.bbox
                    label = f"{item.category} #{item.track_id} {item.confidence:.2f}"
                    cv2.rectangle(frame, (x1, y1), (x2, y2), (60, 220, 120), 2)
                    cv2.putText(frame, label, (x1, max(18, y1 - 7)),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (60, 220, 120), 1, cv2.LINE_AA)
                writer.write(frame)

    finally:
        capture.release()
        if writer is not None:
            writer.release()

    measured_frames = len(latencies_ms)
    measured_seconds = sum(latencies_ms) / 1000.0
    benchmark_fps = measured_frames / measured_seconds if measured_seconds > 0 else 0.0
    summary = {
        "video": str(video_path.resolve()),
        "source": {"width": width, "height": height, "fps": source_fps, "frame_count": source_frames},
        "configuration": {
            "device": detector.device,
            "device_description": detector.device_desc,
            "stride": args.stride,
            "warmup_frames_excluded": warmup_done,
            "max_frames": args.max_frames,
        },
        "results": {
            "processed_frames_including_warmup": processed,
            "measured_frames": measured_frames,
            "mean_latency_ms": round(statistics.mean(latencies_ms), 3) if latencies_ms else 0.0,
            "median_latency_ms": round(statistics.median(latencies_ms), 3) if latencies_ms else 0.0,
            "p95_latency_ms": round(percentile(latencies_ms, 95), 3),
            "p99_latency_ms": round(percentile(latencies_ms, 99), 3),
            "processing_fps": round(benchmark_fps, 3),
            "unique_track_ids": len(seen_track_ids),
            "tracked_detection_observations_by_category": dict(category_counts),
            "track_category_by_id": {str(key): value for key, value in sorted(track_categories.items())},
        },
        "interpretation": (
            "Track IDs and detection observations are descriptive. This benchmark has no ground-truth "
            "annotations, so it does not calculate ID switches, IDF1, HOTA, or MOTA. Processing FPS "
            "measures this offline run, not guaranteed live-camera FPS."
        ),
    }

    csv_path = Path(args.csv_path)
    json_path = Path(args.json_path)
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    json_path.parent.mkdir(parents=True, exist_ok=True)
    with csv_path.open("w", newline="", encoding="utf-8") as handle:
        writer_csv = csv.DictWriter(handle, fieldnames=["frame_index", "latency_ms", "tracked_detections", "track_ids"])
        writer_csv.writeheader()
        writer_csv.writerows(rows)
    json_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")

    print("\n=== VisionX Tracking Benchmark ===")
    print(f"Video: {video_path}")
    print(f"Device: {detector.device} ({detector.device_desc})")
    print(f"Measured frames: {measured_frames} (warm-up excluded)")
    print(f"Mean / median latency: {summary['results']['mean_latency_ms']:.2f} / "
          f"{summary['results']['median_latency_ms']:.2f} ms")
    print(f"P95 latency: {summary['results']['p95_latency_ms']:.2f} ms")
    print(f"Offline processing FPS: {benchmark_fps:.2f}")
    print(f"Unique track IDs observed: {len(seen_track_ids)}")
    print(f"CSV: {csv_path}")
    print(f"JSON: {json_path}")
    if output_path:
        print(f"Annotated video: {output_path}")
    print("\nNOTE: No ground truth supplied; ID switches, IDF1, HOTA, and MOTA are not computed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
