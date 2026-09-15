import { detectionService, DetectionResult } from './detectionService';
import { CategoryType, VideoAnalysisStats, VideoQualityMetrics, TrackedVideoObject, VideoTimelineEvent } from '../types';

export interface VideoAnalysisSnapshot {
  frameNumber: number;
  timeSeconds: number;
  detections: DetectionResult[];
  currentCounts: Record<CategoryType, number>;
  uniqueCounts: Record<CategoryType, number>;
}

export interface VideoAnalysisCallbacks {
  onFrame?: (snapshot: VideoAnalysisSnapshot) => void;
  onProgress?: (progress: number, frameNumber: number, timeSeconds: number) => void;
  onError?: (error: Error) => void;
}

export interface VideoAnalysisRun {
  stop: () => void;
  pause: () => void;
  resume: () => void;
}

const EMPTY_COUNTS = (): Record<CategoryType, number> => ({ all: 0, person: 0, car: 0, bicycle: 0, camera: 0 });

/**
 * Real file-video analysis. Frames are read directly from an HTMLVideoElement;
 * the complete video is never decoded into a JavaScript array or loaded into RAM.
 */
export class VideoAnalysisService {
  private cancelled = false;
  private paused = false;

  public stop() { this.cancelled = true; }
  public pause() { this.paused = true; }
  public resume() { this.paused = false; }

  public async analyzeVideo(
    video: HTMLVideoElement,
    options: { confidenceThreshold?: number; sampleEveryFrames?: number; callbacks?: VideoAnalysisCallbacks } = {}
  ): Promise<VideoAnalysisRun> {
    this.cancelled = false;
    this.paused = false;
    const threshold = options.confidenceThreshold ?? 0.4;
    const sampleEvery = Math.max(1, Math.floor(options.sampleEveryFrames ?? 2));
    const callbacks = options.callbacks ?? {};

    try {
      await this.waitForMetadata(video);
      if (!Number.isFinite(video.duration) || video.duration <= 0 || video.videoWidth <= 0 || video.videoHeight <= 0) {
        throw new Error('The selected video has no usable duration or dimensions.');
      }

      detectionService.resetTracking();
      let frameNumber = 0;
      let lastAnalyzedTime = -1;
      const estimatedFrameRate = await this.estimateFrameRate(video);
      const frameStepSeconds = sampleEvery / estimatedFrameRate;

      while (!this.cancelled && video.currentTime < video.duration - 0.001) {
        while (this.paused && !this.cancelled) await this.sleep(50);
        if (this.cancelled) break;

        const time = video.currentTime;
        if (time <= lastAnalyzedTime + 0.0001) {
          await this.seekVideo(video, Math.min(video.duration, time + frameStepSeconds));
          continue;
        }

        const detections = await detectionService.detectFrame(video, frameNumber, threshold);
        const currentCounts = EMPTY_COUNTS();
        for (const d of detections) currentCounts[d.category] += 1;
        currentCounts.all = detections.length;
        const diagnostics = detectionService.getDiagnostics(video.videoWidth, video.videoHeight, estimatedFrameRate);
        const uniqueCounts: Record<CategoryType, number> = {
          all: diagnostics.uniqueTrackedCounts.person + diagnostics.uniqueTrackedCounts.car + diagnostics.uniqueTrackedCounts.bicycle + diagnostics.uniqueTrackedCounts.camera,
          person: diagnostics.uniqueTrackedCounts.person,
          car: diagnostics.uniqueTrackedCounts.car,
          bicycle: diagnostics.uniqueTrackedCounts.bicycle,
          camera: diagnostics.uniqueTrackedCounts.camera
        };

        callbacks.onFrame?.({ frameNumber, timeSeconds: time, detections, currentCounts, uniqueCounts });
        callbacks.onProgress?.(Math.min(100, (time / video.duration) * 100), frameNumber, time);
        lastAnalyzedTime = time;
        frameNumber += sampleEvery;

        if (time >= video.duration - 0.001) break;
        await this.seekVideo(video, Math.min(video.duration, time + frameStepSeconds));
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      callbacks.onError?.(err);
      throw err;
    }

    return { stop: () => this.stop(), pause: () => this.pause(), resume: () => this.resume() };
  }

  public buildStats(snapshots: VideoAnalysisSnapshot[], enhancedFramesCount = 0, enhancedCropsCount = 0): VideoAnalysisStats {
    const totalDetections = { person: 0, car: 0, bicycle: 0, camera: 0 };
    let uniqueObjects = { person: 0, car: 0, bicycle: 0, camera: 0 };
    const timelineDensity = snapshots.map(s => ({
      time: this.formatTime(s.timeSeconds),
      seconds: s.timeSeconds,
      people: s.currentCounts.person,
      cars: s.currentCounts.car,
      bicycles: s.currentCounts.bicycle,
      cameras: s.currentCounts.camera
    }));

    for (const snapshot of snapshots) {
      totalDetections.person += snapshot.currentCounts.person;
      totalDetections.car += snapshot.currentCounts.car;
      totalDetections.bicycle += snapshot.currentCounts.bicycle;
      totalDetections.camera += snapshot.currentCounts.camera;
      uniqueObjects = snapshot.uniqueCounts;
    }

    return { totalDetections, uniqueObjects, timelineDensity, enhancedFramesCount, enhancedCropsCount };
  }

  public buildTrackedObjects(snapshots: VideoAnalysisSnapshot[]): TrackedVideoObject[] {
    const objects = new Map<number, TrackedVideoObject>();
    for (const snapshot of snapshots) {
      for (const detection of snapshot.detections) {
        const existing = objects.get(detection.tracking_id);
        const id = `${detection.category.toUpperCase()} #${detection.tracking_id}`;
        if (!existing) {
          objects.set(detection.tracking_id, {
            id,
            trackId: detection.tracking_id,
            category: detection.category as 'person' | 'car' | 'bicycle' | 'camera',
            firstSeenTime: this.formatTime(snapshot.timeSeconds),
            firstSeenSeconds: snapshot.timeSeconds,
            lastSeenTime: this.formatTime(snapshot.timeSeconds),
            lastSeenSeconds: snapshot.timeSeconds,
            durationVisible: '00:00',
            detectionCount: 1,
            avgConfidence: detection.confidence,
            maxConfidence: detection.confidence,
            minConfidence: detection.confidence,
            movementDirection: 'Unknown',
            approxPath: 'Not calculated',
            currentBbox: [detection.x1, detection.y1, detection.x2, detection.y2]
          });
        } else {
          existing.lastSeenTime = this.formatTime(snapshot.timeSeconds);
          existing.lastSeenSeconds = snapshot.timeSeconds;
          existing.durationVisible = this.formatTime(Math.max(0, existing.lastSeenSeconds - existing.firstSeenSeconds));
          existing.detectionCount += 1;
          existing.avgConfidence = ((existing.avgConfidence * (existing.detectionCount - 1)) + detection.confidence) / existing.detectionCount;
          existing.maxConfidence = Math.max(existing.maxConfidence, detection.confidence);
          existing.minConfidence = Math.min(existing.minConfidence, detection.confidence);
          existing.currentBbox = [detection.x1, detection.y1, detection.x2, detection.y2];
        }
      }
    }
    return Array.from(objects.values());
  }

  public buildTimeline(snapshots: VideoAnalysisSnapshot[]): VideoTimelineEvent[] {
    const events: VideoTimelineEvent[] = [];
    const seen = new Set<number>();
    for (const snapshot of snapshots) {
      for (const detection of snapshot.detections) {
        const objectId = `${detection.category.toUpperCase()} #${detection.tracking_id}`;
        const type = seen.has(detection.tracking_id) ? 'detected' : 'entered';
        events.push({
          id: `${detection.tracking_id}-${snapshot.frameNumber}`,
          timestamp: this.formatTime(snapshot.timeSeconds),
          timestampSeconds: snapshot.timeSeconds,
          type,
          objectId,
          category: detection.category as 'person' | 'car' | 'bicycle' | 'camera',
          message: type === 'entered' ? `${objectId} detected` : `${objectId} detected again`
        });
        seen.add(detection.tracking_id);
      }
    }
    return events;
  }

  public async measureQuality(video: HTMLVideoElement): Promise<VideoQualityMetrics> {
    await this.waitForMetadata(video);
    const canvas = document.createElement('canvas');
    const width = Math.min(640, video.videoWidth);
    const height = Math.max(1, Math.round(video.videoHeight * (width / video.videoWidth)));
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Canvas 2D context is unavailable.');
    ctx.drawImage(video, 0, 0, width, height);
    const pixels = ctx.getImageData(0, 0, width, height).data;
    let sum = 0;
    let sumSquared = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      const luminance = 0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2];
      sum += luminance;
      sumSquared += luminance * luminance;
    }
    const n = pixels.length / 4;
    const brightness = n ? sum / n : 0;
    const variance = n ? Math.max(0, sumSquared / n - brightness * brightness) : 0;
    const contrast = variance >= 1600 ? 'High' : variance >= 500 ? 'Medium' : 'Low';
    const avgBrightness: VideoQualityMetrics['avgBrightness'] = brightness < 65 ? 'Low' : brightness > 195 ? 'High' : brightness >= 105 ? 'Optimal' : 'Medium';
    const exposure: VideoQualityMetrics['exposure'] = brightness < 55 ? 'Underexposed' : brightness > 215 ? 'Overexposed' : 'Normal';
    const score = Math.round(Math.max(0, Math.min(100, 45 + Math.min(25, variance / 80) + (exposure === 'Normal' ? 30 : 10))));
    return {
      overallScore: score,
      resolution: `${video.videoWidth} × ${video.videoHeight}`,
      fps: 0,
      avgBrightness,
      brightnessValue: Math.round(brightness),
      contrast,
      contrastRatio: Math.round(Math.sqrt(variance) * 100) / 100,
      blurScore: 0,
      blurLevel: 'Medium',
      noiseLevel: 'Medium',
      sharpness: 'Medium',
      exposure,
      dynamicRange: `${Math.round(Math.max(0, Math.min(255, brightness - 2 * Math.sqrt(variance))))}–${Math.round(Math.max(0, Math.min(255, brightness + 2 * Math.sqrt(variance))))}`
    };
  }

  private async estimateFrameRate(video: HTMLVideoElement): Promise<number> {
    const anyVideo = video as HTMLVideoElement & { getVideoPlaybackQuality?: () => { totalVideoFrames?: number } };
    const quality = anyVideo.getVideoPlaybackQuality?.();
    if (quality?.totalVideoFrames && video.currentTime > 0) return quality.totalVideoFrames / video.currentTime;
    // Native FPS is not exposed consistently by browsers. Use a conservative analysis cadence,
    // but never label it as the source video's FPS.
    return 30;
  }

  private waitForMetadata(video: HTMLVideoElement): Promise<void> {
    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const onLoaded = () => { cleanup(); resolve(); };
      const onError = () => { cleanup(); reject(new Error('Unable to load video metadata.')); };
      const cleanup = () => { video.removeEventListener('loadedmetadata', onLoaded); video.removeEventListener('error', onError); };
      video.addEventListener('loadedmetadata', onLoaded, { once: true });
      video.addEventListener('error', onError, { once: true });
    });
  }

  private seekVideo(video: HTMLVideoElement, time: number): Promise<void> {
    return new Promise(resolve => {
      const target = Math.max(0, Math.min(video.duration, time));
      if (Math.abs(video.currentTime - target) < 0.001) { resolve(); return; }
      const onSeeked = () => { video.removeEventListener('seeked', onSeeked); resolve(); };
      video.addEventListener('seeked', onSeeked, { once: true });
      video.currentTime = target;
    });
  }

  private sleep(ms: number) { return new Promise(resolve => setTimeout(resolve, ms)); }
  private formatTime(seconds: number) {
    const s = Math.max(0, Math.floor(seconds));
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }
}

export const videoAnalysisService = new VideoAnalysisService();
export default videoAnalysisService;
