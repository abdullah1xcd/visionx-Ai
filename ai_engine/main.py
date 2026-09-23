from __future__ import annotations

import base64
import os
import time
from typing import Any

import cv2
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from ultralytics import YOLO

MODEL_PATH = os.getenv("VISIONX_MODEL", "yolo26s.pt")
CONF = float(os.getenv("VISIONX_DEFAULT_CONF", "0.35"))
IOU = float(os.getenv("VISIONX_IOU", "0.50"))
DEVICE = os.getenv("VISIONX_DEVICE", "auto")

app = FastAPI(title="VisionX AI Engine", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model: YOLO | None = None
last_error: str | None = None
reset_tracker = True

PERSON = {"person"}
BIKE = {"bicycle"}
VEHICLES = {"car", "truck", "bus", "motorcycle"}


class DetectionRequest(BaseModel):
    image: str = Field(..., description="base64 image or data URL")
    frame_number: int = 0
    confidence: float | None = None
    iou: float | None = None


def load_model() -> YOLO:
    global model, last_error
    if model is None:
        try:
            model = YOLO(MODEL_PATH)
            last_error = None
        except Exception as exc:
            last_error = str(exc)
            raise
    return model


def decode_image(value: str) -> np.ndarray:
    try:
        if "," in value and value.startswith("data:"):
            value = value.split(",", 1)[1]
        raw = base64.b64decode(value)
        image = cv2.imdecode(np.frombuffer(raw, dtype=np.uint8), cv2.IMREAD_COLOR)
        if image is None:
            raise ValueError("Could not decode image")
        return image
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid image: {exc}") from exc


def resolve_device() -> str | int:
    if DEVICE != "auto":
        return DEVICE
    try:
        import torch
        return 0 if torch.cuda.is_available() else "cpu"
    except Exception:
        return "cpu"


def map_class(name: str) -> str | None:
    if name in PERSON:
        return "person"
    if name in BIKE:
        return "bicycle"
    if name in VEHICLES:
        return "car"
    return None


@app.on_event("startup")
def startup() -> None:
    try:
        load_model()
    except Exception:
        pass


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "ok": model is not None,
        "model": MODEL_PATH,
        "device": str(resolve_device()),
        "status": "ready" if model is not None else "error",
        "error": last_error,
    }


@app.post("/reset")
def reset() -> dict[str, bool]:
    global reset_tracker
    reset_tracker = True
    return {"ok": True}


@app.post("/detect")
def detect(req: DetectionRequest) -> dict[str, Any]:
    global reset_tracker
    started = time.perf_counter()
    image = decode_image(req.image)
    try:
        detector = load_model()
        conf = max(0.05, min(0.95, req.confidence if req.confidence is not None else CONF))
        iou = max(0.05, min(0.95, req.iou if req.iou is not None else IOU))
        results = detector.track(
            source=image,
            persist=not reset_tracker,
            tracker="bytetrack.yaml",
            conf=conf,
            iou=iou,
            device=resolve_device(),
            verbose=False,
        )
        reset_tracker = False
        result = results[0]
        names = result.names
        detections = []
        if result.boxes is not None:
            boxes = result.boxes
            ids = boxes.id.int().cpu().tolist() if boxes.id is not None else [0] * len(boxes)
            for cls_id, score, box, track_id in zip(
                boxes.cls.int().cpu().tolist(),
                boxes.conf.cpu().tolist(),
                boxes.xyxy.cpu().tolist(),
                ids,
            ):
                name = str(names[int(cls_id)])
                category = map_class(name)
                if category is None:
                    continue
                x1, y1, x2, y2 = box
                detections.append({
                    "class_id": int(cls_id),
                    "class_name": name,
                    "category": category,
                    "confidence": float(score),
                    "x1": float(x1), "y1": float(y1),
                    "x2": float(x2), "y2": float(y2),
                    "tracking_id": int(track_id),
                })
        return {
            "ok": True,
            "frame_number": req.frame_number,
            "width": int(image.shape[1]),
            "height": int(image.shape[0]),
            "inference_ms": round((time.perf_counter() - started) * 1000, 2),
            "device": str(resolve_device()),
            "model": MODEL_PATH,
            "detections": detections,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
