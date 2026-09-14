export type CategoryType = 'all' | 'person' | 'car' | 'bicycle' | 'camera';

export type DetectionQualityStatus = 'Excellent' | 'Good' | 'Low Quality' | 'Poor Visibility';

export type NightVisionMode = 'auto' | 'day' | 'night';

export interface DetectionResult {
  class_id: number;
  class_name: string;
  category: CategoryType;
  confidence: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  tracking_id: number;
  timestamp: string;
  frame_number: number;
}

export interface DetectedObject {
  id: string;
  trackId: number;
  category: 'person' | 'car' | 'bicycle' | 'camera';
  confidence: number;
  bbox: [number, number, number, number]; // [x1, y1, x2, y2]
  color?: string;
  direction?: string;
  speedKmh?: number;
  isCalibrated?: boolean;
  vehicleType?: string;
  plateText?: string;
  plateConfidence?: number;
  activity?: string;
  posture?: string;
  qualityRating?: 'Good' | 'Acceptable' | 'Poor';
  blurScore?: number;
  brightnessScore?: number;
  position?: { x: number; y: number };
}

export interface CameraSourceItem {
  id: string;
  name: string;
  type: 'webcam' | 'usb' | 'wifi_ip' | 'rtsp' | 'onvif' | 'bluetooth';
  source: string;
  status: 'Online' | 'Offline' | 'Connecting' | 'Stream Unavailable';
  aiStatus: 'Active' | 'Standby' | 'Paused';
  resolution: string;
  fps: number;
  location: string;
  nightVisionType: 'Software Night Vision' | 'Hardware IR';
  lastConnected: string;
  manufacturer?: string;
  model?: string;
}

export interface SystemAlert {
  id: number;
  timestamp: string;
  type: 'SPEED_WARNING' | 'CAMERA_STATUS' | 'OCR_LOW_CONFIDENCE' | 'QUALITY_ALERT';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  message: string;
  cameraId: string;
  trackId?: number;
  acknowledged: boolean;
}

export interface AppSettingsState {
  appearance: 'dark' | 'light' | 'system';
  confidenceThreshold: number;
  inferenceResolution: 640 | 960 | 1280;
  classThresholds: {
    person: number;
    car: number;
    bicycle: number;
    camera: number;
  };
  trackingEngine: 'ByteTrack' | 'BoT-SORT';
  computeDevice: 'CUDA' | 'CPU';
  speedThreshold: number;
  calibrationFactor: number;
  autoEnhancePoorCrops: boolean;
  nightVisionMode: NightVisionMode;
  autoNightThreshold: number;
}

// -------------------------------------------------------------
// VIDEO ANALYSIS MODULE DATA TYPES
// -------------------------------------------------------------

export type VideoAnalysisStatus = 'QUEUED' | 'PROCESSING' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'STOPPED';

export interface VideoFileItem {
  id: string;
  filename: string;
  duration: number; // in seconds
  durationFormatted: string;
  resolution: string;
  fps: number;
  frameCount: number;
  fileSize: string;
  url?: string;
  status: VideoAnalysisStatus;
  analyzedDate?: string;
  currentFrame?: number;
}

export interface VideoQualityMetrics {
  overallScore: number; // 0-100
  resolution: string;
  fps: number;
  avgBrightness: 'Low' | 'Medium' | 'Optimal' | 'High';
  brightnessValue: number; // 0-255
  contrast: 'Low' | 'Medium' | 'High';
  contrastRatio: number;
  blurScore: number; // Laplacian variance
  blurLevel: 'Sharp' | 'Medium' | 'Motion Blur';
  noiseLevel: 'Low' | 'Medium' | 'High';
  sharpness: 'Low' | 'Medium' | 'High';
  exposure: 'Underexposed' | 'Normal' | 'Overexposed';
  dynamicRange: string;
}

export interface TrackedVideoObject {
  id: string; // e.g. "PERSON #12"
  trackId: number;
  category: 'person' | 'car' | 'bicycle' | 'camera';
  firstSeenTime: string;
  firstSeenSeconds: number;
  lastSeenTime: string;
  lastSeenSeconds: number;
  durationVisible: string;
  detectionCount: number;
  avgConfidence: number;
  maxConfidence: number;
  minConfidence: number;
  movementDirection: string;
  approxPath: string;
  currentBbox?: [number, number, number, number];
  originalCropUrl?: string;
  enhancedCropUrl?: string;
  enhancedMetrics?: {
    originalResolution: string;
    enhancedResolution: string;
    blurScore: number;
    sharpness: string;
    brightness: string;
    applied: string[];
  };
}

export interface VideoTimelineEvent {
  id: string;
  timestamp: string;
  timestampSeconds: number;
  type: 'detected' | 'entered' | 'exited' | 'speed_warning' | 'quality_flag';
  objectId: string;
  category: 'person' | 'car' | 'bicycle' | 'camera';
  message: string;
}

export interface VideoAnalysisStats {
  totalDetections: {
    person: number;
    car: number;
    bicycle: number;
    camera: number;
  };
  uniqueObjects: {
    person: number;
    car: number;
    bicycle: number;
    camera: number;
  };
  timelineDensity: Array<{
    time: string;
    seconds: number;
    people: number;
    cars: number;
    bicycles: number;
    cameras: number;
  }>;
  enhancedFramesCount: number;
  enhancedCropsCount: number;
}
