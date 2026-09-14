"""Video utilities for frame drawing, test pattern generation, and synthetic streams."""

from typing import List, Tuple, Dict, Any, Optional
import numpy as np
import cv2


def draw_detection_box(
    frame: np.ndarray,
    bbox: Tuple[int, int, int, int],
    label: str,
    color: Tuple[int, int, int] = (201, 168, 69),  # Gold accent in BGR
    is_selected: bool = False
) -> np.ndarray:
    """Draws a clean, modern bounding box with label tag matching VisionX AI aesthetics."""
    x1, y1, x2, y2 = [int(v) for v in bbox]
    thickness = 3 if is_selected else 2

    # Draw corner-accented or solid rectangle
    cv2.rectangle(frame, (x1, y1), (x2, y2), color, thickness, cv2.LINE_AA)

    # Label background badge
    font = cv2.FONT_HERSHEY_SIMPLEX
    font_scale = 0.5
    font_thickness = 1
    (text_w, text_h), baseline = cv2.getTextSize(label, font, font_scale, font_thickness)

    # Badge coordinates
    badge_y1 = max(0, y1 - text_h - 8)
    badge_y2 = y1
    badge_x1 = x1
    badge_x2 = min(frame.shape[1], x1 + text_w + 12)

    # Semi-transparent or solid badge
    cv2.rectangle(frame, (badge_x1, badge_y1), (badge_x2, badge_y2), color, -1)
    cv2.putText(
        frame,
        label,
        (badge_x1 + 6, badge_y2 - 5),
        font,
        font_scale,
        (16, 50, 69) if color == (201, 168, 69) else (255, 255, 255),  # Dark navy text on gold
        font_thickness,
        cv2.LINE_AA
    )
    return frame


def generate_synthetic_scene(width: int = 1280, height: int = 720, frame_idx: int = 0) -> Tuple[np.ndarray, List[Dict[str, Any]]]:
    """Generates an elegant synthetic computer vision test stream when no physical camera is attached.
    Simulates traffic road and pedestrian sidewalk with realistic moving objects (Person, Car, Bicycle).
    """
    canvas = np.zeros((height, width, 3), dtype=np.uint8)

    # Gradient background representing street/urban road
    for y in range(height):
        # Dark navy urban roadway
        val = int(24 + (y / height) * 20)
        canvas[y, :] = (val, val + 5, val + 15)

    # Road lanes
    road_top = int(height * 0.35)
    road_bottom = int(height * 0.95)
    cv2.rectangle(canvas, (0, road_top), (width, road_bottom), (38, 42, 48), -1)

    # Lane markings (dashed)
    lane_y = int((road_top + road_bottom) / 2)
    for x in range(0, width, 60):
        cv2.line(canvas, (x, lane_y), (x + 30, lane_y), (180, 180, 180), 3)

    # Sidewalk
    cv2.rectangle(canvas, (0, int(height * 0.1)), (width, road_top), (50, 56, 64), -1)
    cv2.line(canvas, (0, road_top), (width, road_top), (120, 120, 130), 2)

    objects = []

    # Moving Car #01 (Sedan moving right)
    car1_w, car1_h = 240, 110
    car1_x = int((frame_idx * 6) % (width + car1_w) - car1_w / 2)
    car1_y = lane_y + 20
    if -car1_w < car1_x < width:
        # Draw car body
        cv2.rectangle(canvas, (car1_x, car1_y), (car1_x + car1_w, car1_y + car1_h), (30, 30, 30), -1)
        cv2.rectangle(canvas, (car1_x + 35, car1_y - 35), (car1_x + car1_w - 45, car1_y), (45, 45, 55), -1)
        # License plate on bumper
        plate_w, plate_h = 60, 20
        px1, py1 = car1_x + car1_w - 40, car1_y + car1_h - 25
        cv2.rectangle(canvas, (px1, py1), (px1 + plate_w, py1 + plate_h), (240, 240, 240), -1)
        cv2.putText(canvas, "ABC 1234", (px1 + 2, py1 + 15), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (0, 0, 0), 1)

        objects.append({
            "category": "car",
            "bbox": (car1_x, car1_y - 35, car1_x + car1_w, car1_y + car1_h),
            "confidence": 0.94,
            "track_id": 4,
            "color": "Black",
            "direction": "East",
            "speed_kmh": 61.2,
            "plate_text": "ABC 1234",
            "plate_conf": 0.92,
            "plate_bbox": (px1, py1, px1 + plate_w, py1 + plate_h)
        })

    # Moving Car #02 (SUV moving left in top lane)
    car2_w, car2_h = 260, 120
    car2_x = int(width - ((frame_idx * 7) % (width + car2_w)) - car2_w / 2)
    car2_y = road_top + 15
    if -car2_w < car2_x < width:
        cv2.rectangle(canvas, (car2_x, car2_y), (car2_x + car2_w, car2_y + car2_h), (210, 210, 215), -1)
        cv2.rectangle(canvas, (car2_x + 40, car2_y - 40), (car2_x + car2_w - 40, car2_y), (160, 165, 175), -1)
        # Plate
        px2, py2 = car2_x + 10, car2_y + car2_h - 28
        cv2.rectangle(canvas, (px2, py2), (px2 + 65, py2 + 22), (245, 245, 245), -1)
        cv2.putText(canvas, "VX 8892", (px2 + 3, py2 + 16), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (0, 0, 0), 1)

        objects.append({
            "category": "car",
            "bbox": (car2_x, car2_y - 40, car2_x + car2_w, car2_y + car2_h),
            "confidence": 0.96,
            "track_id": 7,
            "color": "Silver / Gray",
            "direction": "West",
            "speed_kmh": 68.5,
            "plate_text": "VX 8892",
            "plate_conf": 0.95,
            "plate_bbox": (px2, py2, px2 + 65, py2 + 22)
        })

    # Pedestrian walking on sidewalk (Person #12)
    p_x = int((frame_idx * 2 + 150) % (width + 80) - 40)
    p_y = int(height * 0.16)
    p_w, p_h = 45, 110
    if -p_w < p_x < width:
        # Head
        cv2.circle(canvas, (p_x + 22, p_y + 15), 12, (200, 170, 140), -1)
        # Upper garment (Dark navy / black)
        cv2.rectangle(canvas, (p_x + 10, p_y + 28), (p_x + 35, p_y + 70), (25, 25, 30), -1)
        # Lower garment (Blue jeans)
        cv2.rectangle(canvas, (p_x + 12, p_y + 70), (p_x + 33, p_y + 110), (120, 70, 30), -1)

        objects.append({
            "category": "person",
            "bbox": (p_x, p_y, p_x + p_w, p_y + p_h),
            "confidence": 0.96,
            "track_id": 12,
            "color": "Black / Blue",
            "direction": "East",
            "speed_kmh": 4.8,
            "activity": "Walking",
            "posture": "Standing"
        })

    # Bicycle rider (Bicycle #02)
    b_x = int((frame_idx * 3 + 400) % (width + 100) - 50)
    b_y = int(height * 0.22)
    b_w, b_h = 70, 85
    if -b_w < b_x < width:
        # Wheels
        cv2.circle(canvas, (b_x + 15, b_y + 65), 14, (180, 180, 180), 2)
        cv2.circle(canvas, (b_x + 55, b_y + 65), 14, (180, 180, 180), 2)
        # Frame
        cv2.line(canvas, (b_x + 15, b_y + 65), (b_x + 35, b_y + 45), (40, 40, 210), 3)
        cv2.line(canvas, (b_x + 55, b_y + 65), (b_x + 35, b_y + 45), (40, 40, 210), 3)

        objects.append({
            "category": "bicycle",
            "bbox": (b_x, b_y, b_x + b_w, b_y + b_h),
            "confidence": 0.89,
            "track_id": 2,
            "color": "Red",
            "direction": "East",
            "speed_kmh": 18.2
        })

    return canvas, objects
