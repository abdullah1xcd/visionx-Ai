"""Vehicle speed estimation based on trajectory displacement and perspective calibration."""

from typing import Dict, Tuple, List, Optional
import time
import math


class SpeedEstimator:
    """Estimates speed in km/h based on tracked object displacement over time."""

    def __init__(self, calibration_factor: float = 0.08, fps: float = 30.0):
        # meters per pixel displacement per second factor
        self.calibration_factor = calibration_factor
        self.fps = fps
        # History: track_id -> [(timestamp, (cx, cy))]
        self.history: Dict[int, List[Tuple[float, Tuple[float, float]]]] = {}

    def update(self, track_id: int, bbox: Tuple[int, int, int, int]) -> Optional[float]:
        """Calculates estimated speed in km/h. Returns None if insufficient history."""
        x1, y1, x2, y2 = bbox
        cx = (x1 + x2) / 2.0
        cy = (y1 + y2) / 2.0
        now = time.time()

        if track_id not in self.history:
            self.history[track_id] = [(now, (cx, cy))]
            return None

        records = self.history[track_id]
        records.append((now, (cx, cy)))

        # Keep last 10 points
        if len(records) > 10:
            records.pop(0)

        if len(records) < 3:
            return None

        # Calculate displacement between first and last sample in window
        t_start, (x_start, y_start) = records[0]
        t_end, (x_end, y_end) = records[-1]
        dt = t_end - t_start

        if dt <= 0.05:
            return None

        pixel_dist = math.sqrt((x_end - x_start) ** 2 + (y_end - y_start) ** 2)
        pixel_velocity = pixel_dist / dt  # pixels per second

        # Convert pixel velocity to estimated meters per second, then km/h
        # meters_per_second = pixel_velocity * calibration_factor
        # km_per_hour = meters_per_second * 3.6
        estimated_kmh = (pixel_velocity * self.calibration_factor) * 3.6

        # Stationary threshold
        if estimated_kmh < 4.0:
            return 0.0

        # Clamp to realistic road speed range
        return round(min(160.0, estimated_kmh), 1)

    def cleanup(self, active_track_ids: List[int]):
        """Removes expired tracks from tracking history."""
        active_set = set(active_track_ids)
        to_remove = [tid for tid in self.history if tid not in active_set]
        for tid in to_remove:
            del self.history[tid]
