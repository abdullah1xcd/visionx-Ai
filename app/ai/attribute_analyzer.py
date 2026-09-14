"""Observable visual and activity attribute analyzer for detected people and objects."""

from typing import Dict, Any, Optional
import numpy as np
import cv2
from app.utils.image_utils import estimate_dominant_color


class AttributeAnalyzer:
    """Analyzes observable physical features (garment color, posture, movement).
    NOTE: Strictly respects ethical computer vision guidelines:
    - Never infers emotion, intent, criminality, or psychological state.
    - Only measures observable geometry and pixel color data.
    """

    @staticmethod
    def analyze_person(crop: np.ndarray, speed_kmh: Optional[float], direction: str) -> Dict[str, Any]:
        """Extracts observable clothing color and activity state from a person crop."""
        if crop is None or crop.size == 0:
            return {
                "activity": "Standing",
                "posture": "Standing",
                "movement": direction or "Stationary",
                "clothing_upper": "Unknown",
                "clothing_lower": "Unknown",
                "clothing_summary": "Unknown",
                "tracked": True
            }

        h, w = crop.shape[:2]

        # Upper garment (torso: 25% to 55% vertical range)
        upper_crop = crop[int(h * 0.25):int(h * 0.55), int(w * 0.2):int(w * 0.8)]
        upper_color = estimate_dominant_color(upper_crop)

        # Lower garment (legs: 60% to 90% vertical range)
        lower_crop = crop[int(h * 0.60):int(h * 0.90), int(w * 0.2):int(w * 0.8)]
        lower_color = estimate_dominant_color(lower_crop)

        # Activity inference from velocity
        if speed_kmh is not None and speed_kmh > 3.0:
            activity = "Walking"
        else:
            activity = "Standing"

        return {
            "activity": activity,
            "posture": "Standing",
            "movement": direction if direction != "Stationary" else "Stationary",
            "clothing_upper": f"{upper_color} upper garment",
            "clothing_lower": f"{lower_color} lower garment",
            "clothing_summary": f"{upper_color} / {lower_color}",
            "tracked": True
        }
