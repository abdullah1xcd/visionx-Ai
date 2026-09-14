import {
  VideoFileItem,
  VideoQualityMetrics,
  TrackedVideoObject,
  VideoTimelineEvent,
  VideoAnalysisStats
} from '../types';

export const SAMPLE_VIDEOS: VideoFileItem[] = [
  {
    id: 'VID-01',
    filename: 'commercial_intersection_1080p.mp4',
    duration: 180,
    durationFormatted: '03:00',
    resolution: '1920 × 1080',
    fps: 30,
    frameCount: 5400,
    fileSize: '142.4 MB',
    status: 'COMPLETED',
    analyzedDate: '15 Sep 2026, 14:20',
    currentFrame: 5400
  },
  {
    id: 'VID-02',
    filename: 'subway_terminal_cctv.mp4',
    duration: 120,
    durationFormatted: '02:00',
    resolution: '1280 × 720',
    fps: 25,
    frameCount: 3000,
    fileSize: '68.1 MB',
    status: 'COMPLETED',
    analyzedDate: '15 Sep 2026, 12:45',
    currentFrame: 3000
  },
  {
    id: 'VID-03',
    filename: 'night_highway_surveillance.mp4',
    duration: 240,
    durationFormatted: '04:00',
    resolution: '1920 × 1080',
    fps: 30,
    frameCount: 7200,
    fileSize: '198.8 MB',
    status: 'PAUSED',
    analyzedDate: '14 Sep 2026, 23:10',
    currentFrame: 3600
  },
  {
    id: 'VID-04',
    filename: 'lowres_warehouse_dock.avi',
    duration: 90,
    durationFormatted: '01:30',
    resolution: '640 × 480',
    fps: 20,
    frameCount: 1800,
    fileSize: '24.2 MB',
    status: 'QUEUED',
    analyzedDate: 'Unprocessed',
    currentFrame: 0
  },
  {
    id: 'VID-05',
    filename: 'city_bike_transit_lane.mov',
    duration: 150,
    durationFormatted: '02:30',
    resolution: '1920 × 1080',
    fps: 30,
    frameCount: 4500,
    fileSize: '115.6 MB',
    status: 'COMPLETED',
    analyzedDate: '13 Sep 2026, 17:05',
    currentFrame: 4500
  }
];

export const INITIAL_QUALITY_METRICS: VideoQualityMetrics = {
  overallScore: 78,
  resolution: '1920 × 1080',
  fps: 30,
  avgBrightness: 'Optimal',
  brightnessValue: 124,
  contrast: 'Medium',
  contrastRatio: 3.8,
  blurScore: 142.6,
  blurLevel: 'Sharp',
  noiseLevel: 'Low',
  sharpness: 'Medium',
  exposure: 'Normal',
  dynamicRange: '10.4 EV'
};

export const INITIAL_TRACKED_OBJECTS: TrackedVideoObject[] = [
  {
    id: 'PERSON #12',
    trackId: 12,
    category: 'person',
    firstSeenTime: '00:00:14',
    firstSeenSeconds: 14,
    lastSeenTime: '00:01:42',
    lastSeenSeconds: 102,
    durationVisible: '1m 28s',
    detectionCount: 2640,
    avgConfidence: 0.91,
    maxConfidence: 0.98,
    minConfidence: 0.82,
    movementDirection: 'Left → Center-Right',
    approxPath: 'Sidewalk North-bound crosswalk traversal',
    currentBbox: [0.18, 0.42, 0.28, 0.88],
    enhancedMetrics: {
      originalResolution: '96 × 240 px',
      enhancedResolution: '192 × 480 px (2× Super-Res)',
      blurScore: 168.4,
      sharpness: 'High (Bilateral Filter + Unsharp Mask)',
      brightness: 'Gamma 0.65 Compensated',
      applied: ['2× Neural Upscaling', 'Edge-Preserving Denoise', 'Local CLAHE', 'Unsharp Sharpening']
    }
  },
  {
    id: 'CAR #04',
    trackId: 4,
    category: 'car',
    firstSeenTime: '00:00:08',
    firstSeenSeconds: 8,
    lastSeenTime: '00:00:56',
    lastSeenSeconds: 56,
    durationVisible: '48s',
    detectionCount: 1440,
    avgConfidence: 0.94,
    maxConfidence: 0.99,
    minConfidence: 0.88,
    movementDirection: 'Right → Bottom-Left',
    approxPath: 'Lane 2 straight approach',
    currentBbox: [0.46, 0.48, 0.74, 0.84],
    enhancedMetrics: {
      originalResolution: '280 × 160 px',
      enhancedResolution: '560 × 320 px (2× Super-Res)',
      blurScore: 184.2,
      sharpness: 'Crisp Body Outline',
      brightness: 'Normalized Histogram',
      applied: ['Upscaling', 'Specular Reflection Suppress', 'Contrast Boost', 'High-Pass Sharpen']
    }
  },
  {
    id: 'PERSON #03',
    trackId: 3,
    category: 'person',
    firstSeenTime: '00:00:22',
    firstSeenSeconds: 22,
    lastSeenTime: '00:02:10',
    lastSeenSeconds: 130,
    durationVisible: '1m 48s',
    detectionCount: 3240,
    avgConfidence: 0.89,
    maxConfidence: 0.96,
    minConfidence: 0.76,
    movementDirection: 'Far-Left → Lower-Left',
    approxPath: 'Bus shelter boarding area',
    currentBbox: [0.08, 0.46, 0.16, 0.82],
    enhancedMetrics: {
      originalResolution: '72 × 180 px',
      enhancedResolution: '144 × 360 px',
      blurScore: 134.1,
      sharpness: 'Medium',
      brightness: 'Optimal',
      applied: ['Denoise', 'CLAHE Local Equalization', 'Sharpen']
    }
  },
  {
    id: 'BICYCLE #02',
    trackId: 2,
    category: 'bicycle',
    firstSeenTime: '00:00:35',
    firstSeenSeconds: 35,
    lastSeenTime: '00:01:15',
    lastSeenSeconds: 75,
    durationVisible: '40s',
    detectionCount: 1200,
    avgConfidence: 0.87,
    maxConfidence: 0.93,
    minConfidence: 0.79,
    movementDirection: 'Top-Right → Bottom-Right',
    approxPath: 'Dedicated transit greenway',
    currentBbox: [0.82, 0.52, 0.94, 0.86],
    enhancedMetrics: {
      originalResolution: '110 × 140 px',
      enhancedResolution: '220 × 280 px',
      blurScore: 152.0,
      sharpness: 'High',
      brightness: 'Natural',
      applied: ['Spoke Edge Preservation', 'Motion Blur Compensation', 'Super-Resolution']
    }
  },
  {
    id: 'CAR #07',
    trackId: 7,
    category: 'car',
    firstSeenTime: '00:01:02',
    firstSeenSeconds: 62,
    lastSeenTime: '00:02:40',
    lastSeenSeconds: 160,
    durationVisible: '1m 38s',
    detectionCount: 2940,
    avgConfidence: 0.93,
    maxConfidence: 0.97,
    minConfidence: 0.84,
    movementDirection: 'Center → Left Turn Bay',
    approxPath: 'Interstate ramp deceleration',
    currentBbox: [0.32, 0.38, 0.52, 0.68],
    enhancedMetrics: {
      originalResolution: '180 × 120 px',
      enhancedResolution: '360 × 240 px',
      blurScore: 172.5,
      sharpness: 'Crisp',
      brightness: 'HDR Tone Mapped',
      applied: ['Tone Equalization', 'License Plate Region Contrast', 'Denoise']
    }
  },
  {
    id: 'CAMERA #01',
    trackId: 1,
    category: 'camera',
    firstSeenTime: '00:00:00',
    firstSeenSeconds: 0,
    lastSeenTime: '00:03:00',
    lastSeenSeconds: 180,
    durationVisible: '3m 00s (Static Sensor)',
    detectionCount: 5400,
    avgConfidence: 0.96,
    maxConfidence: 0.99,
    minConfidence: 0.92,
    movementDirection: 'Static Pole Mounted',
    approxPath: 'Traffic signal mast cross-monitor',
    currentBbox: [0.88, 0.12, 0.96, 0.26],
    enhancedMetrics: {
      originalResolution: '64 × 64 px',
      enhancedResolution: '128 × 128 px',
      blurScore: 195.0,
      sharpness: 'Sharp Housing Geometry',
      brightness: 'High Contrast',
      applied: ['Geometric Edge Sharpening', '2× Bilinear Interpolation']
    }
  }
];

export const INITIAL_TIMELINE_EVENTS: VideoTimelineEvent[] = [
  {
    id: 'EVT-01',
    timestamp: '00:00:00',
    timestampSeconds: 0,
    type: 'detected',
    objectId: 'CAMERA #01',
    category: 'camera',
    message: 'Fixed Optical Sensor CAMERA #01 located on traffic mast'
  },
  {
    id: 'EVT-02',
    timestamp: '00:00:08',
    timestampSeconds: 8,
    type: 'entered',
    objectId: 'CAR #04',
    category: 'car',
    message: 'Vehicle CAR #04 entered Lane 2 from east approach'
  },
  {
    id: 'EVT-03',
    timestamp: '00:00:14',
    timestampSeconds: 14,
    type: 'entered',
    objectId: 'PERSON #12',
    category: 'person',
    message: 'Pedestrian PERSON #12 stepped onto North crosswalk'
  },
  {
    id: 'EVT-04',
    timestamp: '00:00:22',
    timestampSeconds: 22,
    type: 'entered',
    objectId: 'PERSON #03',
    category: 'person',
    message: 'Pedestrian PERSON #03 arrived at transit shelter'
  },
  {
    id: 'EVT-05',
    timestamp: '00:00:35',
    timestampSeconds: 35,
    type: 'entered',
    objectId: 'BICYCLE #02',
    category: 'bicycle',
    message: 'Cyclist BICYCLE #02 joined southern cycle track'
  },
  {
    id: 'EVT-06',
    timestamp: '00:00:56',
    timestampSeconds: 56,
    type: 'exited',
    objectId: 'CAR #04',
    category: 'car',
    message: 'Vehicle CAR #04 exited frame through West intersection boundary'
  },
  {
    id: 'EVT-07',
    timestamp: '00:01:02',
    timestampSeconds: 62,
    type: 'entered',
    objectId: 'CAR #07',
    category: 'car',
    message: 'Vehicle CAR #07 entered left turn deceleration zone'
  },
  {
    id: 'EVT-08',
    timestamp: '00:01:15',
    timestampSeconds: 75,
    type: 'exited',
    objectId: 'BICYCLE #02',
    category: 'bicycle',
    message: 'Cyclist BICYCLE #02 cleared camera view'
  },
  {
    id: 'EVT-09',
    timestamp: '00:01:42',
    timestampSeconds: 102,
    type: 'exited',
    objectId: 'PERSON #12',
    category: 'person',
    message: 'Pedestrian PERSON #12 completed crossing and reached sidewalk'
  },
  {
    id: 'EVT-10',
    timestamp: '00:02:10',
    timestampSeconds: 130,
    type: 'exited',
    objectId: 'PERSON #03',
    category: 'person',
    message: 'Pedestrian PERSON #03 boarded arrival bus'
  },
  {
    id: 'EVT-11',
    timestamp: '00:02:40',
    timestampSeconds: 160,
    type: 'exited',
    objectId: 'CAR #07',
    category: 'car',
    message: 'Vehicle CAR #07 completed turn onto expressway'
  }
];

export const INITIAL_VIDEO_STATS: VideoAnalysisStats = {
  totalDetections: {
    person: 14820,
    car: 8640,
    bicycle: 1200,
    camera: 5400
  },
  uniqueObjects: {
    person: 18,
    car: 12,
    bicycle: 4,
    camera: 1
  },
  timelineDensity: [
    { time: '00:00', seconds: 0, people: 2, cars: 1, bicycles: 0, cameras: 1 },
    { time: '00:20', seconds: 20, people: 5, cars: 3, bicycles: 0, cameras: 1 },
    { time: '00:40', seconds: 40, people: 8, cars: 4, bicycles: 1, cameras: 1 },
    { time: '01:00', seconds: 60, people: 11, cars: 5, bicycles: 1, cameras: 1 },
    { time: '01:20', seconds: 80, people: 9, cars: 4, bicycles: 1, cameras: 1 },
    { time: '01:40', seconds: 100, people: 7, cars: 6, bicycles: 0, cameras: 1 },
    { time: '02:00', seconds: 120, people: 6, cars: 4, bicycles: 1, cameras: 1 },
    { time: '02:20', seconds: 140, people: 8, cars: 5, bicycles: 2, cameras: 1 },
    { time: '02:40', seconds: 160, people: 4, cars: 2, bicycles: 0, cameras: 1 },
    { time: '03:00', seconds: 180, people: 3, cars: 3, bicycles: 0, cameras: 1 }
  ],
  enhancedFramesCount: 412,
  enhancedCropsCount: 86
};
