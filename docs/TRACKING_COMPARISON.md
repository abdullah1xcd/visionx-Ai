# VisionX Tracking Comparison Protocol

## Purpose

Compare the project's simple greedy IoU association baseline with the native Ultralytics ByteTrack integration on the same recorded video. This is an engineering benchmark, not a MOTChallenge accuracy evaluation.

## Run

From the repository root in the same Python environment used by the desktop app:

```bash
python -m unittest discover -s tests -p "test_*.py" -v
python scripts/tracking_comparison.py --video path/to/your_video.mp4
```

Optional controls:

```bash
python scripts/tracking_comparison.py \
  --video path/to/your_video.mp4 \
  --max-frames 600 \
  --stride 1 \
  --warmup 10 \
  --iou-match-threshold 0.30 \
  --output-dir runs/tracking_comparison
```

The script writes:
- `comparison.json`: settings and summary metrics for each tracker.
- `comparison_frames.csv`: per-frame latency, number of tracked detections, and assigned IDs.

## Controlled variables

- Same input video and sampled frame indices.
- Same loaded YOLO weights and compute device.
- Same inference image size.
- Same detector confidence floor (0.05) and NMS IoU setting.
- Greedy-IoU association threshold is independently set to 0.30 by default (`--iou-match-threshold`); it is not copied from ByteTrack's `match_thresh`.
- Same VisionX category display thresholds.
- Warm-up frames excluded from latency/FPS calculations.

The IoU baseline is class-aware greedy matching by bounding-box IoU. It is intentionally a simple baseline and does not use a Kalman filter or ByteTrack's low-confidence second association stage.

## Reported metrics

- Mean, median, and P95 per-frame processing latency.
- Processing FPS (derived from measured inference + association time).
- Wall-clock FPS (includes video decoding and benchmark overhead).
- Number of unique track IDs and tracked detection observations.

Unique ID count is descriptive only. A higher or lower count does not by itself indicate better tracking quality.

## Important limitations

No ground-truth identity annotations are bundled with this benchmark. Therefore it does not report ID switches, MOTA, IDF1, or HOTA. Do not present these as measured results. For a publication-grade identity comparison, run both methods on an annotated MOT dataset (for example MOT17) and evaluate with a standard toolkit such as TrackEval.

Offline processing FPS is not a guaranteed live-camera FPS. Record the machine CPU/GPU, driver/runtime versions, model weights, video resolution/FPS, and exact video used alongside any reported results.

## Results table template

| Method | Mean latency (ms) | P95 latency (ms) | Processing FPS | Wall-clock FPS | Unique IDs |
|---|---:|---:|---:|---:|---:|
| Greedy IoU | — | — | — | — | — |
| ByteTrack | — | — | — | — | — |

Fill the table only from a completed run. Do not substitute the published ByteTrack paper's benchmark numbers for VisionX measurements.
