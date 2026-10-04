import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Sparkles, Flame, Zap, Star } from "lucide-react";
import { sound } from "../utils/audio";
import { haptics } from "../utils/haptics";
import { usePerformanceMode } from "../utils/performance";
import { useRenderTracker } from "../utils/perfDebugMonitor";

interface PlayingCardProps {
  card: {
    rank: string;
    suit: string;
    value: number;
    display: string;
  } | null;
  side: "DRAGON" | "TIGER";
  isWinner?: boolean;
}

export const PlayingCard = React.memo<PlayingCardProps>(({ card, side, isWinner = false }) => {
  useRenderTracker("PlayingCard", { side, card: card?.display });
  const [flipped, setFlipped] = useState<boolean>(false);
  const [isPeeking, setIsPeeking] = useState<boolean>(false);
  const perf = usePerformanceMode();

  // Staggered reveal sequence: Anticipation squeeze/peeking -> 3D flip with granular snap -> Winner snap
  useEffect(() => {
    if (card) {
      const peekDelay = side === "DRAGON" ? 60 : 380;
      const flipDelay = side === "DRAGON" ? 180 : 580;

      const peekTimer = setTimeout(() => setIsPeeking(true), peekDelay);
      const flipTimer = setTimeout(() => {
        setIsPeeking(false);
        setFlipped(true);
        try {
          sound.playGranularCardSnap(card.rank || card.display || card.value, side);
          haptics.cardFlip();
        } catch {}
      }, flipDelay);

      return () => {
        clearTimeout(peekTimer);
        clearTimeout(flipTimer);
      };
    } else {
      setFlipped(false);
      setIsPeeking(false);
    }
  }, [card, side]);

  const isRed = card?.suit === "♥" || card?.suit === "♦";

  return (
    <motion.div
      initial={{
        y: -120,
        x: side === "DRAGON" ? -40 : 40,
        rotateZ: side === "DRAGON" ? -20 : 20,
        rotateX: perf.isLowEnd ? 0 : 25,
        opacity: 0,
        scale: 0.5,
      }}
      animate={{
        y: 0,
        x: 0,
        rotateZ: isPeeking ? (side === "DRAGON" ? -3 : 3) : 0,
        rotateX: isPeeking && !perf.isLowEnd ? 12 : 0,
        opacity: 1,
        scale: isWinner ? 1.06 : 1,
      }}
      exit={{
        y: 50,
        opacity: 0,
        scale: 0.75,
        transition: { duration: 0.25 },
      }}
      transition={{
        type: perf.isLowEnd ? "tween" : "spring",
        stiffness: 300,
        damping: 24,
        mass: 0.8,
      }}
      className={`relative w-16 h-22 sm:w-18 sm:h-26 select-none cursor-pointer gpu-accelerated ${
        side === "DRAGON" ? "animate-deal-dragon" : "animate-deal-tiger"
      }`}
      style={{ perspective: perf.isLowEnd ? undefined : 1200, transformStyle: "preserve-3d", willChange: "transform" }}
    >
      {/* Floating Winner Crown & Celebration Badge */}
      <AnimatePresence>
        {isWinner && flipped && (
          <motion.div
            initial={{ scale: 0, y: 10, opacity: 0 }}
            animate={{ scale: 1, y: -16, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 450, damping: 18 }}
            className={`absolute -top-1 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 px-3 py-0.5 rounded-full font-black text-[9px] shadow-2xl whitespace-nowrap border ${
              side === "DRAGON"
                ? "bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 text-white border-amber-300/90 shadow-[0_0_15px_rgba(239,68,68,0.8)]"
                : "bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-neutral-950 border-yellow-200 shadow-[0_0_15px_rgba(251,191,36,0.85)]"
            }`}
          >
            <Crown className="w-2.5 h-2.5 fill-current" />
            <span className="tracking-wider">WINNER</span>
            <Sparkles className="w-2.5 h-2.5 fill-current" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Winner High-Voltage Aura with Shooting Energy Halo */}
      {isWinner && flipped && (
        <>
          <div
            className={`absolute -inset-1.5 rounded-2xl pointer-events-none transition-all ${
              side === "DRAGON" ? "animate-dragon-aura" : "animate-tiger-aura"
            } ${perf.isLowEnd ? "" : "blur-sm"}`}
          />
          {!perf.isLowEnd && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 4, repeat: 2, ease: "linear" }}
              className="absolute -inset-2.5 pointer-events-none flex items-center justify-between"
            >
              <Star className="w-3 h-3 text-amber-300 fill-amber-300" />
              <Star className="w-3 h-3 text-amber-300 fill-amber-300 delay-300" />
            </motion.div>
          )}
        </>
      )}

      {/* 3D Flipping Card Container with Dynamic Felt Shadow */}
      <motion.div
        animate={{
          rotateY: flipped ? 180 : 0,
          z: isPeeking ? 30 : flipped ? 10 : 0,
        }}
        transition={{
          duration: 0.68,
          ease: [0.23, 1, 0.32, 1], // Realistic casino snap flip
        }}
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          transformStyle: "preserve-3d",
        }}
      >
        {/* CARD BACK (Sleek High-End Matte Dragon/Tiger Geometry) */}
        <div
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
          }}
          className="absolute inset-0 w-full h-full rounded-xl bg-neutral-950 border-2 border-amber-500/50 shadow-2xl flex flex-col items-center justify-center p-1 overflow-hidden"
        >
          {/* Geometric Diamond Guilloché Pattern */}
          <div 
            className="absolute inset-0 opacity-80" 
            style={{
              backgroundImage: `repeating-linear-gradient(45deg, #0d0d0d 0, #0d0d0d 2px, #d4af37 0, #d4af37 3px), repeating-linear-gradient(-45deg, #0d0d0d 0, #0d0d0d 2px, #d4af37 0, #d4af37 3px)`,
            }}
          />
          
          <div className="w-full h-full rounded-lg border border-amber-400/30 flex flex-col items-center justify-center relative bg-gradient-to-br from-neutral-900/90 via-black to-neutral-900/90 shadow-inner backdrop-blur-sm">
            {/* Animate ONLY when not flipped so idle flipped card doesn't consume GPU */}
            <motion.div 
              animate={flipped ? { opacity: 0.6, scale: 1 } : { opacity: [0.5, 0.95, 0.5], scale: [0.95, 1.08, 0.95] }}
              transition={flipped ? { duration: 0.2 } : { duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="flex flex-col items-center justify-center"
            >
              {side === "DRAGON" ? (
                <Flame className="w-6 h-6 text-red-500 drop-shadow-[0_0_12px_rgba(239,68,68,0.9)]" />
              ) : (
                <Zap className="w-6 h-6 text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.9)]" />
              )}
              <span className="text-[7.5px] font-black uppercase tracking-widest text-amber-200 font-mono mt-0.5 drop-shadow">
                {side}
              </span>
            </motion.div>
          </div>
        </div>

        {/* CARD FRONT (Revealed Playing Card Face) */}
        <div
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
          className={`absolute inset-0 w-full h-full rounded-xl bg-white border shadow-2xl flex flex-col justify-between p-2 sm:p-2.5 transition-all duration-300 overflow-hidden ${
            isWinner
              ? side === "DRAGON"
                ? "border-red-500 ring-4 ring-red-500/60 shadow-[0_0_40px_rgba(239,68,68,0.95)]"
                : "border-amber-400 ring-4 ring-amber-400/60 shadow-[0_0_40px_rgba(251,191,36,1)]"
              : "border-neutral-300 shadow-xl"
          }`}
        >
          {/* Holographic Iridescent Shine Sweep on Reveal */}
          <motion.div
            initial={{ x: "-120%" }}
            animate={flipped ? { x: "240%" } : { x: "-120%" }}
            transition={{ duration: 1, delay: 0.15, ease: "easeInOut" }}
            className="absolute inset-0 w-3/4 bg-gradient-to-r from-transparent via-cyan-200/50 via-pink-200/50 via-white/70 to-transparent skew-x-12 pointer-events-none"
          />

          {/* Top Rank + Suit */}
          <div className="flex flex-col items-start leading-none z-10">
            <span className={`text-xs sm:text-sm font-black tracking-tight ${isRed ? "text-red-600" : "text-neutral-950"}`}>
              {card?.rank}
            </span>
            <span className={`text-xs sm:text-sm ${isRed ? "text-red-600" : "text-neutral-950"}`}>
              {card?.suit}
            </span>
          </div>

          {/* Large Center Suit Graphic with 3D Depth */}
          <div className="self-center flex items-center justify-center relative z-10">
            <motion.span
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.25, duration: 0.3 }}
              className={`text-2xl sm:text-3xl filter drop-shadow-[0_3px_6px_rgba(0,0,0,0.25)] select-none font-bold ${
                isRed ? "text-red-600" : "text-neutral-950"
              }`}
            >
              {card?.suit}
            </motion.span>
          </div>

          {/* Bottom Rank + Suit (Inverted) */}
          <div className="flex flex-col items-end leading-none transform rotate-180 z-10">
            <span className={`text-xs sm:text-sm font-black tracking-tight ${isRed ? "text-red-600" : "text-neutral-950"}`}>
              {card?.rank}
            </span>
            <span className={`text-xs sm:text-sm ${isRed ? "text-red-600" : "text-neutral-950"}`}>
              {card?.suit}
            </span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
});
