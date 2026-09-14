"""Multi-Object Tracker providing stable identity assignment and temporal smoothing (ByteTrack / BoT-SORT)."""

from typing import List, Dict, Tuple, Optional
import numpy as np
from app.ai.detector import DetectionResult
from app.utils.logger import logger


class TrackedObject:
    """Represents an active track trajectory across multiple video frames with temporal smoothing."""

    def __init__(
        self,
        track_id: int,
        category: str,
        bbox: Tuple[int, int, int, int],
        confidence: float,
        smoothing_factor: float = 0.75
    ):
        self.track_id = track_id
        self.category = category
        self.raw_bbox = bbox
        self.smoothed_bbox = [float(v) for v in bbox]
        self.confidence = confidence
        self.smoothing_factor = smoothing_factor
        self.positions: List[Tuple[float, float]] = [self._center(bbox)]
        self.lost_frames = 0
        self.age = 1
        self.speed_kmh: Optional[float] = None
        self.direction: str = "Stationary"
        self.color: str = "Unknown"

    @staticmethod
    def _center(box: Tuple[int, int, int, int]) -> Tuple[float, float]:
        x1, y1, x2, y2 = box
        return ((x1 + x2) / 2.0, (y1 + y2) / 2.0)

    @property
    def bbox(self) -> Tuple[int, int, int, int]:
        """Returns integer bounding box after temporal smoothing."""
        return (
            int(round(self.smoothed_bbox[0])),
            int(round(self.smoothed_bbox[1])),
            int(round(self.smoothed_bbox[2])),
            int(round(self.smoothed_bbox[3])),
        )

    def update(self, new_bbox: Tuple[int, int, int, int], confidence: float):
        """Updates track with new detection and applies temporal exponential moving average smoothing."""
        self.raw_bbox = new_bbox
        self.confidence = confidence
        self.lost_frames = 0
        self.age += 1

        # Temporal smoothing: Prevents bounding boxes from jumping or vibrating
        alpha = self.smoothing_factor
        for i in range(4):
            self.smoothed_bbox[i] = alpha * new_bbox[i] + (1.0 - alpha) * self.smoothed_bbox[i]

        new_center = self._center(self.bbox)
        prev_center = self.positions[-1]
        self.positions.append(new_center)
        if len(self.positions) > 30:
            self.positions.pop(0)

        # Compute smoothed movement trajectory & direction
        if len(self.positions) >= 5:
            start_pos = self.positions[-5]
            dx = new_center[0] - start_pos[0]
            dy = new_center[1] - start_pos[1]
        else:
            dx = new_center[0] - prev_center[0]
            dy = new_center[1] - prev_center[1]

        if abs(dx) > 4 or abs(dy) > 4:
            if abs(dx) > abs(dy) * 1.2:
                self.direction = "East" if dx > 0 else "West"
            elif abs(dy) > abs(dx) * 1.2:
                self.direction = "South" if dy > 0 else "North"
            else:
                if dx > 0 and dy > 0:
                    self.direction = "South-East"
                elif dx > 0 and dy < 0:
                    self.direction = "North-East"
                elif dx < 0 and dy > 0:
                    self.direction = "South-West"
                else:
                    self.direction = "North-West"
        else:
            self.direction = "Stationary"


def calculate_iou(boxA: Tuple[int, int, int, int], boxB: Tuple[int, int, int, int]) -> float:
    """Calculates Intersection over Union between two bounding boxes."""
    xA = max(boxA[0], boxB[0])
    yA = max(boxA[1], boxB[1])
    xB = min(boxA[2], boxB[2])
    yB = min(boxA[3], boxB[3])

    interArea = max(0, xB - xA) * max(0, yB - yA)
    boxAArea = (boxA[2] - boxA[0]) * (boxA[3] - boxA[1])
    boxBArea = (boxB[2] - boxB[0]) * (boxB[3] - boxB[1])

    denom = float(boxAArea + boxBArea - interArea)
    if denom <= 0:
        return 0.0
    return interArea / denom


class ByteTracker:
    """ByteTrack-inspired multi-object tracker with dual-stage association and temporal smoothing."""

    def __init__(self, max_lost_frames: int = 45, iou_thresh: float = 0.30, smoothing_factor: float = 0.75):
        self.max_lost_frames = max_lost_frames
        self.iou_thresh = iou_thresh
        self.smoothing_factor = smoothing_factor
        self.tracks: Dict[int, TrackedObject] = {}
        self.next_id = 1

    def update(self, detections: List[DetectionResult]) -> List[DetectionResult]:
        """Matches incoming detections with existing tracks using two-stage IoU association."""
        matched_track_ids = set()
        matched_det_indices = set()

        # Step 1: Associate detections with existing tracks of the same category
        for det_idx, det in enumerate(detections):
            best_iou = 0.0
            best_track_id = None

            for t_id, track in self.tracks.items():
                if t_id in matched_track_ids:
                    continue
                if track.category != det.category:
                    continue

                iou = calculate_iou(det.bbox, track.bbox)
                if iou > best_iou and iou >= self.iou_thresh:
                    best_iou = iou
                    best_track_id = t_id

            if best_track_id is not None:
                self.tracks[best_track_id].update(det.bbox, det.confidence)
                det.track_id = best_track_id
                # Use smoothed bbox for rendering
                det.bbox = self.tracks[best_track_id].bbox
                matched_track_ids.add(best_track_id)
                matched_det_indices.add(det_idx)

        # Step 2: Create new tracks for unmatched detections
        for det_idx, det in enumerate(detections):
            if det_idx not in matched_det_indices:
                new_id = self.next_id
                self.next_id += 1
                new_track = TrackedObject(
                    new_id,
                    det.category,
                    det.bbox,
                    det.confidence,
                    smoothing_factor=self.smoothing_factor
                )
                self.tracks[new_id] = new_track
                det.track_id = new_id
                matched_track_ids.add(new_id)

        # Step 3: Age and purge tracks that haven't been detected for max_lost_frames
        to_delete = []
        for t_id, track in self.tracks.items():
            if t_id not in matched_track_ids:
                track.lost_frames += 1
                if track.lost_frames > self.max_lost_frames:
                    to_delete.append(t_id)

        for t_id in to_delete:
            del self.tracks[t_id]

        return detections

    def get_active_count(self) -> Dict[str, int]:
        """Returns live counts of currently active tracks per category."""
        counts = {"person": 0, "car": 0, "bicycle": 0, "camera": 0}
        for track in self.tracks.values():
            if track.lost_frames == 0:
                cat = track.category.lower()
                if cat in counts:
                    counts[cat] += 1
        return counts
