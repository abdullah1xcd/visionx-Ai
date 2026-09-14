"""Hardware detection and runtime performance monitor for VisionX AI."""

import time
from typing import Dict, Any, Tuple

try:
    import psutil
except ImportError:
    psutil = None


def detect_compute_device() -> Tuple[str, str]:
    """Detects whether an NVIDIA CUDA GPU is available or gracefully falls back to CPU."""
    try:
        import torch
        if torch.cuda.is_available():
            device_name = torch.cuda.get_device_name(0)
            return "cuda", f"NVIDIA CUDA ({device_name})"
    except Exception:
        pass
    return "cpu", "CPU Engine"


class FPSMeter:
    """Calculates smoothed frames per second."""
    def __init__(self, avg_frames: int = 20):
        self.avg_frames = avg_frames
        self.timestamps = []

    def update(self) -> float:
        now = time.time()
        self.timestamps.append(now)
        if len(self.timestamps) > self.avg_frames:
            self.timestamps.pop(0)

        if len(self.timestamps) < 2:
            return 0.0

        elapsed = self.timestamps[-1] - self.timestamps[0]
        if elapsed > 0:
            return float(len(self.timestamps) - 1) / elapsed
        return 0.0


class SystemMonitor:
    """Monitors CPU and memory statistics."""
    @staticmethod
    def get_metrics() -> Dict[str, Any]:
        metrics = {
            "cpu_percent": 0.0,
            "ram_percent": 0.0,
            "ram_used_mb": 0.0,
            "gpu_name": "N/A",
            "gpu_mem_used_mb": 0.0
        }
        if psutil:
            try:
                metrics["cpu_percent"] = psutil.cpu_percent(interval=None)
                mem = psutil.virtual_memory()
                metrics["ram_percent"] = mem.percent
                metrics["ram_used_mb"] = mem.used / (1024 * 1024)
            except Exception:
                pass

        try:
            import torch
            if torch.cuda.is_available():
                metrics["gpu_name"] = torch.cuda.get_device_name(0)
                metrics["gpu_mem_used_mb"] = torch.cuda.memory_allocated(0) / (1024 * 1024)
        except Exception:
            pass

        return metrics
