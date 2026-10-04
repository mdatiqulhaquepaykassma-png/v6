import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Eye, ChevronDown, ChevronUp, ShieldCheck, Zap } from "lucide-react";
import { LiveBetRecord } from "../types";

export interface LiveBetsOverlayProps {
  currentRoundBets: LiveBetRecord[];
  tableSlug?: string;
  formatAmt: (amount: number, compact?: boolean) => string;
  maxDisplay?: number;
  className?: string;
  onFollowBet?: (side: "dragon" | "tiger" | "tie", amount: number) => void;
  isBettingOpen?: boolean;
}

export const LiveBetsOverlay: React.FC<LiveBetsOverlayProps> = ({
  currentRoundBets,
  tableSlug = "classic",
  formatAmt,
  maxDisplay = 5,
  className = "",
  onFollowBet,
  isBettingOpen = true,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [recentBets, setRecentBets] = useState<LiveBetRecord[]>([]);
  const lastProcessedIdRef = useRef<string | null>(null);

  // Monitor WebSocket stream directly for live incoming bets or sync from parent
  useEffect(() => {
    // Sync with incoming currentRoundBets
    if (currentRoundBets && currentRoundBets.length > 0) {
      setRecentBets(currentRoundBets.slice(0, maxDisplay));
    }
  }, [currentRoundBets, maxDisplay]);

  // Secondary listener to WebSocket broadcast stream to catch instant bursts
  useEffect(() => {
    if (typeof window === "undefined") return;

    let socket: WebSocket | null = null;
    let isMounted = true;

    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      socket = new WebSocket(`${protocol}//${window.location.host}`);

      socket.onmessage = (event) => {
        if (!isMounted) return;
        try {
          const data = JSON.parse(event.data);
          if (data.type === "NEW_BET" && (!data.tableSlug || data.tableSlug === tableSlug)) {
            if (data.bet && data.bet.id !== lastProcessedIdRef.current) {
              lastProcessedIdRef.current = data.bet.id;
              setRecentBets((prev) => {
                const exists = prev.some((b) => b.id === data.bet.id);
                if (exists) return prev;
                return [data.bet, ...prev].slice(0, maxDisplay);
              });
            }
          } else if (data.type === "ROUND_PHASE" && data.status === "BETTING") {
            // New round started: clear or keep fresh
            if (data.tableSlug === tableSlug) {
              setRecentBets([]);
            }
          }
        } catch {
          // ignore non-json messages
        }
      };
    } catch {
      // socket init error fallback
    }

    return () => {
      isMounted = false;
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [tableSlug, maxDisplay]);

  // Fallback demo bets if no players have bet yet in current round
  const displayBets = recentBets.length > 0 ? recentBets : currentRoundBets.slice(0, maxDisplay);

  if (displayBets.length === 0 && isCollapsed) return null;

  return (
    <div
      className={`select-none pointer-events-auto transition-all ${className}`}
      style={{ zIndex: 35 }}
    >
      <div className="flex flex-col gap-1.5 w-48 xs:w-56 sm:w-64 max-w-[90vw]">
        {/* Transparent Header Bar */}
        <div className="flex items-center justify-between px-2.5 py-1 rounded-xl bg-neutral-950/40 hover:bg-neutral-950/70 backdrop-blur-md border border-white/10 shadow-[0_4px_16px_rgba(0,0,0,0.6)] text-neutral-300 transition-colors">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[9px] xs:text-[10px] font-mono font-black uppercase tracking-wider text-amber-300 flex items-center gap-1">
              <Flame className="w-3 h-3 text-amber-400" />
              <span>Live Bets</span>
            </span>
            {displayBets.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[7.5px] font-mono font-bold">
                {displayBets.length}
              </span>
            )}
          </div>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-0.5 rounded text-neutral-400 hover:text-white transition-colors cursor-pointer"
            title={isCollapsed ? "Expand Live Bets Overlay" : "Collapse Live Bets Overlay"}
          >
            {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Real-time Streaming Bets List with Fade-in Animation */}
        <AnimatePresence initial={false}>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="flex flex-col gap-1 overflow-hidden"
            >
              {displayBets.map((bet, idx) => {
                const isDragon = bet.side === "DRAGON";
                const isTiger = bet.side === "TIGER";
                const isTie = bet.side === "TIE";

                return (
                  <motion.div
                    key={bet.id || `bet_${idx}_${bet.timestamp}`}
                    layout
                    initial={{ opacity: 0, x: -18, scale: 0.92 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 12, scale: 0.88 }}
                    transition={{
                      duration: 0.32,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className={`flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-xl backdrop-blur-md border shadow-md transition-all hover:scale-[1.02] ${
                      isDragon
                        ? "bg-red-950/45 hover:bg-red-950/65 border-red-500/40 text-red-200 shadow-[0_2px_12px_rgba(239,68,68,0.2)]"
                        : isTiger
                        ? "bg-amber-950/45 hover:bg-amber-950/65 border-amber-500/40 text-amber-200 shadow-[0_2px_12px_rgba(245,158,11,0.2)]"
                        : "bg-teal-950/45 hover:bg-teal-950/65 border-cyan-500/40 text-cyan-200 shadow-[0_2px_12px_rgba(6,182,212,0.2)]"
                    }`}
                  >
                    {/* User Avatar / Side Icon */}
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0 border ${
                          isDragon
                            ? "bg-red-900/80 border-red-400/80 text-red-200"
                            : isTiger
                            ? "bg-amber-900/80 border-amber-400/80 text-amber-200"
                            : "bg-teal-900/80 border-cyan-400/80 text-cyan-200"
                        }`}
                      >
                        {isDragon ? "🐉" : isTiger ? "🐯" : "🤝"}
                      </div>

                      {/* Username & Stake Selection */}
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] xs:text-[11px] font-mono font-black text-white truncate max-w-[85px] xs:max-w-[100px]">
                          {bet.username}
                        </span>
                        <span
                          className={`text-[8px] font-mono font-bold uppercase tracking-wider ${
                            isDragon ? "text-red-400" : isTiger ? "text-amber-400" : "text-cyan-400"
                          }`}
                        >
                          {bet.side}
                        </span>
                      </div>
                    </div>

                    {/* Stake & Action */}
                    <div className="flex flex-col items-end shrink-0">
                      <span className="text-[10px] xs:text-[11px] font-mono font-black text-amber-300 drop-shadow">
                        {formatAmt(bet.amount)}
                      </span>
                      {onFollowBet && isBettingOpen && (
                        <button
                          onClick={() => {
                            const side = (bet.side.toLowerCase() === "tie" ? "tie" : isDragon ? "dragon" : "tiger");
                            onFollowBet(side, bet.amount);
                          }}
                          className="text-[7.5px] font-mono text-neutral-400 hover:text-amber-300 underline uppercase tracking-tighter"
                        >
                          Follow
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
