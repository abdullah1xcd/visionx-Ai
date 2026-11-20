# VisionX AI Engine (Local / Self-Hosted)

This FastAPI service runs Ultralytics YOLO locally and is the preferred local inference path when you want YOLO rather than the browser COCO-SSD fallback. It supports object detection, periodic YOLO pose estimation, and approximate upper/lower clothing-region color estimates.

## Windows 10/11 setup (VS Code)

Open PowerShell in the repository root:

```powershell
py -3.11 --version
py -3.11 -m venv .venv-ai
.\.venv-ai\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r ai_engine\requirements.txt
```

If PowerShell blocks activation for this terminal, run:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv-ai\Scripts\Activate.ps1
```

Create or edit the root `.env.local` file (do not commit secrets):

```dotenv
VITE_AI_ENGINE_URL=http://127.0.0.1:8000
```

Start the AI engine in Terminal 1:

```powershell
.\.venv-ai\Scripts\Activate.ps1
python -m uvicorn ai_engine.main:app --host 127.0.0.1 --port 8000 --reload
```

On first inference, Ultralytics automatically downloads the detection weights (`yolo11s.pt`). The pose weights (`yolo11s-pose.pt`) download automatically when the first pose sample is requested. Keep this terminal running.

Start the web app in Terminal 2:

```powershell
npm install
npm run dev
```

Open **http://localhost:3000**. The app's existing `npm run dev` script starts the Express/SQLite API and Vite frontend; the separate Python terminal runs the YOLO engine. Restart Vite after changing `.env.local`.

## Verify the AI engine

In a browser, open `http://127.0.0.1:8000/health`. It should return JSON with `"status":"ok"`. The live dashboard sends pose requests every fifth inference frame to reduce CPU/GPU load. Pose results are retained for the tracked person between samples.

## What the fields mean

- **Detection confidence** is the detector's confidence for the object class, not a probability that every attribute is correct.
- **Clothing color** is an approximate pixel-color estimate from upper/lower person-box regions. It is not semantic garment recognition; lighting, occlusion, skin, and background can affect it.
- **Pose estimate** uses visible COCO body keypoints to estimate torso alignment only (upright/leaning). It does not reliably classify sitting, walking, emotion, identity, or intent.
- **Activity/direction** are motion estimates from tracked bounding-box displacement across frames, not action recognition.
- A successful health check confirms the service is running, not that model accuracy has been benchmarked. Evaluate against labeled footage for a real accuracy metric.

## CPU and model choices

Default detection and pose models are the small YOLO11 variants for a practical local starting point. CPU inference may be slow; an NVIDIA CUDA-compatible PyTorch build can accelerate inference when the PC has a supported NVIDIA GPU and drivers. Do not install a CUDA-specific PyTorch build unless the hardware/driver combination is known.

## Optional API

- `GET /health`
- `POST /detect` with `include_pose=true` to return person color regions and pose keypoints
- `POST /analyze-video` with `include_pose=true` to enable pose analysis on sampled frames
- `POST /pose` for standalone pose keypoints

The web app must call a reachable AI engine URL. Do not set localhost as the AI engine URL in a deployed public website: each visitor's browser would try to connect to its own computer.
