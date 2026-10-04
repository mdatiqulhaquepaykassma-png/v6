import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Sparkles, Flame, Zap, Star } from "lucide-react";
import { sound } from "../utils/audio";
import { haptics } from "../utils/haptics";
import { usePerformanceMode } from "../utils/performance";
import { useRenderTracker } from "../utils/perfDebugMonitor";

interface PlayingCardProps {
  card: {
    rank?: string;
    suit?: string;
    value?: number;
    display?: string;
  } | null;
  side: "DRAGON" | "TIGER";
  isWinner?: boolean;
  gameStatus?: string;
  isAlreadyRevealed?: boolean;
  showWinnerCelebration?: boolean;
}

export const PlayingCard = React.memo<PlayingCardProps>(({ 
  card, 
  side, 
  isWinner = false,
  gameStatus,
  isAlreadyRevealed = false,
  showWinnerCelebration = false,
}) => {
  useRenderTracker("PlayingCard", { side, card: card?.display });
  
  // If the round is already settled, card is immediately flipped and revealed without animation lag
  const isSettled = isAlreadyRevealed || gameStatus === "SETTLING" || gameStatus === "COMPLETED";
  const [flipped, setFlipped] = useState<boolean>(isSettled);
  const [isPeeking, setIsPeeking] = useState<boolean>(false);
  const perf = usePerformanceMode();

  // Staggered reveal sequence:
  // 1. Shoe Ejection -> 2. Land Face Down on Baize -> 3. Squeeze/Peeking -> 4. 3D Flip Snap -> 5. Delayed Winner Coronation
  useEffect(() => {
    if (!card) {
      setFlipped(false);
      setIsPeeking(false);
      return;
    }

    if (isSettled) {
      setFlipped(true);
      setIsPeeking(false);
      return;
    }

    // Live dealing sequence
    const peekDelay = side === "DRAGON" ? 950 : 1750;
    const flipDelay = side === "DRAGON" ? 1200 : 2000;

    const peekTimer = setTimeout(() => setIsPeeking(true), peekDelay);
    const flipTimer = setTimeout(() => {
      setIsPeeking(false);
      setFlipped(true);
      try {
        const rankVal = card.rank || card.display || card.value || "";
        sound.playGranularCardSnap(rankVal, side);
        haptics.cardFlip();
      } catch {}
    }, flipDelay);

    return () => {
      clearTimeout(peekTimer);
      clearTimeout(flipTimer);
    };
  }, [card, side, isSettled]);

  const rawSuit = card?.suit || (card?.display ? card.display.slice(-1) : "♠");
  const rawRank = card?.rank || (card?.display ? card.display.slice(0, -1) : "");
  const isRed = rawSuit === "♥" || rawSuit === "♦";
  const isDragon = side === "DRAGON";
  
  // Winner badge is revealed ONLY after the card has flipped and winner celebration is triggered
  const canShowWinner = Boolean(isWinner && flipped && (showWinnerCelebration || isSettled));

  // Trigger tactile haptic vibration when winner is crowned
  useEffect(() => {
    if (canShowWinner) {
      try {
        haptics.cardWinnerReveal();
      } catch {}
    }
  }, [canShowWinner]);

  return (
    <motion.div
      initial={
        isSettled
          ? { y: 0, x: 0, scale: 1, opacity: 1 }
          : {
              y: -95,
              x: isDragon ? 95 : -95,
              rotateZ: isDragon ? 18 : -18,
              rotateX: perf.isLowEnd ? 0 : 22,
              opacity: 0,
              scale: 0.45,
            }
      }
      animate={{
        y: 0,
        x: 0,
        rotateZ: isPeeking ? (isDragon ? -5 : 5) : 0,
        rotateX: isPeeking && !perf.isLowEnd ? 16 : 0,
        opacity: 1,
        scale: canShowWinner ? 1.06 : 1,
      }}
      exit={{
        y: 40,
        opacity: 0,
        scale: 0.75,
        transition: { duration: 0.22, ease: "easeIn" },
      }}
      transition={
        isSettled
          ? { duration: 0.15 }
          : {
              type: "spring",
              stiffness: 260,
              damping: 24,
              mass: 0.8,
              delay: isDragon ? 0.05 : 0.45,
            }
      }
      className="relative w-14 h-20 xs:w-16 xs:h-22 sm:w-18 sm:h-26 select-none cursor-pointer gpu-accelerated"
      style={{ perspective: perf.isLowEnd ? undefined : 1200, transformStyle: "preserve-3d", willChange: "transform" }}
    >
      {/* Subtle Golden Card Glow & Radiant Energy Halo on Winner Reveal */}
      <AnimatePresence>
        {canShowWinner && (
          <>
            {/* Ambient Golden Radiant Bloom */}
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: [1, 1.05, 1] }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{
                opacity: { duration: 0.35, ease: "easeOut" },
                scale: { duration: 2.2, repeat: Infinity, ease: "easeInOut" },
              }}
              className={`absolute -inset-2.5 rounded-2xl pointer-events-none z-0 ${
                perf.isLowEnd
                  ? "bg-amber-400/20 border border-amber-400/40"
                  : "bg-gradient-to-r from-amber-500/35 via-yellow-300/45 to-amber-500/35 blur-md border border-amber-300/60 shadow-[0_0_40px_rgba(251,191,36,0.6)]"
              } animate-golden-card-glow`}
            />

            {/* Rotating Golden Light Orbit */}
            {!perf.isLowEnd && (
              <motion.div
                initial={{ opacity: 0, rotate: 0 }}
                animate={{ opacity: [0.4, 0.85, 0.4], rotate: 360 }}
                exit={{ opacity: 0 }}
                transition={{
                  opacity: { duration: 2.5, repeat: Infinity, ease: "easeInOut" },
                  rotate: { duration: 6, repeat: Infinity, ease: "linear" },
                }}
                className="absolute -inset-3.5 rounded-3xl pointer-events-none z-0 border border-dashed border-amber-400/40 blur-[0.5px] flex items-center justify-between"
              >
                <div className="w-2 h-2 rounded-full bg-amber-300 shadow-[0_0_10px_#fde047] -translate-x-1" />
                <div className="w-2 h-2 rounded-full bg-yellow-200 shadow-[0_0_10px_#fef08a] translate-x-1" />
              </motion.div>
            )}
          </>
        )}
      </AnimatePresence>

      {/* Floating Winner Crown & Celebration Badge - Visible only after both cards flip and winner is settled */}
      <AnimatePresence>
        {canShowWinner && (
          <motion.div
            initial={{ scale: 0, y: 8, opacity: 0 }}
            animate={{ scale: 1, y: -16, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 450, damping: 18 }}
            className={`absolute -top-1 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 px-3 py-0.5 rounded-full font-black text-[9px] shadow-2xl whitespace-nowrap border ${
              side === "DRAGON"
                ? "bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 text-white border-amber-300/90 shadow-[0_0_15px_rgba(239,68,68,0.8)] ring-2 ring-red-400/50"
                : "bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-neutral-950 border-yellow-200 shadow-[0_0_15px_rgba(251,191,36,0.85)] ring-2 ring-amber-300/50"
            }`}
          >
            <Crown className="w-2.5 h-2.5 fill-current" />
            <span className="tracking-wider">WINNER</span>
            <Sparkles className="w-2.5 h-2.5 fill-current" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3D Flipping Card Container with Dynamic Felt Shadow */}
      <motion.div
        animate={{
          rotateY: flipped ? 180 : 0,
          z: isPeeking ? 26 : flipped ? 4 : 0,
        }}
        transition={{
          duration: isSettled ? 0 : 0.52,
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
            transform: "rotateY(0deg)",
            pointerEvents: flipped ? "none" : "auto",
          }}
          className="absolute inset-0 w-full h-full rounded-xl bg-neutral-950 border-2 border-amber-500/60 flex flex-col items-center justify-center p-1"
        >
          {/* Geometric Diamond Guilloché Pattern */}
          <div 
            className="absolute inset-0 opacity-85 rounded-xl overflow-hidden" 
            style={{
              backgroundImage: `repeating-linear-gradient(45deg, #0d0d0d 0, #0d0d0d 2px, #d4af37 0, #d4af37 3px), repeating-linear-gradient(-45deg, #0d0d0d 0, #0d0d0d 2px, #d4af37 0, #d4af37 3px)`,
            }}
          />
          
          <div className="w-full h-full rounded-lg border border-amber-400/35 flex flex-col items-center justify-center relative bg-gradient-to-br from-neutral-900/95 via-black to-neutral-900/95 shadow-inner">
            <motion.div 
              animate={flipped ? { opacity: 0.3, scale: 0.95 } : { opacity: [0.6, 1, 0.6], scale: [0.96, 1.06, 0.96] }}
              transition={flipped ? { duration: 0.1 } : { duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="flex flex-col items-center justify-center"
            >
              {side === "DRAGON" ? (
                <Flame className="w-5 h-5 xs:w-6 xs:h-6 text-red-500 drop-shadow-[0_0_12px_rgba(239,68,68,0.9)]" />
              ) : (
                <Zap className="w-5 h-5 xs:w-6 xs:h-6 text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.9)]" />
              )}
              <span className="text-[7.5px] xs:text-[8px] font-black uppercase tracking-widest text-amber-200 font-mono mt-0.5 drop-shadow">
                {side}
              </span>
            </motion.div>
          </div>
        </div>

        {/* CARD FRONT (Revealed Playing Card Face) - Bulletproof Visibility */}
        <div
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            pointerEvents: flipped ? "auto" : "none",
          }}
          className={`absolute inset-0 w-full h-full rounded-xl bg-white border flex flex-col justify-between p-1.5 xs:p-2 sm:p-2.5 transition-[border-color,box-shadow] duration-300 overflow-hidden ${
            canShowWinner
              ? "border-amber-300 ring-4 ring-amber-400/90 shadow-[0_0_40px_rgba(245,158,11,0.95),0_0_80px_rgba(251,191,36,0.45),inset_0_0_20px_rgba(254,240,138,0.35)]"
              : "border-neutral-300 shadow-md"
          }`}
        >
          {/* Subtle Golden Sheen Light Sweep on Reveal */}
          {canShowWinner && (
            <motion.div
              initial={{ x: "-120%", opacity: 0 }}
              animate={{ x: "220%", opacity: [0, 0.75, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 0.8, ease: "easeInOut" }}
              className="absolute inset-0 w-2/3 h-full bg-gradient-to-r from-transparent via-amber-300/40 to-transparent skew-x-[-20deg] pointer-events-none z-20"
            />
          )}

          {/* Top Rank + Suit */}
          <div className="flex flex-col items-start leading-none z-10">
            <span className={`text-[11px] xs:text-xs sm:text-sm font-black tracking-tight ${isRed ? "text-red-600" : "text-neutral-950"}`}>
              {rawRank}
            </span>
            <span className={`text-[11px] xs:text-xs sm:text-sm ${isRed ? "text-red-600" : "text-neutral-950"}`}>
              {rawSuit}
            </span>
          </div>

          {/* Large Center Suit Graphic with 3D Depth */}
          <div className="self-center flex items-center justify-center relative z-10">
            <motion.span
              initial={{ scale: 0.5, opacity: 0 }}
              animate={flipped ? { scale: 1, opacity: 1 } : { scale: 0.5, opacity: 0 }}
              transition={{ delay: isSettled ? 0 : 0.15, duration: 0.3 }}
              className={`text-xl xs:text-2xl sm:text-3xl filter drop-shadow-[0_2px_5px_rgba(0,0,0,0.25)] select-none font-bold ${
                isRed ? "text-red-600" : "text-neutral-950"
              }`}
            >
              {rawSuit}
            </motion.span>
          </div>

          {/* Bottom Rank + Suit (Inverted) */}
          <div className="flex flex-col items-end leading-none transform rotate-180 z-10">
            <span className={`text-[11px] xs:text-xs sm:text-sm font-black tracking-tight ${isRed ? "text-red-600" : "text-neutral-950"}`}>
              {rawRank}
            </span>
            <span className={`text-[11px] xs:text-xs sm:text-sm ${isRed ? "text-red-600" : "text-neutral-950"}`}>
              {rawSuit}
            </span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
});
