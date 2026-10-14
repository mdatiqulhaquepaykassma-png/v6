import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Sparkles, X, ArrowRight, RotateCcw, Flame, Zap, Trophy, Coins } from "lucide-react";
import { sound } from "../utils/audio";
import { haptics } from "../utils/haptics";

export interface VictoryWinModalProps {
  isOpen: boolean;
  onClose: () => void;
  winnerSide: "DRAGON" | "TIGER" | "TIE" | null;
  payoutAmount: number;
  betAmount?: number;
  multiplier?: number;
  dragonCard?: { display?: string; value?: number; suit?: string; rank?: string };
  tigerCard?: { display?: string; value?: number; suit?: string; rank?: string };
  formatAmt: (amount: number | null | undefined, compact?: boolean) => string;
  onRebet?: (side: string, amount: number) => void;
  autoCloseDuration?: number; // in milliseconds (default 5000)
}

export const VictoryWinModal: React.FC<VictoryWinModalProps> = ({
  isOpen,
  onClose,
  winnerSide,
  payoutAmount,
  betAmount = 0,
  multiplier = 1.9,
  dragonCard,
  tigerCard,
  formatAmt,
  onRebet,
  autoCloseDuration = 5500,
}) => {
  const [displayedPayout, setDisplayedPayout] = useState<number>(0);
  const [progress, setProgress] = useState<number>(100);
  const startTimeRef = useRef<number>(Date.now());

  const isDragon = winnerSide === "DRAGON";
  const isTiger = winnerSide === "TIGER";
  const isTie = winnerSide === "TIE";

  const profit = Math.max(0, payoutAmount - betAmount);

  // Animated Rolling Number counter + sound effects on open
  useEffect(() => {
    if (!isOpen || payoutAmount <= 0) {
      setDisplayedPayout(0);
      setProgress(100);
      return;
    }

    try {
      sound.playBigWin();
      haptics.win();
    } catch {}

    startTimeRef.current = Date.now();

    // Rapid counter animation over 900ms
    const countDuration = 900;
    const startCountTime = Date.now();
    const countInterval = setInterval(() => {
      const elapsed = Date.now() - startCountTime;
      const progressRatio = Math.min(1, elapsed / countDuration);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progressRatio, 3);
      setDisplayedPayout(Math.floor(payoutAmount * ease));

      if (progressRatio >= 1) {
        clearInterval(countInterval);
        setDisplayedPayout(payoutAmount);
      }
    }, 25);

    // Auto-close countdown progress bar
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const remainingPercent = Math.max(0, 100 - (elapsed / autoCloseDuration) * 100);
      setProgress(remainingPercent);

      if (elapsed >= autoCloseDuration) {
        clearInterval(progressInterval);
        onClose();
      }
    }, 50);

    return () => {
      clearInterval(countInterval);
      clearInterval(progressInterval);
    };
  }, [isOpen, payoutAmount, autoCloseDuration, onClose]);

  // Handle Quick Re-Bet action
  const handleQuickRebet = () => {
    if (winnerSide && betAmount > 0 && onRebet) {
      onRebet(winnerSide, betAmount);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4 select-none pointer-events-auto">
        {/* Deep Backdrop Blur Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Dynamic Mobile Viewport Constrained Particle Burst */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
          {[...Array(28)].map((_, i) => {
            const angle = (i / 28) * Math.PI * 2;
            const maxRadius = typeof window !== "undefined" ? Math.min(window.innerWidth * 0.42, 170) : 150;
            const distance = 80 + (i % 5) * (maxRadius / 5);
            const destX = Math.cos(angle) * distance + (Math.random() - 0.5) * 30;
            const destY = Math.sin(angle) * distance - 40 + (Math.random() - 0.5) * 30;
            return (
              <motion.div
                key={i}
                initial={{ x: 0, y: 30, scale: 0.2, opacity: 1, rotate: 0 }}
                animate={{
                  x: destX,
                  y: destY,
                  scale: [0.2, 1.3, 0.85],
                  opacity: [1, 1, 0],
                  rotate: (i % 2 === 0 ? 1 : -1) * (360 + i * 40),
                }}
                transition={{
                  duration: 1.6 + (i % 4) * 0.25,
                  ease: [0.22, 1, 0.36, 1],
                  delay: (i % 6) * 0.03,
                }}
                className="absolute text-xl sm:text-3xl filter drop-shadow-[0_0_12px_rgba(251,191,36,0.9)]"
              >
                {i % 4 === 0 ? "💎" : i % 3 === 0 ? "✨" : i % 2 === 0 ? "🪙" : "🎉"}
              </motion.div>
            );
          })}
        </div>

        {/* MODAL CARD: Ultra-Responsive Mobile Design */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 420, damping: 26 }}
          className={`relative w-full max-w-[94vw] xs:max-w-[360px] sm:max-w-md bg-gradient-to-b from-[#130d07] via-[#0d0905] to-[#080503] rounded-3xl border-2 sm:border-3 p-4 sm:p-6 shadow-[0_0_70px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col items-center text-center ${
            isDragon
              ? "border-red-500/80 shadow-[0_0_50px_rgba(239,68,68,0.4)]"
              : isTiger
              ? "border-amber-400/90 shadow-[0_0_50px_rgba(245,158,11,0.5)]"
              : "border-teal-400/90 shadow-[0_0_50px_rgba(20,184,166,0.5)]"
          }`}
        >
          {/* Top Corner Close Button */}
          <button
            onClick={onClose}
            type="button"
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 text-neutral-300 hover:text-white flex items-center justify-center transition-all z-20 cursor-pointer"
            aria-label="Close Victory Modal"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Ambient Radial Spotlight inside Card */}
          <div
            className={`absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-40 ${
              isDragon ? "bg-red-600" : isTiger ? "bg-amber-400" : "bg-teal-400"
            }`}
          />

          {/* 1. TOP CORONATION BADGE */}
          <div className="relative mt-1 mb-2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
              className="absolute -inset-2.5 rounded-full border border-dashed border-amber-300/40 pointer-events-none"
            />
            <div
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center shadow-2xl border-2 ${
                isDragon
                  ? "bg-gradient-to-tr from-red-600 via-rose-500 to-amber-500 border-red-200 text-white shadow-red-600/60"
                  : isTiger
                  ? "bg-gradient-to-tr from-amber-500 via-yellow-300 to-amber-600 border-yellow-100 text-neutral-950 shadow-amber-500/70"
                  : "bg-gradient-to-tr from-teal-500 via-emerald-300 to-teal-600 border-teal-100 text-neutral-950 shadow-teal-500/70"
              }`}
            >
              <Trophy className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
          </div>

          {/* 2. GRAND TITLE & WINNING SIDE BADGE */}
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider bg-gradient-to-r from-yellow-200 via-amber-300 to-yellow-400 bg-clip-text text-transparent drop-shadow-md">
            {payoutAmount >= 500 ? "BIG VICTORY!" : "YOU WON!"}
          </h2>

          <div className="flex items-center gap-1.5 mt-1 px-3 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] sm:text-xs font-mono font-black uppercase tracking-widest text-amber-300">
            {isDragon ? (
              <>
                <Flame className="w-3.5 h-3.5 text-red-500" />
                <span>DRAGON TRIUMPH</span>
              </>
            ) : isTiger ? (
              <>
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>TIGER TRIUMPH</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                <span>SUITED TIE · 11X</span>
              </>
            )}
          </div>

          {/* 3. CARD SHOWDOWN COMPARISON STRIP */}
          {dragonCard && tigerCard && (
            <div className="mt-3.5 w-full bg-black/60 rounded-2xl border border-white/10 p-2 sm:p-2.5 flex items-center justify-around gap-2 shadow-inner">
              {/* Dragon Card Box */}
              <div
                className={`flex-1 flex flex-col items-center py-1.5 px-2 rounded-xl border transition-all ${
                  isDragon
                    ? "bg-red-950/40 border-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                    : "bg-black/30 border-white/5 opacity-65"
                }`}
              >
                <span className="text-[9px] font-mono font-bold text-neutral-400 uppercase">DRAGON</span>
                <span className={`text-base sm:text-lg font-black font-mono mt-0.5 ${isDragon ? "text-red-400" : "text-neutral-300"}`}>
                  {dragonCard.display || "K♠"}
                </span>
                <span className="text-[9px] font-mono text-neutral-400">Val: {dragonCard.value ?? 13}</span>
              </div>

              {/* VS Divider Badge */}
              <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-[10px] font-black text-amber-300 font-mono shrink-0">
                VS
              </div>

              {/* Tiger Card Box */}
              <div
                className={`flex-1 flex flex-col items-center py-1.5 px-2 rounded-xl border transition-all ${
                  isTiger
                    ? "bg-amber-950/40 border-amber-400/80 shadow-[0_0_15px_rgba(245,158,11,0.4)]"
                    : "bg-black/30 border-white/5 opacity-65"
                }`}
              >
                <span className="text-[9px] font-mono font-bold text-neutral-400 uppercase">TIGER</span>
                <span className={`text-base sm:text-lg font-black font-mono mt-0.5 ${isTiger ? "text-amber-400" : "text-neutral-300"}`}>
                  {tigerCard.display || "7♦"}
                </span>
                <span className="text-[9px] font-mono text-neutral-400">Val: {tigerCard.value ?? 7}</span>
              </div>
            </div>
          )}

          {/* 4. MAIN PAYOUT TICKER DISPLAY */}
          <div className="mt-3.5 w-full py-2.5 px-3 rounded-2xl bg-gradient-to-b from-neutral-900/90 to-black/90 border border-amber-400/60 shadow-xl flex flex-col items-center">
            <span className="text-[9px] sm:text-[10px] font-mono font-bold text-amber-300/80 uppercase tracking-widest flex items-center gap-1">
              <Coins className="w-3 h-3 text-amber-400" />
              <span>TOTAL ROUND PAYOUT</span>
            </span>

            <div className="text-2xl sm:text-4xl font-black font-mono text-amber-300 tracking-tight drop-shadow-[0_0_15px_rgba(251,191,36,0.8)] my-1">
              +{formatAmt(displayedPayout)}
            </div>

            {/* Profit & Multiplier Sub-bar */}
            <div className="flex items-center gap-3 text-[10px] sm:text-xs font-mono text-neutral-400 border-t border-white/10 pt-1.5 w-full justify-center">
              {betAmount > 0 && (
                <span>
                  Bet: <strong className="text-white">{formatAmt(betAmount)}</strong>
                </span>
              )}
              <span>
                Odds: <strong className="text-amber-400">{multiplier}x</strong>
              </span>
              {profit > 0 && (
                <span>
                  Net: <strong className="text-emerald-400">+{formatAmt(profit)}</strong>
                </span>
              )}
            </div>
          </div>

          {/* 5. TACTILE MOBILE ACTION BUTTONS */}
          <div className="mt-4 w-full flex flex-col sm:flex-row items-center gap-2">
            {/* Quick Rebet Option (if applicable) */}
            {onRebet && betAmount > 0 && winnerSide && (
              <button
                onClick={handleQuickRebet}
                type="button"
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-neutral-200 hover:text-white font-black text-xs transition-all border border-white/15 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span>Re-bet {winnerSide}</span>
              </button>
            )}

            {/* Primary Action: Collect & Continue */}
            <button
              onClick={onClose}
              type="button"
              className="flex-1 w-full py-3 px-5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-neutral-950 font-black text-xs sm:text-sm uppercase tracking-wider shadow-[0_0_25px_rgba(245,158,11,0.6)] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>COLLECT & CONTINUE</span>
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </button>
          </div>

          {/* 6. AUTO-CLOSE PROGRESS BAR */}
          <div className="w-full mt-3 h-1 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              style={{ width: `${progress}%` }}
              className={`h-full transition-all duration-75 ${
                isDragon ? "bg-red-500" : isTiger ? "bg-amber-400" : "bg-teal-400"
              }`}
            />
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
