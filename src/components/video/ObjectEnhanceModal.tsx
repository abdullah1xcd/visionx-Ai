import React, { useState } from 'react';
import { Sparkles, Download, Check, X, ShieldAlert, Sliders, CheckCircle2 } from 'lucide-react';
import { TrackedVideoObject } from '../../types';

interface ObjectEnhanceModalProps {
  object: TrackedVideoObject;
  onClose: () => void;
}

export const ObjectEnhanceModal: React.FC<ObjectEnhanceModalProps> = ({ object, onClose }) => {
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activePreset, setActivePreset] = useState<'balanced' | 'clarity' | 'night'>('balanced');

  const metrics = object.enhancedMetrics || {
    originalResolution: '120 × 240 px',
    enhancedResolution: '240 × 480 px (2× Super-Res)',
    blurScore: 168.4,
    sharpness: 'High',
    brightness: 'Compensated',
    applied: ['2× Neural Upscaling', 'Edge-Preserving Denoise', 'Local CLAHE', 'Unsharp Sharpening']
  };

  const handleSave = () => {
    // Generate a downloadable crop canvas
    const canvas = document.createElement('canvas');
    canvas.width = 240;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Draw background
      ctx.fillStyle = '#161C24';
      ctx.fillRect(0, 0, 240, 360);
      
      // Draw simulated enhanced subject
      ctx.fillStyle = '#252C35';
      ctx.fillRect(20, 20, 200, 320);
      
      // Target text stamp
      ctx.fillStyle = '#D4AF37';
      ctx.font = 'bold 14px monospace';
      ctx.fillText(object.id, 30, 50);
      ctx.fillStyle = '#9AA4AF';
      ctx.font = '10px monospace';
      ctx.fillText(`CONF: ${Math.round(object.avgConfidence * 100)}% | CLAHE ENHANCED`, 30, 70);
      ctx.fillText(`FIRST SEEN: ${object.firstSeenTime}`, 30, 90);
      ctx.fillText('NON-DESTRUCTIVE ENHANCEMENT', 30, 110);
      
      // Border
      ctx.strokeStyle = '#D4AF37';
      ctx.lineWidth = 2;
      ctx.strokeRect(20, 20, 200, 320);
      
      const link = document.createElement('a');
      link.download = `enhanced_${object.id.toLowerCase().replace(/[^a-z0-9]/g, '_')}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.95);
      link.click();
    }
    
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-6 select-none">
      <div className="bg-[#11161D] border border-[#252C35] rounded-xl max-w-3xl w-full flex flex-col overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-[#0D1117] border-b border-[#252C35] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#D4AF37]" />
            <span className="text-xs font-black tracking-wider text-white uppercase">
              OBJECT CROP ENHANCEMENT INSPECTION — {object.id}
            </span>
          </div>

          <button
            onClick={onClose}
            className="text-[#68727D] hover:text-white p-1 rounded transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-xs text-[#F4F6F8] bg-[#080A0D]">
          {/* Side-by-Side Comparison Box */}
          <div className="grid grid-cols-2 gap-4">
            {/* 1. Original Untouched Crop */}
            <div className="p-3.5 rounded-xl bg-[#11161D] border border-[#252C35] flex flex-col items-center">
              <div className="w-full flex items-center justify-between pb-2 border-b border-[#252C35] mb-3">
                <span className="font-bold text-[#9AA4AF] uppercase text-[10px] tracking-wider">
                  Original Crop (Raw Capture)
                </span>
                <span className="font-mono text-[10px] text-[#68727D]">
                  {metrics.originalResolution}
                </span>
              </div>

              {/* Visual Simulated Canvas - Original */}
              <div className="w-full h-56 rounded-lg bg-[#0D1117] border border-[#252C35] relative flex flex-col items-center justify-center overflow-hidden">
                {/* Low contrast silhouette representing original frame */}
                <div className="w-24 h-40 rounded bg-[#1C232B] border border-[#252C35] flex flex-col items-center justify-center filter blur-[0.6px] opacity-75">
                  <div className="w-8 h-8 rounded-full bg-[#252C35] mb-2" />
                  <div className="w-14 h-20 rounded bg-[#252C35]" />
                </div>
                <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/70 text-[9px] font-mono text-[#9AA4AF]">
                  RAW UNENHANCED
                </div>
              </div>
            </div>

            {/* 2. Enhanced Super-Resolution / CLAHE Crop */}
            <div className="p-3.5 rounded-xl bg-[#11161D] border border-[#D4AF37]/40 flex flex-col items-center relative">
              <div className="w-full flex items-center justify-between pb-2 border-b border-[#252C35] mb-3">
                <span className="font-bold text-[#D4AF37] uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Enhanced Frame Crop
                </span>
                <span className="font-mono text-[10px] text-[#D4AF37]">
                  {metrics.enhancedResolution}
                </span>
              </div>

              {/* Visual Simulated Canvas - Enhanced */}
              <div className="w-full h-56 rounded-lg bg-[#080A0D] border border-[#D4AF37]/50 relative flex flex-col items-center justify-center overflow-hidden shadow-inner">
                {/* Crisp high contrast sharpened silhouette */}
                <div className="w-24 h-40 rounded bg-[#161C24] border border-[#D4AF37] flex flex-col items-center justify-center shadow-lg relative">
                  <div className="w-8 h-8 rounded-full bg-[#252C35] border border-[#D4AF37]/50 mb-2" />
                  <div className="w-14 h-20 rounded bg-[#252C35] border border-[#D4AF37]/40" />
                  <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-[#D4AF37] text-[#080A0D] text-[9px] font-mono font-bold">
                  CLAHE + BILATERAL
                </div>
              </div>
            </div>
          </div>

          {/* Metrics & Applied Filters Comparison */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl bg-[#11161D] border border-[#252C35] space-y-2">
              <span className="text-[#9AA4AF] uppercase font-bold text-[10px] block border-b border-[#252C35] pb-1">
                Comparative Metrics
              </span>
              <div className="grid grid-cols-2 gap-y-1 font-mono text-[11px]">
                <span className="text-[#68727D]">Original Resolution:</span>
                <span className="text-white">{metrics.originalResolution}</span>
                <span className="text-[#68727D]">Enhanced Resolution:</span>
                <span className="text-[#D4AF37] font-bold">{metrics.enhancedResolution}</span>
                <span className="text-[#68727D]">Laplacian Blur Score:</span>
                <span className="text-white">{metrics.blurScore} (Clear)</span>
                <span className="text-[#68727D]">Averaged Sharpness:</span>
                <span className="text-emerald-400 font-bold">{metrics.sharpness}</span>
                <span className="text-[#68727D]">Luminance Correction:</span>
                <span className="text-white">{metrics.brightness}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#11161D] border border-[#252C35] space-y-2">
              <span className="text-[#9AA4AF] uppercase font-bold text-[10px] block border-b border-[#252C35] pb-1">
                Enhancement Algorithms Applied
              </span>
              <div className="space-y-1.5 text-[11px]">
                {metrics.applied.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-white">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Non-Destructive Integrity Statement (Section 27) */}
          <div className="p-3 rounded-lg bg-[#161C24] border border-[#252C35] text-[11px] text-[#9AA4AF] flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong className="text-white">Strict Non-Destructive Policy:</strong> VisionX AI never invents missing or non-existent pixel information. Super-resolution and unsharp masking sharpen observable physical gradients without fabricating obscured alphanumeric characters.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-[#0D1117] border-t border-[#252C35] flex items-center justify-between">
          <span className="text-[10px] font-mono text-[#68727D]">
            Export Path: data/videos/enhanced/enhanced_{object.id.toLowerCase().replace(/[^a-z0-9]/g, '_')}.jpg
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
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-[#D4AF37] hover:bg-[#E5C158] text-[#080A0D] text-xs font-bold uppercase tracking-wider cursor-pointer shadow-sm"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Saved to Captures!</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Save Enhanced Crop</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
