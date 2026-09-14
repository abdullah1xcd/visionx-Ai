import { CameraSourceItem, SystemAlert } from '../types';

export const INITIAL_CAMERAS: CameraSourceItem[] = [
  {
    id: 'CAM-01',
    name: 'Main Entrance & Street',
    type: 'webcam',
    source: 'Device 0 (Integrated Webcam)',
    status: 'Online',
    aiStatus: 'Active',
    resolution: '1920×1080',
    fps: 30,
    location: 'Gate A Perimeter',
    nightVisionType: 'Software Night Vision',
    lastConnected: 'Active Now',
    manufacturer: 'Integrated',
    model: 'HD Wide-Angle'
  },
  {
    id: 'CAM-02',
    name: 'Parking Access North',
    type: 'usb',
    source: 'Device 1 (USB 3.0 UVC Camera)',
    status: 'Online',
    aiStatus: 'Active',
    resolution: '2560×1440',
    fps: 30,
    location: 'North Barrier',
    nightVisionType: 'Software Night Vision',
    lastConnected: 'Active Now',
    manufacturer: 'Logitech',
    model: 'Brio 4K / Pro Stream'
  },
  {
    id: 'CAM-03',
    name: 'Perimeter Wall IP Cam',
    type: 'rtsp',
    source: 'rtsp://admin:pass@192.168.1.188:554/live',
    status: 'Online',
    aiStatus: 'Active',
    resolution: '1920×1080',
    fps: 30,
    location: 'East Perimeter',
    nightVisionType: 'Hardware IR',
    lastConnected: '1 min ago',
    manufacturer: 'Hikvision',
    model: 'DS-2CD2043G2-I (IR 30m)'
  },
  {
    id: 'CAM-04',
    name: 'Warehouse Loading Dock',
    type: 'onvif',
    source: 'http://192.168.1.205:80/onvif/device_service',
    status: 'Offline',
    aiStatus: 'Standby',
    resolution: '1920×1080',
    fps: 25,
    location: 'Loading Bay 2',
    nightVisionType: 'Hardware IR',
    lastConnected: '15 min ago',
    manufacturer: 'Dahua',
    model: 'IPC-HFW5241E-Z12E'
  }
];

export const INITIAL_ALERTS: SystemAlert[] = [
  {
    id: 1,
    timestamp: '16:18:04',
    type: 'SPEED_WARNING',
    severity: 'WARNING',
    message: 'Vehicle CAR #04 Estimated speed: 88 km/h exceeds 80 km/h threshold.',
    cameraId: 'CAM-01',
    trackId: 4,
    acknowledged: false
  },
  {
    id: 2,
    timestamp: '15:52:19',
    type: 'QUALITY_ALERT',
    severity: 'INFO',
    message: 'Low ambient illumination on CAM-01 (Luminance: 38 lux). Auto Night Vision active.',
    cameraId: 'CAM-01',
    acknowledged: false
  },
  {
    id: 3,
    timestamp: '14:20:41',
    type: 'CAMERA_STATUS',
    severity: 'CRITICAL',
    message: 'Camera CAM-04 RTSP stream timeout. Attempting automated socket reconnect.',
    cameraId: 'CAM-04',
    acknowledged: false
  },
  {
    id: 4,
    timestamp: '11:05:12',
    type: 'OCR_LOW_CONFIDENCE',
    severity: 'INFO',
    message: 'Vehicle CAR #07 license plate OCR confidence 68%. Verification recommended.',
    cameraId: 'CAM-01',
    trackId: 7,
    acknowledged: true
  }
];

export const HOURLY_STATS = [
  { hour: '00:00', people: 8, vehicles: 6, bicycles: 1 },
  { hour: '02:00', people: 3, vehicles: 2, bicycles: 0 },
  { hour: '04:00', people: 6, vehicles: 9, bicycles: 2 },
  { hour: '06:00', people: 38, vehicles: 45, bicycles: 14 },
  { hour: '08:00', people: 142, vehicles: 128, bicycles: 36 },
  { hour: '10:00', people: 110, vehicles: 84, bicycles: 22 },
  { hour: '12:00', people: 165, vehicles: 95, bicycles: 28 },
  { hour: '14:00', people: 125, vehicles: 76, bicycles: 19 },
  { hour: '16:00', people: 190, vehicles: 150, bicycles: 42 },
  { hour: '18:00', people: 160, vehicles: 120, bicycles: 31 },
  { hour: '20:00', people: 80, vehicles: 52, bicycles: 15 },
  { hour: '22:00', people: 32, vehicles: 22, bicycles: 5 },
];

export const SPEED_HISTOGRAM = [
  { range: '< 30 km/h', count: 42 },
  { range: '30–50 km/h', count: 184 },
  { range: '50–70 km/h', count: 96 },
  { range: '70–80 km/h', count: 28 },
  { range: '> 80 km/h (Warning)', count: 9 },
];
