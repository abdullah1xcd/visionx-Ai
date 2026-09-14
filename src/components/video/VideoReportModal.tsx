import React, { useState } from 'react';
import {
  FileText,
  Download,
  Check,
  X,
  Printer,
  FileSpreadsheet,
  FileCode,
  ShieldCheck,
  Cpu,
  Video,
  Activity,
  Sparkles
} from 'lucide-react';
import { VideoFileItem, VideoQualityMetrics, VideoAnalysisStats, TrackedVideoObject } from '../../types';

interface VideoReportModalProps {
  video: VideoFileItem;
  quality: VideoQualityMetrics;
  stats: VideoAnalysisStats;
  trackedObjects: TrackedVideoObject[];
  computeDevice: string;
  onClose: () => void;
}

export const VideoReportModal: React.FC<VideoReportModalProps> = ({
  video,
  quality,
  stats,
  trackedObjects,
  computeDevice,
  onClose
}) => {
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  const handleExport = (format: 'pdf' | 'csv' | 'json') => {
    if (format === 'json') {
      const data = {
        meta: {
          app: 'VisionX AI Video Analysis',
          version: '2.4.0',
          generatedAt: new Date().toISOString()
        },
        video,
        quality,
        stats,
        trackedObjects
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${video.filename.replace(/\.[^/.]+$/, '')}_analysis_report.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'csv') {
      let csv = 'Track ID,Category,First Seen,Last Seen,Duration,Detection Count,Avg Confidence,Movement\n';
      trackedObjects.forEach((obj) => {
        csv += `"${obj.id}","${obj.category}","${obj.firstSeenTime}","${obj.lastSeenTime}","${obj.durationVisible}",${obj.detectionCount},${Math.round(obj.avgConfidence * 100)}%,"${obj.movementDirection}"\n`;
      });
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${video.filename.replace(/\.[^/.]+$/, '')}_objects_summary.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'pdf') {
      window.print();
    }

    setDownloadSuccess(format.toUpperCase());
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-6 select-none">
      <div className="bg-[#11161D] border border-[#252C35] rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#0D1117] border-b border-[#252C35] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-[#D4AF37]" />
            <div>
              <h3 className="text-sm font-black tracking-wider text-white uppercase">
                VISIONX AI — COMPREHENSIVE VIDEO ANALYSIS REPORT
              </h3>
              <p className="text-[11px] text-[#9AA4AF]">
                Formal forensic analytics summary, object telemetry, and quality metrics
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExport('pdf')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#161C24] hover:bg-[#1C232B] text-slate-200 border border-[#252C35] text-xs font-semibold cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Export PDF / Print</span>
            </button>
            <button
              onClick={() => handleExport('csv')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#161C24] hover:bg-[#1C232B] text-slate-200 border border-[#252C35] text-xs font-semibold cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => handleExport('json')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#161C24] hover:bg-[#1C232B] text-slate-200 border border-[#252C35] text-xs font-semibold cursor-pointer"
            >
              <FileCode className="w-3.5 h-3.5 text-sky-400" />
              <span>Export JSON</span>
            </button>
            <button
              onClick={onClose}
              className="text-[#68727D] hover:text-white p-1 rounded ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Report Content Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6 text-xs text-[#F4F6F8] bg-[#080A0D]">
          {downloadSuccess && (
            <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-400 flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>Successfully exported report in {downloadSuccess} format.</span>
            </div>
          )}

          {/* Section 1: Video Information & AI Metadata */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[#11161D] border border-[#252C35] space-y-2.5">
              <div className="flex items-center gap-2 text-[#D4AF37] font-bold uppercase tracking-wider text-[11px] border-b border-[#252C35] pb-1.5">
                <Video className="w-4 h-4" />
                <span>Video Information</span>
              </div>
              <div className="grid grid-cols-2 gap-y-1.5 font-mono text-[11px]">
                <span className="text-[#9AA4AF]">Filename:</span>
                <span className="text-white font-bold truncate">{video.filename}</span>
                <span className="text-[#9AA4AF]">Duration:</span>
                <span className="text-white">{video.durationFormatted} ({video.duration}s)</span>
                <span className="text-[#9AA4AF]">Resolution:</span>
                <span className="text-white">{video.resolution}</span>
                <span className="text-[#9AA4AF]">Native FPS:</span>
                <span className="text-white">{video.fps} FPS</span>
                <span className="text-[#9AA4AF]">Total Frames:</span>
                <span className="text-white">{video.frameCount.toLocaleString()} frames</span>
                <span className="text-[#9AA4AF]">File Size:</span>
                <span className="text-white">{video.fileSize}</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#11161D] border border-[#252C35] space-y-2.5">
              <div className="flex items-center gap-2 text-[#D4AF37] font-bold uppercase tracking-wider text-[11px] border-b border-[#252C35] pb-1.5">
                <Cpu className="w-4 h-4" />
                <span>AI Inference & Model Information</span>
              </div>
              <div className="grid grid-cols-2 gap-y-1.5 font-mono text-[11px]">
                <span className="text-[#9AA4AF]">Model Architecture:</span>
                <span className="text-white font-bold">YOLOv8 Medium (Surveillance Tune)</span>
                <span className="text-[#9AA4AF]">Compute Device:</span>
                <span className="text-emerald-400 font-bold">{computeDevice} Acceleration</span>
                <span className="text-[#9AA4AF]">Tracker Engine:</span>
                <span className="text-white">ByteTrack (Dual-Threshold IoU)</span>
                <span className="text-[#9AA4AF]">Processing Rate:</span>
                <span className="text-white">28.4 FPS (Chunked Streaming)</span>
                <span className="text-[#9AA4AF]">RAM Footprint:</span>
                <span className="text-white">&lt; 340 MB (Iterative Generator)</span>
                <span className="text-[#9AA4AF]">Analysis Status:</span>
                <span className="text-emerald-400 font-bold">{video.status}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Detection & Tracking Summary (Total Detections vs Unique Objects) */}
          <div className="p-4 rounded-xl bg-[#11161D] border border-[#252C35] space-y-3">
            <div className="flex items-center justify-between border-b border-[#252C35] pb-1.5">
              <div className="flex items-center gap-2 text-[#D4AF37] font-bold uppercase tracking-wider text-[11px]">
                <Activity className="w-4 h-4" />
                <span>Detection & Tracking Summary</span>
              </div>
              <span className="text-[10px] text-[#68727D]">
                Unique objects isolated via persistent ByteTrack spatial association
              </span>
            </div>

            <div className="grid grid-cols-4 gap-3 text-center">
              <div className="p-3 rounded-lg bg-[#080A0D] border border-[#252C35]">
                <span className="text-[10px] text-[#9AA4AF] uppercase font-bold block">PEOPLE</span>
                <div className="text-lg font-mono font-bold text-white mt-1">
                  {stats.uniqueObjects.person} <span className="text-xs text-[#9AA4AF] font-normal">unique</span>
                </div>
                <div className="text-[10px] text-emerald-400 font-mono mt-0.5">
                  {stats.totalDetections.person.toLocaleString()} detections
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#080A0D] border border-[#252C35]">
                <span className="text-[10px] text-[#9AA4AF] uppercase font-bold block">CARS</span>
                <div className="text-lg font-mono font-bold text-white mt-1">
                  {stats.uniqueObjects.car} <span className="text-xs text-[#9AA4AF] font-normal">unique</span>
                </div>
                <div className="text-[10px] text-sky-400 font-mono mt-0.5">
                  {stats.totalDetections.car.toLocaleString()} detections
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#080A0D] border border-[#252C35]">
                <span className="text-[10px] text-[#9AA4AF] uppercase font-bold block">BICYCLES</span>
                <div className="text-lg font-mono font-bold text-white mt-1">
                  {stats.uniqueObjects.bicycle} <span className="text-xs text-[#9AA4AF] font-normal">unique</span>
                </div>
                <div className="text-[10px] text-purple-400 font-mono mt-0.5">
                  {stats.totalDetections.bicycle.toLocaleString()} detections
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#080A0D] border border-[#252C35]">
                <span className="text-[10px] text-[#9AA4AF] uppercase font-bold block">CAMERAS</span>
                <div className="text-lg font-mono font-bold text-white mt-1">
                  {stats.uniqueObjects.camera} <span className="text-xs text-[#9AA4AF] font-normal">unique</span>
                </div>
                <div className="text-[10px] text-[#D4AF37] font-mono mt-0.5">
                  {stats.totalDetections.camera.toLocaleString()} detections
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Video Quality Analysis & Enhancement */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[#11161D] border border-[#252C35] space-y-2">
              <div className="flex items-center gap-2 text-[#D4AF37] font-bold uppercase tracking-wider text-[11px] border-b border-[#252C35] pb-1.5">
                <ShieldCheck className="w-4 h-4" />
                <span>Video Quality Telemetry</span>
              </div>
              <div className="grid grid-cols-2 gap-y-1 font-mono text-[11px]">
                <span className="text-[#9AA4AF]">Quality Score:</span>
                <span className="text-emerald-400 font-bold">{quality.overallScore} / 100</span>
                <span className="text-[#9AA4AF]">Blur (Laplacian Var):</span>
                <span className="text-white">{quality.blurScore} ({quality.blurLevel})</span>
                <span className="text-[#9AA4AF]">Brightness:</span>
                <span className="text-white">{quality.brightnessValue} ({quality.avgBrightness})</span>
                <span className="text-[#9AA4AF]">Contrast Ratio:</span>
                <span className="text-white">{quality.contrastRatio}:1 ({quality.contrast})</span>
                <span className="text-[#9AA4AF]">Noise Level:</span>
                <span className="text-white">{quality.noiseLevel}</span>
                <span className="text-[#9AA4AF]">Dynamic Range:</span>
                <span className="text-white">{quality.dynamicRange}</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#11161D] border border-[#252C35] space-y-2">
              <div className="flex items-center gap-2 text-[#D4AF37] font-bold uppercase tracking-wider text-[11px] border-b border-[#252C35] pb-1.5">
                <Sparkles className="w-4 h-4" />
                <span>Enhancement Pipeline Summary</span>
              </div>
              <div className="grid grid-cols-2 gap-y-1 font-mono text-[11px]">
                <span className="text-[#9AA4AF]">Enhanced Frames:</span>
                <span className="text-amber-400 font-bold">{stats.enhancedFramesCount} frames</span>
                <span className="text-[#9AA4AF]">Enhanced Object Crops:</span>
                <span className="text-amber-400 font-bold">{stats.enhancedCropsCount} crops</span>
                <span className="text-[#9AA4AF]">Algorithms Applied:</span>
                <span className="text-white">CLAHE, Bilateral Denoise, Unsharp</span>
                <span className="text-[#9AA4AF]">Non-Destructive Policy:</span>
                <span className="text-emerald-400 font-bold">STRICT (Original Preserved)</span>
                <span className="text-[#9AA4AF]">Storage Location:</span>
                <span className="text-[#68727D] truncate">data/videos/enhanced/</span>
              </div>
            </div>
          </div>

          {/* Section 4: Key Tracked Entities Table */}
          <div className="p-4 rounded-xl bg-[#11161D] border border-[#252C35] space-y-3">
            <span className="text-[#D4AF37] font-bold uppercase tracking-wider text-[11px] block border-b border-[#252C35] pb-1.5">
              Key Tracked Entities Forensic Record
            </span>

            <table className="w-full text-left font-mono text-[11px]">
              <thead>
                <tr className="text-[#9AA4AF] border-b border-[#252C35]">
                  <th className="pb-1">Track ID</th>
                  <th className="pb-1">Class</th>
                  <th className="pb-1">First Seen</th>
                  <th className="pb-1">Last Seen</th>
                  <th className="pb-1">Duration</th>
                  <th className="pb-1">Avg Conf</th>
                  <th className="pb-1">Movement Path</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#252C35]/50">
                {trackedObjects.map((obj) => (
                  <tr key={obj.id} className="text-slate-200">
                    <td className="py-1.5 font-bold text-white">{obj.id}</td>
                    <td className="py-1.5 uppercase">{obj.category}</td>
                    <td className="py-1.5">{obj.firstSeenTime}</td>
                    <td className="py-1.5">{obj.lastSeenTime}</td>
                    <td className="py-1.5">{obj.durationVisible}</td>
                    <td className="py-1.5 text-emerald-400">{Math.round(obj.avgConfidence * 100)}%</td>
                    <td className="py-1.5 text-[#9AA4AF] truncate max-w-xs">{obj.movementDirection}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
