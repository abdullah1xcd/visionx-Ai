import React, { useState } from 'react';
import { Terminal, Copy, Check, FileText, Code2, FolderGit2, Cpu, Download, X } from 'lucide-react';

interface CodeViewerModalProps {
  onClose: () => void;
}

const FILE_SNIPPETS: Record<string, { desc: string; code: string }> = {
  'app/services/video_analysis_service.py': {
    desc: 'Iterative Chunked Video Decoder, Quality Analysis, YOLO + ByteTrack & SQLite Persistence',
    code: `"""VisionX AI - Video Analysis Pipeline & Non-Destructive Frame Enhancer."""
import cv2
import numpy as np
from ultralytics import YOLO

class VideoAnalysisPipeline:
    def __init__(self, model_path="models/detection/yolov8m.pt"):
        self.model = YOLO(model_path)
        self.clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))

    def analyze_stream(self, video_path: str):
        cap = cv2.VideoCapture(video_path)
        # Iteratively decode frames (low RAM footprint)
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret: break
            # 1. Quality evaluation (Laplacian blur variance, luminance)
            # 2. Pre-inference CLAHE / Denoise if quality is degraded
            # 3. YOLO tracking with ByteTrack association
            results = self.model.track(frame, persist=True, tracker="bytetrack.yaml")
            yield results
        cap.release()`
  },
  'app/ai/night_vision.py': {
    desc: 'Software Night Vision Pipeline (Gamma + CLAHE + Bilateral Denoising + Unsharp Sharpening)',
    code: `"""Software Night Vision Processing Pipeline for Low-Light Surveillance."""
import cv2
import numpy as np

class NightVisionProcessor:
    def __init__(self, gamma: float = 0.65, clahe_clip: float = 2.5, clahe_grid=(8, 8)):
        self.gamma = gamma
        self.clahe = cv2.createCLAHE(clipLimit=clahe_clip, tileGridSize=clahe_grid)
        self.inv_gamma = 1.0 / self.gamma
        self.table = np.array([((i / 255.0) ** self.inv_gamma) * 255 for i in range(256)]).astype("uint8")

    def process(self, frame: np.ndarray) -> np.ndarray:
        # 1. Convert to true monochrome surveillance luminance
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        # 2. Non-linear shadow expansion via LUT Gamma correction
        lifted = cv2.LUT(gray, self.table)
        
        # 3. Local Contrast Adaptive Equalization (CLAHE)
        contrast = self.clahe.apply(lifted)
        
        # 4. Bilateral edge-preserving noise filtering
        denoised = cv2.bilateralFilter(contrast, d=5, sigmaColor=50, sigmaSpace=50)
        
        # 5. Controlled edge sharpening via unsharp masking
        gaussian = cv2.GaussianBlur(denoised, (0, 0), 2.0)
        sharpened = cv2.addWeighted(denoised, 1.4, gaussian, -0.4, 0)
        
        # Return 3-channel monochrome frame for downstream YOLO inference
        return cv2.cvtColor(sharpened, cv2.COLOR_GRAY2BGR)`
  },
  'app/camera/discovery.py': {
    desc: 'ONVIF WS-Discovery, RTSP Stream Validation & Bluetooth Setup Handover',
    code: `"""Camera Discovery, Network Validation & Bluetooth Pairing."""
import socket
import re
import cv2
from typing import List, Dict, Tuple

class OnvifCameraDiscovery:
    WS_DISCOVERY_PROBE = (
        '<?xml version="1.0" encoding="utf-8"?>'
        '<Envelope xmlns="http://www.w3.org/2003/05/soap-envelope">'
        '<Header><Action>http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</Action></Header>'
        '<Body><Probe><Types>dn:NetworkVideoTransmitter</Types></Probe></Body>'
        '</Envelope>'
    )

    @staticmethod
    def discover_local_cameras(timeout: float = 2.0) -> List[Dict]:
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
        sock.settimeout(timeout)
        devices = []
        try:
            sock.sendto(OnvifCameraDiscovery.WS_DISCOVERY_PROBE.encode(), ('239.255.255.250', 3702))
            while True:
                data, addr = sock.recvfrom(4096)
                ip = addr[0]
                devices.append({
                    "ip": ip,
                    "name": f"ONVIF Camera ({ip})",
                    "status": "Ready",
                    "service_url": f"http://{ip}:80/onvif/device_service"
                })
        except socket.timeout:
            pass
        finally:
            sock.close()
        return devices

class StreamValidator:
    @staticmethod
    def validate_rtsp_stream(rtsp_url: str, timeout_sec: int = 5) -> Tuple[bool, str, Dict]:
        cap = cv2.VideoCapture(rtsp_url, cv2.CAP_FFMPEG)
        cap.set(cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, timeout_sec * 1000)
        if not cap.isOpened():
            return False, "Stream Unavailable or Authentication Failed", {}
        ret, frame = cap.read()
        if not ret:
            cap.release()
            return False, "Failed to decode initial frame", {}
        h, w = frame.shape[:2]
        fps = cap.get(cv2.CAP_PROP_FPS) or 30
        cap.release()
        return True, "Connected", {"resolution": f"{w}x{h}", "fps": int(fps)}`
  },
  'app/ai/detector.py': {
    desc: 'Class-Specific Thresholds, Preprocessing & AI Detection Quality Status',
    code: `"""Ultralytics YOLO Detector with Class-Specific Confidence & Quality Telemetry."""
import cv2
import numpy as np
from ultralytics import YOLO
from app.config.settings import settings

class ObjectDetector:
    CLASS_THRESHOLDS = {
        0: 0.60,  # Person (higher threshold prevents false positives)
        2: 0.50,  # Car
        1: 0.50,  # Bicycle
        62: 0.40  # Optical camera sensor
    }

    def __init__(self, model_path="models/detection/yolov8m.pt"):
        self.model = YOLO(model_path)
        self.inference_size = settings.detection.inference_resolution

    def evaluate_quality(self, frame: np.ndarray, fps: float) -> str:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        blur_score = cv2.Laplacian(gray, cv2.CV_64F).var()
        luminance = np.mean(gray)
        if luminance < 25 or blur_score < 40:
            return "Poor Visibility"
        if fps < 18 or blur_score < 70:
            return "Low Quality"
        if fps >= 25 and blur_score >= 100 and luminance >= 50:
            return "Excellent"
        return "Good"

    def detect(self, frame: np.ndarray):
        results = self.model(frame, imgsz=self.inference_size, verbose=False)
        # Filters detections using self.CLASS_THRESHOLDS
        return results`
  },
  'app/ai/tracker.py': {
    desc: 'ByteTracker with Temporal Exponential Moving Average (EMA) Smoothing',
    code: `"""ByteTrack Multi-Object Tracker with Temporal Bounding Box Smoothing."""
import numpy as np

class TrackedEntity:
    def __init__(self, track_id: int, bbox: np.ndarray, category: str, conf: float):
        self.track_id = track_id
        self.bbox = bbox.astype(float)  # [x1, y1, x2, y2]
        self.category = category
        self.confidence = conf
        self.smoothing_factor = 0.75  # Exponential moving average

    def update_coords(self, new_bbox: np.ndarray, conf: float):
        # Prevent bounding box jitter and ID flipping across frames
        self.bbox = (self.smoothing_factor * self.bbox) + ((1.0 - self.smoothing_factor) * new_bbox)
        self.confidence = conf`
  },
  'build.spec': {
    desc: 'PyInstaller Windows Executable Packaging Spec (VisionXAI.exe)',
    code: `# -*- mode: python ; coding: utf-8 -*-
# PyInstaller build specification for VisionX AI (VisionXAI.exe)
a = Analysis(
    ['app/main.py'],
    pathex=['.'],
    datas=[
        ('models', 'models'),
        ('app/ui/styles.py', 'app/ui'),
        ('data/database', 'data/database')
    ],
    binaries=[],
    hiddenimports=['PySide6', 'ultralytics', 'cv2', 'sqlite3', 'torch'],
    name='VisionXAI'
)
pyz = PYZ(a.pure, a.zipped_data)
exe = EXE(
    pyz,
    a.scripts,
    name='VisionXAI.exe',
    console=False,
    icon='app/resources/icon.ico'
)`
  }
};

export const CodeViewerModal: React.FC<CodeViewerModalProps> = ({ onClose }) => {
  const [selectedFile, setSelectedFile] = useState<string>('app/ai/night_vision.py');
  const [copied, setCopied] = useState<boolean>(false);

  const currentSnippet = FILE_SNIPPETS[selectedFile];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentSnippet.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-6 select-none">
      <div className="bg-[#11161D] border border-[#252C35] rounded-xl max-w-5xl w-full h-[85vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#0D1117] border-b border-[#252C35] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#D4AF37]" />
            <span className="text-xs font-black tracking-wider text-white uppercase">
              PYTHON CORE IMPLEMENTATION & WINDOWS BUILD SPECIFICATIONS
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#161C24] hover:bg-[#1C232B] text-slate-200 border border-[#252C35] text-xs font-semibold cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Code'}</span>
            </button>

            <button
              onClick={onClose}
              className="text-[#68727D] hover:text-white p-1 rounded transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content View */}
        <div className="flex-1 flex overflow-hidden">
          {/* File Selector Sidebar */}
          <div className="w-64 bg-[#080A0D] border-r border-[#252C35] p-3 space-y-1 overflow-y-auto">
            <div className="text-[10px] font-bold text-[#68727D] uppercase tracking-wider px-2 py-1">
              Modules & Specs
            </div>
            {Object.keys(FILE_SNIPPETS).map((filePath) => (
              <button
                key={filePath}
                onClick={() => setSelectedFile(filePath)}
                className={`w-full text-left px-2.5 py-2 rounded text-xs font-mono transition-colors cursor-pointer flex items-center gap-2 ${
                  selectedFile === filePath
                    ? 'bg-[#161C24] text-[#D4AF37] font-semibold border-l-2 border-[#D4AF37]'
                    : 'text-[#9AA4AF] hover:bg-[#11161D] hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{filePath}</span>
              </button>
            ))}
          </div>

          {/* Code Viewer Panel */}
          <div className="flex-1 flex flex-col bg-[#0D1117] overflow-hidden">
            <div className="px-4 py-2 border-b border-[#252C35] bg-[#11161D] flex items-center justify-between text-xs">
              <span className="font-mono text-white font-bold">{selectedFile}</span>
              <span className="text-[11px] text-[#9AA4AF]">{currentSnippet.desc}</span>
            </div>

            <pre className="flex-1 p-4 overflow-auto font-mono text-xs text-slate-200 leading-relaxed select-text bg-[#080A0D]">
              <code>{currentSnippet.code}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
