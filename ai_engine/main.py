"""VisionX AI inference API.

CPU-safe FastAPI service. Models load lazily and are cached in-process.
The API returns observable detections and visual attributes only; it does not
infer identity, emotion, intent, or other sensitive traits.
"""
from __future__ import annotations

import os
import tempfile
import threading
from pathlib import Path
from typing import Any

import cv2
import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO

MODEL_NAME = os.getenv("MODEL_NAME", "yolo11s.pt")
POSE_MODEL_NAME = os.getenv("POSE_MODEL_NAME", "yolo11s-pose.pt")
MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "200"))
MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024
MAX_VIDEO_FRAMES = int(os.getenv("MAX_VIDEO_FRAMES", "1800"))
MAX_FRAME_SIDE = int(os.getenv("MAX_FRAME_SIDE", "1280"))
ALLOWED_ORIGINS = [x.strip() for x in os.getenv("ALLOWED_ORIGINS", "*").split(",") if x.strip()]

app = FastAPI(title="VisionX AI Engine", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if "*" in ALLOWED_ORIGINS else ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

_model: YOLO | None = None
_pose_model: YOLO | None = None
_model_lock = threading.Lock()
_pose_lock = threading.Lock()
COCO_NAMES = {0: "person", 1: "bicycle", 2: "car", 3: "motorcycle", 5: "bus", 7: "truck"}


def get_model() -> YOLO:
    global _model
    if _model is None:
        with _model_lock:
            if _model is None:
                _model = YOLO(MODEL_NAME)
    return _model


def get_pose_model() -> YOLO:
    global _pose_model
    if _pose_model is None:
        with _pose_lock:
            if _pose_model is None:
                _pose_model = YOLO(POSE_MODEL_NAME)
    return _pose_model


def resize_for_inference(frame: np.ndarray) -> np.ndarray:
    h, w = frame.shape[:2]
    longest = max(h, w)
    if longest <= MAX_FRAME_SIDE:
        return frame
    scale = MAX_FRAME_SIDE / longest
    return cv2.resize(frame, (max(1, int(w * scale)), max(1, int(h * scale))), interpolation=cv2.INTER_AREA)


def color_name(bgr_crop: np.ndarray) -> dict[str, Any]:
    """Estimate a representative clothing color, excluding extreme shadows/highlights."""
    if bgr_crop is None or bgr_crop.size == 0:
        return {"name": "Unknown", "hex": None, "confidence": 0.0}
    h, w = bgr_crop.shape[:2]
    # Ignore the outer silhouette/background; analyze the central torso/leg region.
    roi = bgr_crop[int(h * 0.12):max(1, int(h * 0.88)), int(w * 0.18):max(1, int(w * 0.82))]
    if roi.size == 0:
        roi = bgr_crop
    hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
    pixels = hsv.reshape(-1, 3)
    valid = pixels[(pixels[:, 2] > 28) & (pixels[:, 2] < 248)]
    if len(valid) < 8:
        valid = pixels
    if not len(valid):
        return {"name": "Unknown", "hex": None, "confidence": 0.0}
    # Median HSV is more robust to isolated background pixels than a single mean.
    med = np.median(valid, axis=0)
    hue, sat, val = float(med[0]), float(med[1]), float(med[2])
    if val < 48:
        name = "Black"
    elif sat < 28 and val > 205:
        name = "White"
    elif sat < 35:
        name = "Gray"
    elif hue < 8 or hue >= 170:
        name = "Red"
    elif hue < 22:
        name = "Orange"
    elif hue < 35:
        name = "Yellow"
    elif hue < 85:
        name = "Green"
    elif hue < 100:
        name = "Cyan"
    elif hue < 130:
        name = "Blue"
    elif hue < 150:
        name = "Purple"
    else:
        name = "Pink"
    # Confidence is a simple consistency estimate, not a calibrated probability.
    spread = float(np.median(np.abs(valid[:, 1] - sat)) + np.median(np.abs(valid[:, 2] - val)))
    confidence = float(np.clip(1.0 - spread / 180.0, 0.0, 1.0))
    bgr = roi.reshape(-1, 3)
    med_bgr = np.median(bgr, axis=0).astype(np.uint8)
    rgb = med_bgr[::-1]
    return {"name": name, "hex": "#{:02X}{:02X}{:02X}".format(*rgb.tolist()), "confidence": round(confidence, 2)}


def estimate_person_colors(frame: np.ndarray, xyxy: list[float]) -> dict[str, Any]:
    """Approximate upper/lower garment-region colors from visible pixels, not semantic clothing labels."""
    h, w = frame.shape[:2]
    x1, y1, x2, y2 = [int(round(v)) for v in xyxy]
    x1, y1 = max(0, x1), max(0, y1)
    x2, y2 = min(w, x2), min(h, y2)
    crop = frame[y1:y2, x1:x2]
    if crop.size == 0 or crop.shape[0] < 24 or crop.shape[1] < 12:
        unknown = color_name(None)
        return {"upper": unknown, "lower": unknown}
    ch = crop.shape[0]
    # Exclude the head and the extreme bottom of the detection where background/feet often enter.
    upper = crop[int(ch * .24):max(1, int(ch * .60)), :]
    lower = crop[int(ch * .60):max(1, int(ch * .88)), :]
    return {"upper": color_name(upper), "lower": color_name(lower)}


def box_iou_xyxy(a: np.ndarray, b: np.ndarray) -> float:
    left, top = max(float(a[0]), float(b[0])), max(float(a[1]), float(b[1]))
    right, bottom = min(float(a[2]), float(b[2])), min(float(a[3]), float(b[3]))
    if right <= left or bottom <= top:
        return 0.0
    intersection = (right - left) * (bottom - top)
    area_a = max(0.0, float(a[2] - a[0])) * max(0.0, float(a[3] - a[1]))
    area_b = max(0.0, float(b[2] - b[0])) * max(0.0, float(b[3] - b[1]))
    union = area_a + area_b - intersection
    return intersection / union if union > 0 else 0.0


def estimate_pose_for_people(frame: np.ndarray, person_boxes: list[list[float]], image_size: int) -> list[dict[str, Any] | None]:
    """Run YOLO pose once and associate visible keypoints with the detector's person boxes."""
    if not person_boxes:
        return []
    resized = resize_for_inference(frame)
    rh, rw = resized.shape[:2]
    sh, sw = frame.shape[0] / rh, frame.shape[1] / rw
    prediction = get_pose_model().predict(resized, conf=0.3, imgsz=image_size, verbose=False)[0]
    if prediction.boxes is None or prediction.keypoints is None:
        return [None] * len(person_boxes)
    pose_boxes = prediction.boxes.xyxy.cpu().numpy()
    pose_points = prediction.keypoints.data.cpu().numpy()
    output: list[dict[str, Any] | None] = []
    for person_box in person_boxes:
        target = np.asarray(person_box, dtype=np.float32)
        best_index, best_iou = -1, 0.0
        for index, pose_box in enumerate(pose_boxes):
            scaled = np.asarray([pose_box[0] * sw, pose_box[1] * sh, pose_box[2] * sw, pose_box[3] * sh])
            overlap = box_iou_xyxy(target, scaled)
            if overlap > best_iou:
                best_index, best_iou = index, overlap
        if best_index < 0 or best_iou < 0.15:
            output.append(None)
            continue
        points = pose_points[best_index]
        visible = points[:, 2] >= 0.35 if points.shape[1] >= 3 else np.ones(len(points), dtype=bool)
        # COCO keypoints: shoulders 5/6, hips 11/12. Only describe torso alignment;
        # a single image cannot reliably distinguish sitting, standing, or intent.
        required = [5, 6, 11, 12]
        if not all(index < len(points) and visible[index] for index in required):
            posture = "Insufficient visible keypoints"
            pose_confidence = 0.0
        else:
            shoulders = np.mean(points[[5, 6], :2], axis=0)
            hips = np.mean(points[[11, 12], :2], axis=0)
            dx, dy = abs(float(shoulders[0] - hips[0])), abs(float(hips[1] - shoulders[1]))
            angle = float(np.degrees(np.arctan2(dx, max(dy, 1.0))))
            posture = "Leaning torso" if angle >= 38 else "Upright torso"
            pose_confidence = float(np.mean(points[required, 2])) if points.shape[1] >= 3 else 0.0
        output.append({
            "posture": posture,
            "confidence": round(pose_confidence, 3),
            "keypoints": np.round(points, 3).tolist(),
            "scope": "Torso alignment estimate only; not a validated activity or sitting/standing classifier.",
        })
    return output


def detect_frame(
    frame: np.ndarray,
    confidence: float = .35,
    image_size: int = 640,
    include_colors: bool = True,
    include_pose: bool = False,
) -> list[dict[str, Any]]:
    source_h, source_w = frame.shape[:2]
    resized = resize_for_inference(frame)
    rh, rw = resized.shape[:2]
    result = get_model().predict(resized, conf=confidence, imgsz=image_size, verbose=False)[0]
    output: list[dict[str, Any]] = []
    person_boxes: list[list[float]] = []
    person_items: list[dict[str, Any]] = []
    if result.boxes is None:
        return output
    for box in result.boxes:
        class_id = int(box.cls.item())
        if class_id not in COCO_NAMES:
            continue
        xyxy = [float(v) for v in box.xyxy[0].cpu().tolist()]
        sx, sy = source_w / rw, source_h / rh
        xyxy = [xyxy[0] * sx, xyxy[1] * sy, xyxy[2] * sx, xyxy[3] * sy]
        item: dict[str, Any] = {
            "class_id": class_id,
            "class_name": COCO_NAMES[class_id],
            "category": "person" if class_id == 0 else ("bicycle" if class_id == 1 else "car"),
            "confidence": round(float(box.conf.item()), 4),
            "bbox": [round(v, 1) for v in xyxy],
        }
        if class_id == 0:
            person_boxes.append(xyxy)
            person_items.append(item)
            if include_colors:
                item["colors"] = estimate_person_colors(frame, xyxy)
        output.append(item)
    if include_pose and person_boxes:
        try:
            poses = estimate_pose_for_people(frame, person_boxes, image_size)
            for item, pose in zip(person_items, poses):
                if pose is not None:
                    item["pose"] = pose
        except Exception as exc:
            # Detection remains usable if the optional pose model cannot load or infer.
            for item in person_items:
                item["pose"] = {"posture": "Pose unavailable", "confidence": 0.0, "error": type(exc).__name__}
    return output


@app.get("/health")
def health() -> dict[str, Any]:
    return {"status": "ok", "service": "visionx-ai-engine", "version": app.version, "model": MODEL_NAME, "device": "auto"}


@app.post("/detect")
async def detect(file: UploadFile = File(...), confidence: float = .35, image_size: int = 640, include_colors: bool = True, include_pose: bool = False) -> dict[str, Any]:
    if not 0.05 <= confidence <= 0.95:
        raise HTTPException(422, "confidence must be between 0.05 and 0.95")
    if image_size not in (320, 480, 640, 960):
        raise HTTPException(422, "image_size must be 320, 480, 640, or 960")
    data = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, f"Image exceeds {MAX_UPLOAD_MB} MB limit")
    frame = cv2.imdecode(np.frombuffer(data, dtype=np.uint8), cv2.IMREAD_COLOR)
    if frame is None:
        raise HTTPException(415, "Unsupported or invalid image")
    try:
        detections = detect_frame(frame, confidence, image_size, include_colors, include_pose)
        return {"width": int(frame.shape[1]), "height": int(frame.shape[0]), "detections": detections}
    except Exception as exc:
        raise HTTPException(503, f"Inference failed: {type(exc).__name__}: {exc}") from exc


@app.post("/analyze-video")
async def analyze_video(
    file: UploadFile = File(...),
    confidence: float = .35,
    sample_fps: float = 2.0,
    image_size: int = 640,
    max_frames: int = 900,
    include_pose: bool = False,
) -> dict[str, Any]:
    if not 0.05 <= confidence <= 0.95:
        raise HTTPException(422, "confidence must be between 0.05 and 0.95")
    if not 0.5 <= sample_fps <= 10:
        raise HTTPException(422, "sample_fps must be between 0.5 and 10")
    data = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, f"Video exceeds {MAX_UPLOAD_MB} MB limit")
    suffix = Path(file.filename or "upload.mp4").suffix or ".mp4"
    temp_path = None
    cap = None
    try:
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(data)
            temp_path = tmp.name
        cap = cv2.VideoCapture(temp_path)
        if not cap.isOpened():
            raise HTTPException(415, "Video could not be decoded; try MP4 (H.264) or WebM")
        fps = cap.get(cv2.CAP_PROP_FPS) or 0.0
        total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        duration = total / fps if fps > 0 and total > 0 else 0.0
        stride = max(1, int(round(fps / sample_fps))) if fps > 0 else 1
        limit = min(max_frames, MAX_VIDEO_FRAMES)
        results: list[dict[str, Any]] = []
        frame_index = 0
        sampled = 0
        while sampled < limit:
            ok, frame = cap.read()
            if not ok:
                break
            if frame_index % stride == 0:
                detections = detect_frame(frame, confidence, image_size, include_colors=True, include_pose=include_pose)
                results.append({"frame": frame_index, "time_seconds": round(frame_index / fps, 3) if fps > 0 else 0, "detections": detections})
                sampled += 1
            frame_index += 1
        return {
            "filename": file.filename,
            "fps": round(fps, 3),
            "duration_seconds": round(duration, 3),
            "frames_sampled": sampled,
            "frames_total": total,
            "truncated": sampled >= limit and (total <= 0 or frame_index < total),
            "sample_fps_actual": round(sampled / duration, 3) if duration > 0 else 0,
            "results": results,
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(503, f"Video analysis failed: {type(exc).__name__}: {exc}") from exc
    finally:
        if cap is not None:
            cap.release()
        if temp_path and os.path.exists(temp_path):
            os.unlink(temp_path)


@app.post("/pose")
async def estimate_pose(file: UploadFile = File(...), confidence: float = .35, image_size: int = 640) -> dict[str, Any]:
    data = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, f"Image exceeds {MAX_UPLOAD_MB} MB limit")
    frame = cv2.imdecode(np.frombuffer(data, dtype=np.uint8), cv2.IMREAD_COLOR)
    if frame is None:
        raise HTTPException(415, "Unsupported or invalid image")
    try:
        resized = resize_for_inference(frame)
        pred = get_pose_model().predict(resized, conf=confidence, imgsz=image_size, verbose=False)[0]
        poses = []
        if pred.keypoints is not None:
            for index, points in enumerate(pred.keypoints.data.cpu().numpy()):
                poses.append({"person_index": index, "keypoints": points.tolist()})
        return {"poses": poses, "note": "Keypoints describe visible body landmarks; posture labels require temporal and scene-aware validation."}
    except Exception as exc:
        raise HTTPException(503, f"Pose estimation failed: {type(exc).__name__}: {exc}") from exc
