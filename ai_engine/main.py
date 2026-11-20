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
    h, w = frame.shape[:2]
    x1, y1, x2, y2 = [int(round(v)) for v in xyxy]
    x1, y1 = max(0, x1), max(0, y1)
    x2, y2 = min(w, x2), min(h, y2)
    crop = frame[y1:y2, x1:x2]
    if crop.size == 0:
        return {"upper": color_name(None), "lower": color_name(None)}
    ch = crop.shape[0]
    upper = crop[int(ch * .18):max(1, int(ch * .62)), :]
    lower = crop[int(ch * .58):, :]
    return {"upper": color_name(upper), "lower": color_name(lower)}


def detect_frame(frame: np.ndarray, confidence: float = .35, image_size: int = 640, include_colors: bool = True) -> list[dict[str, Any]]:
    source_h, source_w = frame.shape[:2]
    resized = resize_for_inference(frame)
    rh, rw = resized.shape[:2]
    result = get_model().predict(resized, conf=confidence, imgsz=image_size, verbose=False)[0]
    output: list[dict[str, Any]] = []
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
        if include_colors and class_id == 0:
            item["colors"] = estimate_person_colors(frame, xyxy)
        output.append(item)
    return output


@app.get("/health")
def health() -> dict[str, Any]:
    return {"status": "ok", "service": "visionx-ai-engine", "version": app.version, "model": MODEL_NAME, "device": "auto"}


@app.post("/detect")
async def detect(file: UploadFile = File(...), confidence: float = .35, image_size: int = 640, include_colors: bool = True) -> dict[str, Any]:
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
        detections = detect_frame(frame, confidence, image_size, include_colors)
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
                detections = detect_frame(frame, confidence, image_size, include_colors=True)
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
