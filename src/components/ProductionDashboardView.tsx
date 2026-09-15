import React, { useEffect, useRef, useState } from 'react';
import { Camera, Play, Pause, RotateCcw, Cpu, Moon, AlertTriangle } from 'lucide-react';
import { AppSettingsState, CategoryType, DetectionResult, DetectedObject, DetectionQualityStatus } from '../types';
import { detectionService } from '../services/detectionService';

interface Props { settings: AppSettingsState; onAddAlert: (msg: string, type: 'SPEED_WARNING' | 'CAMERA_STATUS' | 'OCR_LOW_CONFIDENCE' | 'QUALITY_ALERT', severity: 'WARNING' | 'INFO' | 'CRITICAL') => void; }

export const ProductionDashboardView: React.FC<Props> = ({ settings, onAddAlert }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef(0);
  const lastTickRef = useRef(performance.now());
  const frameCountRef = useRef(0);
  const detectingRef = useRef(false);
  const objectsRef = useRef<DetectedObject[]>([]);
  const [connected, setConnected] = useState(false);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [engine, setEngine] = useState('INITIALIZING');
  const [device, setDevice] = useState('Detecting...');
  const [cameraFps, setCameraFps] = useState(0);
  const [inferenceFps, setInferenceFps] = useState(0);
  const [detections, setDetections] = useState<DetectionResult[]>([]);
  const [filter, setFilter] = useState<CategoryType>('all');
  const [quality, setQuality] = useState<DetectionQualityStatus>('Good');
  const [night, setNight] = useState(false);

  const connect = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      setConnected(true);
    } catch (e) { setConnected(false); setError('Camera unavailable or permission denied.'); onAddAlert('Webcam access failed or permission was denied.', 'CAMERA_STATUS', 'WARNING'); }
  };

  useEffect(() => { let alive = true; detectionService.initModel().then(() => { if (!alive) return; const s = detectionService.getStatus(); setEngine(s.status); setDevice(s.device); }); return () => { alive = false; streamRef.current?.getTracks().forEach(t => t.stop()); }; }, []);

  useEffect(() => {
    let raf = 0;
    const loop = async (now: number) => {
      frameCountRef.current++;
      if (now - lastTickRef.current >= 1000) { setCameraFps(frameCountRef.current); frameCountRef.current = 0; lastTickRef.current = now; }
      const video = videoRef.current, canvas = canvasRef.current;
      if (video && canvas && connected && !paused && video.readyState >= 2) {
        canvas.width = video.videoWidth || 1280; canvas.height = video.videoHeight || 720;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const results = (!detectingRef.current && detectionService.isReady()) ? await (async () => { detectingRef.current = true; try { frameRef.current++; return await detectionService.detectFrame(canvas, frameRef.current, settings.confidenceThreshold); } finally { detectingRef.current = false; } })() : detections;
          setDetections(results);
          const d = detectionService.getDiagnostics(canvas.width, canvas.height, cameraFps);
          setInferenceFps(d.inferenceFps);
          objectsRef.current = results.map(r => ({ id: `${r.category}-${r.tracking_id}`, trackId: r.tracking_id, category: r.category as any, confidence: r.confidence, bbox: [r.x1,r.y1,r.x2,r.y2], position: { x: (r.x1+r.x2)/2, y: (r.y1+r.y2)/2 } }));
          if (night) { const img = ctx.getImageData(0,0,canvas.width,canvas.height); for(let i=0;i<img.data.length;i+=4){ const l=.299*img.data[i]+.587*img.data[i+1]+.114*img.data[i+2]; const v=Math.min(255,Math.pow(l/255,.65)*265); img.data[i]=img.data[i+1]=img.data[i+2]=v; } ctx.putImageData(img,0,0); }
          for (const r of results) { if (filter !== 'all' && r.category !== filter) continue; ctx.strokeStyle = r.category==='person'?'#10B981':r.category==='car'?'#38BDF8':r.category==='bicycle'?'#A855F7':'#D4AF37'; ctx.lineWidth=2; ctx.strokeRect(r.x1,r.y1,r.x2-r.x1,r.y2-r.y1); ctx.fillStyle='rgba(8,10,13,.9)'; ctx.fillRect(r.x1,r.y1-18,120,18); ctx.fillStyle=ctx.strokeStyle; ctx.font='11px monospace'; ctx.fillText(`${r.category.toUpperCase()} #${r.tracking_id} ${Math.round(r.confidence*100)}%`,r.x1+4,r.y1-5); }
          const lum = (() => { const x=Math.max(0,Math.floor(canvas.width/2)-10), y=Math.max(0,Math.floor(canvas.height/2)-10); const p=ctx.getImageData(x,y,20,20).data; let s=0; for(let i=0;i<p.length;i+=4)s+=.299*p[i]+.587*p[i+1]+.114*p[i+2]; return s/(p.length/4); })();
          setQuality(lum<25?'Poor Visibility':cameraFps<15?'Low Quality':lum>=50&&cameraFps>=20?'Excellent':'Good');
        }
      }
      raf=requestAnimationFrame(loop);
    };
    raf=requestAnimationFrame(loop); return () => cancelAnimationFrame(raf);
  }, [connected, paused, filter, night, settings.confidenceThreshold, cameraFps, detections]);

  const counts = { person: detections.filter(d=>d.category==='person').length, car: detections.filter(d=>d.category==='car').length, bicycle: detections.filter(d=>d.category==='bicycle').length, camera: detections.filter(d=>d.category==='camera').length };
  return <div className="flex-1 flex flex-col overflow-hidden bg-[#080A0D] text-[#F4F6F8]">
    <div className="px-6 py-4 border-b border-[#252C35] bg-[#0D1117] flex items-center justify-between"><div><h2 className="text-lg font-black uppercase tracking-wider">LIVE AI DETECTION</h2><p className="text-xs text-[#9AA4AF]">Real camera frames only • no simulated objects or telemetry</p></div><div className="flex gap-2"><button onClick={()=>setNight(v=>!v)} className="px-3 py-2 border border-[#252C35] rounded-lg text-xs"><Moon className="inline w-3 h-3 mr-1"/>{night?'NIGHT ON':'NIGHT OFF'}</button><button onClick={paused?()=>setPaused(false):()=>setPaused(true)} className="px-3 py-2 bg-[#D4AF37] text-black rounded-lg text-xs font-bold">{paused?<Play className="inline w-3 h-3 mr-1"/>:<Pause className="inline w-3 h-3 mr-1"/>}{paused?'RESUME':'PAUSE'}</button><button onClick={connect} className="px-3 py-2 border border-[#D4AF37]/50 rounded-lg text-xs font-bold"><Camera className="inline w-3 h-3 mr-1"/>CONNECT</button></div></div>
    <div className="flex-1 grid grid-cols-[1fr_300px] gap-4 p-4 overflow-hidden"><div className="relative bg-black rounded-xl border border-[#252C35] overflow-hidden flex items-center justify-center"><video ref={videoRef} className="hidden" muted playsInline/><canvas ref={canvasRef} className="max-w-full max-h-full object-contain"/>{!connected&&<div className="absolute inset-0 flex flex-col items-center justify-center text-center"><Camera className="w-12 h-12 text-[#68727D] mb-3"/><p className="text-sm font-bold">NO CAMERA CONNECTED</p><p className="text-xs text-[#68727D] mt-1">Nothing is detected until a real video source is available.</p>{error&&<p className="text-xs text-rose-400 mt-3">{error}</p>}</div>}<div className="absolute top-3 left-3 px-3 py-2 bg-black/75 border border-[#252C35] rounded text-[10px] font-mono">AI: {engine} • {device} • {inferenceFps} INF FPS</div></div>
      <aside className="bg-[#11161D] border border-[#252C35] rounded-xl p-4 overflow-y-auto"><div className="grid grid-cols-2 gap-2">{(['person','car','bicycle','camera'] as const).map(c=><button key={c} onClick={()=>setFilter(filter===c?'all':c)} className={`p-3 rounded-lg border text-left ${filter===c?'border-[#D4AF37]':'border-[#252C35]'}`}><div className="text-[10px] uppercase text-[#9AA4AF]">{c}</div><div className="text-2xl font-mono font-bold">{counts[c]}</div></button>)}</div><div className="mt-4 p-3 rounded-lg bg-[#080A0D] border border-[#252C35] text-xs space-y-2"><div>Camera FPS <b className="float-right">{cameraFps}</b></div><div>Inference FPS <b className="float-right">{inferenceFps}</b></div><div>Quality <b className="float-right">{quality}</b></div><div>Objects now <b className="float-right">{detections.length}</b></div></div><div className="mt-4 text-[11px] text-[#68727D]"><Cpu className="inline w-3 h-3 mr-1"/>Backend status is reported from TensorFlow.js. Camera class remains zero unless a supported model detects it.</div></aside></div>
  </div>;
};