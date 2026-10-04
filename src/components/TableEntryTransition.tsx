import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Crown, X } from "lucide-react";
import { sound } from "../utils/audio";

interface TableEntryTransitionProps {
  isOpen: boolean;
  tableName: string;
  tableIcon?: string;
  onComplete?: () => void;
}

export const TableEntryTransition: React.FC<TableEntryTransitionProps> = ({
  isOpen,
  tableName,
  tableIcon = "🎯",
  onComplete,
}) => {
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!isOpen) return;
    try {
      sound.playButtonClick();
    } catch {}

    const timer = setTimeout(() => {
      onCompleteRef.current?.();
    }, 650);

    return () => clearTimeout(timer);
  }, [isOpen]);

  const handleDismiss = () => {
    onCompleteRef.current?.();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="table-door-transition"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.25, ease: "easeOut" } }}
          onClick={handleDismiss}
          className="fixed inset-0 z-[180] flex items-center justify-center overflow-hidden cursor-pointer select-none"
        >
          {/* Backdrop Overlay with Smooth Opacity Fade */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.85, 0.85, 0] }}
            transition={{ duration: 0.65, times: [0, 0.2, 0.8, 1], ease: "easeInOut" }}
            className="absolute inset-0 bg-neutral-950/85 backdrop-blur-md pointer-events-none"
          />

          {/* Skip Button in Top Right */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDismiss();
            }}
            className="absolute top-4 right-4 z-40 px-3 py-1.5 rounded-full bg-neutral-900/80 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-700 text-xs font-semibold flex items-center gap-1.5 backdrop-blur-md transition-all shadow-lg"
          >
            <span>Skip</span>
            <X className="w-3.5 h-3.5" />
          </button>

          {/* Central Golden Ray Flash */}
          <motion.div
            initial={{ opacity: 0, scaleY: 0 }}
            animate={{
              opacity: [0, 0.9, 0.9, 0],
              scaleY: [0, 1.2, 1.6, 2],
              scaleX: [0.1, 0.4, 1.5, 2.5],
            }}
            transition={{ duration: 0.65, ease: "easeInOut" }}
            className="absolute inset-y-0 w-36 bg-gradient-to-r from-transparent via-amber-400/40 to-transparent blur-3xl z-20 pointer-events-none"
          />

          {/* Left Door Panel */}
          <motion.div
            initial={{ x: "0%" }}
            animate={{ x: "-105%" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
            className="w-1/2 h-full bg-gradient-to-r from-[#05080e] via-[#0a0f18] to-[#111726] border-r-2 border-amber-500/70 shadow-[25px_0_60px_rgba(0,0,0,0.95)] flex flex-col items-end justify-center pr-4 sm:pr-8 relative z-10 pointer-events-none"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(245,158,11,0.18),_transparent_70%)]" />
            <div className="absolute right-0 inset-y-0 w-1 bg-gradient-to-b from-amber-300 via-amber-500 to-amber-600 shadow-[0_0_20px_rgba(245,158,11,0.9)]" />

            <div className="flex flex-col items-center gap-2 opacity-90 scale-90 sm:scale-100 mr-2 sm:mr-6">
              <div className="w-14 h-14 sm:w-18 sm:h-18 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 flex items-center justify-center text-red-500 shadow-[0_0_30px_rgba(239,68,68,0.4)]">
                <span className="text-2xl sm:text-4xl font-black">🐉</span>
              </div>
              <span className="text-[10px] sm:text-xs font-black tracking-[0.3em] text-red-400 uppercase font-mono">
                DRAGON
              </span>
            </div>
          </motion.div>

          {/* Right Door Panel */}
          <motion.div
            initial={{ x: "0%" }}
            animate={{ x: "105%" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
            className="w-1/2 h-full bg-gradient-to-l from-[#05080e] via-[#0a0f18] to-[#111726] border-l-2 border-amber-500/70 shadow-[-25px_0_60px_rgba(0,0,0,0.95)] flex flex-col items-start justify-center pl-4 sm:pl-8 relative z-10 pointer-events-none"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.18),_transparent_70%)]" />
            <div className="absolute left-0 inset-y-0 w-1 bg-gradient-to-b from-amber-300 via-amber-500 to-amber-600 shadow-[0_0_20px_rgba(245,158,11,0.9)]" />

            <div className="flex flex-col items-center gap-2 opacity-90 scale-90 sm:scale-100 ml-2 sm:ml-6">
              <div className="w-14 h-14 sm:w-18 sm:h-18 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 flex items-center justify-center text-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.4)]">
                <span className="text-2xl sm:text-4xl font-black">🐅</span>
              </div>
              <span className="text-[10px] sm:text-xs font-black tracking-[0.3em] text-amber-400 uppercase font-mono">
                TIGER
              </span>
            </div>
          </motion.div>

          {/* Central Table Name Badge */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{
              scale: [0.5, 1.15, 1, 1.2],
              opacity: [0, 1, 1, 0],
            }}
            transition={{ duration: 0.65, times: [0, 0.3, 0.7, 1], ease: [0.16, 1, 0.3, 1] }}
            className="absolute z-30 flex flex-col items-center justify-center text-center px-4 pointer-events-none"
          >
            <div className="px-6 py-3.5 rounded-3xl bg-neutral-950/95 border-2 border-amber-400 shadow-[0_0_50px_rgba(245,158,11,0.8)] backdrop-blur-2xl flex items-center gap-3.5 transform-gpu">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/60 flex items-center justify-center text-2xl shadow-inner">
                {tableIcon}
              </div>
              <div className="text-left">
                <div className="text-[10px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  <span>ENTERING ARENA</span>
                  <Crown className="w-3 h-3 text-amber-300 ml-1" />
                </div>
                <div className="text-base sm:text-lg font-black text-white tracking-wider uppercase font-mono drop-shadow-[0_2px_8px_rgba(245,158,11,0.5)]">
                  {tableName} TABLE
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
