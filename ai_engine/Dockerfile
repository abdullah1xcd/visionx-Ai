FROM python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 YOLO_CONFIG_DIR=/tmp/ultralytics
RUN apt-get update && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 libgomp1 ffmpeg && rm -rf /var/lib/apt/lists/*
WORKDIR /srv
COPY ai_engine/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY ai_engine ./ai_engine
EXPOSE 8000
CMD ["uvicorn", "ai_engine.main:app", "--host", "0.0.0.0", "--port", "8000"]
