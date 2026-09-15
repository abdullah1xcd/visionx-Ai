import React, { useEffect, useRef, useState } from 'react';
import { Upload, Play, Pause, Square, Download, Users, Car, Bike, Camera, Cpu } from 'lucide-react';
import { AppSettingsState, CategoryType, DetectionResult, TrackedVideoObject, VideoAnalysisStats, VideoQualityMetrics } from '../types';
import { videoAnalysisService, VideoAnalysisSnapshot } from '../services/videoAnalysisService';
import { detectionService } from '../services/detectionService';

interface Props { settings: AppSettingsState; onAddAlert: (msg: string, type: 'SPEED_WARNING' | 'CAMERA_STATUS' | 'OCR_LOW_CONFIDENCE' | 'QUALITY_ALERT', severity: 'WARNING' | 'INFO' | 'CRITICAL') => void; }

export const ProductionVideoAnalysisView: React.FC<Props> = ({ settings }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const snapshotsRef = useRef<VideoAnalysisSnapshot[]>([]);
  const runRef = useRef<{ stop:()=>void; pause:()=>void; resume:()=>void } | null>(null);
  const [fileName, setFileName] = useState('');
  const [url, setUrl] = useState('');
  const [progress, setProgress] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [paused, setPaused] = useState(false);
  const [frame, setFrame] = useState(0);
  const [time, setTime] = useState(0);
  const [detections, setDetections] = useState<DetectionResult[]>([]);
  const [stats, setStats] = useState<VideoAnalysisStats | null>(null);
  const [objects, setObjects] = useState<TrackedVideoObject[]>([]);
  const [quality, setQuality] = useState<VideoQualityMetrics | null>(null);
  const [filter, setFilter] = useState<CategoryType>('all');
  const [status, setStatus] = useState('Select a video file');

  useEffect(() => () => { runRef.current?.stop(); if (url) URL.revokeObjectURL(url); }, [url]);

  const loadFile = (file: File) => {
    if (!file.type.startsWith('video/')) { setStatus('Unsupported file. Choose a video.'); return; }
    if (url) URL.revokeObjectURL(url);
    const next = URL.createObjectURL(file); setUrl(next); setFileName(file.name); setProgress(0); setFrame(0); setTime(0); setDetections([]); setStats(null); setObjects([]); setQuality(null); setStatus('Video loaded — ready for real analysis');
  };

  const analyze = async () => {
    const video = videoRef.current; if (!video || !url) return;
    setAnalyzing(true); setPaused(false); setStatus('Analyzing real frames…'); snapshotsRef.current = [];
    try {
      const q = await videoAnalysisService.measureQuality(video); setQuality(q);
      runRef.current = await videoAnalysisService.analyzeVideo(video, { confidenceThreshold: settings.confidenceThreshold, sampleEveryFrames: 3, callbacks: {
        onFrame: s => { snapshotsRef.current.push(s); setFrame(s.frameNumber); setTime(s.timeSeconds); setDetections(s.detections); },
        onProgress: (p, f, t) => { setProgress(p); setFrame(f); setTime(t); },
        onError: e => setStatus(`Analysis failed: ${e.message}`)
      }});
      const snaps = snapshotsRef.current; setStats(videoAnalysisService.buildStats(snaps)); setObjects(videoAnalysisService.buildTrackedObjects(snaps)); setStatus('Analysis completed'); setProgress(100);
    } catch (e) { setStatus(e instanceof Error ? e.message : 'Analysis failed'); } finally { setAnalyzing(false); setPaused(false); }
  };

  const pauseResume = () => { if (!runRef.current) return; if (paused) { runRef.current.resume(); setPaused(false); } else { runRef.current.pause(); setPaused(true); } };
  const stop = () => { runRef.current?.stop(); runRef.current = null; setAnalyzing(false); setPaused(false); setStatus('Analysis stopped'); };
  const capture = () => { const canvas = canvasRef.current, video = videoRef.current; if (!canvas || !video) return; canvas.width=video.videoWidth; canvas.height=video.videoHeight; const ctx=canvas.getContext('2d'); if(!ctx)return; ctx.drawImage(video,0,0); canvas.toBlob(blob=>{ if(!blob)return; const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`${fileName || 'video'}-frame-${frame}.png`; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000); }); };

  useEffect(() => { const video=videoRef.current, canvas=canvasRef.current; if(!video||!canvas)return; const draw=()=>{ if(video.videoWidth&&video.videoHeight){canvas.width=video.videoWidth;canvas.height=video.videoHeight;const ctx=canvas.getContext('2d');if(ctx){ctx.drawImage(video,0,0,canvas.width,canvas.height);for(const d of detections){if(filter!=='all'&&d.category!==filter)continue;ctx.strokeStyle=d.category==='person'?'#10B981':d.category==='car'?'#38BDF8':d.category==='bicycle'?'#A855F7':'#D4AF37';ctx.lineWidth=3;ctx.strokeRect(d.x1,d.y1,d.x2-d.x1,d.y2-d.y1);ctx.fillStyle='rgba(0,0,0,.8)';ctx.fillRect(d.x1,d.y1-22,145,22);ctx.fillStyle=ctx.strokeStyle;ctx.font='13px monospace';ctx.fillText(`${d.category.toUpperCase()} #${d.tracking_id} ${Math.round(d.confidence*100)}%`,d.x1+4,d.y1-7);}}}requestAnimationFrame(draw)};draw(); }, [detections, filter, url]);

  const counts = { person: detections.filter(d=>d.category==='person').length, car: detections.filter(d=>d.category==='car').length, bicycle: detections.filter(d=>d.category==='bicycle').length, camera: detections.filter(d=>d.category==='camera').length };
  return <div className="flex-1 overflow-y-auto bg-[#080A0D] text-white p-5"><div className="max-w-7xl mx-auto space-y-4"><header className="flex items-center justify-between"><div><h2 className="text-xl font-black tracking-wider">VIDEO ANALYSIS</h2><p className="text-xs text-[#9AA4AF]">Real uploaded video • real inference • no sample detections</p></div><div className="flex gap-2"><button onClick={()=>inputRef.current?.click()} className="px-4 py-2 bg-[#D4AF37] text-black rounded-lg text-xs font-bold"><Upload className="inline w-4 h-4 mr-1"/>ADD VIDEO</button><input ref={inputRef} hidden type="file" accept="video/mp4,video/avi,video/quicktime,video/x-matroska,video/webm" onChange={e=>e.target.files?.[0]&&loadFile(e.target.files[0])}/></div></header>
    <div className="grid grid-cols-[1fr_310px] gap-4"><section className="bg-[#11161D] border border-[#252C35] rounded-xl overflow-hidden"><div className="relative aspect-video bg-black flex items-center justify-center"><video ref={videoRef} src={url} className="absolute inset-0 w-full h-full object-contain" controls playsInline muted/><canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-contain pointer-events-none"/>{!url&&<div className="text-center text-[#68727D]"><Upload className="mx-auto w-10 h-10 mb-2"/><p>Select an MP4/AVI/MOV/MKV/WEBM file</p></div>}</div><div className="p-3 border-t border-[#252C35] flex items-center gap-2"><button disabled={!url||analyzing} onClick={analyze} className="px-3 py-2 rounded bg-[#D4AF37] text-black text-xs font-bold"><Play className="inline w-3 h-3 mr-1"/>ANALYZE</button><button disabled={!analyzing} onClick={pauseResume} className="px-3 py-2 rounded border border-[#252C35] text-xs"><Pause className="inline w-3 h-3 mr-1"/>{paused?'RESUME':'PAUSE'}</button><button disabled={!analyzing} onClick={stop} className="px-3 py-2 rounded border border-[#252C35] text-xs"><Square className="inline w-3 h-3 mr-1"/>STOP</button><button disabled={!url} onClick={capture} className="px-3 py-2 rounded border border-[#252C35] text-xs"><Download className="inline w-3 h-3 mr-1"/>CAPTURE FRAME</button><span className="ml-auto text-[10px] font-mono text-[#9AA4AF]">{fileName||'NO FILE'} • {Math.round(progress)}%</span></div><div className="h-1 bg-[#080A0D]"><div className="h-full bg-[#D4AF37]" style={{width:`${progress}%`}}/></div></section>
      <aside className="space-y-3"><div className="bg-[#11161D] border border-[#252C35] rounded-xl p-4"><div className="text-[10px] text-[#9AA4AF] uppercase">Status</div><div className="mt-1 text-sm font-bold">{status}</div><div className="mt-3 text-xs text-[#9AA4AF]">Time <b className="float-right text-white">{time.toFixed(1)}s</b></div><div className="text-xs text-[#9AA4AF]">Frame <b className="float-right text-white">{frame}</b></div></div><div className="grid grid-cols-2 gap-2">{(['person','car','bicycle','camera'] as const).map(c=><button key={c} onClick={()=>setFilter(filter===c?'all':c)} className={`p-3 text-left rounded-lg bg-[#11161D] border ${filter===c?'border-[#D4AF37]':'border-[#252C35]'}`}><div className="text-[10px] text-[#9AA4AF] uppercase">{c}</div><div className="text-2xl font-mono font-bold">{counts[c]}</div></button>)}</div><div className="bg-[#11161D] border border-[#252C35] rounded-xl p-4 text-xs"><Cpu className="inline w-3 h-3 mr-1"/>Model: {detectionService.getStatus().status}<br/>Backend: {detectionService.getStatus().device}</div></aside></div>
    <div className="grid md:grid-cols-3 gap-4"><div className="bg-[#11161D] border border-[#252C35] rounded-xl p-4"><h3 className="text-xs font-bold uppercase mb-3">Unique Objects</h3>{stats?Object.entries(stats.uniqueObjects).filter(([k])=>k!=='all').map(([k,v])=><div key={k} className="text-xs py-1">{k}<b className="float-right">{v}</b></div>):<p className="text-xs text-[#68727D]">No analysis yet.</p>}</div><div className="bg-[#11161D] border border-[#252C35] rounded-xl p-4"><h3 className="text-xs font-bold uppercase mb-3">Video Quality</h3>{quality?<><div className="text-2xl font-mono">{quality.overallScore}/100</div><div className="text-xs text-[#9AA4AF]">{quality.resolution} • brightness {quality.brightnessValue} • {quality.exposure}</div></>:<p className="text-xs text-[#68727D]">Measured when analysis starts.</p>}</div><div className="bg-[#11161D] border border-[#252C35] rounded-xl p-4"><h3 className="text-xs font-bold uppercase mb-3">Tracked Objects</h3><div className="max-h-36 overflow-y-auto">{objects.length?objects.map(o=><div key={o.trackId} className="text-xs py-1 border-b border-[#252C35]">{o.id}<span className="float-right">{Math.round(o.avgConfidence*100)}%</span></div>):<p className="text-xs text-[#68727D]">No tracked objects.</p>}</div></div></div>
  </div></div>;
};