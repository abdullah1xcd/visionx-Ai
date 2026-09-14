import React from 'react';
import { Camera, Cpu, Activity, Moon, Minus, Square, X, Terminal } from 'lucide-react';
import { NightVisionMode } from '../types';

interface TitleBarProps {
  activeCameraName: string;
  fps: number;
  computeDevice: 'CUDA' | 'CPU';
  nightVisionMode: NightVisionMode;
  isNightVisionActive: boolean;
  onToggleDevice: () => void;
  onCycleNightVision: () => void;
  onOpenCode: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  activeCameraName,
  fps,
  computeDevice,
  nightVisionMode,
  isNightVisionActive,
  onToggleDevice,
  onCycleNightVision,
  onOpenCode
}) => {
  return (
    <div className="h-10 bg-[#080A0D] border-b border-[#252C35] flex items-center justify-between px-4 select-none shrink-0">
      {/* Title & Brand */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-[#F4F6F8] font-bold text-xs tracking-wider">
          <span className="text-[#D4AF37] font-black tracking-widest">VISIONX AI</span>
          <span className="text-[#68727D]">|</span>
          <span className="text-[#9AA4AF] font-medium hidden sm:inline">Intelligent Computer Vision & Object Analysis</span>
        </div>
      </div>

      {/* Telemetry quick indicators */}
      <div className="flex items-center gap-3 text-xs">
        {/* Active Camera Status */}
        <div className="flex items-center gap-1.5 text-[#F4F6F8]">
          <Camera className="w-3.5 h-3.5 text-[#D4AF37]" />
          <span className="font-medium text-slate-200">{activeCameraName}</span>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            ONLINE
          </span>
        </div>

        {/* FPS Counter */}
        <div className="flex items-center gap-1 text-[#D4AF37] font-semibold text-xs px-2 py-0.5 bg-[#11161D] rounded border border-[#252C35]">
          <Activity className="w-3 h-3 text-[#D4AF37]" />
          <span>{fps} FPS</span>
        </div>

        {/* Compute Device */}
        <button
          onClick={onToggleDevice}
          title="Click to toggle CUDA GPU / CPU Engine"
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded border text-[11px] font-semibold transition-colors cursor-pointer ${
            computeDevice === 'CUDA'
              ? 'bg-[#161C24] text-[#D4AF37] border-[#D4AF37]/40 hover:bg-[#1C232B]'
              : 'bg-[#11161D] text-[#9AA4AF] border-[#252C35] hover:bg-[#161C24]'
          }`}
        >
          <Cpu className="w-3 h-3" />
          <span>{computeDevice}</span>
        </button>

        {/* Night Vision Quick Indicator */}
        <button
          onClick={onCycleNightVision}
          title="Click to cycle Night Vision Mode (Auto / Day / Night)"
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded border text-[11px] font-semibold transition-colors cursor-pointer ${
            isNightVisionActive
              ? 'bg-amber-950/40 text-amber-300 border-amber-600/50 hover:bg-amber-900/40'
              : 'bg-[#11161D] text-[#9AA4AF] border-[#252C35] hover:bg-[#161C24]'
          }`}
        >
          <Moon className="w-3 h-3 text-[#D4AF37]" />
          <span>NV: {nightVisionMode.toUpperCase()}</span>
        </button>

        {/* Backend & PySide6 Code Viewer */}
        <button
          onClick={onOpenCode}
          title="View native Python / PySide6 implementation and build specs"
          className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#11161D] hover:bg-[#161C24] text-[#9AA4AF] hover:text-[#F4F6F8] border border-[#252C35] text-[11px] font-semibold transition-colors cursor-pointer"
        >
          <Terminal className="w-3 h-3 text-[#D4AF37]" />
          <span>Python Backend</span>
        </button>

        {/* Windows Titlebar Controls */}
        <div className="flex items-center gap-1.5 pl-2 border-l border-[#252C35] text-[#68727D]">
          <button className="hover:text-white p-1 rounded hover:bg-[#161C24] transition-colors" title="Minimize">
            <Minus className="w-3 h-3" />
          </button>
          <button className="hover:text-white p-1 rounded hover:bg-[#161C24] transition-colors" title="Maximize">
            <Square className="w-2.5 h-2.5" />
          </button>
          <button className="hover:text-rose-400 p-1 rounded hover:bg-[#161C24] transition-colors" title="Close">
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
