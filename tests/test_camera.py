"""Unit tests for Camera sources and CameraManager."""

import unittest
from app.camera.camera_manager import CameraManager, SyntheticSource
from app.database.models import CameraModel


class TestCameraModule(unittest.TestCase):
    def setUp(self):
        self.manager = CameraManager()

    def test_synthetic_source_read(self):
        source = SyntheticSource(width=640, height=480, fps=30)
        self.assertTrue(source.connect())
        ret, frame = source.read_frame()
        self.assertTrue(ret)
        self.assertIsNotNone(frame)
        self.assertEqual(frame.shape, (480, 640, 3))
        source.disconnect()
        self.assertFalse(source.is_connected())

    def test_camera_manager_crud(self):
        test_cam = CameraModel(
            id="TEST-01",
            name="Test Unit",
            camera_type="webcam",
            source="0"
        )
        self.manager.add_camera(test_cam)
        retrieved = self.manager.repo.get_by_id("TEST-01")
        self.assertIsNotNone(retrieved)
        self.assertEqual(retrieved.name, "Test Unit")

        self.manager.remove_camera("TEST-01")
        self.assertIsNone(self.manager.repo.get_by_id("TEST-01"))


if __name__ == "__main__":
    unittest.main()
