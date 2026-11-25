# Run VisionX locally with the YOLO AI engine (Windows)

The web app and AI engine run as two local processes. The web app automatically selects
`http://127.0.0.1:8000` when opened from `localhost` or `127.0.0.1`, unless
`VITE_AI_ENGINE_URL` is explicitly configured.

## Requirements

- Windows 10/11 x64
- Node.js 20+ and npm
- Python 3.10–3.12 (64-bit)
- For GPU inference: a compatible NVIDIA GPU and the matching PyTorch CUDA build.
  CPU inference is supported if no compatible GPU is available.

## 1. Install the Python AI engine (one time)

Open PowerShell in the repository root:

```powershell
py -3.11 -m venv .venv-ai
.\.venv-ai\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r ai_engine/requirements.txt
```

If PowerShell blocks activation, run the commands from Command Prompt instead:

```bat
py -3.11 -m venv .venv-ai
.venv-ai\Scripts\activate.bat
python -m pip install --upgrade pip
pip install -r ai_engine\requirements.txt
```

PyTorch's installed build determines whether CUDA is available. To use an NVIDIA GPU,
install the PyTorch CUDA build compatible with your driver by following the official
PyTorch install selector, then verify it:

```powershell
python -c "import torch; print('CUDA available:', torch.cuda.is_available()); print(torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'Using CPU')"
```

## 2. Start the local YOLO API

With the virtual environment active:

```powershell
python -m uvicorn ai_engine.main:app --host 127.0.0.1 --port 8000
```

Open http://127.0.0.1:8000/health. A healthy response includes `"status":"ok"`.
The first inference downloads the configured YOLO weights (default `yolo11s.pt`) if
they are not already cached. Keep this terminal open while using VisionX.

## 3. Start the web application

Open a second terminal in the repository root:

```powershell
npm install
npm run dev
```

Open http://localhost:3000. The Dashboard and Video Analysis will automatically try
the local YOLO API. If it is not running or unavailable, the browser COCO-SSD fallback
is used instead.

## Notes

- Local YOLO inference does not require a Vercel deployment or a cloud AI service.
- The browser must be able to reach port 8000; do not expose this development API to
  the public internet without adding authentication and appropriate network controls.
- The model weights are cached locally after their first download.
- The separate cloud deployment still needs its own reachable AI engine URL configured
  as `VITE_AI_ENGINE_URL`; the localhost auto-detection is only for local browser hosts.
