"""VisionX AI - Video Analysis & Frame Enhancement Service.

Handles chunked video decoding, quality gating, YOLO detection, ByteTrack ID
association, non-destructive frame enhancement, and SQLite persistence.
"""
import os
import cv2
import time
import sqlite3
import numpy as np
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Generator
from ultralytics import YOLO
from app.ai.night_vision import NightVisionProcessor
from app.config.settings import settings

DB_PATH = "data/database/visionx.db"

class VideoQualityEvaluator:
    @staticmethod
    def evaluate_frame(frame: np.ndarray) -> Dict:
        """Calculates observable frame quality telemetry."""
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        h, w = frame.shape[:2]
        
        # Laplacian variance for focus / motion blur
        blur_score = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        
        # Mean luminance & RMS contrast
        mean_lum = float(np.mean(gray))
        contrast = float(np.std(gray))
        
        # Noise estimation using high-frequency median filter difference
        denoised_med = cv2.medianBlur(gray, 3)
        noise_diff = np.abs(gray.astype(np.float32) - denoised_med.astype(np.float32))
        noise_level = float(np.mean(noise_diff))
        
        # Composite score 0-100
        score = 50.0
        if blur_score > 120: score += 20
        elif blur_score < 40: score -= 25
        
        if 80 <= mean_lum <= 180: score += 15
        elif mean_lum < 35 or mean_lum > 220: score -= 20
        
        if contrast > 40: score += 15
        elif contrast < 20: score -= 15
        
        score = max(5.0, min(100.0, score))
        
        return {
            "score": int(score),
            "blur_score": round(blur_score, 1),
            "luminance": round(mean_lum, 1),
            "contrast": round(contrast, 1),
            "noise": round(noise_level, 2),
            "is_low_quality": score < 60 or blur_score < 55 or mean_lum < 35
        }

class FrameEnhancementEngine:
    def __init__(self):
        self.clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
        self.nv_proc = NightVisionProcessor(gamma=0.7)

    def enhance_crop_or_frame(self, img: np.ndarray, is_night: bool = False) -> Tuple[np.ndarray, List[str]]:
        """Non-destructive enhancement without hallucinating missing data."""
        applied = []
        result = img.copy()
        
        if is_night:
            result = self.nv_proc.process(result)
            applied.append("Night Vision Gamma Lift & Equalization")
            return result, applied
        
        # 1. Bilateral Edge-Preserving Denoise
        result = cv2.bilateralFilter(result, d=5, sigmaColor=40, sigmaSpace=40)
        applied.append("Edge-Preserving Denoise")
        
        # 2. Local Contrast Adaptive Equalization (LAB color space)
        lab = cv2.cvtColor(result, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        l_eq = self.clahe.apply(l)
        result = cv2.cvtColor(cv2.merge((l_eq, a, b)), cv2.COLOR_LAB2BGR)
        applied.append("Adaptive Local CLAHE")
        
        # 3. Controlled Unsharp Mask
        gaussian = cv2.GaussianBlur(result, (0, 0), 2.0)
        result = cv2.addWeighted(result, 1.3, gaussian, -0.3, 0)
        applied.append("Unsharp Sharpening")
        
        return result, applied

class VideoAnalysisPipeline:
    def __init__(self, model_path: str = "models/detection/yolov8m.pt"):
        self.model = YOLO(model_path)
        self.quality_eval = VideoQualityEvaluator()
        self.enhancer = FrameEnhancementEngine()
        self.setup_directories()

    def setup_directories(self):
        """Creates data/videos directory structure as specified in Section 13."""
        for sub in ["original", "analyzed", "enhanced", "captures"]:
            Path(f"data/videos/{sub}").mkdir(parents=True, exist_ok=True)

    def analyze_video_stream(
        self,
        video_path: str,
        sample_step: int = 1,
        max_fps: int = 30
    ) -> Generator[Dict, None, None]:
        """Iterative chunked processing without buffering entire file in RAM."""
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise IOError(f"Could not open video file {video_path}")

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        native_fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        frame_idx = 0
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            frame_idx += 1
            if frame_idx % sample_step != 0:
                continue

            start_t = time.perf_counter()
            
            # Step 1: Image Quality Analysis
            quality = self.quality_eval.evaluate_frame(frame)
            
            # Step 2: Optional Frame Enhancement if quality is degraded
            processed_frame = frame
            enhanced_flag = False
            if quality["is_low_quality"]:
                processed_frame, _ = self.enhancer.enhance_crop_or_frame(frame)
                enhanced_flag = True

            # Step 3: YOLO Inference with ByteTrack tracking
            results = self.model.track(
                processed_frame,
                persist=True,
                tracker="bytetrack.yaml",
                verbose=False,
                device="cuda" if settings.detection.compute_device == "CUDA" else "cpu"
            )

            proc_time = time.perf_counter() - start_t
            proc_fps = round(1.0 / max(0.001, proc_time), 1)

            yield {
                "frame_index": frame_idx,
                "total_frames": total_frames,
                "progress_pct": round((frame_idx / max(1, total_frames)) * 100, 1),
                "timestamp_sec": round(frame_idx / native_fps, 2),
                "processing_fps": proc_fps,
                "quality": quality,
                "enhanced_frame": enhanced_flag,
                "results": results
            }

        cap.release()
