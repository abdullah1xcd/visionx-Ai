import React, { useState, useEffect, useRef } from 'react';
import {
  PlaySquare,
  Upload,
  Play,
  Pause,
  Square,
  RotateCcw,
  Sparkles,
  Camera,
  Film,
  FileText,
  Search,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  Maximize2,
  Clock,
  Layers,
  BarChart2,
  ShieldCheck,
  Eye,
  History,
  FolderOpen,
  Cpu,
  TrendingUp,
  Download,
  Users,
  Car,
  Bike
} from 'lucide-react';
import {
  VideoFileItem,
  VideoQualityMetrics,
  TrackedVideoObject,
  VideoTimelineEvent,
  VideoAnalysisStats,
  AppSettingsState,
  CategoryType
} from '../types';
import {
  SAMPLE_VIDEOS,
  INITIAL_QUALITY_METRICS,
  INITIAL_TRACKED_OBJECTS,
  INITIAL_TIMELINE_EVENTS,
  INITIAL_VIDEO_STATS
} from '../data/videoAnalysisData';
import { VideoReportModal } from './video/VideoReportModal';
import { ObjectEnhanceModal } from './video/ObjectEnhanceModal';
import { VideoExportModal } from './video/VideoExportModal';

interface VideoAnalysisViewProps {
  settings: AppSettingsState;
  onAddAlert: (
    msg: string,
    type: 'SPEED_WARNING' | 'CAMERA_STATUS' | 'OCR_LOW_CONFIDENCE' | 'QUALITY_ALERT',
    severity: 'WARNING' | 'INFO' | 'CRITICAL'
  ) => void;
}

type BottomTab = 'objects' | 'statistics' | 'timeline' | 'quality' | 'enhancement' | 'history';

export const VideoAnalysisView: React.FC<VideoAnalysisViewProps> = ({
  settings,
  onAddAlert
}) => {
  // Video selection state
  const [selectedVideo, setSelectedVideo] = useState<VideoFileItem>(SAMPLE_VIDEOS[0]);
  const [historyVideos, setHistoryVideos] = useState<VideoFileItem[]>(SAMPLE_VIDEOS);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Playback & Analysis Engine State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [currentTime, setCurrentTime] = useState(14); // seconds
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [analysisProgress, setAnalysisProgress] = useState<number>(45); // percentage
  const [currentFrameNumber, setCurrentFrameNumber] = useState<number>(2430);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<CategoryType>('all');
  const [activeBottomTab, setActiveBottomTab] = useState<BottomTab>('objects');

  // Interactive object search
  const [objectSearchQuery, setObjectSearchQuery] = useState('');
  const [selectedObjectForModal, setSelectedObjectForModal] = useState<TrackedVideoObject | null>(null);

  // Modals state
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [captureMessage, setCaptureMessage] = useState<string | null>(null);

  // Canvas ref for video playback & AI bounding box overlays
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Real-time analysis simulation ticker
  useEffect(() => {
    let interval: any = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= selectedVideo.duration) {
            setIsPlaying(false);
            return selectedVideo.duration;
          }
          const nextTime = Math.min(selectedVideo.duration, prev + 1 * playbackSpeed);
          setCurrentFrameNumber(Math.floor((nextTime / selectedVideo.duration) * selectedVideo.frameCount));
          setAnalysisProgress(Math.floor((nextTime / selectedVideo.duration) * 100));
          return nextTime;
        });
      }, 1000 / playbackSpeed);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, playbackSpeed, selectedVideo]);

  // Video canvas rendering loop with AI overlays
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;

      // 1. Draw modern dark video background simulator
      ctx.fillStyle = '#0a0d12';
      ctx.fillRect(0, 0, w, h);

      // Perspective street grid / road geometry
      ctx.strokeStyle = '#18202b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      // Horizon line
      ctx.moveTo(0, h * 0.38);
      ctx.lineTo(w, h * 0.38);
      // Vanishing point lanes
      ctx.moveTo(w * 0.5, h * 0.38);
      ctx.lineTo(w * 0.1, h);
      ctx.moveTo(w * 0.5, h * 0.38);
      ctx.lineTo(w * 0.9, h);
      ctx.moveTo(w * 0.5, h * 0.38);
      ctx.lineTo(w * 0.4, h);
      ctx.moveTo(w * 0.5, h * 0.38);
      ctx.lineTo(w * 0.65, h);
      ctx.stroke();

      // Subtle atmospheric grid dots
      ctx.fillStyle = '#1c2633';
      for (let x = 30; x < w; x += 60) {
        for (let y = 30; y < h; y += 60) {
          ctx.fillRect(x, y, 1.5, 1.5);
        }
      }

      // Draw sidewalk curb
      ctx.fillStyle = '#111720';
      ctx.fillRect(0, h * 0.65, w * 0.32, h * 0.35);
      ctx.strokeStyle = '#252C35';
      ctx.strokeRect(0, h * 0.65, w * 0.32, h * 0.35);

      // Compute temporal sinusoidal offsets based on currentTime
      const t = currentTime;

      // 2. Render Tracked Objects & Overlays
      INITIAL_TRACKED_OBJECTS.forEach((obj) => {
        // Category filtering (Filters only affect visualization)
        if (activeCategoryFilter !== 'all' && obj.category !== activeCategoryFilter) {
          return;
        }

        // Check if object is active in this timestamp range
        if (t < obj.firstSeenSeconds || t > obj.lastSeenSeconds) {
          return;
        }

        let boxX = 0;
        let boxY = 0;
        let boxW = 0;
        let boxH = 0;
        let strokeColor = '#D4AF37';

        if (obj.category === 'person') {
          strokeColor = '#10B981'; // Emerald for Person
          const progress = (t - obj.firstSeenSeconds) / Math.max(1, obj.lastSeenSeconds - obj.firstSeenSeconds);
          boxX = w * (0.12 + progress * 0.16);
          boxY = h * (0.52 - progress * 0.04);
          boxW = 55;
          boxH = 130;
        } else if (obj.category === 'car') {
          strokeColor = '#38BDF8'; // Sky blue for Car
          const progress = (t - obj.firstSeenSeconds) / Math.max(1, obj.lastSeenSeconds - obj.firstSeenSeconds);
          boxX = w * (0.75 - progress * 0.35);
          boxY = h * (0.42 + progress * 0.3);
          boxW = 140 + progress * 40;
          boxH = 80 + progress * 25;
        } else if (obj.category === 'bicycle') {
          strokeColor = '#A855F7'; // Purple for Bicycle
          const progress = (t - obj.firstSeenSeconds) / Math.max(1, obj.lastSeenSeconds - obj.firstSeenSeconds);
          boxX = w * (0.85 - progress * 0.12);
          boxY = h * (0.62 + progress * 0.1);
          boxW = 75;
          boxH = 95;
        } else if (obj.category === 'camera') {
          strokeColor = '#D4AF37'; // Gold for Camera
          boxX = w * 0.88;
          boxY = h * 0.12;
          boxW = 48;
          boxH = 48;
        }

        // Draw bounding box (clean 1.5px border)
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(boxX, boxY, boxW, boxH);

        // Subtle corner accents
        const cornerLen = 8;
        ctx.lineWidth = 2.5;
        // Top-left
        ctx.beginPath();
        ctx.moveTo(boxX, boxY + cornerLen);
        ctx.lineTo(boxX, boxY);
        ctx.lineTo(boxX + cornerLen, boxY);
        ctx.stroke();

        // Label banner with background
        const labelText = `${obj.id} ${Math.round(obj.avgConfidence * 100)}%`;
        ctx.font = 'bold 10px monospace';
        const textMetrics = ctx.measureText(labelText);
        const labelWidth = textMetrics.width + 10;
        const labelHeight = 18;

        ctx.fillStyle = 'rgba(8, 10, 13, 0.88)';
        ctx.fillRect(boxX, boxY - labelHeight, labelWidth, labelHeight);
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(boxX, boxY - labelHeight, labelWidth, labelHeight);

        ctx.fillStyle = strokeColor;
        ctx.fillText(labelText, boxX + 5, boxY - 5);
      });

      // 3. Telemetry Overlay Watermark (Top Left)
      ctx.fillStyle = 'rgba(8, 10, 13, 0.85)';
      ctx.fillRect(16, 16, 320, 48);
      ctx.strokeStyle = '#252C35';
      ctx.lineWidth = 1;
      ctx.strokeRect(16, 16, 320, 48);

      ctx.fillStyle = '#D4AF37';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(`VIDEO ANALYSIS • ${selectedVideo.filename.toUpperCase()}`, 26, 33);
      ctx.fillStyle = '#9AA4AF';
      ctx.font = '10px monospace';
      ctx.fillText(
        `${selectedVideo.resolution} @ ${selectedVideo.fps} FPS | ${settings.computeDevice} ACCEL | FRAME: ${currentFrameNumber.toLocaleString()}`,
        26,
        50
      );

      // Frame Rate / Quality Stamp (Top Right)
      ctx.fillStyle = 'rgba(8, 10, 13, 0.85)';
      ctx.fillRect(w - 180, 16, 164, 48);
      ctx.strokeStyle = '#252C35';
      ctx.strokeRect(w - 180, 16, 164, 48);

      ctx.fillStyle = '#10B981';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(`ANALYSIS: 28.4 FPS`, w - 170, 33);
      ctx.fillStyle = '#9AA4AF';
      ctx.font = '10px monospace';
      ctx.fillText(`QUALITY SCORE: ${INITIAL_QUALITY_METRICS.overallScore}/100`, w - 170, 50);

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [currentTime, activeCategoryFilter, selectedVideo, settings.computeDevice, currentFrameNumber]);

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
  };

  // Playback control actions
  const handleTogglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleStop = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    setCurrentFrameNumber(0);
    setAnalysisProgress(0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetSec = parseFloat(e.target.value);
    setCurrentTime(targetSec);
    setCurrentFrameNumber(Math.floor((targetSec / selectedVideo.duration) * selectedVideo.frameCount));
    setAnalysisProgress(Math.floor((targetSec / selectedVideo.duration) * 100));
  };

  // Capture frame action (Section 15)
  const handleCaptureFrame = () => {
    setCaptureMessage(`Frame #${currentFrameNumber.toLocaleString()} captured to data/videos/captures/`);
    setTimeout(() => setCaptureMessage(null), 3500);
    onAddAlert(`Video frame #${currentFrameNumber} captured and saved.`, 'CAMERA_STATUS', 'INFO');
  };

  // Switch video
  const handleSelectVideo = (vid: VideoFileItem) => {
    setSelectedVideo(vid);
    setCurrentTime(0);
    setCurrentFrameNumber(0);
    setAnalysisProgress(vid.status === 'COMPLETED' ? 100 : 0);
    setIsPlaying(false);
    setIsAddModalOpen(false);
  };

  // Filter objects for tab 1
  const filteredObjects = INITIAL_TRACKED_OBJECTS.filter((obj) => {
    const matchesSearch =
      obj.id.toLowerCase().includes(objectSearchQuery.toLowerCase()) ||
      obj.category.toLowerCase().includes(objectSearchQuery.toLowerCase()) ||
      obj.movementDirection.toLowerCase().includes(objectSearchQuery.toLowerCase());
    const matchesCat = activeCategoryFilter === 'all' || obj.category === activeCategoryFilter;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#080A0D] text-[#F4F6F8]">
      {/* 1. Header Toolbar */}
      <div className="px-6 py-3 bg-[#0D1117] border-b border-[#252C35] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#161C24] border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
            <PlaySquare className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black tracking-wider text-white uppercase">
                VIDEO ANALYSIS & AI ENHANCEMENT
              </h2>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30">
                LOCAL / FILE MODE
              </span>
            </div>
            <p className="text-[11px] text-[#9AA4AF]">
              Batch & real-time forensic video stream ingestion, ByteTrack multi-object tracking, and frame enhancement
            </p>
          </div>
        </div>

        {/* Video Actions Toolbar */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D4AF37] hover:bg-[#E5C158] text-[#080A0D] font-bold text-xs tracking-wider uppercase transition-all shadow-sm cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>+ Add Video</span>
          </button>

          <button
            onClick={() => setIsReportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#161C24] hover:bg-[#1C232B] text-slate-200 border border-[#252C35] hover:border-[#D4AF37] text-xs font-semibold transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Report</span>
          </button>

          <button
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#161C24] hover:bg-[#1C232B] text-slate-200 border border-[#252C35] hover:border-[#D4AF37] text-xs font-semibold transition-colors cursor-pointer"
          >
            <Film className="w-3.5 h-3.5 text-sky-400" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Capture Feedback Notification Toast */}
      {captureMessage && (
        <div className="bg-[#161C24] border-b border-[#D4AF37] px-6 py-2 text-xs font-mono text-[#D4AF37] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4" />
            <span>{captureMessage}</span>
          </div>
          <span className="text-[10px] text-[#9AA4AF]">NON-DESTRUCTIVE SAVE</span>
        </div>
      )}

      {/* 2. Main Content Split View (Player + Metadata Panel) */}
      <div className="flex-1 flex overflow-hidden p-4 gap-4">
        {/* Left Column: Player & Analysis Telemetry HUD */}
        <div className="flex-[3] flex flex-col bg-[#11161D] border border-[#252C35] rounded-xl overflow-hidden shadow-xl">
          {/* Real-time Analysis Telemetry Banner (Section 5) */}
          <div className="px-4 py-2 bg-[#0D1117] border-b border-[#252C35] flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="text-[#68727D]">Processing:</span>
                <span className="font-bold text-[#D4AF37]">{analysisProgress}%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[#68727D]">Current Frame:</span>
                <span className="text-white font-bold">
                  {currentFrameNumber.toLocaleString()} / {selectedVideo.frameCount.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[#68727D]">Analysis FPS:</span>
                <span className="text-emerald-400 font-bold">28.4 FPS</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[#68727D]">AI Engine:</span>
                <span className="text-sky-400 font-bold">{settings.computeDevice}</span>
              </div>
            </div>

            {/* Currently Visible Object Counts */}
            <div className="flex items-center gap-3 text-[11px]">
              <span className="text-[#68727D]">Visible:</span>
              <span className="text-emerald-400 font-bold">People: 2</span>
              <span className="text-sky-400 font-bold">Cars: 1</span>
              <span className="text-purple-400 font-bold">Bicycles: 1</span>
              <span className="text-[#D4AF37] font-bold">Cameras: 1</span>
            </div>
          </div>

          {/* Canvas Video Viewport */}
          <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
            <canvas
              ref={canvasRef}
              width={960}
              height={540}
              className="w-full h-full object-contain"
            />
          </div>

          {/* Player Controls Strip (Section 4) */}
          <div className="p-3 bg-[#0D1117] border-t border-[#252C35] space-y-2">
            {/* Scrubber Timeline Bar */}
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-mono text-[#D4AF37] w-12 text-right">
                {formatTime(currentTime)}
              </span>
              <input
                type="range"
                min="0"
                max={selectedVideo.duration}
                step="0.5"
                value={currentTime}
                onChange={handleSeek}
                className="flex-1 h-1.5 bg-[#252C35] rounded-lg appearance-none cursor-pointer accent-[#D4AF37]"
              />
              <span className="text-[11px] font-mono text-[#9AA4AF] w-12">
                {selectedVideo.durationFormatted}
              </span>
            </div>

            {/* Transport & Control Buttons */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                {/* Play / Pause */}
                <button
                  onClick={handleTogglePlay}
                  className="w-8 h-8 rounded-lg bg-[#D4AF37] hover:bg-[#E5C158] text-[#080A0D] flex items-center justify-center font-bold cursor-pointer transition-transform active:scale-95 shadow-sm"
                  title={isPlaying ? 'Pause Video' : 'Play Video'}
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                </button>

                {/* Stop */}
                <button
                  onClick={handleStop}
                  className="w-8 h-8 rounded-lg bg-[#161C24] hover:bg-[#1C232B] text-slate-200 border border-[#252C35] flex items-center justify-center cursor-pointer"
                  title="Stop & Reset"
                >
                  <Square className="w-3.5 h-3.5" />
                </button>

                {/* Frame Capture */}
                <button
                  onClick={handleCaptureFrame}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#161C24] hover:bg-[#1C232B] text-slate-200 border border-[#252C35] text-xs font-semibold cursor-pointer"
                  title="Capture & Save Current Frame"
                >
                  <Camera className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Capture Frame</span>
                </button>
              </div>

              {/* Playback Speed Selector (0.25x to 2x) */}
              <div className="flex items-center gap-1 bg-[#11161D] p-1 rounded-lg border border-[#252C35]">
                <span className="text-[10px] text-[#68727D] font-mono px-1.5">SPEED:</span>
                {[0.25, 0.5, 1.0, 1.5, 2.0].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => setPlaybackSpeed(rate)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-colors cursor-pointer ${
                      playbackSpeed === rate
                        ? 'bg-[#D4AF37] text-[#080A0D]'
                        : 'text-[#9AA4AF] hover:text-white'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Video Information & Detection Summary (Section 26 Layout) */}
        <div className="flex-1 min-w-[320px] max-w-sm flex flex-col gap-3 overflow-y-auto">
          {/* Panel 1: Video Information */}
          <div className="p-4 rounded-xl bg-[#11161D] border border-[#252C35] space-y-3">
            <div className="flex items-center justify-between border-b border-[#252C35] pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#D4AF37]">
                Video Information
              </span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800">
                {selectedVideo.status}
              </span>
            </div>

            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-[#68727D]">Filename:</span>
                <span className="text-white font-bold truncate max-w-[170px]" title={selectedVideo.filename}>
                  {selectedVideo.filename}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#68727D]">Duration:</span>
                <span className="text-white">{selectedVideo.durationFormatted} ({selectedVideo.duration}s)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#68727D]">Resolution:</span>
                <span className="text-white">{selectedVideo.resolution}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#68727D]">Native FPS:</span>
                <span className="text-white">{selectedVideo.fps} FPS</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#68727D]">Video Quality:</span>
                <span className="text-emerald-400 font-bold">{INITIAL_QUALITY_METRICS.overallScore} / 100</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#68727D]">File Size:</span>
                <span className="text-white">{selectedVideo.fileSize}</span>
              </div>
            </div>
          </div>

          {/* Panel 2: Detection Summary (Total Detections vs Unique Objects) */}
          <div className="p-4 rounded-xl bg-[#11161D] border border-[#252C35] space-y-3">
            <div className="flex items-center justify-between border-b border-[#252C35] pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#D4AF37]">
                Detection Summary
              </span>
              <span className="text-[10px] text-[#68727D] font-mono">ByteTrack Filtered</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              {/* People */}
              <div className="p-2.5 rounded-lg bg-[#080A0D] border border-[#252C35]">
                <div className="flex items-center gap-1.5 text-[#9AA4AF] text-[10px] uppercase font-bold">
                  <Users className="w-3 h-3 text-emerald-400" />
                  <span>People</span>
                </div>
                <div className="text-base font-bold text-white mt-1">
                  {INITIAL_VIDEO_STATS.uniqueObjects.person}{' '}
                  <span className="text-[10px] text-[#68727D] font-normal">unique</span>
                </div>
                <div className="text-[10px] text-emerald-400 mt-0.5">
                  {INITIAL_VIDEO_STATS.totalDetections.person.toLocaleString()} dets
                </div>
              </div>

              {/* Cars */}
              <div className="p-2.5 rounded-lg bg-[#080A0D] border border-[#252C35]">
                <div className="flex items-center gap-1.5 text-[#9AA4AF] text-[10px] uppercase font-bold">
                  <Car className="w-3 h-3 text-sky-400" />
                  <span>Cars</span>
                </div>
                <div className="text-base font-bold text-white mt-1">
                  {INITIAL_VIDEO_STATS.uniqueObjects.car}{' '}
                  <span className="text-[10px] text-[#68727D] font-normal">unique</span>
                </div>
                <div className="text-[10px] text-sky-400 mt-0.5">
                  {INITIAL_VIDEO_STATS.totalDetections.car.toLocaleString()} dets
                </div>
              </div>

              {/* Bicycles */}
              <div className="p-2.5 rounded-lg bg-[#080A0D] border border-[#252C35]">
                <div className="flex items-center gap-1.5 text-[#9AA4AF] text-[10px] uppercase font-bold">
                  <Bike className="w-3 h-3 text-purple-400" />
                  <span>Bicycles</span>
                </div>
                <div className="text-base font-bold text-white mt-1">
                  {INITIAL_VIDEO_STATS.uniqueObjects.bicycle}{' '}
                  <span className="text-[10px] text-[#68727D] font-normal">unique</span>
                </div>
                <div className="text-[10px] text-purple-400 mt-0.5">
                  {INITIAL_VIDEO_STATS.totalDetections.bicycle.toLocaleString()} dets
                </div>
              </div>

              {/* Cameras */}
              <div className="p-2.5 rounded-lg bg-[#080A0D] border border-[#252C35]">
                <div className="flex items-center gap-1.5 text-[#9AA4AF] text-[10px] uppercase font-bold">
                  <Camera className="w-3 h-3 text-[#D4AF37]" />
                  <span>Cameras</span>
                </div>
                <div className="text-base font-bold text-white mt-1">
                  {INITIAL_VIDEO_STATS.uniqueObjects.camera}{' '}
                  <span className="text-[10px] text-[#68727D] font-normal">unique</span>
                </div>
                <div className="text-[10px] text-[#D4AF37] mt-0.5">
                  {INITIAL_VIDEO_STATS.totalDetections.camera.toLocaleString()} dets
                </div>
              </div>
            </div>
          </div>

          {/* Panel 3: Visualization Filter Controls (Section 17) */}
          <div className="p-4 rounded-xl bg-[#11161D] border border-[#252C35] space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#9AA4AF] block">
              Viewport Display Filters
            </span>
            <div className="grid grid-cols-3 gap-1 bg-[#080A0D] p-1 rounded-lg border border-[#252C35] text-[10px] font-bold">
              {(
                [
                  { id: 'all', label: 'ALL' },
                  { id: 'person', label: 'PEOPLE' },
                  { id: 'car', label: 'CARS' },
                  { id: 'bicycle', label: 'BIKES' },
                  { id: 'camera', label: 'CAMERAS' }
                ] as { id: CategoryType; label: string }[]
              ).map((f) => (
                <button
                  key={f.id}
                  onClick={() => setActiveCategoryFilter(f.id)}
                  className={`py-1 rounded text-center transition-colors cursor-pointer ${
                    activeCategoryFilter === f.id
                      ? 'bg-[#161C24] text-[#D4AF37] border border-[#D4AF37]/40 shadow-sm'
                      : 'text-[#9AA4AF] hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bottom Multi-Tab Analytics Section (Section 26) */}
      <div className="h-64 bg-[#0D1117] border-t border-[#252C35] flex flex-col shrink-0">
        {/* Tabs Bar */}
        <div className="px-6 flex items-center gap-1 border-b border-[#252C35] bg-[#11161D]/70 text-xs font-bold">
          {(
            [
              { id: 'objects', label: 'TRACKED OBJECTS', count: filteredObjects.length },
              { id: 'statistics', label: 'VIDEO STATISTICS' },
              { id: 'timeline', label: 'TIMELINE EVENTS', count: INITIAL_TIMELINE_EVENTS.length },
              { id: 'quality', label: 'QUALITY ANALYSIS', badge: `${INITIAL_QUALITY_METRICS.overallScore}/100` },
              { id: 'enhancement', label: 'FRAME ENHANCEMENT', badge: 'CLAHE' },
              { id: 'history', label: 'ANALYSIS HISTORY', count: historyVideos.length }
            ] as { id: BottomTab; label: string; count?: number; badge?: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveBottomTab(tab.id)}
              className={`px-4 py-2.5 border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                activeBottomTab === tab.id
                  ? 'border-[#D4AF37] text-[#D4AF37] bg-[#161C24]'
                  : 'border-transparent text-[#9AA4AF] hover:text-white'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#252C35] text-slate-300">
                  {tab.count}
                </span>
              )}
              {tab.badge && (
                <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-800">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Contents Container */}
        <div className="flex-1 p-4 overflow-y-auto bg-[#080A0D]">
          {/* TAB 1: TRACKED OBJECTS */}
          {activeBottomTab === 'objects' && (
            <div className="space-y-3">
              {/* Search Bar */}
              <div className="flex items-center justify-between">
                <div className="relative w-72">
                  <Search className="w-3.5 h-3.5 text-[#68727D] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search objects e.g. PERSON #12..."
                    value={objectSearchQuery}
                    onChange={(e) => setObjectSearchQuery(e.target.value)}
                    className="w-full bg-[#11161D] border border-[#252C35] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#68727D]"
                  />
                </div>
                <span className="text-xs text-[#9AA4AF]">
                  Showing {filteredObjects.length} identified entities with spatial persistence
                </span>
              </div>

              {/* Objects Table */}
              <div className="rounded-lg border border-[#252C35] overflow-hidden bg-[#11161D]">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="bg-[#0D1117] text-[#9AA4AF] border-b border-[#252C35]">
                      <th className="py-2 px-3">Object ID</th>
                      <th className="py-2 px-3">Category</th>
                      <th className="py-2 px-3">First Seen</th>
                      <th className="py-2 px-3">Last Seen</th>
                      <th className="py-2 px-3">Duration</th>
                      <th className="py-2 px-3">Detections</th>
                      <th className="py-2 px-3">Avg Conf</th>
                      <th className="py-2 px-3">Movement Path</th>
                      <th className="py-2 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#252C35]/60">
                    {filteredObjects.map((obj) => (
                      <tr key={obj.id} className="hover:bg-[#161C24] transition-colors">
                        <td className="py-2 px-3 font-bold text-white">{obj.id}</td>
                        <td className="py-2 px-3 uppercase text-[#D4AF37]">{obj.category}</td>
                        <td className="py-2 px-3">{obj.firstSeenTime}</td>
                        <td className="py-2 px-3">{obj.lastSeenTime}</td>
                        <td className="py-2 px-3 text-slate-300">{obj.durationVisible}</td>
                        <td className="py-2 px-3 text-white font-bold">{obj.detectionCount.toLocaleString()}</td>
                        <td className="py-2 px-3 text-emerald-400">{Math.round(obj.avgConfidence * 100)}%</td>
                        <td className="py-2 px-3 text-[#9AA4AF] max-w-xs truncate">{obj.movementDirection}</td>
                        <td className="py-2 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Play from first appearance */}
                            <button
                              onClick={() => {
                                setCurrentTime(obj.firstSeenSeconds);
                                setIsPlaying(true);
                              }}
                              className="px-2 py-1 rounded bg-[#161C24] hover:bg-[#1C232B] text-slate-200 hover:text-white border border-[#252C35] text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                              title="Jump & Play from first appearance"
                            >
                              <Play className="w-2.5 h-2.5 text-[#D4AF37]" />
                              <span>Play</span>
                            </button>

                            {/* Enhance Object Crop */}
                            <button
                              onClick={() => setSelectedObjectForModal(obj)}
                              className="px-2 py-1 rounded bg-[#D4AF37] hover:bg-[#E5C158] text-[#080A0D] text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                              title="Open original vs enhanced crop inspection"
                            >
                              <Sparkles className="w-2.5 h-2.5" />
                              <span>Enhance</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: VIDEO STATISTICS */}
          {activeBottomTab === 'statistics' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-white tracking-wider">
                  Timeline Object Activity Distribution (Over Video Duration)
                </span>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" />
                    <span className="text-[#9AA4AF]">People</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-sky-400" />
                    <span className="text-[#9AA4AF]">Cars</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-purple-400" />
                    <span className="text-[#9AA4AF]">Bicycles</span>
                  </div>
                </div>
              </div>

              {/* Activity Density Chart */}
              <div className="h-36 flex items-end gap-4 p-4 rounded-xl bg-[#11161D] border border-[#252C35]">
                {INITIAL_VIDEO_STATS.timelineDensity.map((item, idx) => {
                  const maxVal = 14;
                  const pHeight = (item.people / maxVal) * 100;
                  const cHeight = (item.cars / maxVal) * 100;
                  const bHeight = (item.bicycles / maxVal) * 100;

                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                      <div className="w-full flex items-end justify-center gap-1 h-full">
                        <div
                          style={{ height: `${pHeight}%` }}
                          className="w-1/3 bg-emerald-500 rounded-t transition-all group-hover:bg-emerald-400"
                          title={`People: ${item.people}`}
                        />
                        <div
                          style={{ height: `${cHeight}%` }}
                          className="w-1/3 bg-sky-500 rounded-t transition-all group-hover:bg-sky-400"
                          title={`Cars: ${item.cars}`}
                        />
                        <div
                          style={{ height: `${bHeight}%` }}
                          className="w-1/3 bg-purple-500 rounded-t transition-all group-hover:bg-purple-400"
                          title={`Bicycles: ${item.bicycles}`}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-[#68727D] mt-2">{item.time}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: TIMELINE EVENTS */}
          {activeBottomTab === 'timeline' && (
            <div className="space-y-2">
              <span className="text-xs text-[#9AA4AF] block mb-2">
                Click any timestamp to jump directly to that video moment:
              </span>

              <div className="grid grid-cols-2 gap-2">
                {INITIAL_TIMELINE_EVENTS.map((evt) => (
                  <div
                    key={evt.id}
                    onClick={() => {
                      setCurrentTime(evt.timestampSeconds);
                      setIsPlaying(true);
                    }}
                    className="p-2.5 rounded-lg bg-[#11161D] border border-[#252C35] hover:border-[#D4AF37] cursor-pointer flex items-center justify-between transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="px-2 py-0.5 rounded bg-[#161C24] text-[#D4AF37] font-mono font-bold text-xs border border-[#252C35] group-hover:border-[#D4AF37]/50">
                        {evt.timestamp}
                      </span>
                      <span className="text-xs text-white font-medium truncate max-w-sm">
                        {evt.message}
                      </span>
                    </div>

                    <span className="text-[10px] font-mono text-[#68727D] uppercase">
                      {evt.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: QUALITY ANALYSIS */}
          {activeBottomTab === 'quality' && (
            <div className="grid grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-[#11161D] border border-[#252C35] space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#9AA4AF] block">
                  OVERALL QUALITY SCORE
                </span>
                <div className="text-3xl font-mono font-black text-emerald-400">
                  {INITIAL_QUALITY_METRICS.overallScore} <span className="text-xs text-[#9AA4AF] font-normal">/ 100</span>
                </div>
                <div className="text-[11px] text-[#68727D]">Optimal surveillance standard</div>
              </div>

              <div className="p-4 rounded-xl bg-[#11161D] border border-[#252C35] space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#9AA4AF] block">
                  BLUR & SHARPNESS
                </span>
                <div className="text-xl font-mono font-bold text-white">
                  {INITIAL_QUALITY_METRICS.blurScore} <span className="text-xs text-emerald-400">({INITIAL_QUALITY_METRICS.blurLevel})</span>
                </div>
                <div className="text-[11px] text-[#68727D]">Laplacian edge variance</div>
              </div>

              <div className="p-4 rounded-xl bg-[#11161D] border border-[#252C35] space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#9AA4AF] block">
                  BRIGHTNESS & EXPOSURE
                </span>
                <div className="text-xl font-mono font-bold text-white">
                  {INITIAL_QUALITY_METRICS.brightnessValue} <span className="text-xs text-sky-400">({INITIAL_QUALITY_METRICS.exposure})</span>
                </div>
                <div className="text-[11px] text-[#68727D]">Average frame luminance</div>
              </div>

              <div className="p-4 rounded-xl bg-[#11161D] border border-[#252C35] space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#9AA4AF] block">
                  DYNAMIC RANGE & CONTRAST
                </span>
                <div className="text-xl font-mono font-bold text-white">
                  {INITIAL_QUALITY_METRICS.contrastRatio}:1 <span className="text-xs text-[#D4AF37]">({INITIAL_QUALITY_METRICS.dynamicRange})</span>
                </div>
                <div className="text-[11px] text-[#68727D]">RMS contrast ratio</div>
              </div>
            </div>
          )}

          {/* TAB 5: FRAME ENHANCEMENT */}
          {activeBottomTab === 'enhancement' && (
            <div className="flex items-center justify-between p-4 rounded-xl bg-[#11161D] border border-[#252C35]">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                  <span className="text-xs font-bold text-white uppercase">
                    AUTOMATIC LOW-QUALITY FRAME ENHANCEMENT
                  </span>
                </div>
                <p className="text-xs text-[#9AA4AF]">
                  When active, frames with blur variance &lt; 60 or underexposure &lt; 35 luminance are automatically treated with CLAHE and bilateral filtering before YOLO inference.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-xs font-bold font-mono">
                  {INITIAL_VIDEO_STATS.enhancedFramesCount} Frames Enhanced
                </span>
                <button
                  onClick={() => setSelectedObjectForModal(INITIAL_TRACKED_OBJECTS[0])}
                  className="px-3 py-1.5 rounded bg-[#D4AF37] hover:bg-[#E5C158] text-[#080A0D] text-xs font-bold cursor-pointer uppercase tracking-wider"
                >
                  Inspect Sample Crop
                </button>
              </div>
            </div>
          )}

          {/* TAB 6: ANALYSIS HISTORY */}
          {activeBottomTab === 'history' && (
            <div className="space-y-2">
              <span className="text-xs text-[#9AA4AF] block mb-1">
                Previously indexed video analyses in SQLite database:
              </span>

              <div className="grid grid-cols-2 gap-2">
                {historyVideos.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleSelectVideo(item)}
                    className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                      item.id === selectedVideo.id
                        ? 'bg-[#161C24] border-[#D4AF37] text-white'
                        : 'bg-[#11161D] border-[#252C35] text-[#9AA4AF] hover:text-white'
                    }`}
                  >
                    <div>
                      <span className="font-bold text-white text-xs block truncate max-w-xs">
                        {item.filename}
                      </span>
                      <span className="text-[10px] font-mono text-[#68727D]">
                        {item.analyzedDate} • {item.resolution} • {item.durationFormatted}
                      </span>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                        item.status === 'COMPLETED'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-amber-950 text-amber-400 border border-amber-800'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: + ADD VIDEO / DRAG & DROP & BENCHMARKS */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-6 select-none">
          <div className="bg-[#11161D] border border-[#252C35] rounded-xl max-w-2xl w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#252C35] pb-3">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-[#D4AF37]" />
                <h3 className="text-base font-black tracking-wide text-white uppercase">
                  ADD VIDEO FILE FOR FORENSIC ANALYSIS
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-[#68727D] hover:text-white p-1 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Drag & Drop Zone */}
            <div className="border-2 border-dashed border-[#252C35] hover:border-[#D4AF37] rounded-xl p-8 text-center space-y-3 bg-[#080A0D] transition-colors cursor-pointer">
              <div className="w-12 h-12 rounded-full bg-[#161C24] text-[#D4AF37] flex items-center justify-center mx-auto border border-[#252C35]">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <span className="text-sm font-bold text-white block">
                  Drag & Drop Video File Here
                </span>
                <span className="text-xs text-[#9AA4AF]">
                  or browse local storage (Supported formats: MP4, AVI, MOV, MKV, WEBM)
                </span>
              </div>
              <label className="inline-block px-4 py-2 rounded-lg bg-[#161C24] hover:bg-[#1C232B] text-slate-200 border border-[#252C35] text-xs font-semibold cursor-pointer">
                Select Local File
                <input
                  type="file"
                  accept="video/mp4,video/avi,video/quicktime,video/x-matroska,video/webm"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      const file = e.target.files[0];
                      const newVid: VideoFileItem = {
                        id: `VID-${Date.now()}`,
                        filename: file.name,
                        duration: 120,
                        durationFormatted: '02:00',
                        resolution: '1920 × 1080',
                        fps: 30,
                        frameCount: 3600,
                        fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
                        status: 'QUEUED',
                        analyzedDate: 'Just Now',
                        currentFrame: 0
                      };
                      setHistoryVideos((prev) => [newVid, ...prev]);
                      handleSelectVideo(newVid);
                    }
                  }}
                />
              </label>
            </div>

            {/* Benchmark Sample Videos Quick Selector */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-[#9AA4AF] uppercase tracking-wider block">
                Or Select Pre-Loaded Benchmark Surveillance Footage:
              </span>

              <div className="space-y-2">
                {SAMPLE_VIDEOS.map((vid) => (
                  <div
                    key={vid.id}
                    onClick={() => handleSelectVideo(vid)}
                    className="p-3 rounded-lg bg-[#080A0D] border border-[#252C35] hover:border-[#D4AF37] flex items-center justify-between cursor-pointer transition-all"
                  >
                    <div>
                      <span className="text-xs font-bold text-white block">{vid.filename}</span>
                      <span className="text-[10px] font-mono text-[#68727D]">
                        {vid.resolution} • {vid.durationFormatted} • {vid.fileSize}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="px-3 py-1 rounded bg-[#161C24] hover:bg-[#1C232B] text-[#D4AF37] border border-[#252C35] text-xs font-semibold cursor-pointer"
                    >
                      Load & Analyze
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Video Report Modal */}
      {isReportModalOpen && (
        <VideoReportModal
          video={selectedVideo}
          quality={INITIAL_QUALITY_METRICS}
          stats={INITIAL_VIDEO_STATS}
          trackedObjects={INITIAL_TRACKED_OBJECTS}
          computeDevice={settings.computeDevice}
          onClose={() => setIsReportModalOpen(false)}
        />
      )}

      {/* MODAL: Object Crop Enhancement Modal */}
      {selectedObjectForModal && (
        <ObjectEnhanceModal
          object={selectedObjectForModal}
          onClose={() => setSelectedObjectForModal(null)}
        />
      )}

      {/* MODAL: Export Analyzed Video Modal */}
      {isExportModalOpen && (
        <VideoExportModal
          video={selectedVideo}
          onClose={() => setIsExportModalOpen(false)}
        />
      )}
    </div>
  );
};
