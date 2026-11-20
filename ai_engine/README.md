# Optional VisionX AI Engine (Local / Self-Hosted)

This FastAPI + YOLO service is an **optional prototype** for developers who want to run inference on their own computer or their own infrastructure.

## Free browser mode (recommended)

The normal VisionX web app does not need this service. Keep `VITE_AI_ENGINE_URL` empty to use the in-browser TensorFlow.js COCO-SSD model. No external AI host, API key, or paid GPU is required.

## Run locally

```bash
python -m venv .venv
# activate the environment, then:
pip install -r ai_engine/requirements.txt
uvicorn ai_engine.main:app --host 127.0.0.1 --port 8000 --reload
```

Models are downloaded automatically on first use. The default detector is `yolo11s.pt`; `yolo11n.pt` uses less compute and is usually faster, while larger models need more memory and processing power.

## Optional endpoints

- `GET /health` — service health and model configuration.
- `POST /detect` — object detection for one uploaded image.
- `POST /analyze-video` — sampled-frame video analysis.
- `POST /pose` — pose keypoints.

To connect a locally running service, set `VITE_AI_ENGINE_URL` to the reachable service URL in your local environment. Do not set this to localhost in a deployed public website: visitors' browsers would try to connect to their own computers.

## Limitations

- This service is not deployed by default and is not required for the free browser experience.
- CPU inference can be slow on long or high-resolution videos.
- Detection accuracy must be evaluated on representative labelled footage; a successful health check is not an accuracy benchmark.
- Clothing colors are approximate visible-pixel estimates, not calibrated probabilities or semantic garment segmentation.
- Pose keypoints require a separate pose model and do not automatically provide validated posture labels.
