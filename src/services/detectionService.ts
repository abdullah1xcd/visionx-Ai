import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import { CategoryType, DetectionQualityStatus } from '../types';

export interface DetectionResult {
  class_id: number; class_name: string; category: CategoryType; confidence: number;
  x1: number; y1: number; x2: number; y2: number; tracking_id: number;
  timestamp: string; frame_number: number;
}
export type AIEngineStatus = 'INITIALIZING' | 'ACTIVE' | 'DEGRADED' | 'ERROR' | 'NOT_READY';
export interface DiagnosticsData {
  modelName: string; modelStatus: AIEngineStatus; device: string; inputResolution: string;
  inferenceResolution: string; inferenceFps: number; cameraFps: number; lastInferenceMs: number;
  totalDetectionsCurrentFrame: number;
  currentCounts: { person: number; car: number; bicycle: number; camera: number };
  uniqueTrackedCounts: { person: number; car: number; bicycle: number; camera: number };
  trackingMethod: string; recentLogs: string[];
}
export interface EngineTestResult {
  modelLoaded: boolean; frameCaptured: boolean; inferenceSuccess: boolean; device: string;
  inferenceTimeMs: number; detectedCount: number;
  detections: { class_name: string; confidence: number; bbox: [number, number, number, number] }[];
  timestamp: string;
}
interface InternalTrack {
  id: number; category: CategoryType; class_name: string; bbox: [number, number, number, number];
  confidence: number; lastSeenFrame: number; hits: number;
}
class RealDetectionService {
  private model: cocoSsd.ObjectDetection | null = null;
  private isModelLoading = false;
  private engineStatus: AIEngineStatus = 'INITIALIZING';
  private statusMessage = 'Initializing AI Engine...';
  private deviceName = 'Detecting...';
  private nextTrackId = 1;
  private activeTracks: InternalTrack[] = [];
  private uniqueSeenTrackIds = new Set<number>();
  private uniqueCategoryTrackIds = { person: new Set<number>(), car: new Set<number>(), bicycle: new Set<number>(), camera: new Set<number>() };
  private lastInferenceTimeMs = 0;
  private inferenceFrameTimes: number[] = [];
  private diagnosticLogs: string[] = [];
  private maxLogs = 30;
  private isInferenceRunning = false;

  constructor() { this.initModel(); }
  public async initModel(): Promise<boolean> {
    if (this.model) return true;
    if (this.isModelLoading) return false;
    this.isModelLoading = true; this.engineStatus = 'INITIALIZING'; this.statusMessage = 'Loading Real Neural Network...';
    this.addLog('Initializing TensorFlow.js neural inference backend...');
    try {
      await tf.ready(); const backend = tf.getBackend();
      this.deviceName = backend === 'webgl' ? 'WebGL (GPU Acceleration)' : backend === 'wasm' ? 'WASM (CPU)' : `${backend.toUpperCase()} (CPU)`;
      this.addLog(`TFJS Backend initialized: ${this.deviceName}`); this.addLog('Loading COCO-SSD MobileNetV2 weights...');
      this.model = await cocoSsd.load({ base: 'mobilenet_v2' });
      this.engineStatus = 'ACTIVE'; this.statusMessage = 'AI Engine Active (Real Inference)';
      this.addLog('Neural network successfully loaded and primed for real-time inference.'); this.isModelLoading = false; return true;
    } catch (err: any) {
      console.error('Error loading detection model:', err); this.engineStatus = 'ERROR';
      this.statusMessage = `Model Load Error: ${err?.message || 'Failed'}`;
      this.addLog(`FATAL: Failed to load detection model: ${err?.message || 'unknown error'}`); this.isModelLoading = false; return false;
    }
  }
  public getStatus() { return { status: this.engineStatus, message: this.statusMessage, device: this.deviceName }; }
  public isReady() { return this.model !== null && this.engineStatus === 'ACTIVE'; }
  public mapCategory(cocoClass: string): CategoryType | null {
    const cls = cocoClass.toLowerCase().trim();
    if (cls === 'person') return 'person';
    if (cls === 'car' || cls === 'truck' || cls === 'bus') return 'car';
    if (cls === 'bicycle') return 'bicycle';
    return null;
  }
  public async detectFrame(imageSource: HTMLVideoElement | HTMLCanvasElement, frameNumber: number, confidenceThreshold = 0.4): Promise<DetectionResult[]> {
    if (!this.model || this.engineStatus !== 'ACTIVE' || this.isInferenceRunning) return [];
    this.isInferenceRunning = true; const t0 = performance.now();
    try {
      const rawPredictions = await this.model.detect(imageSource); this.lastInferenceTimeMs = Math.round(performance.now() - t0);
      const now = performance.now(); this.inferenceFrameTimes.push(now); if (this.inferenceFrameTimes.length > 30) this.inferenceFrameTimes.shift();
      const sourceWidth = imageSource instanceof HTMLVideoElement ? imageSource.videoWidth : imageSource.width;
      const sourceHeight = imageSource instanceof HTMLVideoElement ? imageSource.videoHeight : imageSource.height;
      const validDetections: { category: CategoryType; class_name: string; confidence: number; bbox: [number, number, number, number] }[] = [];
      for (const pred of rawPredictions) {
        const score = typeof pred.score === 'number' ? pred.score : 0; const category = this.mapCategory(pred.class);
        if (score < confidenceThreshold || score > 1 || !Number.isFinite(score) || !category) continue;
        const [rawX, rawY, rawW, rawH] = pred.bbox; if (rawW <= 0 || rawH <= 0) continue;
        const x1 = Math.max(0, Math.min(sourceWidth, rawX)); const y1 = Math.max(0, Math.min(sourceHeight, rawY));
        const x2 = Math.max(0, Math.min(sourceWidth, rawX + rawW)); const y2 = Math.max(0, Math.min(sourceHeight, rawY + rawH));
        if (x2 <= x1 || y2 <= y1) continue;
        validDetections.push({ category, class_name: pred.class, confidence: score, bbox: [x1, y1, x2, y2] });
      }
      const trackedResults = this.updateSpatialTracker(validDetections, frameNumber);
      if (frameNumber % 30 === 0) this.addLog(`Frame #${frameNumber} | Inf: ${this.lastInferenceTimeMs}ms | Detections: ${trackedResults.length}`);
      this.isInferenceRunning = false; return trackedResults;
    } catch (err) { console.error('Inference error:', err); this.isInferenceRunning = false; return []; }
  }
  private updateSpatialTracker(detections: { category: CategoryType; class_name: string; confidence: number; bbox: [number, number, number, number] }[], frameNumber: number): DetectionResult[] {
    const timestamp = new Date().toLocaleTimeString('en-GB'); const matched = new Set<number>(); const results: DetectionResult[] = [];
    for (const det of detections) {
      let bestIou = 0.3; let bestTrackIdx = -1;
      for (let i = 0; i < this.activeTracks.length; i++) {
        if (matched.has(i) || this.activeTracks[i].category !== det.category) continue;
        const iou = this.calculateIoU(det.bbox, this.activeTracks[i].bbox); if (iou > bestIou) { bestIou = iou; bestTrackIdx = i; }
      }
      let trackingId: number;
      if (bestTrackIdx >= 0) { matched.add(bestTrackIdx); const track = this.activeTracks[bestTrackIdx]; track.bbox = det.bbox; track.confidence = det.confidence; track.lastSeenFrame = frameNumber; track.hits += 1; trackingId = track.id; }
      else {
        trackingId = this.nextTrackId++; this.activeTracks.push({ id: trackingId, category: det.category, class_name: det.class_name, bbox: det.bbox, confidence: det.confidence, lastSeenFrame: frameNumber, hits: 1 });
        this.uniqueSeenTrackIds.add(trackingId); this.uniqueCategoryTrackIds[det.category].add(trackingId);
      }
      results.push({ class_id: trackingId, class_name: det.class_name, category: det.category, confidence: det.confidence, x1: det.bbox[0], y1: det.bbox[1], x2: det.bbox[2], y2: det.bbox[3], tracking_id: trackingId, timestamp, frame_number: frameNumber });
    }
    this.activeTracks = this.activeTracks.filter(t => frameNumber - t.lastSeenFrame < 20); return results;
  }
  private calculateIoU(b1: [number, number, number, number], b2: [number, number, number, number]) {
    const xLeft = Math.max(b1[0], b2[0]), yTop = Math.max(b1[1], b2[1]), xRight = Math.min(b1[2], b2[2]), yBottom = Math.min(b1[3], b2[3]);
    if (xRight <= xLeft || yBottom <= yTop) return 0; const intersection = (xRight - xLeft) * (yBottom - yTop);
    const a1 = (b1[2] - b1[0]) * (b1[3] - b1[1]), a2 = (b2[2] - b2[0]) * (b2[3] - b2[1]); const union = a1 + a2 - intersection; return union > 0 ? intersection / union : 0;
  }
  public async testAiEngine(imageSource: HTMLVideoElement | HTMLCanvasElement): Promise<EngineTestResult> {
    const timestamp = new Date().toLocaleTimeString('en-GB');
    if (!this.model && !(await this.initModel())) return { modelLoaded: false, frameCaptured: false, inferenceSuccess: false, device: this.deviceName, inferenceTimeMs: 0, detectedCount: 0, detections: [], timestamp };
    const t0 = performance.now();
    try { const predictions = await this.model!.detect(imageSource); const elapsed = Math.round(performance.now() - t0);
      const realDetections = predictions.filter(p => p.score >= 0.35 && this.mapCategory(p.class) !== null).map(p => ({ class_name: p.class, confidence: p.score, bbox: p.bbox as [number, number, number, number] }));
      return { modelLoaded: true, frameCaptured: true, inferenceSuccess: true, device: this.deviceName, inferenceTimeMs: elapsed, detectedCount: realDetections.length, detections: realDetections, timestamp };
    } catch { return { modelLoaded: true, frameCaptured: true, inferenceSuccess: false, device: this.deviceName, inferenceTimeMs: 0, detectedCount: 0, detections: [], timestamp }; }
  }
  public getDiagnostics(inputWidth = 0, inputHeight = 0, cameraFps = 0): DiagnosticsData {
    const counts = { person: 0, car: 0, bicycle: 0, camera: 0 }; for (const t of this.activeTracks) counts[t.category]++;
    const inferenceFps = this.inferenceFrameTimes.length >= 2 ? Math.round(1000 * (this.inferenceFrameTimes.length - 1) / (this.inferenceFrameTimes[this.inferenceFrameTimes.length - 1] - this.inferenceFrameTimes[0])) : 0;
    return { modelName: 'COCO-SSD MobileNetV2', modelStatus: this.engineStatus, device: this.deviceName, inputResolution: `${inputWidth}x${inputHeight}`, inferenceResolution: `${inputWidth}x${inputHeight}`, inferenceFps, cameraFps: Number.isFinite(cameraFps) ? cameraFps : 0, lastInferenceMs: this.lastInferenceTimeMs, totalDetectionsCurrentFrame: this.activeTracks.length, currentCounts: counts, uniqueTrackedCounts: { person: this.uniqueCategoryTrackIds.person.size, car: this.uniqueCategoryTrackIds.car.size, bicycle: this.uniqueCategoryTrackIds.bicycle.size, camera: this.uniqueCategoryTrackIds.camera.size }, trackingMethod: 'IoU spatial tracking', recentLogs: [...this.diagnosticLogs] };
  }
  public resetTracking() { this.nextTrackId = 1; this.activeTracks = []; this.uniqueSeenTrackIds.clear(); Object.values(this.uniqueCategoryTrackIds).forEach(s => s.clear()); }
  public getQualityStatus(): DetectionQualityStatus { return this.engineStatus === 'ACTIVE' ? 'Good' : 'Poor Visibility'; }
  private addLog(message: string) { this.diagnosticLogs.push(`[${new Date().toLocaleTimeString('en-GB')}] ${message}`); if (this.diagnosticLogs.length > this.maxLogs) this.diagnosticLogs.shift(); }
}
export const detectionService = new RealDetectionService();
export default detectionService;
