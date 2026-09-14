# VISIONX AI
**Intelligent Computer Vision & Object Analysis**
*Professional AI-powered Computer Vision Application for Windows 10/11*

---

## 1. Project Overview

**VisionX AI** is a professional desktop computer vision application designed for Windows PCs and laptops. It receives live video streams from built-in webcams, external USB cameras, or IP/CCTV RTSP network cameras and automatically performs real-time object detection, multi-object identity tracking, vehicle telemetry analysis, image quality assessment, and modular AI enhancement.

### Initial Object Categories (V1)
1. **Person**: Automatic detection, tracking ID, movement direction, standing/walking activity, clothing color approximation.
2. **Car**: Vehicle classification (Sedan, SUV, etc.), dominant color, movement direction, estimated speed (km/h), license plate detection, and OCR reading.
3. **Bicycle**: Detection, tracking ID, movement direction, color, speed estimation.
4. **Camera**: Detects visible optical hardware and cameras.

*Detection is 100% automatic*: As soon as a camera starts, all supported categories are detected simultaneously without requiring manual pre-selection.

---

## 2. Key Features

- **Real-Time Detection & Overlays**: Low-latency Ultralytics YOLO inference with live bounding boxes, confidence tags, and tracking badges.
- **Persistent Object Tracking**: ByteTrack / BoT-SORT algorithm assigning stable IDs (e.g. `Person #01`, `Car #04`) across frames.
- **Vehicle Analytics & License Plate OCR**:
  - Vehicle aspect ratio classification
  - Estimated vehicle speed (km/h) with perspective calibration
  - Crop extraction and OCR (PaddleOCR preferred, EasyOCR fallback)
  - Clear labeling of estimates and OCR confidence warnings
- **Image Quality Assessment (`QualityAnalyzer`)**:
  - Real-time evaluation of blur (Laplacian variance), brightness, contrast (RMS standard deviation), and high-frequency noise.
- **Modular AI Image Enhancement (`ImageEnhancementPipeline`)**:
  - Non-destructive processing preserving both original and enhanced crops.
  - Adaptive contrast equalization (CLAHE), bilateral denoising, unsharp edge sharpening, and cubic upscaling.
  - Interactive `[ Original ]` vs `[ Enhanced ]` comparison view.
- **Interactive Object Details & Freeze Capture**:
  - Click any bounding box in the live viewport to open the side inspector.
  - Single-click `[ 📸 Capture & Analyze ]` to freeze, inspect, enhance, and store artifacts.
- **SQLite Database Persistence**:
  - Stores camera profiles, detection events, alerts, and capture metadata (without storing bloated video blobs).
- **GPU Acceleration with Graceful CPU Fallback**:
  - Auto-detects NVIDIA CUDA GPU; smoothly falls back to CPU if unavailable.

---

## 3. Technology Stack

- **Operating System**: Windows 10 / 11 (x64)
- **Language**: Python 3.10 - 3.12
- **Desktop UI Framework**: PySide6 (Qt for Python)
- **Computer Vision**: OpenCV (`opencv-python`), NumPy, Pillow
- **Object Detection**: Ultralytics YOLO (YOLOv8)
- **Object Tracking**: ByteTrack (IoU & trajectory association)
- **OCR Engine**: PaddleOCR / EasyOCR
- **Database**: SQLite3
- **Executable Packaging**: PyInstaller (`VisionXAI.exe`)

---

## 4. Project Architecture

```
VisionX-AI/
├── app/
│   ├── main.py                      # Application bootstrap & entry point
│   │
│   ├── ui/
│   │   ├── main_window.py           # Main window & left sidebar navigation
│   │   ├── styles.py                # Visual styling & Dark Navy/Gold QSS theme
│   │   ├── widgets/
│   │   │   ├── camera_view.py       # Live viewport with interactive box selection
│   │   │   ├── object_card.py       # Live category counter cards
│   │   │   ├── detection_overlay.py # Category filter toolbar ([ALL], [PERSON]...)
│   │   │   ├── camera_selector.py   # Camera switcher dropdown
│   │   │   ├── statistics_card.py   # Metrics and analytics card
│   │   │   └── alert_card.py        # System alert notification item
│   │   └── pages/
│   │       ├── dashboard_page.py    # Main screen (video, counters, details)
│   │       ├── cameras_page.py      # Camera management (Add, Test, Reconnect)
│   │       ├── statistics_page.py   # Aggregated analytics & hourly trends
│   │       ├── alerts_page.py       # Speed warnings & connection alerts
│   │       └── settings_page.py     # Inference threshold, calibration, storage
│   │
│   ├── ai/
│   │   ├── detector.py              # Ultralytics YOLO wrapper & GPU/CPU fallback
│   │   ├── tracker.py               # ByteTrack stable ID tracker
│   │   ├── classifier.py            # Vehicle type estimation
│   │   ├── attribute_analyzer.py    # Observable person clothing & activity
│   │   ├── quality_analyzer.py      # Blur, noise, contrast, brightness metrics
│   │   └── enhancement.py           # Non-destructive modular enhancement
│   │
│   ├── vehicle/
│   │   ├── plate_detector.py        # Dedicated license plate localizer
│   │   ├── plate_ocr.py             # PaddleOCR / EasyOCR text extraction
│   │   └── speed_estimator.py       # Displacement-based speed estimation
│   │
│   ├── camera/
│   │   ├── video_source.py          # Abstract base video source interface
│   │   ├── webcam.py                # Built-in laptop webcam
│   │   ├── usb_camera.py            # External USB webcam
│   │   ├── ip_camera.py             # IP CCTV camera (RTSP protocol)
│   │   └── camera_manager.py        # Multi-camera manager & synthetic fallback
│   │
│   ├── database/
│   │   ├── database.py              # SQLite connection & schema initialization
│   │   ├── models.py                # Data entity classes
│   │   └── repositories.py          # CRUD repositories (Cameras, Events, Alerts)
│   │
│   ├── services/
│   │   ├── detection_service.py     # Background QThread AI worker
│   │   ├── statistics_service.py    # Hourly & daily count aggregations
│   │   ├── alert_service.py         # Speed and connection alert dispatcher
│   │   └── capture_service.py       # Frame freezing & crop persistence
│   │
│   ├── config/
│   │   ├── settings.py              # Global application configuration
│   │   └── camera_config.py         # Camera configuration models
│   │
│   └── utils/
│       ├── logger.py                # Rotating file logger
│       ├── image_utils.py           # OpenCV <-> QImage/QPixmap conversions
│       ├── video_utils.py           # Bounding box drawing & test pattern
│       └── performance.py           # FPS meter & hardware monitor
│
├── models/
│   ├── detection/                   # YOLO weights (yolo_model.pt)
│   ├── license_plate/               # Dedicated plate weights (plate_model.pt)
│   └── enhancement/                 # Enhancement model files
├── data/
│   ├── database/                    # visionx.db (SQLite)
│   ├── captures/                    # Frozen frame captures
│   ├── enhanced/                    # Enhanced image crops
│   └── logs/                        # visionx.log
├── tests/                           # Unit test suite
├── scripts/                         # Download, diagnostics, & benchmarks
├── requirements.txt
├── build.spec                       # PyInstaller build recipe
└── README.md
```

---

## 5. Quick Start & Installation

### Step 1: Clone or Extract Repository
```bash
git clone <repo-url>
cd VisionX-AI
```

### Step 2: Create Python Virtual Environment (Recommended)
```bash
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate
```

### Step 3: Install Dependencies
```bash
pip install -r requirements.txt
```

### Step 4: Download Pretrained Detection Model
```bash
python scripts/download_models.py
```

### Step 5: Launch VisionX AI
```bash
python app/main.py
```

---

## 6. Packaging into Standalone Windows Executable (`VisionXAI.exe`)

To package VisionX AI into a single Windows distribution folder or portable executable with PyInstaller:

```bash
# Ensure PyInstaller is installed
pip install pyinstaller

# Run the provided Windows build specification
pyinstaller build.spec
```

The compiled binary and assets will be output in:
```
dist/VisionXAI/VisionXAI.exe
```
This executable runs on Windows 10 and 11 without requiring users to install Python, PySide6, OpenCV, or YOLO manually.

---

## 7. Camera Configuration

### 1. Built-in Laptop Webcam
- By default, `CAM-01` is configured to device index `0`.
- If your laptop has multiple built-in sensors (e.g. IR camera), test index `0` or `1`.

### 2. External USB Camera
- Connect your USB camera.
- Navigate to the **Cameras** page in VisionX AI.
- Click **+ Add Camera**, select Type: `usb`, and specify the device index (e.g., `1` or `2`).

### 3. IP / CCTV RTSP Camera
- Ensure the IP camera is on the same local network.
- Click **+ Add Camera**, select Type: `rtsp`.
- Enter the RTSP stream URL, e.g.:
  `rtsp://admin:password@192.168.1.100:554/stream1`
- VisionX AI automatically enables low-latency TCP transport and frame buffer clearing.

---

## 8. AI Safety & Privacy Policy

1. **Local Processing**: Video feeds and images are processed 100% locally on your PC. No video data is sent to cloud servers.
2. **No Facial Recognition**: VisionX AI V1 strictly forbids facial identification or psychological profiling.
3. **Advisory Estimates**: Speed estimations and OCR character readings are computer vision approximations. Always verify critical readings against the original image.

---

## 9. Testing & Diagnostics

Run the automated test suite:
```bash
python -m unittest discover tests
```

Run camera stream diagnostics:
```bash
python scripts/test_camera.py
```

Run performance benchmark:
```bash
python scripts/benchmark.py
```

---

## 10. Future Roadmap

- **V1.1**: Fine-tuned license plate detector models for regional plates, advanced perspective warp speed calibration.
- **V2.0**: Multi-camera simultaneous grid view, customizable boundary tripwires.
- **V3.0**: Mobile alerting bridge, enterprise NVR integration.
