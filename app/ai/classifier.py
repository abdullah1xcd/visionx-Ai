"""Vehicle sub-classification (Sedan, SUV, Truck, Van) based on visual attributes."""

from typing import Optional
import numpy as np


class VehicleClassifier:
    """Estimates vehicle body archetype from bounding box proportions and profile silhouettes."""

    @staticmethod
    def classify_vehicle_type(crop: np.ndarray, bbox: tuple) -> str:
        """Estimates vehicle type. Note: always presented as 'Estimated vehicle type'."""
        if crop is None or crop.size == 0:
            return "Vehicle"

        h, w = crop.shape[:2]
        if h == 0 or w == 0:
            return "Vehicle"

        aspect_ratio = float(w) / float(h)

        # Heuristic archetype approximation based on bounding geometry
        if aspect_ratio > 2.2:
            return "Sedan"
        elif 1.6 <= aspect_ratio <= 2.2:
            # Check upper vertical proportion to distinguish SUV from Hatchback
            upper_crop = crop[:int(h * 0.4), :]
            if upper_crop.size > 0:
                upper_gray = np.mean(upper_crop)
                if upper_gray < 80:
                    return "SUV"
            return "Sedan / Hatchback"
        elif 1.2 <= aspect_ratio < 1.6:
            return "SUV / Crossover"
        elif aspect_ratio < 1.2:
            return "Van / Commercial Vehicle"
        else:
            return "Automobile"
