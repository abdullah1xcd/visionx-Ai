"""SQLite Database connection management and schema initializations."""

import sqlite3
import os
from pathlib import Path
from app.config.settings import settings
from app.utils.logger import logger


class Database:
    """Manages SQLite database lifecycle and schema creation for VisionX AI."""
    _instance = None

    def __new__(cls, db_path: str = None):
        if cls._instance is None:
            cls._instance = super(Database, cls).__new__(cls)
            cls._instance.db_path = db_path or settings.database_path
            cls._instance._init_db()
        return cls._instance

    def get_connection(self) -> sqlite3.Connection:
        """Returns a connection configured with row factory."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        """Creates tables and indexes if not present."""
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()

                # Cameras table
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS cameras (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    camera_type TEXT NOT NULL,
                    source TEXT NOT NULL,
                    status TEXT DEFAULT 'Offline',
                    width INTEGER DEFAULT 1280,
                    height INTEGER DEFAULT 720,
                    fps INTEGER DEFAULT 30,
                    location TEXT DEFAULT 'Main',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """)

                # Detection events table
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS detection_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    camera_id TEXT NOT NULL,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    category TEXT NOT NULL,
                    track_id INTEGER NOT NULL,
                    confidence REAL NOT NULL,
                    speed_kmh REAL,
                    plate_text TEXT,
                    plate_conf REAL,
                    color TEXT,
                    direction TEXT,
                    crop_path TEXT
                )
                """)
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_events_time ON detection_events(timestamp)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_events_cat ON detection_events(category)")

                # Alerts table
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS alerts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    alert_type TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    message TEXT NOT NULL,
                    camera_id TEXT NOT NULL,
                    track_id INTEGER,
                    acknowledged INTEGER DEFAULT 0
                )
                """)
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_alerts_time ON alerts(timestamp)")

                # Capture records table
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS captures (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    camera_id TEXT NOT NULL,
                    original_path TEXT NOT NULL,
                    enhanced_path TEXT,
                    detected_count INTEGER DEFAULT 0,
                    notes TEXT
                )
                """)

                conn.commit()
                logger.info(f"Initialized SQLite database at {self.db_path}")
        except Exception as e:
            logger.error(f"Error initializing SQLite database: {e}")
