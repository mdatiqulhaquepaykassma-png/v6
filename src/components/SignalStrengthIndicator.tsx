import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Wifi, WifiOff, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import { useWebSocketLatency, ConnectionQuality } from "../hooks/useWebSocketLatency";

interface SignalStrengthIndicatorProps {
  lang?: "bn" | "en";
  className?: string;
  showTextOnMobile?: boolean;
  align?: "left" | "right";
  compact?: boolean;
}

export const SignalStrengthIndicator: React.FC<SignalStrengthIndicatorProps> = React.memo(({
  lang = "bn",
  className = "",
  showTextOnMobile = false,
  align = "right",
  compact = false,
}) => {
  const { latency, jitter, status, quality, bars, nodeName } = useWebSocketLatency(2500);
  const [showTooltip, setShowTooltip] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close tooltip on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowTooltip(false);
      }
    }
    if (showTooltip) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [showTooltip]);

  const getQualityColor = (q: ConnectionQuality) => {
    switch (q) {
      case "excellent":
        return {
          text: "text-emerald-400",
          border: "border-emerald-500/30",
          bg: "bg-emerald-500/10",
          barActive: "bg-emerald-400 shadow-[0_0_6px_#34d399]",
          glow: "shadow-[0_0_12px_rgba(52,211,153,0.25)]",
          label: lang === "bn" ? "চমৎকার সংযোগ" : "Excellent",
        };
      case "good":
        return {
          text: "text-lime-400",
          border: "border-lime-500/30",
          bg: "bg-lime-500/10",
          barActive: "bg-lime-400 shadow-[0_0_6px_#a3e635]",
          glow: "shadow-[0_0_12px_rgba(163,230,53,0.2)]",
          label: lang === "bn" ? "ভালো সংযোগ" : "Good",
        };
      case "fair":
        return {
          text: "text-amber-400",
          border: "border-amber-500/30",
          bg: "bg-amber-500/10",
          barActive: "bg-amber-400 shadow-[0_0_6px_#fbbf24]",
          glow: "shadow-[0_0_12px_rgba(251,191,36,0.2)]",
          label: lang === "bn" ? "মাঝারি সংযোগ" : "Fair",
        };
      case "poor":
        return {
          text: "text-rose-400",
          border: "border-rose-500/30",
          bg: "bg-rose-500/10",
          barActive: "bg-rose-400 shadow-[0_0_6px_#fb7185]",
          glow: "shadow-[0_0_12px_rgba(251,113,133,0.25)]",
          label: lang === "bn" ? "দুর্বল সংযোগ" : "Poor",
        };
      case "offline":
      default:
        return {
          text: "text-neutral-500",
          border: "border-neutral-700/50",
          bg: "bg-neutral-900/60",
          barActive: "bg-neutral-600",
          glow: "",
          label: lang === "bn" ? "অফলাইন" : "Offline",
        };
    }
  };

  const styleConfig = getQualityColor(quality);

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* Header Button Trigger */}
      <button
        type="button"
        onClick={() => setShowTooltip((prev) => !prev)}
        className={`flex items-center ${compact ? "gap-1 px-1.5 py-0.5 rounded-lg h-6" : "gap-1.5 px-2 py-1 rounded-xl"} border ${styleConfig.border} ${styleConfig.bg} ${styleConfig.glow} transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-md select-none group`}
        title={
          latency !== null
            ? `WebSocket Latency: ${latency}ms (${styleConfig.label})`
            : "WebSocket Server Disconnected"
        }
      >
        {/* Signal Bars Icon Graphic */}
        <div className={`flex items-end gap-[1.5px] ${compact ? "h-3 w-3.5" : "h-3.5 w-4"} pb-[1px] justify-center`}>
          {[1, 2, 3, 4].map((barIndex) => {
            const isActive = bars >= barIndex;
            const heights = compact ? ["h-1", "h-1.5", "h-2", "h-2.5"] : ["h-1", "h-1.5", "h-2.5", "h-3.5"];
            return (
              <span
                key={barIndex}
                className={`w-[2px] rounded-full transition-all duration-300 ${heights[barIndex - 1]} ${
                  isActive ? styleConfig.barActive : "bg-neutral-700/50"
                }`}
              />
            );
          })}
        </div>

        {/* Latency Readout in ms */}
        <div className="flex items-center gap-0.5">
          <span
            className={`font-mono ${compact ? "text-[9px]" : "text-[10px] sm:text-[11px]"} font-black tracking-tight ${styleConfig.text} ${
              showTextOnMobile ? "inline" : "hidden xs:inline"
            }`}
          >
            {status === "connected" && latency !== null
              ? `${latency}ms`
              : status === "connecting"
              ? "..."
              : "OFFLINE"}
          </span>
        </div>

        {/* Subtle Live Ping Indicator Dot */}
        {status === "connected" && (
          <span className="relative flex h-1.5 w-1.5 ml-0.5">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                quality === "excellent"
                  ? "bg-emerald-400"
                  : quality === "good"
                  ? "bg-lime-400"
                  : quality === "fair"
                  ? "bg-amber-400"
                  : "bg-rose-400"
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                quality === "excellent"
                  ? "bg-emerald-500"
                  : quality === "good"
                  ? "bg-lime-500"
                  : quality === "fair"
                  ? "bg-amber-500"
                  : "bg-rose-500"
              }`}
            />
          </span>
        )}
      </button>

      {/* Real-Time Telemetry Details Popover */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.95 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className={`absolute top-full ${align === "left" ? "left-0" : "right-0"} mt-2 z-50 w-64 p-3 bg-neutral-950/95 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-[0_15px_35px_rgba(0,0,0,0.85)] text-neutral-200 text-xs space-y-2.5`}
          >
            {/* Header / Status Title */}
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-1.5 font-bold text-white text-xs">
                {status === "connected" ? (
                  <Wifi className="w-4 h-4 text-emerald-400" />
                ) : (
                  <WifiOff className="w-4 h-4 text-rose-400" />
                )}
                <span>{lang === "bn" ? "রিয়েল-টাইম গেমিং নেটওয়ার্ক" : "Live Game Network"}</span>
              </div>
              <span
                className={`text-[9.5px] font-black uppercase px-2 py-0.5 rounded-full border ${styleConfig.border} ${styleConfig.bg} ${styleConfig.text}`}
              >
                {styleConfig.label}
              </span>
            </div>

            {/* Metrics Grid */}
            <div className="space-y-1.5 font-mono text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">{lang === "bn" ? "পিং ল্যাটেন্সি" : "Ping Latency"}:</span>
                <span className={`font-black ${styleConfig.text}`}>
                  {latency !== null ? `${latency} ms` : "---"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-neutral-400">{lang === "bn" ? "নেটওয়ার্ক জিটার" : "Jitter"}:</span>
                <span className="text-neutral-200 font-bold">±{jitter} ms</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-neutral-400">{lang === "bn" ? "প্রোটোকল" : "Protocol"}:</span>
                <span className="text-amber-300 font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-amber-400" />
                  WSS (WebSocket)
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-neutral-400">{lang === "bn" ? "সার্ভার নোড" : "Active Node"}:</span>
                <span className="text-neutral-300 text-[10px] truncate max-w-[120px]" title={nodeName}>
                  {nodeName}
                </span>
              </div>
            </div>

            {/* Quality Summary Message */}
            <div className="pt-2 border-t border-white/10 flex items-start gap-1.5 text-[10px] text-neutral-400">
              {quality === "excellent" || quality === "good" ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              )}
              <p className="leading-tight">
                {quality === "excellent" || quality === "good"
                  ? lang === "bn"
                    ? "সার্ভারের সাথে অতি দ্রুত সংযোগ বিদ্যমান। লাইভ কার্ড ও বেট কোনো ল্যাগ ছাড়া কার্যকর হবে।"
                    : "Zero-lag ultra-low latency connection established to the game server."
                  : lang === "bn"
                  ? "নেটওয়ার্ক কিছুটা ধীর হতে পারে। স্থিতিশীল ইন্টারনেট ব্যবহার করুন।"
                  : "Slight latency detected. Ensure a stable network connection for optimal speed."}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default SignalStrengthIndicator;
