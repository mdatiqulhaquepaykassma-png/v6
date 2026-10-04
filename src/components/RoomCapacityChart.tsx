import React, { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Users, TrendingUp, Flame, Clock } from "lucide-react";
import { CapacityTrendPoint } from "../types";

export const RoomCapacityChart: React.FC = () => {
  const [data, setData] = useState<CapacityTrendPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchTrends = async () => {
      try {
        const res = await fetch("/api/p2p/capacity-trends");
        if (res.ok) {
          const json = await res.json();
          if (json.points && Array.isArray(json.points)) {
            setData(json.points);
          }
        }
      } catch (e) {
        console.error("Failed to load capacity trends:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchTrends();
    const interval = setInterval(fetchTrends, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && data.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-xs text-neutral-500 bg-neutral-950/60 rounded-2xl border border-neutral-800">
        Loading room traffic trends...
      </div>
    );
  }

  // Find peak point
  const peakPoint = data.reduce(
    (max, p) => (p.players > (max?.players || 0) ? p : max),
    data[0]
  );

  return (
    <div className="bg-gradient-to-br from-[#121622] via-[#0E121B] to-[#0A0D14] border border-amber-500/25 rounded-3xl p-4 sm:p-5 shadow-xl space-y-3">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
              <span>Room Capacity &amp; Player Traffic Trends</span>
              <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 uppercase font-bold">
                Last 1 Hour
              </span>
            </h3>
            <p className="text-[11px] text-neutral-400">
              Real-time activity density to help spot peak action and matched odds
            </p>
          </div>
        </div>

        {peakPoint && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] font-bold">
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            <span>
              Peak: <strong>{peakPoint.time}</strong> ({peakPoint.players} players · {peakPoint.capacityPct}% full)
            </span>
          </div>
        )}
      </div>

      {/* Recharts Area Chart */}
      <div className="w-full h-44 sm:h-48 pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="capacityColor" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="playersColor" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
            <XAxis
              dataKey="time"
              stroke="#a3a3a3"
              fontSize={10}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#a3a3a3"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              domain={[0, "auto"]}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-[#0b0e14] border border-amber-500/40 p-2.5 rounded-xl shadow-xl text-xs space-y-1">
                      <div className="font-bold text-white flex items-center gap-1 font-mono text-[11px]">
                        <Clock className="w-3 h-3 text-neutral-400" />
                        <span>{label}</span>
                      </div>
                      <div className="text-cyan-400 font-mono font-bold flex items-center justify-between gap-3">
                        <span>Active Players:</span>
                        <span>{payload[0]?.value}</span>
                      </div>
                      <div className="text-amber-300 font-mono font-bold flex items-center justify-between gap-3">
                        <span>Capacity:</span>
                        <span>{payload[1]?.value}%</span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="players"
              stroke="#06b6d4"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#playersColor)"
              name="Active Players"
            />
            <Area
              type="monotone"
              dataKey="capacityPct"
              stroke="#f59e0b"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#capacityColor)"
              name="Capacity %"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1 border-t border-white/5">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            <span>Active Players</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span>Room Capacity %</span>
          </div>
        </div>
        <span className="text-neutral-500">Live 10-Min Bucket Samples</span>
      </div>
    </div>
  );
};
