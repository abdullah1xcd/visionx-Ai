# -*- mode: python ; coding: utf-8 -*-
# VisionX AI — PyInstaller Build Specification for Windows 10/11
# Command: pyinstaller build.spec

import sys
from pathlib import Path
from PyInstaller.utils.hooks import collect_data_files, collect_submodules

block_cipher = None

# Base path
ROOT_DIR = Path('.').resolve()

datas = [
    (str(ROOT_DIR / 'models'), 'models'),
    (str(ROOT_DIR / 'data'), 'data'),
    (str(ROOT_DIR / 'assets'), 'assets'),
]

# Collect ultralytics and easyocr/paddleocr assets
try:
    datas += collect_data_files('ultralytics')
except Exception:
    pass

try:
    datas += collect_data_files('easyocr')
except Exception:
    pass

hiddenimports = [
    'PySide6',
    'PySide6.QtCore',
    'PySide6.QtGui',
    'PySide6.QtWidgets',
    'cv2',
    'numpy',
    'PIL',
    'ultralytics',
    'easyocr',
    'sqlite3',
    'app.ai.detector',
    'app.ai.tracker',
    'app.ai.quality_analyzer',
    'app.ai.enhancement',
    'app.vehicle.plate_detector',
    'app.vehicle.plate_ocr',
    'app.vehicle.speed_estimator',
    'app.camera.camera_manager',
    'app.database.database',
]

a = Analysis(
    ['app/main.py'],
    pathex=[str(ROOT_DIR)],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['tkinter', 'matplotlib', 'scipy.spatial.cKDTree'],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='VisionXAI',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,  # Windowed GUI application
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=str(ROOT_DIR / 'assets' / 'logo' / 'app_icon.ico') if (ROOT_DIR / 'assets' / 'logo' / 'app_icon.ico').exists() else None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='VisionXAI',
)
