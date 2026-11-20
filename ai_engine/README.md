# VisionX AI Engine (v2)

Independent FastAPI inference service intended to run beside the Vercel-hosted frontend.

## Endpoints
- `GET /health` — health and model configuration.
- `POST /detect` — YOLO object detection for one uploaded image, with optional person clothing-color estimates.
- `POST /analyze-video` — server-side sampled-frame analysis; avoids browser seek/decode/inference serialisation.
- `POST /pose` — optional YOLO pose keypoints.

## Local run
```bash
python -m venv .venv
# activate the environment, then:
pip install -r ai_engine/requirements.txt
uvicorn ai_engine.main:app --host 0.0.0.0 --port 8000 --reload
```

Models are downloaded automatically on first use. Default detector: `yolo11s.pt`. Set `MODEL_NAME=yolo11n.pt` for lower latency or `yolo11m.pt` for higher capacity (with more compute and memory). Pose weights load only when `/pose` is first called.

## Deployment
Create a Render Web Service from this repository using root directory `.` and the Blueprint at `ai_engine/render.yaml`. Configure `ALLOWED_ORIGINS` to the exact deployed frontend origin. The initial blueprint uses a CPU service; use a GPU-capable host for higher throughput. Do not expect CPU inference to match GPU throughput.

## Important
- The frontend must call this service using `VITE_AI_ENGINE_URL`; the current frontend is not connected by this backend-only commit.
- A successful API health check is not an accuracy benchmark. Measure precision/recall on representative labelled footage before choosing a production model or confidence threshold.
- The video endpoint samples frames at the requested rate and returns all sampled results. For long videos, use lower `sample_fps` or `max_frames`; this is not a real-time streaming endpoint.
- Clothing colors are approximate visible-pixel estimates and are marked with a consistency score, not a calibrated probability.
