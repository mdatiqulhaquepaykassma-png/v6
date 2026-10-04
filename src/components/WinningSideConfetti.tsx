import React, { useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Flame, Crown, Zap } from "lucide-react";
import { formatCurrency, useActiveCurrency } from "../utils/currency";
import { usePerformanceMode } from "../utils/performance";

export interface WinningSideConfettiProps {
  side: "DRAGON" | "TIGER" | "TIE" | null;
  payout?: number;
  multiplier?: number;
  isUserWinner?: boolean;
  activationKey?: number | string;
  onComplete?: () => void;
}

interface ParticleSpec {
  id: number;
  type: "ribbon" | "square" | "disc" | "star" | "spark" | "coin";
  color: string;
  startX: number; // percentage (0 - 100 within that side)
  startY: number; // percentage
  burstX: number; // horizontal drift in px
  peakY: number; // negative peak height in px
  finalY: number; // falling distance in px
  scale: number;
  rotationZ: number;
  rotationX: number;
  rotationY: number;
  duration: number;
  delay: number;
}

export const WinningSideConfetti = React.memo<WinningSideConfettiProps>(({
  side,
  payout = 0,
  multiplier = 1.9,
  isUserWinner = false,
  activationKey,
  onComplete,
}) => {
  const activeCurrency = useActiveCurrency();
  const perf = usePerformanceMode();

  // Color schemes strictly customized for each winning side
  const dragonPalette = [
    "#EF4444", // Bright Crimson
    "#DC2626", // Deep Ruby
    "#B91C1C", // Dark Carmine
    "#F59E0B", // Imperial Gold
    "#FDE047", // Radiant Yellow
    "#FB7185", // Rose Shimmer
    "#FFFFFF", // Pure Silver/White Glint
    "#EA580C", // Fiery Orange
  ];

  const tigerPalette = [
    "#F59E0B", // Radiant Amber
    "#FBBF24", // Golden Honey
    "#FACC15", // Electric Gold
    "#D97706", // Burnt Bronze
    "#06B6D4", // Tiger Cyan Accent
    "#10B981", // Emerald Surge
    "#FFFFFF", // Platinum White
    "#F97316", // Sun Orange
  ];

  const tiePalette = [
    "#10B981", // Emerald
    "#059669", // Deep Jade
    "#14B8A6", // Teal
    "#34D399", // Light Mint
    "#F59E0B", // Gold
    "#FFFFFF", // White
  ];

  const particles: ParticleSpec[] = useMemo(() => {
    if (!side) return [];

    const palette =
      side === "DRAGON"
        ? dragonPalette
        : side === "TIGER"
        ? tigerPalette
        : tiePalette;

    const count = perf.maxParticles; // Dynamic adaptive count (e.g. 12 on low-end, 36 on desktop)
    const items: ParticleSpec[] = [];

    const types: ParticleSpec["type"][] = [
      "ribbon",
      "ribbon",
      "square",
      "square",
      "disc",
      "star",
      "spark",
      "coin",
    ];

    for (let i = 0; i < count; i++) {
      const type = types[i % types.length];
      const color = palette[i % palette.length];
      // Origin spreads around the center of the winning card & betting zone (around 45% - 55% horizontal)
      const startX = 25 + Math.random() * 50;
      const startY = 48 + (Math.random() - 0.5) * 16;

      // Fountain physics: burst upwards with varied spread, then fall down
      const spreadAngle = (Math.PI * 0.7) * (Math.random() - 0.5); // spread cone
      const velocity = 140 + Math.random() * 220;
      const burstX = Math.sin(spreadAngle) * (velocity * 0.95);
      const peakY = -100 - Math.random() * 200;
      const finalY = 280 + Math.random() * 240;

      items.push({
        id: i,
        type,
        color,
        startX,
        startY,
        burstX,
        peakY,
        finalY,
        scale: 0.6 + Math.random() * 0.65,
        rotationZ: perf.isLowEnd ? 0 : (Math.random() - 0.5) * 720,
        rotationX: perf.isLowEnd ? 0 : Math.random() * 360,
        rotationY: perf.isLowEnd ? 0 : Math.random() * 360,
        duration: 1.8 + Math.random() * 0.8,
        delay: Math.random() * 0.18,
      });
    }

    return items;
  }, [side, activationKey, perf.maxParticles, perf.isLowEnd]);

  // Auto-dismiss cleanup
  useEffect(() => {
    if (!side) return;
    const timer = setTimeout(() => {
      if (onComplete) onComplete();
    }, 2200);
    return () => clearTimeout(timer);
  }, [side, activationKey, onComplete]);

  const isDragon = side === "DRAGON";
  const isTiger = side === "TIGER";

  // Container styling strictly covers the side with 100% non-blocking pointer events
  const sideContainerClass = isDragon
    ? "left-0 top-0 bottom-0 w-1/2"
    : isTiger
    ? "right-0 top-0 bottom-0 w-1/2"
    : "left-1/4 right-1/4 top-0 bottom-0";

  return (
    <AnimatePresence>
      {side && (
        <motion.div
          key={`winning-confetti-${side}-${activationKey || "key"}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.4 } }}
          style={{ pointerEvents: "none", touchAction: "none" }}
          className={`absolute ${sideContainerClass} pointer-events-none z-30 overflow-hidden select-none`}
        >
          {/* 1. LOCALIZED GOD-RAY & SPOTLIGHT ILLUMINATION (ONLY ON WINNING SIDE) */}
          <motion.div
            initial={{ opacity: 0, scaleY: 0 }}
            animate={{ opacity: 1, scaleY: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            style={{ pointerEvents: "none", touchAction: "none" }}
            className={`absolute inset-0 pointer-events-none ${
              isDragon
                ? "bg-gradient-to-b from-red-600/20 via-red-900/5 to-transparent"
                : isTiger
                ? "bg-gradient-to-b from-amber-500/20 via-yellow-900/5 to-transparent"
                : "bg-gradient-to-b from-emerald-500/20 via-teal-900/5 to-transparent"
            }`}
          />

          {/* Glowing Radial Core over the Winning Side */}
          <motion.div
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: [0.4, 1.3, 1.0], opacity: [0, 0.6, 0.2] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.8, ease: "easeOut" }}
            style={{ pointerEvents: "none", touchAction: "none" }}
            className={`absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 sm:w-80 h-64 sm:h-80 rounded-full blur-3xl pointer-events-none ${
              isDragon
                ? "bg-red-500/25"
                : isTiger
                ? "bg-amber-400/25"
                : "bg-teal-400/25"
            }`}
          />

          {/* 2. ANIMATEPRESENCE CONFETTI PARTICLES SHOWER */}
          {particles.map((p) => {
            return (
              <motion.div
                key={`p-${p.id}`}
                initial={{
                  left: `${p.startX}%`,
                  top: `${p.startY}%`,
                  x: 0,
                  y: 0,
                  scale: 0,
                  opacity: 0,
                  rotateZ: 0,
                  rotateX: 0,
                  rotateY: 0,
                }}
                animate={{
                  x: [0, p.burstX * 0.45, p.burstX],
                  y: [0, p.peakY, p.finalY],
                  scale: [0, p.scale * 1.3, p.scale, p.scale * 0.7, 0.2],
                  opacity: [0, 1, 1, 0.85, 0],
                  rotateZ: [0, p.rotationZ * 0.5, p.rotationZ],
                  rotateX: [0, p.rotationX * 0.6, p.rotationX],
                  rotateY: [0, p.rotationY * 0.6, p.rotationY],
                }}
                transition={{
                  duration: p.duration,
                  delay: p.delay,
                  ease: [0.18, 0.85, 0.35, 1],
                }}
                className="absolute pointer-events-none transform-gpu"
                style={{
                  transformOrigin: "center center",
                  perspective: 600,
                }}
              >
                {/* Render distinct physical confetti shapes */}
                {p.type === "ribbon" && (
                  <div
                    className="rounded-xs shadow-sm"
                    style={{
                      width: `${6 + (p.id % 4) * 2}px`,
                      height: `${14 + (p.id % 5) * 3}px`,
                      backgroundColor: p.color,
                      boxShadow: `0 0 10px ${p.color}88`,
                    }}
                  />
                )}

                {p.type === "square" && (
                  <div
                    className="rounded-xs"
                    style={{
                      width: `${8 + (p.id % 4) * 2}px`,
                      height: `${8 + (p.id % 4) * 2}px`,
                      backgroundColor: p.color,
                      boxShadow: `0 0 8px ${p.color}66`,
                    }}
                  />
                )}

                {p.type === "disc" && (
                  <div
                    className="rounded-full"
                    style={{
                      width: `${7 + (p.id % 4) * 2}px`,
                      height: `${7 + (p.id % 4) * 2}px`,
                      backgroundColor: p.color,
                      border: "1px solid rgba(255,255,255,0.7)",
                      boxShadow: `0 0 8px ${p.color}99`,
                    }}
                  />
                )}

                {p.type === "star" && (
                  <span
                    className="text-xs select-none"
                    style={{
                      color: p.color,
                      filter: `drop-shadow(0 0 6px ${p.color})`,
                    }}
                  >
                    {p.id % 2 === 0 ? "✦" : "★"}
                  </span>
                )}

                {p.type === "spark" && (
                  <div className="relative">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{
                        backgroundColor: p.color,
                        boxShadow: `0 0 12px ${p.color}`,
                      }}
                    />
                    <div
                      className="absolute inset-0 rounded-full animate-ping opacity-75"
                      style={{ backgroundColor: p.color }}
                    />
                  </div>
                )}

                {p.type === "coin" && (
                  <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-amber-600 via-yellow-300 to-amber-500 border border-yellow-100 shadow-[0_0_12px_rgba(251,191,36,0.9)] flex items-center justify-center text-[8px] font-black text-neutral-950 font-mono">
                    🪙
                  </div>
                )}
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
  );
});
