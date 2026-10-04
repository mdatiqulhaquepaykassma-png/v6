import React, { useState } from "react";
import { ShieldCheck, Eye, TrendingUp, Users, CheckCircle, XCircle, Clock, Filter, Flame, RotateCcw } from "lucide-react";
import { LiveBetRecord, UserWallet } from "../types";
import { formatCurrency } from "../utils/currency";

interface LiveBetFeedProps {
  currentRoundBets: LiveBetRecord[];
  recentSettledBets: LiveBetRecord[];
  currentUser: UserWallet;
  roundNumber?: number;
}

export const LiveBetFeed = React.memo<LiveBetFeedProps>(({
  currentRoundBets,
  recentSettledBets,
  currentUser,
  roundNumber = 1001,
}) => {
  const [activeTab, setActiveTab] = useState<"current" | "history">("current");
  const [filterSide, setFilterSide] = useState<"ALL" | "DRAGON" | "TIGER" | "MINE">("ALL");

  const betsToDisplay = activeTab === "current" ? currentRoundBets : recentSettledBets;

  const filteredBets = betsToDisplay.filter((bet) => {
    if (filterSide === "MINE") {
      return bet.userId === currentUser.userId;
    }
    if (filterSide !== "ALL") {
      return bet.side === filterSide;
    }
    return true;
  });

  // Calculate live stake sums for transparency
  const currentDragonTotal = currentRoundBets
    .filter((b) => b.side === "DRAGON")
    .reduce((acc, b) => acc + b.amount, 0);

  const currentTigerTotal = currentRoundBets
    .filter((b) => b.side === "TIGER")
    .reduce((acc, b) => acc + b.amount, 0);

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "--:--";
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header & Mode Switcher */}
      <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-400">
            <Eye className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-widest">Live Activity</h3>
            <p className="text-[9px] text-neutral-600 uppercase tracking-tighter">Real-time engagement feed</p>
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-neutral-950 p-1 rounded-xl border border-white/5">
          <button
            onClick={() => setActiveTab("current")}
            className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${
              activeTab === "current" ? "bg-white text-black" : "text-neutral-500"
            }`}
          >
            Round
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${
              activeTab === "history" ? "bg-white text-black" : "text-neutral-500"
            }`}
          >
            History
          </button>
        </div>
      </div>

      {/* Live Volume Metrics Bar */}
      {activeTab === "current" && (
        <div className="grid grid-cols-2 gap-px bg-white/5 border-b border-white/5">
          <div className="px-6 py-3 bg-neutral-950/40">
            <span className="text-[8px] font-bold text-neutral-600 uppercase tracking-widest block mb-1">Dragon Volume</span>
            <span className="text-sm font-bold text-violet-400 tabular-nums">
              {formatCurrency(currentDragonTotal, { currencyCode: 'INR', convertFromBase: false, compact: true })}
            </span>
          </div>
          <div className="px-6 py-3 bg-neutral-950/40 border-l border-white/5">
            <span className="text-[8px] font-bold text-neutral-600 uppercase tracking-widest block mb-1">Tiger Volume</span>
            <span className="text-sm font-bold text-cyan-400 tabular-nums">
              {formatCurrency(currentTigerTotal, { currencyCode: 'INR', convertFromBase: false, compact: true })}
            </span>
          </div>
        </div>
      )}

      {/* Filter Buttons */}
      <div className="px-6 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar border-b border-white/5">
        {(["ALL", "DRAGON", "TIGER", "MINE"] as const).map((side) => (
          <button
            key={side}
            onClick={() => setFilterSide(side)}
            className={`px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${
              filterSide === side ? "text-white" : "text-neutral-600 hover:text-neutral-400"
            }`}
          >
            {side}
          </button>
        ))}
      </div>

      {/* Bets Table */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <table className="w-full text-left">
          <tbody className="divide-y divide-white/5">
            {filteredBets.length === 0 ? (
              <tr>
                <td className="py-12 text-center text-neutral-700 text-[10px] uppercase tracking-widest italic">
                  Awaiting engagement...
                </td>
              </tr>
            ) : (
              filteredBets.map((bet) => {
                const isCurrentUser = bet.userId === currentUser.userId;
                return (
                  <tr key={bet.id} className={`group hover:bg-white/5 transition-all ${isCurrentUser ? "bg-violet-500/5" : ""}`}>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${bet.side.includes("DRAGON") ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]" : "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]"}`} />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white tracking-tight">{bet.username}</span>
                              <span className="text-[8px] font-mono px-1 py-0.2 bg-white/10 rounded text-amber-300 font-bold">{bet.side}</span>
                              {isCurrentUser && <span className="text-[8px] font-black text-violet-400 uppercase tracking-widest">Self</span>}
                            </div>
                            <span className="text-[9px] text-neutral-600 font-mono">{formatTime(bet.timestamp)}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-bold text-white tabular-nums">₹{bet.amount.toLocaleString()}</div>
                          {bet.status === "WON" && <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-tighter">+ WIN</span>}
                          {bet.status === "REFUNDED" && <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-tighter">RETURN</span>}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Info */}
      <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between text-[9px] text-neutral-700 uppercase font-bold tracking-widest">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-3 h-3" />
          <span>Provably Fair Hash Enabled</span>
        </div>
        <span>{filteredBets.length} Active</span>
      </div>
    </div>
  );
});
