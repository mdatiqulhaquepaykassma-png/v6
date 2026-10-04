import React, { useState, useEffect } from "react";
import {
  Zap,
  Flame,
  TrendingUp,
  Volume2,
  VolumeX,
  Copy,
  ChevronDown,
  ChevronUp,
  Award,
  Users,
  Radio,
  ArrowRight,
} from "lucide-react";
import { LiveBetRecord, UserWallet } from "../types";
import { sound } from "../utils/audio";

interface LiveActionProps {
  currentRoundBets: LiveBetRecord[];
  currentUser?: UserWallet | null;
  roundNumber?: number;
  onFollowBet?: (side: "dragon" | "tiger", amount: number) => void;
  className?: string;
}

export const LiveAction = React.memo<LiveActionProps>(({
  currentRoundBets,
  currentUser,
  roundNumber = 1001,
  onFollowBet,
  className = "",
}) => {
  const [filter, setFilter] = useState<"ALL" | "WHALES" | "DRAGON" | "TIGER">("ALL");
  const [soundAlerts, setSoundAlerts] = useState<boolean>(true);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Play subtle chip clink on incoming new bet if enabled
  useEffect(() => {
    if (soundAlerts && currentRoundBets.length > 0) {
      const latest = currentRoundBets[0];
      if (latest && latest.amount >= 1000) {
        sound.playCoinsClinking();
      }
    }
  }, [currentRoundBets.length, soundAlerts]);

  // Calculations for social betting pressure
  const dragonBets = currentRoundBets.filter((b) => b.side === "DRAGON");
  const tigerBets = currentRoundBets.filter((b) => b.side === "TIGER");

  const dragonVolume = dragonBets.reduce((sum, b) => sum + b.amount, 0);
  const tigerVolume = tigerBets.reduce((sum, b) => sum + b.amount, 0);
  const totalVolume = dragonVolume + tigerVolume;

  const dragonPct = totalVolume > 0 ? Math.round((dragonVolume / totalVolume) * 100) : 50;
  const tigerPct = totalVolume > 0 ? Math.round((tigerVolume / totalVolume) * 100) : 50;

  // Social Pressure sentiment statement
  const getPressureSentiment = () => {
    if (totalVolume === 0) return "Waiting for opening wagers of Round #" + roundNumber;
    if (dragonPct >= 65) {
      return `🔥 Heavy Social Pressure: ${dragonPct}% of table volume is roaring on DRAGON!`;
    }
    if (tigerPct >= 65) {
      return `⚡ High Social Pressure: ${tigerPct}% of table volume is backing TIGER!`;
    }
    return `⚔️ Balanced Arena: Dragon ৳${dragonVolume.toLocaleString()} vs Tiger ৳${tigerVolume.toLocaleString()}`;
  };

  // Filtered bets
  const filteredBets = currentRoundBets.filter((bet) => {
    if (filter === "WHALES") return bet.amount >= 500;
    if (filter === "DRAGON") return bet.side === "DRAGON";
    if (filter === "TIGER") return bet.side === "TIGER";
    return true;
  });

  const handleCopy = (bet: LiveBetRecord) => {
    if (onFollowBet) {
      onFollowBet(bet.side.toLowerCase() as "dragon" | "tiger", bet.amount);
      setCopiedId(bet.id);
      sound.playChipStack();
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const getTimeAgo = (isoString: string) => {
    try {
      const diffSec = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
      if (diffSec < 2) return "Just now";
      if (diffSec < 60) return `${diffSec}s ago`;
      return `${Math.floor(diffSec / 60)}m ago`;
    } catch {
      return "Just now";
    }
  };

  const getSideColor = (side: string) => {
    switch (side) {
      case "DRAGON":
        return {
          text: "text-red-400",
          bg: "bg-red-950/40 border-red-800/60",
          pill: "bg-red-500/10 text-red-400 border-red-500/30",
          indicator: "bg-red-500",
        };
      case "TIGER":
        return {
          text: "text-amber-400",
          bg: "bg-amber-950/40 border-amber-800/60",
          pill: "bg-amber-500/10 text-amber-400 border-amber-500/30",
          indicator: "bg-amber-500",
        };
      default:
        return {
          text: "text-blue-400",
          bg: "bg-blue-950/40 border-blue-800/60",
          pill: "bg-blue-500/10 text-blue-400 border-blue-500/30",
          indicator: "bg-blue-500",
        };
    }
  };

  return (
    <div
      id="live-action-feed"
      className={`bg-neutral-900/95 border border-neutral-800/90 rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden transition-all ${className}`}
    >
      {/* Top Header Bar */}
      <div className="p-3.5 sm:p-4 bg-gradient-to-r from-neutral-900 via-neutral-900/95 to-neutral-950 border-b border-neutral-800/80 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
            <Radio className="w-4 h-4 text-red-400 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-black tracking-wider uppercase bg-gradient-to-r from-red-400 via-amber-300 to-amber-500 bg-clip-text text-transparent">
                Live Action Stream
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-950/80 border border-red-700/50 text-red-300">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                Live Feed
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 hidden sm:block">
              Streaming real-time player wagers to ensure transparency &amp; social betting pressure
            </p>
          </div>
        </div>

        {/* Action Controls & Volume */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            id="live-action-sound-toggle"
            onClick={() => {
              setSoundAlerts(!soundAlerts);
              sound.playButtonClick();
            }}
            title={soundAlerts ? "Mute live action sound alerts" : "Unmute live action sound alerts"}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all ${
              soundAlerts
                ? "bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20"
                : "bg-neutral-800/60 border-neutral-700 text-neutral-400 hover:text-neutral-200"
            }`}
          >
            {soundAlerts ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">{soundAlerts ? "Sound On" : "Muted"}</span>
          </button>

          <button
            id="live-action-collapse-toggle"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg bg-neutral-800/70 hover:bg-neutral-800 text-neutral-300 transition-colors"
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Social Pressure Meter Banner */}
      <div className="bg-neutral-950/80 px-3.5 py-2.5 border-b border-neutral-800/70">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="flex items-center gap-1.5 font-bold text-red-400">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            DRAGON: ৳{dragonVolume.toLocaleString()} ({dragonPct}%)
          </span>
          <span className="text-[11px] text-neutral-400 hidden md:inline font-mono">
            Round #{roundNumber} • {currentRoundBets.length} Active Bets
          </span>
          <span className="flex items-center gap-1.5 font-bold text-amber-400">
            TIGER: ৳{tigerVolume.toLocaleString()} ({tigerPct}%)
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          </span>
        </div>

        {/* Tug-of-war pressure bar */}
        <div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden flex">
          <div
            className="h-full bg-gradient-to-r from-red-600 to-rose-500 transition-all duration-300"
            style={{ width: `${Math.max(5, Math.min(95, dragonPct))}%` }}
          />
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-300"
            style={{ width: `${Math.max(5, Math.min(95, tigerPct))}%` }}
          />
        </div>

        {/* Dynamic Sentiment Quote */}
        <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-neutral-300">
          <span className="truncate">{getPressureSentiment()}</span>
        </div>
      </div>

      {/* Expandable Body */}
      {!isCollapsed && (
        <div className="p-3 sm:p-4">
          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-none">
            <button
              onClick={() => setFilter("ALL")}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                filter === "ALL"
                  ? "bg-neutral-100 text-neutral-900 shadow-sm"
                  : "bg-neutral-800/70 text-neutral-400 hover:text-neutral-200"
              }`}
            >
              All Actions ({currentRoundBets.length})
            </button>
            <button
              onClick={() => setFilter("WHALES")}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1 transition-all ${
                filter === "WHALES"
                  ? "bg-amber-500 text-neutral-950 font-bold shadow-sm"
                  : "bg-neutral-800/70 text-amber-300/80 hover:text-amber-200"
              }`}
            >
              <Flame className="w-3 h-3 text-amber-400" />
              High Stakes (৳500+)
            </button>
            <button
              onClick={() => setFilter("DRAGON")}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                filter === "DRAGON"
                  ? "bg-red-600 text-white shadow-sm"
                  : "bg-neutral-800/70 text-red-400 hover:text-red-300"
              }`}
            >
              Dragon ({dragonBets.length})
            </button>
            <button
              onClick={() => setFilter("TIGER")}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                filter === "TIGER"
                  ? "bg-amber-600 text-neutral-950 font-bold shadow-sm"
                  : "bg-neutral-800/70 text-amber-400 hover:text-amber-300"
              }`}
            >
              Tiger ({tigerBets.length})
            </button>
          </div>

          {/* Real-Time Live Feed Stream */}
          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
            {filteredBets.length === 0 ? (
              <div className="text-center py-8 text-neutral-500 text-xs">
                <Users className="w-7 h-7 mx-auto mb-2 opacity-40 text-neutral-400" />
                No player actions matching filter yet.
                <p className="text-[11px] text-neutral-600 mt-1">
                  Place your stake to lead the action feed!
                </p>
              </div>
            ) : (
              filteredBets.map((bet, index) => {
                const sideStyle = getSideColor(bet.side);
                const isWhale = bet.amount >= 1000;
                const isUser = currentUser && bet.userId === currentUser.userId;

                return (
                  <div
                    key={bet.id || index}
                    className={`group relative flex items-center justify-between p-2.5 sm:p-3 rounded-xl border transition-all ${
                      isWhale
                        ? "bg-gradient-to-r from-amber-950/30 via-neutral-900 to-neutral-900/90 border-amber-500/40 shadow-sm shadow-amber-500/5"
                        : "bg-neutral-950/60 border-neutral-800/80 hover:border-neutral-700"
                    } ${isUser ? "ring-1 ring-emerald-500/60 bg-emerald-950/20" : ""}`}
                  >
                    {/* Left: Player info & explicit action string */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-2 h-2 rounded-full shrink-0 ${sideStyle.indicator} ${
                          index === 0 ? "animate-ping" : ""
                        }`}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-neutral-200 truncate max-w-[120px] sm:max-w-[160px]">
                            {isUser ? "You" : bet.username}
                          </span>
                          {bet.vipTier && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded border bg-neutral-900 border-neutral-700 text-neutral-300 font-mono">
                              {bet.vipTier}
                            </span>
                          )}
                          {isWhale && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              <Flame className="w-2.5 h-2.5 text-amber-400" />
                              WHALE
                            </span>
                          )}
                        </div>

                        {/* Explicit stream action format: 'Player123 bet ৳500 on Dragon' */}
                        <div className="text-xs text-neutral-300 font-medium mt-0.5 flex items-center gap-1.5 flex-wrap">
                          <span>bet </span>
                          <span className="font-mono font-bold text-amber-400">
                            ৳{bet.amount.toLocaleString()}
                          </span>
                          <span> on </span>
                          <span className={`font-bold ${sideStyle.text}`}>
                            {bet.side === "DRAGON" ? "Dragon" : "Tiger"}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            STATUS: {bet.status || "ACTIVE"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Timestamp & Follow Bet Button */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right hidden xs:block">
                        <span className="text-[10px] text-neutral-400 font-mono block">
                          {getTimeAgo(bet.timestamp)}
                        </span>
                        {isUser && (
                          <span className="text-[9px] text-emerald-400 font-bold block">
                            Tk Return: ⏳ Escrow
                          </span>
                        )}
                      </div>

                      {/* Follow / Copy Bet Button (Social Betting Pressure) */}
                      {!isUser && onFollowBet && (
                        <button
                          onClick={() => handleCopy(bet)}
                          title={`Follow this bet: Copy ৳${bet.amount} on ${bet.side}`}
                          className={`px-2 py-1 rounded-lg text-[11px] font-semibold border flex items-center gap-1 transition-all ${
                            copiedId === bet.id
                              ? "bg-emerald-600 text-white border-emerald-500"
                              : "bg-neutral-800/80 hover:bg-neutral-700 border-neutral-700 text-neutral-300 hover:text-white"
                          }`}
                        >
                          <Copy className="w-3 h-3" />
                          <span>{copiedId === bet.id ? "Followed!" : "Follow"}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
});
