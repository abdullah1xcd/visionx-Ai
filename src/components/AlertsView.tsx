import React from 'react';
import { AlertTriangle, Info, ShieldAlert, Check } from 'lucide-react';
import { SystemAlert } from '../types';

interface AlertsViewProps {
  alerts: SystemAlert[];
  onAcknowledgeAlert: (id: number) => void;
  onAcknowledgeAll: () => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({
  alerts,
  onAcknowledgeAlert,
  onAcknowledgeAll
}) => {
  return (
    <div className="flex-1 p-6 overflow-y-auto bg-[#080A0D] text-[#F4F6F8]">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#252C35] pb-4">
          <div>
            <h2 className="text-xl font-black tracking-wide text-white uppercase">
              SYSTEM & DETECTION ALERTS
            </h2>
            <p className="text-xs text-[#9AA4AF] mt-1">
              Automated notifications for vehicle speed thresholds, stream disconnects, and quality warnings
            </p>
          </div>

          <button
            onClick={onAcknowledgeAll}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#161C24] hover:bg-[#1C232B] text-slate-200 border border-[#252C35] hover:border-[#D4AF37] text-xs font-semibold transition-colors cursor-pointer"
          >
            <Check className="w-4 h-4 text-[#D4AF37]" />
            <span>Acknowledge All</span>
          </button>
        </div>

        {/* Alerts Feed */}
        <div className="space-y-3">
          {alerts.map((alert) => {
            const isCritical = alert.severity === 'CRITICAL';
            const isWarning = alert.severity === 'WARNING';
            const borderAccentColor = isCritical ? '#F43F5E' : isWarning ? '#F59E0B' : '#38BDF8';

            return (
              <div
                key={alert.id}
                className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                  alert.acknowledged
                    ? 'bg-[#0D1117] border-[#252C35] opacity-60'
                    : 'bg-[#11161D] border-[#252C35]'
                }`}
                style={{ borderLeftWidth: '3px', borderLeftColor: borderAccentColor }}
              >
                <div className="flex items-start gap-3.5">
                  <div className="mt-0.5">
                    {isCritical ? (
                      <ShieldAlert className="w-5 h-5 text-rose-500" />
                    ) : isWarning ? (
                      <AlertTriangle className="w-5 h-5 text-amber-400" />
                    ) : (
                      <Info className="w-5 h-5 text-sky-400" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-[11px] font-mono font-bold uppercase ${
                          isCritical
                            ? 'text-rose-400'
                            : isWarning
                            ? 'text-amber-400'
                            : 'text-sky-400'
                        }`}
                      >
                        [{alert.severity}]
                      </span>
                      <span className="text-[11px] font-semibold text-[#D4AF37]">
                        Camera: {alert.cameraId}
                      </span>
                      <span className="text-[11px] text-[#68727D] font-mono">
                        {alert.timestamp}
                      </span>
                      {alert.acknowledged && (
                        <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-800/60 font-medium">
                          Acknowledged
                        </span>
                      )}
                    </div>

                    <p className="text-sm font-medium text-white mt-1">{alert.message}</p>
                  </div>
                </div>

                {!alert.acknowledged && (
                  <button
                    onClick={() => onAcknowledgeAlert(alert.id)}
                    className="px-3 py-1.5 rounded bg-[#161C24] hover:bg-[#1C232B] text-slate-200 hover:text-white border border-[#252C35] hover:border-[#D4AF37] text-xs font-semibold transition-colors cursor-pointer shrink-0 ml-4"
                  >
                    Acknowledge
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
