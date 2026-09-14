import React, { useState } from 'react';
import {
  Activity,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Play,
  RotateCcw,
  Sliders,
  Terminal,
  X,
  Layers,
  Sparkles,
  Camera
} from 'lucide-react';
import {
  detectionService,
  DiagnosticsData,
  EngineTestResult,
  DetectionResult
} from '../services/detectionService';

interface AiDiagnosticsModalProps {
  currentDetections: DetectionResult[];
  cameraFps: number;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onClose: () => void;
}

export const AiDiagnosticsModal: React.FC<AiDiagnosticsModalProps> = ({
  currentDetections,
  cameraFps,
  canvasRef,
  onClose
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'diagnostics' | 'test' | 'logs'>('diagnostics');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<EngineTestResult | null>(null);

  const diagData: DiagnosticsData = detectionService.getDiagnostics(
    currentDetections,
    cameraFps
  );

  const handleRunTest = async () => {
    if (!canvasRef.current) return;
    setIsTesting(true);
    try {
      const res = await detectionService.testAiEngine(canvasRef.current);
      setTestResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-6 select-none">
      <div className="bg-[#11161D] border border-[#252C35] rounded-xl max-w-3xl w-full flex flex-col max-h-[85vh] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-[#0D1117] border-b border-[#252C35] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#161C24] border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-wider text-white uppercase">
                AI ENGINE DIAGNOSTICS & VERIFICATION
              </h3>
              <p className="text-[11px] text-[#9AA4AF]">
                Real-time neural network telemetry, genuine inference hardware, and single-frame verification
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#68727D] hover:text-white hover:bg-[#161C24] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 flex items-center gap-2 border-b border-[#252C35] bg-[#080A0D] text-xs font-bold">
          <button
            onClick={() => setActiveSubTab('diagnostics')}
            className={`py-2.5 px-3 border-b-2 transition-colors cursor-pointer ${
              activeSubTab === 'diagnostics'
                ? 'border-[#D4AF37] text-[#D4AF37]'
                : 'border-transparent text-[#9AA4AF] hover:text-white'
            }`}
          >
            LIVE TELEMETRY
          </button>
          <button
            onClick={() => setActiveSubTab('test')}
            className={`py-2.5 px-3 border-b-2 transition-colors cursor-pointer ${
              activeSubTab === 'test'
                ? 'border-[#D4AF37] text-[#D4AF37]'
                : 'border-transparent text-[#9AA4AF] hover:text-white'
            }`}
          >
            [ TEST AI ENGINE ]
          </button>
          <button
            onClick={() => setActiveSubTab('logs')}
            className={`py-2.5 px-3 border-b-2 transition-colors cursor-pointer ${
              activeSubTab === 'logs'
                ? 'border-[#D4AF37] text-[#D4AF37]'
                : 'border-transparent text-[#9AA4AF] hover:text-white'
            }`}
          >
            INFERENCE LOGS ({diagData.recentLogs.length})
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* TAB 1: DIAGNOSTICS */}
          {activeSubTab === 'diagnostics' && (
            <div className="space-y-4">
              {/* Primary Engine Status Card */}
              <div className="p-4 rounded-xl bg-[#080A0D] border border-[#252C35] flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-[#68727D] uppercase tracking-wider block">
                    AI INFERENCE ENGINE
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        diagData.modelStatus === 'ACTIVE'
                          ? 'bg-emerald-400 animate-pulse'
                          : diagData.modelStatus === 'INITIALIZING'
                          ? 'bg-amber-400 animate-pulse'
                          : 'bg-rose-500'
                      }`}
                    />
                    <span className="text-sm font-bold text-white uppercase">
                      {diagData.modelStatus === 'ACTIVE'
                        ? 'AI ENGINE: ACTIVE (REAL INFERENCE)'
                        : diagData.modelStatus === 'INITIALIZING'
                        ? 'AI ENGINE: INITIALIZING'
                        : 'AI ENGINE: NOT READY'}
                    </span>
                  </div>
                  <span className="text-xs text-[#9AA4AF] font-mono mt-0.5 block">
                    Model: {diagData.modelName}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold text-[#68727D] uppercase tracking-wider block">
                    ACTIVE HARDWARE
                  </span>
                  <span className="text-xs font-mono font-bold text-[#D4AF37] block mt-1">
                    {diagData.device}
                  </span>
                  <span className="text-[11px] text-[#68727D]">Hardware-accelerated tensors</span>
                </div>
              </div>

              {/* Grid Metrics (Separated Camera FPS vs AI FPS) */}
              <div className="grid grid-cols-3 gap-3 font-mono text-xs">
                <div className="p-3 rounded-lg bg-[#080A0D] border border-[#252C35]">
                  <span className="text-[10px] text-[#68727D] uppercase block font-sans font-bold">
                    CAMERA FRAME RATE
                  </span>
                  <div className="text-lg font-bold text-white mt-1">
                    {diagData.cameraFps} <span className="text-xs text-[#68727D]">FPS</span>
                  </div>
                  <span className="text-[10px] text-[#9AA4AF]">Input Video Stream</span>
                </div>

                <div className="p-3 rounded-lg bg-[#080A0D] border border-[#252C35]">
                  <span className="text-[10px] text-[#68727D] uppercase block font-sans font-bold">
                    AI INFERENCE RATE
                  </span>
                  <div className="text-lg font-bold text-emerald-400 mt-1">
                    {diagData.inferenceFps} <span className="text-xs text-[#68727D]">FPS</span>
                  </div>
                  <span className="text-[10px] text-[#9AA4AF]">Calculated from frame delta</span>
                </div>

                <div className="p-3 rounded-lg bg-[#080A0D] border border-[#252C35]">
                  <span className="text-[10px] text-[#68727D] uppercase block font-sans font-bold">
                    LAST INFERENCE TIME
                  </span>
                  <div className="text-lg font-bold text-sky-400 mt-1">
                    {diagData.lastInferenceMs} <span className="text-xs text-[#68727D]">ms</span>
                  </div>
                  <span className="text-[10px] text-[#9AA4AF]">Neural forward pass</span>
                </div>
              </div>

              {/* Real Counts vs Unique Counts Breakdown (Requirement 6) */}
              <div className="p-4 rounded-xl bg-[#080A0D] border border-[#252C35] space-y-3 font-mono">
                <div className="flex items-center justify-between border-b border-[#252C35] pb-2 font-sans">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#D4AF37]">
                    GENUINE OBJECT COUNTS BREAKDOWN
                  </span>
                  <span className="text-[10px] text-[#68727D]">Zero Mock / Zero Hardcoded</span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  {/* Currently Visible Column */}
                  <div className="space-y-2 bg-[#11161D] p-3 rounded-lg border border-[#252C35]">
                    <span className="text-[11px] font-sans font-bold text-white block">
                      CURRENTLY VISIBLE (THIS FRAME):
                    </span>
                    <div className="flex justify-between">
                      <span className="text-[#9AA4AF]">People:</span>
                      <span className="text-emerald-400 font-bold">{diagData.currentCounts.person}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#9AA4AF]">Cars:</span>
                      <span className="text-sky-400 font-bold">{diagData.currentCounts.car}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#9AA4AF]">Bicycles:</span>
                      <span className="text-purple-400 font-bold">{diagData.currentCounts.bicycle}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#9AA4AF]">Cameras:</span>
                      <span className="text-[#D4AF37] font-bold">{diagData.currentCounts.camera}</span>
                    </div>
                  </div>

                  {/* Unique Tracked Column */}
                  <div className="space-y-2 bg-[#11161D] p-3 rounded-lg border border-[#252C35]">
                    <span className="text-[11px] font-sans font-bold text-white block">
                      UNIQUE TRACKED OBJECTS (SESSION):
                    </span>
                    <div className="flex justify-between">
                      <span className="text-[#9AA4AF]">People (Unique IDs):</span>
                      <span className="text-emerald-400 font-bold">{diagData.uniqueTrackedCounts.person}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#9AA4AF]">Cars (Unique IDs):</span>
                      <span className="text-sky-400 font-bold">{diagData.uniqueTrackedCounts.car}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#9AA4AF]">Bicycles (Unique IDs):</span>
                      <span className="text-purple-400 font-bold">{diagData.uniqueTrackedCounts.bicycle}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#9AA4AF]">Cameras (Unique IDs):</span>
                      <span className="text-[#D4AF37] font-bold">{diagData.uniqueTrackedCounts.camera}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tracking Algorithm Status */}
              <div className="p-3 rounded-lg bg-[#080A0D] border border-[#252C35] flex items-center justify-between text-xs font-mono">
                <div>
                  <span className="text-[#68727D]">Tracking Architecture: </span>
                  <span className="text-white font-bold">{diagData.trackingMethod}</span>
                </div>
                <button
                  onClick={() => detectionService.resetTracking()}
                  className="px-2.5 py-1 rounded bg-[#161C24] hover:bg-[#1C232B] text-slate-200 border border-[#252C35] text-[11px] font-semibold cursor-pointer"
                >
                  Reset Tracker IDs
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: MODEL TEST BUTTON (Requirement 18) */}
          {activeSubTab === 'test' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#080A0D] border border-[#252C35] space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-white block font-sans">
                  STANDALONE AI ENGINE VERIFICATION
                </span>
                <p className="text-xs text-[#9AA4AF]">
                  Captures one single actual frame directly from the active camera canvas, passes it into the neural network, and reports the exact model outputs without any caching or interpolation.
                </p>

                <button
                  onClick={handleRunTest}
                  disabled={isTesting}
                  className="mt-2 px-4 py-2 rounded-lg bg-[#D4AF37] hover:bg-[#E5C158] text-[#080A0D] font-bold text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {isTesting ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                      <span>INSPECTING FRAME WITH NEURAL NETWORK...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>[ TEST AI ENGINE NOW ]</span>
                    </>
                  )}
                </button>
              </div>

              {testResult && (
                <div className="p-4 rounded-xl bg-[#080A0D] border border-[#252C35] space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between border-b border-[#252C35] pb-2 font-sans">
                    <span className="font-bold text-white text-xs uppercase">
                      AI ENGINE TEST RESULTS ({testResult.timestamp})
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        testResult.inferenceSuccess
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-rose-950 text-rose-400 border border-rose-800'
                      }`}
                    >
                      {testResult.inferenceSuccess ? 'SUCCESS' : 'FAILED'}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-[#9AA4AF]">Model Loaded:</span>
                      <span className="text-white font-bold">{testResult.modelLoaded ? 'YES' : 'NO'}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-[#9AA4AF]">Camera Frame Captured:</span>
                      <span className="text-white font-bold">{testResult.frameCaptured ? 'YES' : 'NO'}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-[#9AA4AF]">Inference Hardware:</span>
                      <span className="text-[#D4AF37] font-bold">{testResult.device}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-[#9AA4AF]">Inference Duration:</span>
                      <span className="text-sky-400 font-bold">{testResult.inferenceTimeMs} ms</span>
                    </div>
                  </div>

                  {/* Actual Detections List */}
                  <div className="pt-2 border-t border-[#252C35] space-y-1.5">
                    <span className="text-[11px] font-sans font-bold text-white block">
                      ACTUAL DETECTIONS:
                    </span>
                    {testResult.detectedCount === 0 ? (
                      <div className="p-3 rounded bg-[#11161D] text-[#9AA4AF] text-center">
                        Detections: None (No supported objects in frame)
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {testResult.detections.map((d, i) => (
                          <div
                            key={i}
                            className="p-2 rounded bg-[#11161D] border border-[#252C35] flex items-center justify-between"
                          >
                            <span className="font-bold text-white uppercase">{d.class_name}</span>
                            <span className="text-emerald-400 font-bold">{Math.round(d.confidence * 100)}%</span>
                            <span className="text-[#68727D] text-[10px]">
                              bbox: [{Math.round(d.bbox[0])}, {Math.round(d.bbox[1])}, {Math.round(d.bbox[2])}, {Math.round(d.bbox[3])}]
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: LOGS */}
          {activeSubTab === 'logs' && (
            <div className="p-4 rounded-xl bg-[#080A0D] border border-[#252C35] font-mono text-[11px] text-[#9AA4AF] space-y-1 max-h-96 overflow-y-auto">
              {diagData.recentLogs.map((log, index) => (
                <div key={index} className="hover:text-white transition-colors">
                  {log}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
