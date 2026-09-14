"""Alert Service monitoring thresholds and dispatching system notifications."""

from typing import List, Optional
from datetime import datetime
from app.database.repositories import AlertRepository
from app.database.models import AlertModel
from app.config.settings import settings
from app.utils.logger import logger


class AlertService:
    """Evaluates rules and logs alerts for threshold breaches and hardware events."""

    def __init__(self, repo: Optional[AlertRepository] = None):
        self.repo = repo or AlertRepository()
        self.speed_threshold = settings.vehicle.speed_threshold_warning

    def check_speed_alert(self, camera_id: str, track_id: int, speed_kmh: float) -> Optional[AlertModel]:
        """Triggers warning if vehicle estimated speed exceeds configured safety threshold."""
        if speed_kmh > self.speed_threshold:
            msg = f"Vehicle #{track_id:02d} Estimated speed: {speed_kmh:.0f} km/h (Threshold: {self.speed_threshold:.0f} km/h exceeded)"
            alert = AlertModel(
                id=None,
                timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                alert_type="SPEED_WARNING",
                severity="WARNING",
                message=msg,
                camera_id=camera_id,
                track_id=track_id,
                acknowledged=False
            )
            self.repo.add_alert(alert)
            logger.warning(f"ALERT: {msg}")
            return alert
        return None

    def log_camera_status_alert(self, camera_id: str, status: str) -> AlertModel:
        """Logs connection failure or camera disconnect alert."""
        severity = "CRITICAL" if "offline" in status.lower() or "error" in status.lower() else "INFO"
        msg = f"Camera {camera_id} status changed to {status}"
        alert = AlertModel(
            id=None,
            timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            alert_type="CAMERA_STATUS",
            severity=severity,
            message=msg,
            camera_id=camera_id,
            acknowledged=False
        )
        self.repo.add_alert(alert)
        return alert

    def get_recent_alerts(self, limit: int = 50) -> List[AlertModel]:
        return self.repo.get_recent(limit)

    def acknowledge_alert(self, alert_id: int):
        self.repo.acknowledge(alert_id)
