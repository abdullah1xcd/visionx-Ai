import React, { useState } from 'react';
import { Download, Film, Check, X, Shield, Sparkles, Layers, Video } from 'lucide-react';
import { VideoFileItem } from '../../types';

interface VideoExportModalProps {
  video: VideoFileItem;
  onClose: () => void;
}

export const VideoExportModal: React.FC<VideoExportModalProps> = ({ video, onClose }) => {
  const [exportType, setExportType] = useState<'analyzed' | 'enhanced' | 'original'>('analyzed');
  const [includeAudio, setIncludeAudio] = useState(true);
  const [exportResolution, setExportResolution] = useState('1080p');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  const handleStartExport = () => {
    setIsExporting(true);
    setExportProgress(0);

    const interval = setInterval(() => {
      setExportProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsExporting(false);
          setIsCompleted(true);
          return 100;
        }
        return prev + 15;
      });
    }, 200);
  };

  const getTargetFilename = () => {
    const base = video.filename.replace(/\.[^/.]+$/, '');
    if (exportType === 'original') return `${base}_original.mp4`;
    if (exportType === 'enhanced') return `${base}_enhanced_clahe.mp4`;
    return `${base}_analyzed_yolo.mp4`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-6 select-none">
      <div className="bg-[#11161D] border border-[#252C35] rounded-xl max-w-xl w-full flex flex-col overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-[#0D1117] border-b border-[#252C35] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-[#D4AF37]" />
            <span className="text-xs font-black tracking-wider text-white uppercase">
              EXPORT ANALYZED VIDEO
            </span>
          </div>

          <button
            onClick={onClose}
            className="text-[#68727D] hover:text-white p-1 rounded transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-4 text-xs text-[#F4F6F8] bg-[#080A0D]">
          <div>
            <label className="block text-[#9AA4AF] font-bold mb-2 uppercase text-[10px] tracking-wider">
              Select Video Render Mode:
            </label>

            <div className="space-y-2">
              {/* Option 1: AI Detection Video */}
              <label
                onClick={() => setExportType('analyzed')}
                className={`p-3 rounded-lg border flex items-start gap-3 cursor-pointer transition-all ${
                  exportType === 'analyzed'
                    ? 'bg-[#161C24] border-[#D4AF37] text-white shadow-sm'
                    : 'bg-[#11161D] border-[#252C35] text-[#9AA4AF] hover:text-white'
                }`}
              >
                <Layers className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-bold flex items-center justify-between">
                    <span>AI Detection Overlay Video</span>
                    {exportType === 'analyzed' && (
                      <span className="text-[10px] font-mono font-bold text-[#D4AF37]">SELECTED</span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#68727D] mt-0.5">
                    Includes bounding boxes, tracking ID labels (e.g. PERSON #12), confidence scores, and forensic timestamp.
                  </p>
                </div>
              </label>

              {/* Option 2: Enhanced Video */}
              <label
                onClick={() => setExportType('enhanced')}
                className={`p-3 rounded-lg border flex items-start gap-3 cursor-pointer transition-all ${
                  exportType === 'enhanced'
                    ? 'bg-[#161C24] border-[#D4AF37] text-white shadow-sm'
                    : 'bg-[#11161D] border-[#252C35] text-[#9AA4AF] hover:text-white'
                }`}
              >
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-bold flex items-center justify-between">
                    <span>Enhanced Video (CLAHE + Denoise)</span>
                    {exportType === 'enhanced' && (
                      <span className="text-[10px] font-mono font-bold text-[#D4AF37]">SELECTED</span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#68727D] mt-0.5">
                    Full frame stream treated with adaptive histogram equalization and unsharp sharpening filters.
                  </p>
                </div>
              </label>

              {/* Option 3: Original Video */}
              <label
                onClick={() => setExportType('original')}
                className={`p-3 rounded-lg border flex items-start gap-3 cursor-pointer transition-all ${
                  exportType === 'original'
                    ? 'bg-[#161C24] border-[#D4AF37] text-white shadow-sm'
                    : 'bg-[#11161D] border-[#252C35] text-[#9AA4AF] hover:text-white'
                }`}
              >
                <Video className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-bold flex items-center justify-between">
                    <span>Original Source Video</span>
                    {exportType === 'original' && (
                      <span className="text-[10px] font-mono font-bold text-[#D4AF37]">SELECTED</span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#68727D] mt-0.5">
                    Pristine, untouched footage without any artificial graphics or computational filters.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Export Settings */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-[#9AA4AF] font-semibold mb-1">Target Resolution:</label>
              <select
                value={exportResolution}
                onChange={(e) => setExportResolution(e.target.value)}
                className="w-full bg-[#11161D] border border-[#252C35] rounded-lg px-2.5 py-1.5 text-white font-mono"
              >
                <option value="1080p">1920 × 1080 (Native 1080p)</option>
                <option value="720p">1280 × 720 (High-Speed Encode)</option>
              </select>
            </div>

            <div>
              <label className="block text-[#9AA4AF] font-semibold mb-1">Codec & Format:</label>
              <input
                type="text"
                disabled
                value="H.264 / MP4 (Universal Playback)"
                className="w-full bg-[#11161D] border border-[#252C35] rounded-lg px-2.5 py-1.5 text-[#9AA4AF] font-mono"
              />
            </div>
          </div>

          {/* Export Progress Bar */}
          {isExporting && (
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-white">Rendering stream: {exportProgress}%</span>
                <span className="text-[#D4AF37]">Encoding H.264...</span>
              </div>
              <div className="w-full h-2 bg-[#11161D] rounded-full overflow-hidden border border-[#252C35]">
                <div
                  className="h-full bg-[#D4AF37] transition-all duration-200"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
            </div>
          )}

          {isCompleted && (
            <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-400 flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>
                Export complete: <strong className="text-white font-mono">{getTargetFilename()}</strong> saved to{' '}
                <span className="text-emerald-300 font-mono">data/videos/analyzed/</span>
              </span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-[#0D1117] border-t border-[#252C35] flex items-center justify-between">
          <span className="text-[10px] font-mono text-[#68727D]">
            Output: data/videos/{exportType === 'enhanced' ? 'enhanced' : 'analyzed'}/{getTargetFilename()}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-[#161C24] hover:bg-[#1C232B] text-[#9AA4AF] text-xs font-semibold cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              disabled={isExporting}
              onClick={handleStartExport}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-[#D4AF37] hover:bg-[#E5C158] text-[#080A0D] text-xs font-bold uppercase tracking-wider cursor-pointer shadow-sm disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? 'Encoding...' : 'Export Video'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
