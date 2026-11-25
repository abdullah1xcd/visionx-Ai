"""Side-by-side video benchmark: greedy IoU baseline vs Ultralytics ByteTrack.

Both modes use the same YOLO weights, input video, image size, device, NMS IoU,
and detector confidence floor. The IoU baseline uses class-aware greedy matching
on the detector outputs; ByteTrack uses Ultralytics' native two-stage association.

This is an engineering comparison, not a MOTChallenge evaluation. Without
ground-truth identity annotations, ID switches, MOTA, IDF1, and HOTA are omitted.
"""
from __future__ import annotations

import argparse
import csv
import json
import statistics
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import cv2

from app.ai.detector import ObjectDetector, DetectionResult
from app.ai.tracker import ByteTracker
from app.config.settings import settings


@dataclass
class IoUTrack:
    track_id: int
    category: str
    bbox: tuple[int, int, int, int]
    lost: int = 0


class GreedyIoUTracker:
    """Simple class-aware IoU association baseline (not a Kalman tracker)."""

    def __init__(self, match_threshold: float = 0.30, max_lost: int = 45):
        self.match_threshold = match_threshold
        self.max_lost = max_lost
        self.tracks: dict[int, IoUTrack] = {}
        self.next_id = 1

    @staticmethod
    def iou(a: tuple[int, int, int, int], b: tuple[int, int, int, int]) -> float:
        x1, y1 = max(a[0], b[0]), max(a[1], b[1])
        x2, y2 = min(a[2], b[2]), min(a[3], b[3])
        intersection = max(0, x2 - x1) * max(0, y2 - y1)
        area_a = max(0, a[2] - a[0]) * max(0, a[3] - a[1])
        area_b = max(0, b[2] - b[0]) * max(0, b[3] - b[1])
        union = area_a + area_b - intersection
        return intersection / union if union else 0.0

    def update(self, detections: list[DetectionResult]) -> list[DetectionResult]:
        candidates = []
        for index, detection in enumerate(detections):
            for track_id, track in self.tracks.items():
                if track.lost == 0 and track.category == detection.category:
                    score = self.iou(track.bbox, detection.bbox)
                    if score >= self.match_threshold:
                        candidates.append((score, index, track_id))
        candidates.sort(reverse=True)

        used_detections: set[int] = set()
        used_tracks: set[int] = set()
        assignments: dict[int, int] = {}
        for _, detection_index, track_id in candidates:
            if detection_index not in used_detections and track_id not in used_tracks:
                assignments[detection_index] = track_id
                used_detections.add(detection_index)
                used_tracks.add(track_id)

        for track_id, track in list(self.tracks.items()):
            if track_id not in used_tracks:
                track.lost += 1
                if track.lost > self.max_lost:
                    del self.tracks[track_id]

        output = []
        for index, detection in enumerate(detections):
            track_id = assignments.get(index)
            if track_id is None:
                track_id = self.next_id
                self.next_id += 1
                self.tracks[track_id] = IoUTrack(track_id, detection.category, detection.bbox)
            else:
                track = self.tracks[track_id]
                track.bbox = detection.bbox
                track.lost = 0
            detection.track_id = track_id
            output.append(detection)
        return output


def percentile(values: list[float], pct: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    index = min(len(ordered) - 1, round((pct / 100) * (len(ordered) - 1)))
    return ordered[index]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Compare greedy IoU tracking with native ByteTrack.")
    parser.add_argument("--video", required=True, help="Path to a recorded video.")
    parser.add_argument("--max-frames", type=int, default=0, help="Maximum sampled frames per method; 0 = all.")
    parser.add_argument("--stride", type=int, default=1, help="Process every Nth decoded frame.")
    parser.add_argument("--warmup", type=int, default=5, help="Warm-up frames excluded from timing.")
    parser.add_argument("--output-dir", default="runs/tracking_comparison")
    return parser.parse_args()


def benchmark_method(detector: ObjectDetector, video_path: Path, method: str,
                     max_frames: int, stride: int, warmup: int) -> tuple[dict, list[dict]]:
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise RuntimeError(f"Cannot open video: {video_path}")

    iou_tracker = GreedyIoUTracker(
        match_threshold=float(settings.tracking.match_thresh),
        max_lost=int(settings.tracking.track_buffer),
    )
    byte_adapter = ByteTracker(
        max_lost_frames=int(settings.tracking.track_buffer),
        iou_thresh=float(settings.tracking.match_thresh),
        smoothing_factor=float(settings.tracking.bbox_smoothing_factor),
    )
    latencies: list[float] = []
    rows: list[dict] = []
    unique_ids: set[int] = set()
    observations = 0
    sampled = 0
    decoded = 0
    wall_started = time.perf_counter()

    try:
        while max_frames == 0 or sampled < max_frames:
            ok, frame = cap.read()
            if not ok:
                break
            frame_index = decoded
            decoded += 1
            if frame_index % stride:
                continue

            started = time.perf_counter()
            if method == "ByteTrack":
                detections = detector.track(frame)
                tracked = byte_adapter.update(detections)
            else:
                processed = detector._conditional_preprocess(frame)
                predictions = detector.model.predict(
                    source=processed,
                    conf=0.05,
                    iou=settings.detection.iou_threshold,
                    imgsz=detector.inference_size,
                    verbose=False,
                    device=detector.device,
                )
                boxes = predictions[0].boxes if predictions else None
                detections = detector._convert_boxes(boxes, require_track_id=False)
                tracked = iou_tracker.update(detections)
            elapsed_ms = (time.perf_counter() - started) * 1000
            sampled += 1

            ids = [int(item.track_id) for item in tracked if item.track_id is not None]
            unique_ids.update(ids)
            observations += len(ids)
            if sampled > warmup:
                latencies.append(elapsed_ms)
                rows.append({
                    "method": method,
                    "frame_index": frame_index,
                    "latency_ms": round(elapsed_ms, 3),
                    "detections_with_ids": len(ids),
                    "track_ids": ";".join(map(str, ids)),
                })
    finally:
        cap.release()

    wall_seconds = time.perf_counter() - wall_started
    measured_seconds = sum(latencies) / 1000
    measured_frames = len(latencies)
    summary = {
        "method": method,
        "sampled_frames_including_warmup": sampled,
        "measured_frames": measured_frames,
        "mean_latency_ms": round(statistics.mean(latencies), 3) if latencies else 0.0,
        "median_latency_ms": round(statistics.median(latencies), 3) if latencies else 0.0,
        "p95_latency_ms": round(percentile(latencies, 95), 3),
        "processing_fps": round(measured_frames / measured_seconds, 3) if measured_seconds else 0.0,
        "wall_clock_fps_including_decode": round(sampled / wall_seconds, 3) if wall_seconds else 0.0,
        "unique_track_ids": len(unique_ids),
        "tracked_detection_observations_including_warmup": observations,
    }
    return summary, rows


def main() -> int:
    args = parse_args()
    video_path = Path(args.video)
    if not video_path.is_file():
        print(f"ERROR: video not found: {video_path}")
        return 2
    if args.max_frames < 0 or args.stride < 1 or args.warmup < 0:
        print("ERROR: max-frames and warmup must be >= 0; stride must be >= 1.")
        return 2

    detector = ObjectDetector()
    if not detector.is_ready:
        print("ERROR: YOLO detector is not ready.")
        return 3

    # Each method gets a fresh VideoCapture and processes the same sampled frame sequence.
    # ByteTrack is run first so its persistent tracker state is never mixed with predict().
    summaries = []
    all_rows = []
    for method in ("ByteTrack", "Greedy-IoU"):
        print(f"Running {method}...")
        summary, rows = benchmark_method(
            detector, video_path, method, args.max_frames, args.stride, args.warmup
        )
        summaries.append(summary)
        all_rows.extend(rows)

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    report = {
        "video": str(video_path.resolve()),
        "detector": "same loaded Ultralytics YOLO model for both methods",
        "shared_settings": {
            "device": detector.device,
            "device_description": detector.device_desc,
            "inference_size": detector.inference_size,
            "detector_confidence_floor": 0.05,
            "nms_iou": settings.detection.iou_threshold,
            "stride": args.stride,
            "warmup_frames_excluded_per_method": args.warmup,
        },
        "methods": summaries,
        "limitations": [
            "Greedy-IoU is a simple class-aware IoU baseline, not a Kalman-filter tracker.",
            "The same video and detector settings are used, but ByteTrack's low-score association is algorithmically different from greedy IoU.",
            "Unique ID count is not an identity-accuracy metric.",
            "No ground-truth annotations were supplied; ID switches, MOTA, IDF1, and HOTA are not computed.",
            "Results are offline benchmark measurements and do not guarantee live-camera FPS.",
        ],
    }
    (output_dir / "comparison.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    with (output_dir / "comparison_frames.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=["method", "frame_index", "latency_ms", "detections_with_ids", "track_ids"],
        )
        writer.writeheader()
        writer.writerows(all_rows)

    print("\n=== VisionX: Greedy IoU vs ByteTrack ===")
    for item in summaries:
        print(
            f"{item['method']}: FPS={item['processing_fps']:.2f}, "
            f"mean latency={item['mean_latency_ms']:.2f} ms, "
            f"unique IDs={item['unique_track_ids']}, "
            f"tracked observations={item['tracked_detection_observations_including_warmup']}"
        )
    print(f"Reports: {output_dir.resolve()}")
    print("NOTE: No ground truth; do not interpret unique ID count as tracking accuracy.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
