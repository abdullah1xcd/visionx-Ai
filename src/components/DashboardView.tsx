import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  Play,
  Pause,
  Maximize2,
  Sparkles,
  CameraOff,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ChevronRight,
  ShieldAlert,
  Car,
  User,
  Bike,
  Moon,
  Sun,
  Activity,
  Cpu,
  Download,
  X,
  Info,
  Sliders,
  RotateCcw,
  Terminal,
  Upload
} from 'lucide-react';
import {
  CategoryType,
  DetectedObject,
  AppSettingsState,
  DetectionQualityStatus,
  NightVisionMode,
  DetectionResult
} from '../types';
import { detectionService, AIEngineStatus } from '../services/detectionService';
import { AiDiagnosticsModal } from './AiDiagnosticsModal';

interface DashboardViewProps {
  settings: AppSettingsState;
  onAddAlert: (
    msg: string,
    type: 'SPEED_WARNING' | 'CAMERA_STATUS' | 'OCR_LOW_CONFIDENCE' | 'QUALITY_ALERT',
    severity: 'WARNING' | 'INFO' | 'CRITICAL'
  ) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ settings, onAddAlert }) => {
  const [activeFilter, setActiveFilter] = useState<CategoryType>('all');
  const [selectedObject, setSelectedObject] = useState<DetectedObject | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(true);

  const [useWebcam, setUseWebcam] = useState<boolean>(true);
  const [isCameraConnected, setIsCameraConnected] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const [cameraFps, setCameraFps] = useState<number>(0);
  const [aiInferenceFps, setAiInferenceFps] = useState<number>(0);
  const [lastInferenceMs, setLastInferenceMs] = useState<number>(0);

  const [aiEngineStatus, setAiEngineStatus] = useState<AIEngineStatus>('INITIALIZING');
  const [hardwareDevice, setHardwareDevice] = useState<string>('Detecting...');
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState<boolean>(false);

  const [nightVisionMode, setNightVisionMode] = useState<NightVisionMode>(settings.nightVisionMode || 'auto');
  const [isNightVisionActive, setIsNightVisionActive] = useState<boolean>(false);
  const [detectionQuality, setDetectionQuality] = useState<DetectionQualityStatus>('Good');

  const [isCapturedModalOpen, setIsCapturedModalOpen] = useState<boolean>(false);
  const [capturedFrameData, setCapturedFrameData] = useState<string | null>(null);
  const [capturedObject, setCapturedObject] = useState<DetectedObject | null>(null);

  const [counts, setCounts] = useState({ person: 0, car: 0, bicycle: 0, camera: 0 });
  const [uniqueCounts, setUniqueCounts] = useState({ person: 0, car: 0, bicycle: 0, camera: 0 });
  const [currentDetections, setCurrentDetections] = useState<DetectionResult[]>([]);
  const objectsStateRef = useRef<DetectedObject[]>([]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const frameCounterRef = useRef<number>(0);
  const isDetectingRef = useRef<boolean>(false);

  useEffect(() => {
    let mounted = true;
    const initAI = async () => {
      setAiEngineStatus('INITIALIZING');
      const ok = await detectionService.initModel();
      if (!mounted) return;
      const status = detectionService.getStatus();
      setAiEngineStatus(status.status);
      setHardwareDevice(status.device);
      if (ok) {
        onAddAlert(`AI Engine initialized: ${status.device}`, 'QUALITY_ALERT', 'INFO');
      } else {
        onAddAlert(`AI Engine failed to load: ${status.message}`, 'CAMERA_STATUS', 'CRITICAL');
      }
    };
    initAI();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (useWebcam) {
      setCameraError(null);
      navigator.mediaDevices
        ?.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
        })
        .then((stream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().then(() => {
              setIsCameraConnected(true);
              setCameraError(null);
              onAddAlert('Live hardware camera connected successfully.', 'CAMERA_STATUS', 'INFO');
            }).catch((err) => console.warn('Video play failed:', err));
          }
        })
        .catch((err) => {
          console.warn('Webcam access error:', err);
          setIsCameraConnected(false);
          setCameraError('Camera hardware unavailable or browser permission denied. Click "CONNECT WEBCAM" or allow access.');
          onAddAlert('Webcam access failed or permission denied.', 'CAMERA_STATUS', 'WARNING');
        });
    } else {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
      setIsCameraConnected(false);
      setCounts({ person: 0, car: 0, bicycle: 0, camera: 0 });
      setUniqueCounts({ person: 0, car: 0, bicycle: 0, camera: 0 });
      setCurrentDetections([]);
      objectsStateRef.current = [];
    }

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [useWebcam]);

  useEffect(() => {
    let lastCameraTime = performance.now();
    let framesRendered = 0;
    const renderLoop = (timestamp: number) => {
      framesRendered++;
      if (timestamp - lastCameraTime >= 1000) {
        setCameraFps(framesRendered);
        framesRendered = 0;
        lastCameraTime = timestamp;
      }
      if (!isPaused) {
        frameCounterRef.current += 1;
        drawAndInferFrame();
      }
      animationFrameRef.current = requestAnimationFrame(renderLoop);
    };
    animationFrameRef.current = requestAnimationFrame(renderLoop);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPaused, isCameraConnected, activeFilter, nightVisionMode, isNightVisionActive, settings]);

  const drawAndInferFrame = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const width = canvas.width;
    const height = canvas.height;
    const video = videoRef.current;

    if (useWebcam && video && video.readyState >= 2) {
      ctx.drawImage(video, 0, 0, width, height);
      if (!isCameraConnected) setIsCameraConnected(true);
    } else {
      ctx.fillStyle = '#080A0D';
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = '#161C24';
      ctx.lineWidth = 1;
      for (let x = 40; x < width; x += 60) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
      }
      for (let y = 40; y < height; y += 60) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
      }
      ctx.fillStyle = '#9AA4AF';
      ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(cameraError ? 'CAMERA DISCONNECTED / PERMISSION NEEDED' : 'CAMERA STANDBY — CLICK "CONNECT WEBCAM"', width / 2, height / 2 - 10);
      ctx.font = '11px -apple-system, BlinkMacSystemFont, monospace';
      ctx.fillStyle = '#68727D';
      ctx.fillText('Zero mock data policy: AI counters will only register when live video frames are provided.', width / 2, height / 2 + 15);
      ctx.textAlign = 'left';
      if (counts.person !== 0 || counts.car !== 0 || counts.bicycle !== 0 || counts.camera !== 0) {
        setCounts({ person: 0, car: 0, bicycle: 0, camera: 0 });
        setUniqueCounts({ person: 0, car: 0, bicycle: 0, camera: 0 });
        setCurrentDetections([]);
        objectsStateRef.current = [];
      }
      return;
    }

    const sampleX = Math.floor(width / 2);
    const sampleY = Math.floor(height / 2);
    const centerPixels = ctx.getImageData(sampleX - 25, sampleY - 25, 50, 50).data;
    let totalLum = 0;
    for (let i = 0; i < centerPixels.length; i += 4) {
      totalLum += 0.299 * centerPixels[i] + 0.587 * centerPixels[i + 1] + 0.114 * centerPixels[i + 2];
    }
    const avgLum = totalLum / (centerPixels.length / 4);

    if (nightVisionMode === 'auto') {
      const isDark = avgLum < settings.autoNightThreshold;
      if (isDark !== isNightVisionActive) setIsNightVisionActive(isDark);
    } else if (nightVisionMode === 'night') {
      if (!isNightVisionActive) setIsNightVisionActive(true);
    } else if (isNightVisionActive) {
      setIsNightVisionActive(false);
    }

    if (isNightVisionActive) applySoftwareNightVision(ctx, width, height);

    if (avgLum < 25) setDetectionQuality('Poor Visibility');
    else if (cameraFps < 15) setDetectionQuality('Low Quality');
    else if (avgLum >= 50 && cameraFps >= 20) setDetectionQuality('Excellent');
    else setDetectionQuality('Good');

    if (detectionService.isReady() && !isDetectingRef.current && frameCounterRef.current % 2 === 0) {
      isDetectingRef.current = true;
      detectionService.detectFrame(canvas, frameCounterRef.current, settings.confidenceThreshold)
        .then((results: DetectionResult[]) => {
          isDetectingRef.current = false;
          const diag = detectionService.getDiagnostics(results, cameraFps);
          setAiInferenceFps(diag.inferenceFps);
          setLastInferenceMs(diag.lastInferenceMs);

          const pCount = results.filter((r) => r.category === 'person').length;
          const cCount = results.filter((r) => r.category === 'car').length;
          const bCount = results.filter((r) => r.category === 'bicycle').length;
          const camCount = results.filter((r) => r.category === 'camera').length;
          setCounts({ person: pCount, car: cCount, bicycle: bCount, camera: camCount });
          setUniqueCounts(diag.uniqueTrackedCounts);
          setCurrentDetections(results);

          const mappedObjects: DetectedObject[] = results
            .filter((res) => res.category !== 'all')
            .map((res) => {
              const cat = res.category as 'person' | 'car' | 'bicycle' | 'camera';
              return {
                id: `${res.category}-${res.tracking_id}`,
                trackId: res.tracking_id,
                category: cat,
                confidence: res.confidence,
                bbox: [res.x1, res.y1, res.x2, res.y2],
                color: 'Physical Object',
                direction: 'Detected In Frame',
                qualityRating: res.confidence > 0.8 ? 'Good' : 'Acceptable',
                brightnessScore: Math.round(avgLum),
                position: { x: Math.round((res.x1 + res.x2) / 2), y: Math.round((res.y1 + res.y2) / 2) }
              };
            });

          objectsStateRef.current = mappedObjects;
          if (selectedObject) {
            const updated = mappedObjects.find((o) => o.trackId === selectedObject.trackId);
            if (updated) setSelectedObject(updated);
          }
        })
        .catch((err) => {
          console.error('Inference error:', err);
          isDetectingRef.current = false;
        });
    }

    drawRealBoundingBoxes(ctx);
  };

  const applySoftwareNightVision = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      const lifted = Math.min(255, Math.pow(lum / 255, 0.65) * 265);
      data[i] = lifted; data[i + 1] = lifted; data[i + 2] = lifted;
    }
    ctx.putImageData(imgData, 0, 0);
    const grad = ctx.createRadialGradient(width / 2, height / 2, width * 0.35, width / 2, height / 2, width * 0.75);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.3)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  };

  const drawRealBoundingBoxes = (ctx: CanvasRenderingContext2D) => {
    const list = objectsStateRef.current;
    list.forEach((obj) => {
      if (activeFilter !== 'all' && obj.category !== activeFilter) return;
      const [x1, y1, x2, y2] = obj.bbox;
      const isSelected = selectedObject?.trackId === obj.trackId;
      let strokeColor = '#38BDF8';
      if (obj.category === 'person') strokeColor = '#10B981';
      if (obj.category === 'car') strokeColor = '#38BDF8';
      if (obj.category === 'bicycle') strokeColor = '#A855F7';
      if (obj.category === 'camera') strokeColor = '#D4AF37';
      if (isSelected) strokeColor = '#EAB308';

      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = isSelected ? 2.5 : 1.5;
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
      const cornerLen = Math.min(12, (x2 - x1) * 0.2);
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(x1, y1 + cornerLen); ctx.lineTo(x1, y1); ctx.lineTo(x1 + cornerLen, y1);
      ctx.moveTo(x2 - cornerLen, y1); ctx.lineTo(x2, y1); ctx.lineTo(x2, y1 + cornerLen);
      ctx.moveTo(x1, y2 - cornerLen); ctx.lineTo(x1, y2); ctx.lineTo(x1 + cornerLen, y2);
      ctx.moveTo(x2 - cornerLen, y2); ctx.lineTo(x2, y2); ctx.lineTo(x2, y2 - cornerLen);
      ctx.stroke();

      const labelText = `${obj.category.toUpperCase()} #${obj.trackId < 10 ? '0' + obj.trackId : obj.trackId}  ${Math.round(obj.confidence * 100)}%`;
      ctx.font = '600 11px monospace';
      const textWidth = ctx.measureText(labelText).width;
      const labelHeight = 18;
      ctx.fillStyle = isSelected ? 'rgba(212, 175, 55, 0.9)' : 'rgba(8, 10, 13, 0.85)';
      ctx.fillRect(x1, Math.max(0, y1 - labelHeight), textWidth + 10, labelHeight);
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1;
      ctx.strokeRect(x1, Math.max(0, y1 - labelHeight), textWidth + 10, labelHeight);
      ctx.fillStyle = isSelected ? '#080A0D' : strokeColor;
      ctx.fillText(labelText, x1 + 5, Math.max(13, y1 - 5));
    });
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;
    let found: DetectedObject | null = null;
    for (const obj of objectsStateRef.current) {
      const [x1, y1, x2, y2] = obj.bbox;
      if (clickX >= x1 && clickX <= x2 && clickY >= y1 && clickY <= y2) { found = obj; break; }
    }
    setSelectedObject(found);
    if (found) setIsDetailsOpen(true);
  };

  const handleCapture = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedFrameData(dataUrl);
    setCapturedObject(selectedObject || objectsStateRef.current[0] || null);
    setIsCapturedModalOpen(true);
    onAddAlert('Single frame captured for high-resolution inspection.', 'CAMERA_STATUS', 'INFO');
  };

  const cycleNightVision = () => {
    const nextMode: NightVisionMode = nightVisionMode === 'auto' ? 'night' : nightVisionMode === 'night' ? 'day' : 'auto';
    setNightVisionMode(nextMode);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#080A0D] text-[#F4F6F8]">
      <div className="px-4 py-2 bg-[#0D1117] border-b border-[#252C35] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5" title={`Currently visible: ${counts.person} | Unique: ${uniqueCounts.person}`}><User className="w-3.5 h-3.5 text-emerald-400" /><span className="text-[#9AA4AF]">PEOPLE:</span><span className="font-bold text-[#F4F6F8] font-mono">{counts.person}</span>{uniqueCounts.person > 0 && <span className="text-[10px] text-[#68727D] font-mono">({uniqueCounts.person} unq)</span>}</div>
          <div className="h-3.5 w-px bg-[#252C35]" />
          <div className="flex items-center gap-1.5" title={`Currently visible: ${counts.car} | Unique: ${uniqueCounts.car}`}><Car className="w-3.5 h-3.5 text-sky-400" /><span className="text-[#9AA4AF]">CARS:</span><span className="font-bold text-[#F4F6F8] font-mono">{counts.car}</span>{uniqueCounts.car > 0 && <span className="text-[10px] text-[#68727D] font-mono">({uniqueCounts.car} unq)</span>}</div>
          <div className="h-3.5 w-px bg-[#252C35]" />
          <div className="flex items-center gap-1.5" title={`Currently visible: ${counts.bicycle} | Unique: ${uniqueCounts.bicycle}`}><Bike className="w-3.5 h-3.5 text-purple-400" /><span className="text-[#9AA4AF]">BICYCLES:</span><span className="font-bold text-[#F4F6F8] font-mono">{counts.bicycle}</span>{uniqueCounts.bicycle > 0 && <span className="text-[10px] text-[#68727D] font-mono">({uniqueCounts.bicycle} unq)</span>}</div>
          <div className="h-3.5 w-px bg-[#252C35]" />
          <div className="flex items-center gap-1.5" title={`Currently visible: ${counts.camera} | Unique: ${uniqueCounts.camera}`}><Camera className="w-3.5 h-3.5 text-[#D4AF37]" /><span className="text-[#9AA4AF]">CAMERAS:</span><span className="font-bold text-[#F4F6F8] font-mono">{counts.camera}</span>{uniqueCounts.camera > 0 && <span className="text-[10px] text-[#68727D] font-mono">({uniqueCounts.camera} unq)</span>}</div>
        </div>

        <div className="flex items-center gap-2.5">
          <div onClick={() => setIsDiagnosticsOpen(true)} className="flex items-center gap-1.5 text-xs bg-[#11161D] hover:bg-[#161C24] px-2.5 py-1 rounded border border-[#252C35] hover:border-[#D4AF37]/50 cursor-pointer transition-colors" title="Click to view AI Engine Diagnostics">
            <span className="text-[10px] font-semibold text-[#68727D] uppercase">AI ENGINE:</span>
            <span className={`inline-flex items-center gap-1 font-bold text-xs font-mono ${aiEngineStatus === 'ACTIVE' ? 'text-emerald-400' : aiEngineStatus === 'INITIALIZING' ? 'text-amber-400' : 'text-rose-400'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${aiEngineStatus === 'ACTIVE' ? 'bg-emerald-400 animate-pulse' : aiEngineStatus === 'INITIALIZING' ? 'bg-amber-400 animate-pulse' : 'bg-rose-400'}`} />
              {aiEngineStatus === 'ACTIVE' ? 'ACTIVE' : aiEngineStatus}
            </span>
          </div>
          <button onClick={() => setIsDiagnosticsOpen(true)} className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#161C24] hover:bg-[#1C232B] text-[#D4AF37] border border-[#252C35] hover:border-[#D4AF37] text-[11px] font-bold cursor-pointer transition-colors"><Sparkles className="w-3 h-3" /><span>TEST AI ENGINE</span></button>
          <div className="flex items-center bg-[#11161D] rounded p-0.5 border border-[#252C35] text-xs">
            {(['all', 'person', 'car', 'bicycle', 'camera'] as CategoryType[]).map((cat) => {
              const labelMap: Record<CategoryType, string> = { all: 'ALL', person: 'PEOPLE', car: 'CARS', bicycle: 'BICYCLES', camera: 'CAMERAS' };
              const isSelected = activeFilter === cat;
              return <button key={cat} onClick={() => setActiveFilter(cat)} className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide transition-colors cursor-pointer ${isSelected ? 'bg-[#161C24] text-[#D4AF37] border border-[#D4AF37]/50 shadow-sm' : 'text-[#9AA4AF] hover:text-[#F4F6F8]'}`}>{labelMap[cat]}</button>;
            })}
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden p-3 gap-3">
        <div className="flex-1 flex flex-col bg-[#11161D] rounded-lg border border-[#252C35] overflow-hidden">
          <div className="px-3 py-1.5 bg-[#0D1117] border-b border-[#252C35] flex items-center justify-between">
            <div className="flex items-center gap-2"><span className="text-xs font-bold text-[#F4F6F8]">PRIMARY OPTICAL SENSOR</span><span className="text-[#68727D]">•</span><span className="text-[11px] text-[#9AA4AF] font-mono">1280×720 • {cameraFps} FPS</span></div>
            <div className="flex items-center gap-2">
              <button onClick={() => setUseWebcam((v) => !v)} className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold border transition-colors cursor-pointer ${useWebcam ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60' : 'bg-[#161C24] text-[#9AA4AF] border-[#252C35] hover:text-white'}`}><Camera className="w-3 h-3" /><span>{useWebcam ? 'Device Camera (Active)' : 'Camera Standby'}</span></button>
              <button onClick={cycleNightVision} className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold border transition-colors cursor-pointer ${isNightVisionActive ? 'bg-amber-950/50 text-amber-300 border-amber-600/60' : 'bg-[#161C24] text-[#9AA4AF] border-[#252C35] hover:text-white'}`}><Moon className="w-3 h-3 text-[#D4AF37]" /><span>NV: {nightVisionMode.toUpperCase()}</span></button>
              <button onClick={() => setIsPaused((p) => !p)} className="p-1 rounded bg-[#161C24] hover:bg-[#1C232B] text-[#9AA4AF] hover:text-white border border-[#252C35] transition-colors cursor-pointer" title={isPaused ? 'Resume stream' : 'Pause stream'}>{isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}</button>
              <button onClick={handleCapture} className="flex items-center gap-1 px-2.5 py-0.5 rounded bg-[#D4AF37] hover:bg-[#E5C158] text-[#080A0D] text-[11px] font-bold border-none transition-colors cursor-pointer" title="Freeze frame and analyze detected objects"><Camera className="w-3 h-3" /><span>CAPTURE</span></button>
            </div>
          </div>

          <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
            <canvas ref={canvasRef} width={1280} height={720} onClick={handleCanvasClick} className="w-full h-full object-contain cursor-crosshair select-none" />
            <video ref={videoRef} className="hidden" playsInline muted autoPlay />
            <div className="absolute top-3 left-3 bg-[#080A0D]/85 backdrop-blur-sm px-2.5 py-1.5 rounded border border-[#252C35] text-[11px] font-mono space-y-0.5 pointer-events-none select-none">
              <div className="flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${isCameraConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} /><span className="font-bold text-white">{isCameraConnected ? 'CAMERA ONLINE' : 'CAMERA DISCONNECTED'}</span><span className="text-[#68727D]">|</span><span className="text-[#D4AF37] font-semibold">DEVICE CAMERA</span></div>
              <div className="text-[10px] text-[#9AA4AF]">1280×720 • {cameraFps} FPS Input</div>
            </div>
            <div className="absolute top-3 right-3 bg-[#080A0D]/85 backdrop-blur-sm px-2.5 py-1.5 rounded border border-[#252C35] text-[11px] font-mono text-right space-y-0.5 pointer-events-none select-none">
              <div className="flex items-center justify-end gap-1.5"><span className="text-emerald-400 font-bold">{aiEngineStatus === 'ACTIVE' ? 'REAL AI INFERENCE' : aiEngineStatus}</span><span className="text-[#68727D]">|</span><span className="text-[#D4AF37] font-bold">{hardwareDevice}</span></div>
              <div className="text-[10px] text-[#9AA4AF]">AI: {aiInferenceFps} FPS • Latency: {lastInferenceMs}ms</div>
            </div>
            <div className="absolute bottom-3 left-3 bg-[#080A0D]/85 backdrop-blur-sm px-2.5 py-1 rounded border border-[#252C35] text-[11px] font-mono pointer-events-none select-none flex items-center gap-3">
              <span>People: <strong className="text-emerald-400">{counts.person}</strong></span><span>Cars: <strong className="text-sky-400">{counts.car}</strong></span><span>Bicycles: <strong className="text-purple-400">{counts.bicycle}</strong></span><span>Cameras: <strong className="text-[#D4AF37]">{counts.camera}</strong></span>
            </div>
            <div className="absolute bottom-3 right-3 bg-[#080A0D]/85 backdrop-blur-sm px-2.5 py-1 rounded border border-[#252C35] text-[11px] font-mono pointer-events-none select-none flex items-center gap-2"><span className="text-[#9AA4AF]">NIGHT VISION:</span><span className={`font-bold ${isNightVisionActive ? 'text-[#D4AF37]' : 'text-slate-400'}`}>{isNightVisionActive ? 'ACTIVE (MONOCHROME)' : 'OFF'}</span></div>
            {cameraError && <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-amber-950/90 text-amber-200 border border-amber-600/70 px-4 py-2 rounded-lg text-xs flex items-center gap-3 shadow-lg"><AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" /><span>{cameraError}</span><button onClick={() => setUseWebcam(true)} className="px-2 py-0.5 bg-[#D4AF37] text-black font-bold rounded text-[11px] cursor-pointer">RECONNECT</button></div>}
          </div>
        </div>

        {isDetailsOpen && <div className="w-80 bg-[#11161D] rounded-lg border border-[#252C35] flex flex-col shrink-0 overflow-hidden">
          <div className="p-3 bg-[#0D1117] border-b border-[#252C35] flex items-center justify-between"><div className="flex items-center gap-2"><Sliders className="w-4 h-4 text-[#D4AF37]" /><span className="text-xs font-bold text-[#F4F6F8] tracking-wider uppercase">OBJECT DETAILS</span></div><button onClick={() => setIsDetailsOpen(false)} className="text-[#68727D] hover:text-white p-0.5 rounded transition-colors cursor-pointer" title="Collapse panel"><X className="w-3.5 h-3.5" /></button></div>
          <div className="flex-1 p-3 overflow-y-auto space-y-3.5 text-xs">
            {selectedObject ? <>
              <div className="p-3 rounded-lg bg-[#161C24] border border-[#252C35] space-y-2"><div className="flex items-center justify-between"><span className="text-sm font-black text-[#D4AF37] uppercase">{selectedObject.category} #{selectedObject.trackId < 10 ? '0' + selectedObject.trackId : selectedObject.trackId}</span><span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 font-mono">{Math.round(selectedObject.confidence * 100)}% Conf.</span></div><div className="grid grid-cols-2 gap-2 text-[11px] pt-1"><div><span className="text-[#68727D] block">Category:</span><span className="font-semibold text-white capitalize">{selectedObject.category}</span></div><div><span className="text-[#68727D] block">Tracking ID:</span><span className="font-mono font-bold text-white">{selectedObject.trackId}</span></div></div></div>
              <div className="p-3 rounded-lg bg-[#161C24] border border-[#252C35] space-y-2"><div className="text-[11px] font-bold text-[#9AA4AF] uppercase tracking-wider">Spatial Bounding Box</div><div className="space-y-1 text-[11px] font-mono"><div className="flex justify-between"><span className="text-[#68727D]">Top-Left (X1, Y1):</span><span className="text-white">{Math.round(selectedObject.bbox[0])}, {Math.round(selectedObject.bbox[1])}</span></div><div className="flex justify-between"><span className="text-[#68727D]">Bottom-Right (X2, Y2):</span><span className="text-white">{Math.round(selectedObject.bbox[2])}, {Math.round(selectedObject.bbox[3])}</span></div><div className="flex justify-between"><span className="text-[#68727D]">Dimensions:</span><span className="text-white">{Math.round(selectedObject.bbox[2] - selectedObject.bbox[0])} × {Math.round(selectedObject.bbox[3] - selectedObject.bbox[1])} px</span></div></div></div>

              {selectedObject.category === 'car' && <div className="p-3 rounded-lg bg-[#161C24] border border-[#252C35] space-y-2"><div className="text-[11px] font-bold text-[#9AA4AF] uppercase tracking-wider flex items-center justify-between"><span>Vehicle Analytics</span><span className="text-[10px] text-amber-400 font-normal">Not measured</span></div><div className="space-y-2 text-[11px]"><div className="flex items-center justify-between border-b border-[#252C35]/60 pb-1.5"><span className="text-[#68727D]">Estimated Speed:</span><span className="font-mono font-bold text-[#68727D]">Unavailable — calibration required</span></div><div className="flex items-center justify-between"><span className="text-[#68727D]">License Plate:</span><span className="font-mono font-bold text-[#68727D]">Not analyzed</span></div></div><div className="text-[10px] text-[#68727D] leading-relaxed">Speed requires camera calibration, reference distance and temporal tracking. Plate text is shown only when a real OCR pipeline provides it.</div></div>}

              <div className="p-3 rounded-lg bg-[#161C24] border border-[#252C35] space-y-2"><div className="text-[11px] font-bold text-[#9AA4AF] uppercase tracking-wider">Detection Quality</div><div className="grid grid-cols-2 gap-2 text-[11px]"><div><span className="text-[#68727D] block">Rating:</span><span className="font-semibold text-emerald-400">{selectedObject.qualityRating}</span></div><div><span className="text-[#68727D] block">Brightness:</span><span className="font-mono text-white">{selectedObject.brightnessScore ?? 'N/A'}</span></div></div><button onClick={handleCapture} className="w-full mt-2 py-1.5 rounded bg-[#11161D] hover:bg-[#1C232B] text-slate-200 hover:text-white border border-[#252C35] text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"><Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" /><span>Capture & Enhance Crop</span></button></div>
            </> : <div className="p-6 text-center space-y-3 text-[#68727D]"><Eye className="w-8 h-8 mx-auto stroke-1" /><p className="text-xs font-medium">{currentDetections.length === 0 ? 'No objects currently detected. Stand in front of the webcam or bring a supported object into view.' : 'Click any bounding box on the camera stream to inspect details.'}</p>{currentDetections.length > 0 && <div className="pt-2 text-[11px] text-white">Detected now: <span className="text-emerald-400 font-bold">{currentDetections.length} target object{currentDetections.length > 1 ? 's' : ''}</span></div>}</div>}
          </div>
        </div>}
      </div>

      {isDiagnosticsOpen && <AiDiagnosticsModal currentDetections={currentDetections} cameraFps={cameraFps} canvasRef={canvasRef} onClose={() => setIsDiagnosticsOpen(false)} />}

      {isCapturedModalOpen && capturedFrameData && <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-6 z-50 animate-in fade-in duration-150 select-none"><div className="bg-[#11161D] border border-[#252C35] rounded-xl max-w-3xl w-full flex flex-col overflow-hidden shadow-2xl"><div className="px-5 py-3.5 bg-[#0D1117] border-b border-[#252C35] flex items-center justify-between"><div className="flex items-center gap-2"><Camera className="w-4 h-4 text-[#D4AF37]" /><h3 className="text-sm font-black tracking-wider text-white uppercase">CAPTURED FRAME INSPECTION</h3></div><button onClick={() => setIsCapturedModalOpen(false)} className="text-[#68727D] hover:text-white p-1 rounded transition-colors cursor-pointer"><X className="w-4 h-4" /></button></div><div className="p-4 space-y-3"><div className="rounded-lg overflow-hidden border border-[#252C35] bg-black max-h-96 flex items-center justify-center"><img src={capturedFrameData} alt="Captured frame" className="max-h-96 w-auto object-contain" referrerPolicy="no-referrer" /></div><div className="flex items-center justify-between text-xs text-[#9AA4AF]"><span>Saved frame to local session cache</span><a href={capturedFrameData} download={`visionx-capture-${Date.now()}.jpg`} className="px-3 py-1.5 rounded bg-[#D4AF37] hover:bg-[#E5C158] text-[#080A0D] font-bold uppercase tracking-wider">Save JPEG</a></div></div></div></div>}
    </div>
  );
};
