"""Track metadata adapter for Ultralytics' native ByteTrack implementation.

Association, Kalman prediction, and track lifecycle are handled by Ultralytics
when ObjectDetector.track() is called. This class preserves VisionX telemetry
(direction, smoothing, and active category counts) without reimplementing
or mislabelling the association algorithm.
"""

from typing import Dict, List, Optional, Tuple

from app.ai.detector import DetectionResult


class TrackedObject:
    """VisionX telemetry for one native ByteTrack identity."""

    def __init__(
        self,
        track_id: int,
        category: str,
        bbox: Tuple[int, int, int, int],
        confidence: float,
        smoothing_factor: float = 0.75,
    ):
        self.track_id = track_id
        self.category = category
        self.raw_bbox = bbox
        self.smoothed_bbox = [float(value) for value in bbox]
        self.confidence = confidence
        self.smoothing_factor = smoothing_factor
        self.positions: List[Tuple[float, float]] = [self._center(bbox)]
        self.lost_frames = 0
        self.age = 1
        self.speed_kmh: Optional[float] = None
        self.direction = "Stationary"
        self.color = "Unknown"

    @staticmethod
    def _center(box: Tuple[int, int, int, int]) -> Tuple[float, float]:
        x1, y1, x2, y2 = box
        return ((x1 + x2) / 2.0, (y1 + y2) / 2.0)

    @property
    def bbox(self) -> Tuple[int, int, int, int]:
        return tuple(int(round(value)) for value in self.smoothed_bbox)

    def update(self, new_bbox: Tuple[int, int, int, int], confidence: float) -> None:
        self.raw_bbox = new_bbox
        self.confidence = confidence
        self.lost_frames = 0
        self.age += 1

        alpha = self.smoothing_factor
        for index in range(4):
            self.smoothed_bbox[index] = (
                alpha * new_bbox[index] + (1.0 - alpha) * self.smoothed_bbox[index]
            )

        center = self._center(self.bbox)
        previous = self.positions[-1]
        self.positions.append(center)
        if len(self.positions) > 30:
            self.positions.pop(0)

        if len(self.positions) >= 5:
            dx = center[0] - self.positions[-5][0]
            dy = center[1] - self.positions[-5][1]
        else:
            dx = center[0] - previous[0]
            dy = center[1] - previous[1]

        if abs(dx) <= 4 and abs(dy) <= 4:
            self.direction = "Stationary"
        elif abs(dx) > abs(dy) * 1.2:
            self.direction = "East" if dx > 0 else "West"
        elif abs(dy) > abs(dx) * 1.2:
            self.direction = "South" if dy > 0 else "North"
        elif dx > 0 and dy > 0:
            self.direction = "South-East"
        elif dx > 0 and dy < 0:
            self.direction = "North-East"
        elif dx < 0 and dy > 0:
            self.direction = "South-West"
        else:
            self.direction = "North-West"


class ByteTracker:
    """Adapter for identities produced by Ultralytics' real ByteTrack tracker."""

    def __init__(
        self,
        max_lost_frames: int = 45,
        iou_thresh: float = 0.30,
        smoothing_factor: float = 0.75,
    ):
        # max_lost_frames is retained for compatibility with existing settings.
        self.max_lost_frames = max_lost_frames
        self.iou_thresh = iou_thresh
        self.smoothing_factor = smoothing_factor
        self.tracks: Dict[int, TrackedObject] = {}

    def update(self, detections: List[DetectionResult]) -> List[DetectionResult]:
        """Update telemetry using IDs assigned upstream by Ultralytics ByteTrack."""
        seen_ids = set()
        tracked = []

        for detection in detections:
            if detection.track_id is None:
                continue

            track_id = int(detection.track_id)
            seen_ids.add(track_id)
            track = self.tracks.get(track_id)

            if track is None or track.category != detection.category:
                track = TrackedObject(
                    track_id,
                    detection.category,
                    detection.bbox,
                    detection.confidence,
                    smoothing_factor=self.smoothing_factor,
                )
                self.tracks[track_id] = track
            else:
                track.update(detection.bbox, detection.confidence)

            detection.track_id = track_id
            detection.bbox = track.bbox
            tracked.append(detection)

        expired = []
        for track_id, track in self.tracks.items():
            if track_id not in seen_ids:
                track.lost_frames += 1
                if track.lost_frames > self.max_lost_frames:
                    expired.append(track_id)

        for track_id in expired:
            del self.tracks[track_id]

        return tracked

    def get_active_count(self) -> Dict[str, int]:
        counts = {"person": 0, "car": 0, "bicycle": 0, "camera": 0}
        for track in self.tracks.values():
            if track.lost_frames == 0 and track.category.lower() in counts:
                counts[track.category.lower()] += 1
        return counts

    def reset(self) -> None:
        """Clear VisionX telemetry when the underlying video source is reset."""
        self.tracks.clear()
