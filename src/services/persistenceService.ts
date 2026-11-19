import { CameraSourceItem, SystemAlert, VideoAnalysisStats } from '../types';

const API_BASE = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const apiUrl = (path: string) => `${API_BASE}${path}`;

export type PersistedVideoSummary = {
  id: string; filename: string; duration: number; status: string; progress: number; current_frame: number;
  total_detections: number; unique_person: number; unique_car: number; unique_bicycle: number; unique_camera: number;
  created_at: string; updated_at: string;
};

type StoredDetection = { run_id: string; category: string; track_id: number };
type DemoStore = { cameras: CameraSourceItem[]; alerts: SystemAlert[]; runs: PersistedVideoSummary[]; detections: StoredDetection[] };
const STORAGE_KEY = 'visionx.public-demo.v1';
const emptyStore = (): DemoStore => ({ cameras: [], alerts: [], runs: [], detections: [] });

const readStore = (): DemoStore => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStore();
    const value = JSON.parse(raw) as Partial<DemoStore>;
    return {
      cameras: Array.isArray(value.cameras) ? value.cameras : [],
      alerts: Array.isArray(value.alerts) ? value.alerts : [],
      runs: Array.isArray(value.runs) ? value.runs : [],
      detections: Array.isArray(value.detections) ? value.detections : [],
    };
  } catch {
    return emptyStore();
  }
};
const writeStore = (store: DemoStore) => {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); }
  catch (error) { throw new Error(error instanceof Error ? error.message : 'Browser storage is unavailable or full.'); }
};
const updateStore = (change: (store: DemoStore) => DemoStore) => {
  writeStore(change(readStore()));
};
const localId = () => globalThis.crypto?.randomUUID?.() || `run-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const api = async <T>(path: string, init?: RequestInit): Promise<T> => {
  if (!API_BASE) throw new Error('Remote API is not configured; using this browser for demo storage.');
  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    });
  } catch {
    throw new Error(`VisionX backend is unreachable at ${API_BASE}.`);
  }
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(body || `API ${response.status} at ${apiUrl(path)}`);
  }
  return response.json();
};
const withLocalFallback = async <T>(remote: () => Promise<T>, local: () => T | Promise<T>): Promise<T> => {
  if (!API_BASE) return local();
  try { return await remote(); } catch { return local(); }
};

let detectionQueue: Promise<unknown> = Promise.resolve();

export const persistenceService = {
  health: () => withLocalFallback(
    () => api<{ ok: boolean; sqlite: boolean; node: string }>('/api/health'),
    () => ({ ok: true, sqlite: false, node: 'browser-local-storage' }),
  ),
  discoverOnvif: async (): Promise<any[]> => {
    throw new Error('ONVIF discovery is not available from a public browser demo. Use a local VisionX installation on the same camera network.');
  },
  createStreamTicket: async (_url: string): Promise<{ ticket: string }> => {
    throw new Error('RTSP streaming is not enabled on the public demo. Use the browser webcam or upload a video.');
  },
  streamUrl: (ticket: string) => apiUrl(`/api/stream?ticket=${encodeURIComponent(ticket)}`),
  cameras: () => withLocalFallback(
    () => api<CameraSourceItem[]>('/api/cameras'),
    () => readStore().cameras,
  ),
  saveCamera: (camera: CameraSourceItem) => withLocalFallback(
    () => api('/api/cameras', { method: 'POST', body: JSON.stringify(camera) }),
    () => { updateStore(store => ({ ...store, cameras: [camera, ...store.cameras.filter(item => item.id !== camera.id)] })); return { ok: true }; },
  ),
  removeCamera: (id: string) => withLocalFallback(
    () => api(`/api/cameras/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    () => { updateStore(store => ({ ...store, cameras: store.cameras.filter(camera => camera.id !== id) })); return { ok: true }; },
  ),
  alerts: () => withLocalFallback(
    () => api<SystemAlert[]>('/api/alerts'),
    () => readStore().alerts,
  ),
  saveAlert: (alert: SystemAlert) => withLocalFallback(
    () => api('/api/alerts', { method: 'POST', body: JSON.stringify(alert) }),
    () => { updateStore(store => ({ ...store, alerts: [alert, ...store.alerts.filter(item => item.id !== alert.id)].slice(0, 500) })); return { ok: true }; },
  ),
  acknowledgeAlert: (id: number) => withLocalFallback(
    () => api(`/api/alerts/${id}`, { method: 'PATCH', body: JSON.stringify({ acknowledged: true }) }),
    () => { updateStore(store => ({ ...store, alerts: store.alerts.map(alert => alert.id === id ? { ...alert, acknowledged: true } : alert) })); return { ok: true }; },
  ),
  createVideoRun: (payload: Record<string, unknown>) => withLocalFallback(
    () => api<{ ok: boolean; id: string }>('/api/video-runs', { method: 'POST', body: JSON.stringify(payload) }),
    () => {
      const id = localId();
      const timestamp = new Date().toISOString();
      const run: PersistedVideoSummary = {
        id, filename: String(payload.filename || 'video'), duration: Number(payload.duration || 0),
        status: String(payload.status || 'PROCESSING'), progress: Number(payload.progress || 0), current_frame: 0,
        total_detections: 0, unique_person: 0, unique_car: 0, unique_bicycle: 0, unique_camera: 0,
        created_at: timestamp, updated_at: timestamp,
      };
      updateStore(store => ({ ...store, runs: [run, ...store.runs].slice(0, 100) }));
      return { ok: true, id };
    },
  ),
  updateVideoRun: (id: string, payload: Record<string, unknown>) => withLocalFallback(
    () => api(`/api/video-runs/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(payload) }),
    () => {
      updateStore(store => ({
        ...store,
        runs: store.runs.map(run => run.id !== id ? run : {
          ...run,
          status: payload.status === undefined ? run.status : String(payload.status),
          progress: payload.progress === undefined ? run.progress : Number(payload.progress),
          current_frame: payload.currentFrame === undefined ? run.current_frame : Number(payload.currentFrame),
          total_detections: payload.totalDetections === undefined ? run.total_detections : Number(payload.totalDetections),
          unique_person: payload.uniquePerson === undefined ? run.unique_person : Number(payload.uniquePerson),
          unique_car: payload.uniqueCar === undefined ? run.unique_car : Number(payload.uniqueCar),
          unique_bicycle: payload.uniqueBicycle === undefined ? run.unique_bicycle : Number(payload.uniqueBicycle),
          unique_camera: payload.uniqueCamera === undefined ? run.unique_camera : Number(payload.uniqueCamera),
          updated_at: new Date().toISOString(),
        }),
      }));
      return { ok: true };
    },
  ),
  saveDetections: (id: string, items: unknown[]) => {
    if (!items.length) return Promise.resolve({ ok: true });
    const task = detectionQueue.then(() => withLocalFallback(
      () => api<{ ok: boolean }>(`/api/video-runs/${encodeURIComponent(id)}/detections`, { method: 'POST', body: JSON.stringify({ items }) }),
      () => {
        const valid = items.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object');
        updateStore(store => ({
          ...store,
          detections: [...store.detections, ...valid.map(item => ({
            run_id: id, category: String(item.category || 'unknown'), track_id: Number(item.trackingId || 0),
          }))].slice(-50000),
        }));
        return { ok: true };
      },
    ));
    detectionQueue = task.then(() => undefined, () => undefined);
    return task;
  },
  flushDetections: () => detectionQueue,
  statistics: () => withLocalFallback(
    () => api<{ totals: { category: string; count: number }[]; unique: { category: string; count: number }[]; videos: number; processing?: number; cameras: number }>('/api/statistics'),
    () => {
      const store = readStore();
      const totals = new Map<string, number>();
      const unique = new Map<string, Set<string>>();
      for (const item of store.detections) {
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
        videos: store.runs.filter(run => run.status === 'COMPLETED').length,
        processing: store.runs.filter(run => run.status === 'PROCESSING').length,
        cameras: store.cameras.length,
      };
    },
  ),
};

export const persistVideoCompletion = (id: string, _filename: string, _duration: number, stats: VideoAnalysisStats) =>
  persistenceService.updateVideoRun(id, {
    status: 'COMPLETED', progress: 100, currentFrame: 0,
    totalDetections: Object.values(stats.totalDetections).reduce((a, b) => a + b, 0),
    uniquePerson: stats.uniqueObjects.person, uniqueCar: stats.uniqueObjects.car,
    uniqueBicycle: stats.uniqueObjects.bicycle, uniqueCamera: stats.uniqueObjects.camera,
  });
