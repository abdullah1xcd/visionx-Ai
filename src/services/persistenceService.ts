import { CameraSourceItem, SystemAlert, VideoAnalysisStats } from '../types';

const API_BASE = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const apiUrl = (path: string) => `${API_BASE}${path}`;

const api = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const url = apiUrl(path);
  let r: Response;
  try {
    r = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
      ...init,
    });
  } catch {
    throw new Error(
      API_BASE
        ? `VisionX backend is unreachable at ${API_BASE}.`
        : 'VisionX backend is not configured for this deployment. Set VITE_API_BASE_URL to the deployed VisionX API.'
    );
  }
  if (!r.ok) {
    const body = await r.text().catch(() => '');
    throw new Error(body || `API ${r.status} at ${url}`);
  }
  return r.json();
};

let detectionQueue = Promise.resolve();

export const persistenceService = {
  health: () => api<{ ok: boolean; sqlite: boolean; node: string }>('/api/health'),
  cameras: () => api<CameraSourceItem[]>('/api/cameras'),
  saveCamera: (camera: CameraSourceItem) => api('/api/cameras', { method: 'POST', body: JSON.stringify(camera) }),
  removeCamera: (id: string) => api(`/api/cameras/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  alerts: () => api<SystemAlert[]>('/api/alerts'),
  saveAlert: (alert: SystemAlert) => api('/api/alerts', { method: 'POST', body: JSON.stringify(alert) }),
  acknowledgeAlert: (id: number) => api(`/api/alerts/${id}`, { method: 'PATCH', body: JSON.stringify({ acknowledged: true }) }),
  createVideoRun: (payload: Record<string, unknown>) => api<{ ok: boolean; id: string }>('/api/video-runs', { method: 'POST', body: JSON.stringify(payload) }),
  updateVideoRun: (id: string, payload: Record<string, unknown>) => api(`/api/video-runs/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  saveDetections: (id: string, items: unknown[]) => {
    if (!items.length) return Promise.resolve({ ok: true });
    let result: Promise<{ ok: boolean }>;
    detectionQueue = detectionQueue.then(async () => {
      result = await api<{ ok: boolean }>(`/api/video-runs/${encodeURIComponent(id)}/detections`, {
        method: 'POST',
        body: JSON.stringify({ items }),
      });
      return result;
    }).catch(() => ({ ok: false }));
    return detectionQueue.then(() => result!);
  },
  statistics: () => api<{
    totals: { category: string; count: number }[];
    unique: { category: string; count: number }[];
    videos: number;
    processing?: number;
    cameras: number;
  }>('/api/statistics'),
};

export type PersistedVideoSummary = {
  id: string; filename: string; duration: number; status: string; progress: number; current_frame: number;
  total_detections: number; unique_person: number; unique_car: number; unique_bicycle: number; unique_camera: number;
  created_at: string; updated_at: string;
};

export const persistVideoCompletion = (
  id: string, _filename: string, _duration: number, stats: VideoAnalysisStats
) => persistenceService.updateVideoRun(id, {
  status: 'COMPLETED',
  progress: 100,
  currentFrame: 0,
  totalDetections: Object.values(stats.totalDetections).reduce((a, b) => a + b, 0),
  uniquePerson: stats.uniqueObjects.person,
  uniqueCar: stats.uniqueObjects.car,
  uniqueBicycle: stats.uniqueObjects.bicycle,
  uniqueCamera: stats.uniqueObjects.camera,
});
