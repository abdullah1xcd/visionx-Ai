import React from 'react';
import { Users, Car, Bike, Camera, Gauge, AlertTriangle, TrendingUp, ShieldCheck } from 'lucide-react';
import { HOURLY_STATS, SPEED_HISTOGRAM } from '../data/mockData';

export const StatisticsView: React.FC = () => {
  return (
    <div className="flex-1 p-6 overflow-y-auto bg-[#080A0D] text-[#F4F6F8]">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="border-b border-[#252C35] pb-4">
          <h2 className="text-xl font-black tracking-wide text-white uppercase">
            DETECTION STATISTICS & HISTORICAL ANALYTICS
          </h2>
          <p className="text-xs text-[#9AA4AF] mt-1">
            Aggregated computer vision telemetry, pedestrian flow rates, and vehicle speed distributions
          </p>
        </div>

        {/* Object Totals Strip */}
        <div className="grid grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-[#11161D] border border-[#252C35]">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#9AA4AF]">
              <span>Total People</span>
              <Users className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-mono font-bold text-white mt-2">1,284</div>
            <div className="text-[11px] text-emerald-400 mt-1 font-medium">↑ 14% vs yesterday</div>
          </div>

          <div className="p-4 rounded-xl bg-[#11161D] border border-[#252C35]">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#9AA4AF]">
              <span>Total Cars</span>
              <Car className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-3xl font-mono font-bold text-white mt-2">872</div>
            <div className="text-[11px] text-emerald-400 mt-1 font-medium">↑ 8% peak traffic</div>
          </div>

          <div className="p-4 rounded-xl bg-[#11161D] border border-[#252C35]">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#9AA4AF]">
              <span>Total Bicycles</span>
              <Bike className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-3xl font-mono font-bold text-white mt-2">143</div>
            <div className="text-[11px] text-[#9AA4AF] mt-1">Active transit lanes</div>
          </div>

          <div className="p-4 rounded-xl bg-[#11161D] border border-[#252C35]">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#9AA4AF]">
              <span>Optical Devices</span>
              <Camera className="w-4 h-4 text-[#D4AF37]" />
            </div>
            <div className="text-3xl font-mono font-bold text-white mt-2">4</div>
            <div className="text-[11px] text-[#9AA4AF] mt-1">All streams active</div>
          </div>
        </div>

        {/* Speed & Analytics KPI Row (Required: Speed labeled ESTIMATED SPEED) */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-[#11161D] border border-[#252C35]">
            <div className="flex items-center gap-2 text-xs font-bold uppercase text-[#9AA4AF]">
              <Gauge className="w-4 h-4 text-[#D4AF37]" />
              <span>AVERAGE ESTIMATED SPEED</span>
            </div>
            <div className="text-2xl font-mono font-bold text-white mt-2">
              43 <span className="text-xs font-normal text-[#9AA4AF]">km/h</span>
            </div>
            <div className="text-[10px] text-[#68727D] mt-1">
              Calculated via calibrated pixel displacement
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#11161D] border border-[#252C35]">
            <div className="flex items-center gap-2 text-xs font-bold uppercase text-[#9AA4AF]">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              <span>MAXIMUM ESTIMATED SPEED</span>
            </div>
            <div className="text-2xl font-mono font-bold text-amber-400 mt-2">
              88 <span className="text-xs font-normal text-[#9AA4AF]">km/h</span>
            </div>
            <div className="text-[10px] text-[#68727D] mt-1">
              Logged today at 16:18 (CAM-01 CAR #04)
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#11161D] border border-[#252C35]">
            <div className="flex items-center gap-2 text-xs font-bold uppercase text-[#9AA4AF]">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>DETECTION ACCURACY SCORE</span>
            </div>
            <div className="text-2xl font-mono font-bold text-emerald-400 mt-2">
              96.2<span className="text-xs font-normal text-[#9AA4AF]">%</span>
            </div>
            <div className="text-[10px] text-[#68727D] mt-1">
              Based on IoU tracking stability & CLAHE enhancement
            </div>
          </div>
        </div>

        {/* Hourly Flow Chart & Speed Distribution */}
        <div className="grid grid-cols-3 gap-4">
          {/* 2-Col Hourly Distribution */}
          <div className="col-span-2 p-5 rounded-xl bg-[#11161D] border border-[#252C35]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase text-white tracking-wider">
                24-Hour Object Influx (People & Vehicles)
              </h3>
              <div className="flex items-center gap-4 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400"></span>
                  <span className="text-[#9AA4AF]">People</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-sky-400"></span>
                  <span className="text-[#9AA4AF]">Cars</span>
                </div>
              </div>
            </div>

            {/* Custom SVG Bar Chart */}
            <div className="h-56 flex items-end gap-3 pt-6 pb-2 border-b border-[#252C35]">
              {HOURLY_STATS.map((stat, idx) => {
                const maxVal = 220;
                const peopleHeight = (stat.people / maxVal) * 100;
                const vehicleHeight = (stat.vehicles / maxVal) * 100;

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
                    <div className="w-full flex items-end justify-center gap-1 h-full">
                      {/* People Bar */}
                      <div
                        style={{ height: `${peopleHeight}%` }}
                        className="w-1/2 bg-emerald-500/80 hover:bg-emerald-400 rounded-t transition-all relative"
                        title={`People: ${stat.people}`}
                      />
                      {/* Vehicle Bar */}
                      <div
                        style={{ height: `${vehicleHeight}%` }}
                        className="w-1/2 bg-sky-500/80 hover:bg-sky-400 rounded-t transition-all relative"
                        title={`Vehicles: ${stat.vehicles}`}
                      />
                    </div>
                    <span className="text-[9px] font-mono text-[#68727D] mt-1">{stat.hour}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Speed Distribution Histogram */}
          <div className="p-5 rounded-xl bg-[#11161D] border border-[#252C35] flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase text-white tracking-wider mb-4">
                Estimated Speed Distribution
              </h3>
              <div className="space-y-3">
                {SPEED_HISTOGRAM.map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-[#9AA4AF]">{item.range}</span>
                      <span className="text-white font-bold">{item.count}</span>
                    </div>
                    <div className="w-full h-2 bg-[#080A0D] rounded-full overflow-hidden border border-[#252C35]">
                      <div
                        className={`h-full rounded-full ${
                          item.range.includes('Warning') ? 'bg-rose-500' : 'bg-[#D4AF37]'
                        }`}
                        style={{ width: `${(item.count / 184) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#080A0D] border border-[#252C35] text-[10px] text-[#68727D] mt-4">
              * Speed estimation uses optical flow pixel tracking with calibrated focal reference distance.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
