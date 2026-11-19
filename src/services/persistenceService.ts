import { CameraSourceItem, SystemAlert, VideoAnalysisStats } from '../types';

export type PersistedVideoSummary = {
  id: string; filename: string; duration: number; status: string; progress: number; current_frame: number;
  total_detections: number; unique_person: number; unique_car: number; unique_bicycle: number; unique_camera: number;
  created_at: string; updated_at: string;
};

type StoredDetection = { run_id: string; category: string; track_id: number };
type SessionStore = {
  cameras: CameraSourceItem[];
  alerts: SystemAlert[];
  runs: PersistedVideoSummary[];
  detections: StoredDetection[];
};

const sessionStore: SessionStore = { cameras: [], alerts: [], runs: [], detections: [] };
const localId = () => globalThis.crypto?.randomUUID?.() || `run-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const timestamp = () => new Date().toISOString();

export const persistenceService = {
  // All visitor data lives only in this page session's memory.
  // Reloading or closing the page creates a fresh, empty session.
  health: async () => ({ ok: true, sqlite: false, node: 'browser-session-memory' }),

  discoverOnvif: async (): Promise<any[]> => {
    throw new Error('ONVIF discovery requires a VisionX service running on the same network as the IP camera.');
  },
  createStreamTicket: async (_url: string): Promise<{ ticket: string }> => {
    throw new Error('RTSP streaming requires a VisionX camera gateway reachable from the camera network.');
  },
  streamUrl: (ticket: string) => `/api/stream?ticket=${encodeURIComponent(ticket)}`,

  cameras: async () => [...sessionStore.cameras],
  saveCamera: async (camera: CameraSourceItem) => {
    sessionStore.cameras = [camera, ...sessionStore.cameras.filter(item => item.id !== camera.id)];
    return { ok: true };
  },
  removeCamera: async (id: string) => {
    sessionStore.cameras = sessionStore.cameras.filter(camera => camera.id !== id);
    return { ok: true };
  },

  alerts: async () => [...sessionStore.alerts],
  saveAlert: async (alert: SystemAlert) => {
    sessionStore.alerts = [alert, ...sessionStore.alerts.filter(item => item.id !== alert.id)].slice(0, 500);
    return { ok: true };
  },
  acknowledgeAlert: async (id: number) => {
    sessionStore.alerts = sessionStore.alerts.map(alert => alert.id === id ? { ...alert, acknowledged: true } : alert);
    return { ok: true };
  },

  createVideoRun: async (payload: Record<string, unknown>) => {
    const id = localId();
    const now = timestamp();
    const run: PersistedVideoSummary = {
      id,
      filename: String(payload.filename || 'video'),
      duration: Number(payload.duration || 0),
      status: String(payload.status || 'PROCESSING'),
      progress: Number(payload.progress || 0),
      current_frame: 0,
      total_detections: 0,
      unique_person: 0,
      unique_car: 0,
      unique_bicycle: 0,
      unique_camera: 0,
      created_at: now,
      updated_at: now,
    };
    sessionStore.runs = [run, ...sessionStore.runs].slice(0, 100);
    return { ok: true, id };
  },

  updateVideoRun: async (id: string, payload: Record<string, unknown>) => {
    sessionStore.runs = sessionStore.runs.map(run => run.id !== id ? run : {
      ...run,
      status: payload.status === undefined ? run.status : String(payload.status),
      progress: payload.progress === undefined ? run.progress : Number(payload.progress),
      current_frame: payload.currentFrame === undefined ? run.current_frame : Number(payload.currentFrame),
      total_detections: payload.totalDetections === undefined ? run.total_detections : Number(payload.totalDetections),
      unique_person: payload.uniquePerson === undefined ? run.unique_person : Number(payload.uniquePerson),
      unique_car: payload.uniqueCar === undefined ? run.unique_car : Number(payload.uniqueCar),
      unique_bicycle: payload.uniqueBicycle === undefined ? run.unique_bicycle : Number(payload.uniqueBicycle),
      unique_camera: payload.uniqueCamera === undefined ? run.unique_camera : Number(payload.uniqueCamera),
      updated_at: timestamp(),
    });
    return { ok: true };
  },

  saveDetections: async (id: string, items: unknown[]) => {
    const valid = items.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object');
    sessionStore.detections.push(...valid.map(item => ({
      run_id: id,
      category: String(item.category || 'unknown'),
      track_id: Number(item.trackingId || 0),
    })));
    if (sessionStore.detections.length > 50000) sessionStore.detections.splice(0, sessionStore.detections.length - 50000);
    return { ok: true };
  },
  flushDetections: async () => undefined,

  statistics: async () => {
    const totals = new Map<string, number>();
    const unique = new Map<string, Set<string>>();
    for (const item of sessionStore.detections) {
      totals.set(item.category, (totals.get(item.category) || 0) + 1);
      if (item.track_id > 0) {
        const ids = unique.get(item.category) || new Set<string>();
        ids.add(`${item.run_id}:${item.track_id}`);
        unique.set(item.category, ids);
      }
    }
    return {
      totals: [...totals].map(([category, count]) => ({ category, count })),
      unique: [...unique].map(([category, ids]) => ({ category, count: ids.size })),
      videos: sessionStore.runs.filter(run => run.status === 'COMPLETED').length,
      processing: sessionStore.runs.filter(run => run.status === 'PROCESSING').length,
      cameras: sessionStore.cameras.length,
    };
  },
};

export const persistVideoCompletion = (id: string, _filename: string, _duration: number, stats: VideoAnalysisStats) =>
  persistenceService.updateVideoRun(id, {
    status: 'COMPLETED',
    progress: 100,
    currentFrame: 0,
    totalDetections: Object.values(stats.totalDetections).reduce((a, b) => a + b, 0),
    uniquePerson: stats.uniqueObjects.person,
    uniqueCar: stats.uniqueObjects.car,
    uniqueBicycle: stats.uniqueObjects.bicycle,
    uniqueCamera: stats.uniqueObjects.camera,
  });
