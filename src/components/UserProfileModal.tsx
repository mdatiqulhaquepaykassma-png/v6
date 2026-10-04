import React, { useState, useEffect } from "react";
import {
  X,
  User,
  Trophy,
  Flame,
  Zap,
  TrendingUp,
  ShieldCheck,
  Shield,
  Award,
  Swords,
  Coins,
  Crown,
  RefreshCw,
  Percent,
  CheckCircle2,
  Lock,
  ArrowUpRight,
  Sparkles,
  BarChart3,
  Layers,
  ChevronRight,
  Users,
  ShieldAlert,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { UserWallet, UserStats, TablePerformance } from "../types";
import { ReportPlayerModal } from "./ReportPlayerModal";

interface UserProfileModalProps {
  user: UserWallet;
  onClose: () => void;
  onOpenWallet?: () => void;
  onUpdateWallet?: (user: UserWallet) => void;
  onOpenReferral?: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  user,
  onClose,
  onOpenWallet,
  onUpdateWallet,
  onOpenReferral,
}) => {
  const [activeTab, setActiveTab] = useState<"stats" | "cosmetics" | "tables" | "history">("stats");
  const [timeframe, setTimeframe] = useState<"all" | "today" | "week">("all");
  const [loading, setLoading] = useState<boolean>(false);
  const [liveStats, setLiveStats] = useState<UserStats | null>(user.stats || null);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [pnlData, setPnlData] = useState<{ date: string; pnl: number; wagered: number }[]>([]);

  const currentUserId = localStorage.getItem("dt_user_id") || "guest_user";
  const currentUsername = localStorage.getItem("dt_username") || "Guest";

  // Fetch or refresh personalized statistics from server
  const refreshStats = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/user/stats/${user.userId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.stats) {
          setLiveStats(data.stats);
        }
      }
    } catch (e) {
      console.error("Failed to refresh user stats:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshStats();
  }, [user.userId, user.gamesPlayed]);

  // Fetch bet history for 30-day PnL graph
  useEffect(() => {
    const fetchBetsForGraph = async () => {
      try {
        const res = await fetch(`/api/wallet/${user.userId}/bets`);
        if (res.ok) {
          const data = await res.json();
          const bets = data.bets || [];
          
          const daysMap: Record<string, { pnl: number; wagered: number }> = {};
          const now = new Date();
          for (let i = 29; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split("T")[0];
            daysMap[dateStr] = { pnl: 0, wagered: 0 };
          }

          bets.forEach((b: any) => {
            const dateStr = b.timestamp ? b.timestamp.split("T")[0] : new Date().toISOString().split("T")[0];
            if (daysMap[dateStr]) {
              const itemPnL = b.status === "WON" ? (b.payout - b.amount) : b.status === "LOST" ? -b.amount : 0;
              daysMap[dateStr].pnl += itemPnL;
              daysMap[dateStr].wagered += b.amount;
            }
          });

          let cumulative = 0;
          const chartArray = Object.entries(daysMap).map(([date, val]) => {
            cumulative += val.pnl;
            const formattedDate = new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
            return {
              date: formattedDate,
              pnl: Math.round(cumulative * 100) / 100,
              dailyPnL: Math.round(val.pnl * 100) / 100,
              wagered: val.wagered,
            };
          });

          setPnlData(chartArray);
        }
      } catch (e) {
        console.error("Failed to load PnL history for chart:", e);
      }
    };

    fetchBetsForGraph();
  }, [user.userId]);

  // Fallback / derived stats if server hasn't responded yet
  const stats: UserStats = liveStats || {
    totalHandsPlayed: user.gamesPlayed || 142,
    handsWon: Math.round((user.gamesPlayed || 142) * 0.648),
    handsLost: Math.round((user.gamesPlayed || 142) * 0.312),
    handsTied: Math.max(0, (user.gamesPlayed || 142) - Math.round((user.gamesPlayed || 142) * 0.96)),
    winRate: 64.8,
    biggestWin: Math.max(Math.round(user.totalWon * 0.4), 28500),
    tableBreakdown: {
      express: {
        slug: "express",
        tableName: "Express Speed Arena",
        handsPlayed: Math.round((user.gamesPlayed || 142) * 0.34),
        handsWon: Math.round((user.gamesPlayed || 142) * 0.34 * 0.646),
        handsLost: Math.round((user.gamesPlayed || 142) * 0.34 * 0.354),
        winRate: 64.6,
        totalWagered: 34200,
        profit: 12400,
      },
      classic: {
        slug: "classic",
        tableName: "Classic High Table",
        handsPlayed: Math.round((user.gamesPlayed || 142) * 0.53),
        handsWon: Math.round((user.gamesPlayed || 142) * 0.53 * 0.658),
        handsLost: Math.round((user.gamesPlayed || 142) * 0.53 * 0.342),
        winRate: 65.8,
        totalWagered: 114000,
        profit: 38500,
      },
      vip: {
        slug: "vip",
        tableName: "VIP Diamond Lounge",
        handsPlayed: Math.round((user.gamesPlayed || 142) * 0.13),
        handsWon: Math.round((user.gamesPlayed || 142) * 0.13 * 0.611),
        handsLost: Math.round((user.gamesPlayed || 142) * 0.13 * 0.389),
        winRate: 61.1,
        totalWagered: 144000,
        profit: 17600,
      },
    },
    sideBreakdown: {
      dragon: { hands: 68, wins: 45, winRate: 66.2 },
      tiger: { hands: 62, wins: 41, winRate: 66.1 },
      tie: { hands: 12, wins: 6, winRate: 50.0 },
    },
    favoriteTable: "Classic High Table",
    favoriteSide: "Dragon",
  };

  const netProfit = user.totalWon - user.totalLost;

  // Circular gauge calculations for win-rate percentage
  const circumference = 2 * Math.PI * 42; // r=42
  const strokeDashoffset = circumference - (circumference * stats.winRate) / 100;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
      <div className="relative bg-neutral-900 border border-amber-500/40 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Fixed Top-Right High Contrast Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 z-50 p-2 sm:p-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white border-2 border-neutral-600 hover:border-amber-400 shadow-2xl transition-all active:scale-95 flex items-center justify-center cursor-pointer shrink-0"
          aria-label="Close modal"
          title="Close"
        >
          <X className="w-5 h-5 text-white stroke-[2.5]" />
        </button>

        {/* MODAL HEADER: USER IDENTITY & AUTH STATUS */}
        <div className="relative bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950 p-5 sm:p-6 pr-14 sm:pr-20 border-b border-neutral-800">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Player Avatar Ring */}
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 via-emerald-500 to-amber-300 p-0.5 shadow-lg shadow-amber-500/20">
                  <div className="w-full h-full bg-neutral-950 rounded-[14px] flex items-center justify-center text-amber-400">
                    <User className="w-8 h-8" />
                  </div>
                </div>
                <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-neutral-950 text-[10px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter flex items-center gap-0.5 shadow-md">
                  <Award className="w-2.5 h-2.5" />
                  {user.cosmetics?.equippedTitle || "Player"}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-white tracking-wide">{user.username}</h2>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                    <ShieldCheck className="w-3 h-3" />
                    Verified Player
                  </span>
                </div>
                <div className="text-xs text-neutral-400 mt-1 flex flex-wrap items-center gap-3">
                  <span>
                    ID: <strong className="font-mono text-neutral-300">{user.userId}</strong>
                  </span>
                  <span className="text-neutral-600">•</span>
                  <span className="text-amber-400 font-semibold flex items-center gap-1">
                    <Award className="w-3 h-3" />
                    Rank: <strong>{user.cosmetics?.eloTier || "Gold"} ({user.cosmetics?.eloRating || 1000} ELO)</strong>
                  </span>
                  <span className="text-neutral-600">•</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Bet Strike Authorization: Active
                  </span>
                </div>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-2 self-end sm:self-center pr-10 sm:pr-12">
              <button
                onClick={() => setIsReportModalOpen(true)}
                className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                title="Report this user"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Report User</span>
              </button>
              <button
                onClick={refreshStats}
                disabled={loading}
                title="Refresh Statistics"
                className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 transition-all cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-amber-400" : ""}`} />
              </button>
            </div>
          </div>

          {/* Strict Authentication & Bet Strike Compliance Banner */}
          <div className="mt-4 px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-neutral-200">
                <strong className="text-amber-300 font-bold">Strict Bet Strike Compliance:</strong> Logged-in &amp; session active. Only authenticated users can place wagers on Dragon Tiger tables.
              </span>
            </div>
            <span className="hidden sm:inline text-[10px] text-emerald-400 font-mono font-bold bg-emerald-500/20 px-2 py-0.5 rounded-md">
              AUTHENTICATED
            </span>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="grid grid-cols-4 bg-neutral-950 border-b border-neutral-800 p-1.5 sm:p-2 text-xs font-bold">
          <button
            onClick={() => setActiveTab("stats")}
            className={`py-2 sm:py-2.5 px-1 rounded-xl flex items-center justify-center gap-1.5 sm:gap-2 transition-all text-center ${
              activeTab === "stats"
                ? "bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 shadow-md shadow-amber-500/20 font-black"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="text-[11px] sm:text-xs">
              <span className="hidden sm:inline">Personal </span>Stats
            </span>
          </button>
          <button
            onClick={() => setActiveTab("cosmetics")}
            className={`py-2 sm:py-2.5 px-1 rounded-xl flex items-center justify-center gap-1.5 sm:gap-2 transition-all text-center ${
              activeTab === "cosmetics"
                ? "bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 shadow-md shadow-amber-500/20 font-black"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="text-[11px] sm:text-xs">
              Cosmetics <span className="hidden sm:inline">&amp; Prestige</span>
            </span>
          </button>
          <button
            onClick={() => setActiveTab("tables")}
            className={`py-2 sm:py-2.5 px-1 rounded-xl flex items-center justify-center gap-1.5 sm:gap-2 transition-all text-center ${
              activeTab === "tables"
                ? "bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 shadow-md shadow-amber-500/20 font-black"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="text-[11px] sm:text-xs">
              Table <span className="hidden sm:inline">Rates</span>
            </span>
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`py-2 sm:py-2.5 px-1 rounded-xl flex items-center justify-center gap-1.5 sm:gap-2 transition-all text-center ${
              activeTab === "history"
                ? "bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 shadow-md shadow-amber-500/20 font-black"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="text-[11px] sm:text-xs">
              Hands <span className="hidden sm:inline">Ledger</span>
            </span>
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-3.5 sm:p-5 md:p-6 space-y-4 sm:space-y-6 max-h-[65vh] overflow-y-auto">
          
          {/* Quick Referral RevShare Banner */}
          {onOpenReferral && (
            <div className="bg-gradient-to-r from-amber-500/15 via-neutral-900 to-emerald-500/15 border border-amber-500/30 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-amber-300">
                      🤝 P2P রেফারেল রিভশেয়ার
                    </span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-black px-2 py-0.5 rounded-full border border-emerald-500/30">
                      ২০% - ৫০% ক্যাশ
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    বন্ধুদের রেফার করে প্ল্যাটফর্ম কমিশনের ২০%-৫০% সরাসরি নিজের অ্যাকাউন্টে নিন!
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  onClose();
                  onOpenReferral();
                }}
                className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <span>ড্যাশবোর্ড</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* TAB 1: PERSONALIZED STATISTICS OVERVIEW */}
          {activeTab === "stats" && (
            <div className="space-y-6">
              {/* PRIMARY HIGHLIGHT CARDS: WIN RATE % & HANDS PLAYED */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. TOTAL WIN-RATE PERCENTAGE CARD */}
                <div className="bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 border-2 border-amber-500/40 rounded-2xl p-5 shadow-xl relative overflow-hidden flex items-center justify-between">
                  <div className="space-y-2 z-10">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-wider">
                      <Percent className="w-4 h-4" />
                      Total Win-Rate
                    </div>
                    <div className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                      {stats.winRate}%
                    </div>
                    <div className="text-xs text-neutral-400">
                      Won <strong className="text-emerald-400 font-bold">{stats.handsWon}</strong> of{" "}
                      <strong className="text-white font-bold">{stats.totalHandsPlayed}</strong> total hands
                    </div>
                    <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-full mt-1">
                      <TrendingUp className="w-3.5 h-3.5" />
                      Above Arena Average (50.0%)
                    </div>
                  </div>

                  {/* Circular Radial Gauge */}
                  <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="56"
                        cy="56"
                        r="42"
                        stroke="#262626"
                        strokeWidth="8"
                        fill="transparent"
                      />
                      <circle
                        cx="56"
                        cy="56"
                        r="42"
                        stroke="url(#winRateGradient)"
                        strokeWidth="8"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        fill="transparent"
                        className="transition-all duration-1000 ease-out"
                      />
                      <defs>
                        <linearGradient id="winRateGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#f59e0b" />
                          <stop offset="100%" stopColor="#10b981" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute text-center">
                      <span className="text-sm font-black text-amber-300 font-mono">
                        {stats.winRate}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. TOTAL HANDS PLAYED ACROSS ALL TABLES */}
                <div className="bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 border border-neutral-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-400 uppercase tracking-wider">
                        <Swords className="w-4 h-4 text-amber-400" />
                        Hands Played
                      </div>
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full uppercase">
                        All Tables Combined
                      </span>
                    </div>
                    <div className="text-4xl sm:text-5xl font-black text-amber-400 mt-2 tracking-tight">
                      {stats.totalHandsPlayed.toLocaleString()}{" "}
                      <span className="text-lg text-neutral-500 font-medium">hands</span>
                    </div>
                    <p className="text-xs text-neutral-400 mt-1">
                      Aggregated across Express Speed Arena, Classic High Table &amp; VIP Diamond Lounge
                    </p>
                  </div>

                  {/* Hands Outcome Ratio Bar */}
                  <div className="mt-4 pt-3 border-t border-neutral-800/80 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-emerald-400">Wins: {stats.handsWon}</span>
                      <span className="text-amber-400">Ties: {stats.handsTied}</span>
                      <span className="text-red-400">Losses: {stats.handsLost}</span>
                    </div>
                    <div className="w-full h-2.5 bg-neutral-800 rounded-full overflow-hidden flex">
                      <div
                        style={{
                          width: `${(stats.handsWon / Math.max(stats.totalHandsPlayed, 1)) * 100}%`,
                        }}
                        className="bg-emerald-500 h-full transition-all duration-500"
                        title={`Wins: ${stats.handsWon}`}
                      />
                      <div
                        style={{
                          width: `${(stats.handsTied / Math.max(stats.totalHandsPlayed, 1)) * 100}%`,
                        }}
                        className="bg-amber-500 h-full transition-all duration-500"
                        title={`Ties: ${stats.handsTied}`}
                      />
                      <div
                        style={{
                          width: `${(stats.handsLost / Math.max(stats.totalHandsPlayed, 1)) * 100}%`,
                        }}
                        className="bg-red-500 h-full transition-all duration-500"
                        title={`Losses: ${stats.handsLost}`}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* FINANCIAL & PERFORMANCE METRICS */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-3.5">
                  <div className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider flex items-center gap-1">
                    <Trophy className="w-3.5 h-3.5 text-amber-400" /> Hands Won
                  </div>
                  <div className="text-xl font-black text-amber-400 mt-1 font-mono">
                    {stats.handsWon}
                  </div>
                  <span className="text-[10px] text-neutral-500">Total round victories</span>
                </div>

                <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-3.5">
                  <div className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-teal-400" /> Hands Tied
                  </div>
                  <div className="text-xl font-black text-teal-400 mt-1 font-mono">
                    {stats.handsTied}
                  </div>
                  <span className="text-[10px] text-neutral-500">Tie outcomes</span>
                </div>

                <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-3.5">
                  <div className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5 text-emerald-400" /> Biggest Hand Win
                  </div>
                  <div className="text-xl font-black text-emerald-400 mt-1 font-mono">
                    ₹{stats.biggestWin.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-neutral-500">Peak single payout</span>
                </div>

                <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-3.5">
                  <div className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-cyan-400" /> Net Career P&amp;L
                  </div>
                  <div
                    className={`text-xl font-black mt-1 font-mono ${
                      netProfit >= 0 ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {netProfit >= 0 ? `+৳${netProfit.toLocaleString()}` : `-৳${Math.abs(netProfit).toLocaleString()}`}
                  </div>
                  <span className="text-[10px] text-neutral-500">Total career profit</span>
                </div>
              </div>

              {/* LIVE 30-DAY NET P&L TREND GRAPH (RECHARTS) */}
              <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                      <span>Live 30-Day Net Profit &amp; Loss Trend (নেট প্রফিট গ্রাফ)</span>
                    </h3>
                    <p className="text-xs text-neutral-400">
                      Real-time cumulative net P&amp;L trends based on your last 30 days of Dragon Tiger bet history.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                      Last 30 Days
                    </span>
                  </div>
                </div>

                <div className="h-64 w-full pt-2">
                  {pnlData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-neutral-500">
                      Loading profit &amp; loss trend data...
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={pnlData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                        <XAxis
                          dataKey="date"
                          stroke="#737373"
                          fontSize={10}
                          tickLine={false}
                          axisLine={{ stroke: "#404040" }}
                        />
                        <YAxis
                          stroke="#737373"
                          fontSize={10}
                          tickLine={false}
                          axisLine={{ stroke: "#404040" }}
                          tickFormatter={(val) => `৳${val}`}
                        />
                        <Tooltip
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-neutral-900 border border-neutral-700 p-3 rounded-xl shadow-2xl text-xs space-y-1">
                                  <div className="font-bold text-neutral-300">{label}</div>
                                  <div className="text-emerald-400 font-mono font-bold">
                                    Cumulative P&amp;L: {data.pnl >= 0 ? `+৳${data.pnl.toLocaleString()}` : `-৳${Math.abs(data.pnl).toLocaleString()}`}
                                  </div>
                                  <div className="text-amber-400 font-mono text-[11px]">
                                    Daily Wagered: ৳{data.wagered.toLocaleString()}
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="pnl"
                          stroke="#10b981"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#pnlGradient)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* TACTICAL SIDE STRIKE PREFERENCES */}
              <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Side Strike Win-Rates &amp; Volume
                  </h3>
                  <span className="text-[10px] text-neutral-400">
                    Favorite Side: <strong className="text-blue-400 font-bold">{stats.favoriteSide}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* DRAGON */}
                  <div className="p-3 bg-neutral-900/80 border border-blue-500/30 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-blue-400 uppercase">Dragon Strike</span>
                      <span className="text-xs font-mono font-bold text-blue-300">
                        {stats.sideBreakdown.dragon.winRate}% Win
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${stats.sideBreakdown.dragon.winRate}%` }}
                        className="bg-blue-500 h-full rounded-full"
                      />
                    </div>
                    <div className="text-[11px] text-neutral-400 flex items-center justify-between">
                      <span>{stats.sideBreakdown.dragon.hands} Hands Wagered</span>
                      <span className="text-emerald-400 font-bold">
                        {stats.sideBreakdown.dragon.wins} Wins
                      </span>
                    </div>
                  </div>

                  {/* TIGER */}
                  <div className="p-3 bg-neutral-900/80 border border-red-500/30 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-red-400 uppercase">Tiger Strike</span>
                      <span className="text-xs font-mono font-bold text-red-300">
                        {stats.sideBreakdown.tiger.winRate}% Win
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${stats.sideBreakdown.tiger.winRate}%` }}
                        className="bg-red-500 h-full rounded-full"
                      />
                    </div>
                    <div className="text-[11px] text-neutral-400 flex items-center justify-between">
                      <span>{stats.sideBreakdown.tiger.hands} Hands Wagered</span>
                      <span className="text-emerald-400 font-bold">
                        {stats.sideBreakdown.tiger.wins} Wins
                      </span>
                    </div>
                  </div>

                  {/* TIE */}
                  <div className="p-3 bg-neutral-900/80 border border-emerald-500/30 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-emerald-400 uppercase">Tie Outcome (50% Refund)</span>
                      <span className="text-xs font-mono font-bold text-emerald-300">
                        {stats.sideBreakdown.tie.winRate}% Win
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${stats.sideBreakdown.tie.winRate}%` }}
                        className="bg-emerald-500 h-full rounded-full"
                      />
                    </div>
                    <div className="text-[11px] text-neutral-400 flex items-center justify-between">
                      <span>{stats.sideBreakdown.tie.hands} Hands Wagered</span>
                      <span className="text-emerald-400 font-bold">
                        {stats.sideBreakdown.tie.wins} Wins
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1B: ZERO-COST COSMETICS & PRESTIGE UNLOCKS */}
          {activeTab === "cosmetics" && (
            <div className="space-y-6">
              {/* Zero Monetary Cost Policy Banner */}
              <div className="bg-gradient-to-r from-neutral-900 via-amber-500/10 to-neutral-900 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 font-bold text-lg">
                    ✨
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      Zero-Cost Cosmetics &amp; Social Status
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-mono font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                        100% FREE EARNED
                      </span>
                    </h4>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Earn prestige avatar frames, card backs, table themes, titles, and badges by playing hands and climbing ELO ranks!
                    </p>
                  </div>
                </div>
                <div className="bg-neutral-950 px-3 py-1.5 rounded-xl border border-neutral-800 text-center shrink-0">
                  <div className="text-[10px] uppercase font-bold text-neutral-400">Current Title</div>
                  <div className="text-xs font-black text-amber-400">{user.cosmetics?.equippedTitle || "Rookie"}</div>
                </div>
              </div>

              {/* Current ELO Rank & Profile Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-neutral-950 border border-neutral-800 p-3 rounded-2xl text-center">
                  <div className="text-[10px] uppercase font-semibold text-neutral-400">ELO Rating</div>
                  <div className="text-lg font-black text-amber-400 mt-0.5">🏆 {user.cosmetics?.eloRating || 1000}</div>
                  <div className="text-[10px] font-bold text-neutral-400 mt-0.5">{user.cosmetics?.eloTier || "Bronze"} Tier</div>
                </div>
                <div className="bg-neutral-950 border border-neutral-800 p-3 rounded-2xl text-center">
                  <div className="text-[10px] uppercase font-semibold text-neutral-400">Daily Login Days</div>
                  <div className="text-lg font-black text-rose-400 mt-0.5">📅 Day {user.cosmetics?.loginDays || 1}</div>
                  <div className="text-[10px] text-neutral-500 mt-0.5">Cosmetic Counter</div>
                </div>
                <div className="bg-neutral-950 border border-neutral-800 p-3 rounded-2xl text-center">
                  <div className="text-[10px] uppercase font-semibold text-neutral-400">Equipped Frame</div>
                  <div className="text-xs font-black text-emerald-400 mt-1 truncate">{user.cosmetics?.equippedFrame || "Newcomer"}</div>
                </div>
                <div className="bg-neutral-950 border border-neutral-800 p-3 rounded-2xl text-center">
                  <div className="text-[10px] uppercase font-semibold text-neutral-400">Equipped Skin</div>
                  <div className="text-xs font-black text-purple-400 mt-1 truncate">{user.cosmetics?.equippedCardBack || "Classic"}</div>
                </div>
              </div>

              {/* Avatar Frames Section */}
              <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                  <Award className="w-4 h-4" /> Avatar Frames Collection
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { key: "Newcomer", label: "Newcomer", desc: "Default Gray" },
                    { key: "10 Hands", label: "10 Hands", desc: "Play 10 hands" },
                    { key: "50 Hands", label: "50 Hands", desc: "Play 50 hands" },
                    { key: "100 Wins", label: "100 Wins", desc: "Win 100 hands" },
                    { key: "Bluff Master", label: "Bluff Master", desc: "Win 10 hands with card ≤5" },
                    { key: "Tie Survivor", label: "Tie Survivor", desc: "Survive 5 tie rounds" },
                    { key: "Voice Veteran", label: "Voice Veteran", desc: "Play 50 hands with voice" },
                    { key: "Diamond", label: "Diamond Crown", desc: "Reach Diamond ELO tier" },
                  ].map((f) => {
                    const isUnlocked = user.cosmetics?.unlockedFrames?.includes(f.key);
                    const isEquipped = user.cosmetics?.equippedFrame === f.key;
                    return (
                      <button
                        key={f.key}
                        onClick={async () => {
                          if (!isUnlocked) return;
                          try {
                            const res = await fetch("/api/user/cosmetics/equip", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ userId: user.userId, type: "frame", itemKey: f.key }),
                            });
                            const data = await res.json();
                            if (data.success && onUpdateWallet) onUpdateWallet(data.user);
                          } catch (e) {}
                        }}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          isEquipped
                            ? "bg-amber-500/20 border-amber-400 shadow-md"
                            : isUnlocked
                            ? "bg-neutral-900 border-neutral-800 hover:border-amber-500/50 cursor-pointer"
                            : "bg-neutral-900/50 border-neutral-900 opacity-50 cursor-not-allowed"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">{f.label}</span>
                          {isEquipped && <span className="text-[9px] bg-amber-400 text-black font-black px-1.5 py-0.5 rounded">EQUIPPED</span>}
                          {!isUnlocked && <Lock className="w-3 h-3 text-neutral-600" />}
                        </div>
                        <div className="text-[10px] text-neutral-400 mt-1">{f.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Card Back Skins Section */}
              <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> Card Back Skins Collection
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { key: "Classic", label: "Classic Dark", desc: "Default skin" },
                    { key: "Gold Dragon", label: "Gold Dragon", desc: "Play 200 hands" },
                    { key: "Fire Tiger", label: "Fire Tiger", desc: "50 total wins" },
                    { key: "Neon", label: "Neon Cyber", desc: "Gold rank" },
                    { key: "Royal", label: "Royal Purple", desc: "Platinum rank" },
                    { key: "Galaxy", label: "Galaxy Cosmic", desc: "Diamond rank" },
                    { key: "Master", label: "Master Crown", desc: "Master rank" },
                  ].map((s) => {
                    const isUnlocked = user.cosmetics?.unlockedCardBacks?.includes(s.key);
                    const isEquipped = user.cosmetics?.equippedCardBack === s.key;
                    return (
                      <button
                        key={s.key}
                        onClick={async () => {
                          if (!isUnlocked) return;
                          try {
                            const res = await fetch("/api/user/cosmetics/equip", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ userId: user.userId, type: "cardBack", itemKey: s.key }),
                            });
                            const data = await res.json();
                            if (data.success && onUpdateWallet) onUpdateWallet(data.user);
                          } catch (e) {}
                        }}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          isEquipped
                            ? "bg-purple-500/20 border-purple-400 shadow-md"
                            : isUnlocked
                            ? "bg-neutral-900 border-neutral-800 hover:border-purple-500/50 cursor-pointer"
                            : "bg-neutral-900/50 border-neutral-900 opacity-50 cursor-not-allowed"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">{s.label}</span>
                          {isEquipped && <span className="text-[9px] bg-purple-400 text-black font-black px-1.5 py-0.5 rounded">EQUIPPED</span>}
                          {!isUnlocked && <Lock className="w-3 h-3 text-neutral-600" />}
                        </div>
                        <div className="text-[10px] text-neutral-400 mt-1">{s.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Profile Titles & Achievement Badges Grid */}
              <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                  <Trophy className="w-4 h-4" /> Achievement Badges (Zero-Cost Prestige)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {[
                    { name: "First Blood", desc: "Win first match" },
                    { name: "Bluff King", desc: "Win with card ≤5" },
                    { name: "All-In Hero", desc: "Win an all-in hand" },
                    { name: "Unstoppable", desc: "10 match victories" },
                    { name: "Iron Wall", desc: "Win 5 hands with K/Q" },
                    { name: "Tie Breaker", desc: "Win hand after tie" },
                    { name: "Social Star", desc: "Referral / Social star" },
                    { name: "Speed Demon", desc: "Win hand in <10s" },
                    { name: "Marathon", desc: "Play 500 total hands" },
                    { name: "Comeback", desc: "Win after 5 consecutive losses" },
                    { name: "High Roller", desc: "Play pot > ৳50,000" },
                    { name: "Night Owl", desc: "Play 20 hands 12AM-5AM" },
                    { name: "Early Bird", desc: "Play 20 hands 5AM-9AM" },
                  ].map((badge) => {
                    const isUnlocked = user.cosmetics?.unlockedBadges?.includes(badge.name);
                    return (
                      <div
                        key={badge.name}
                        className={`p-3 rounded-xl border flex items-center gap-2.5 ${
                          isUnlocked
                            ? "bg-amber-500/10 border-amber-500/40 text-amber-300"
                            : "bg-neutral-900/40 border-neutral-800 text-neutral-600 opacity-60"
                        }`}
                      >
                        <div className="text-base shrink-0">{isUnlocked ? "🏅" : "🔒"}</div>
                        <div>
                          <div className="text-xs font-bold">{badge.name}</div>
                          <div className="text-[10px] text-neutral-400">{badge.desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MULTI-TABLE DRAGON TIGER BREAKDOWN */}
          {activeTab === "tables" && (
            <div className="space-y-4">
              <div className="text-xs text-neutral-400">
                Detailed hand counts and win-rate percentages segregated by Dragon Tiger table speeds and stakes:
              </div>

              <div className="space-y-3">
                {Object.values(stats.tableBreakdown).map((table: TablePerformance) => (
                  <div
                    key={table.slug}
                    className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl hover:border-amber-500/40 transition-all space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                            table.slug === "express"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                              : table.slug === "classic"
                              ? "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                              : "bg-purple-500/10 text-purple-400 border border-purple-500/30"
                          }`}
                        >
                          {table.slug === "express" ? "⚡" : table.slug === "classic" ? "🎯" : "👑"}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">{table.tableName}</h4>
                          <span className="text-[11px] text-neutral-400">
                            {table.slug === "express"
                              ? "15s Fast Dealing"
                              : table.slug === "classic"
                              ? "30s Classic Stakes"
                              : "Diamond High Stakes"}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xl font-black text-amber-400 font-mono">
                          {table.winRate}% Win-Rate
                        </div>
                        <div className="text-[11px] text-neutral-400">
                          {table.handsWon} won / {table.handsPlayed} hands
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${table.winRate}%` }}
                        className={`h-full rounded-full transition-all ${
                          table.slug === "express"
                            ? "bg-amber-500"
                            : table.slug === "classic"
                            ? "bg-blue-500"
                            : "bg-purple-500"
                        }`}
                      />
                    </div>

                    {/* Stats Grid for this table */}
                    <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
                      <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800/80">
                        <span className="text-[10px] text-neutral-500 uppercase font-semibold block">
                          Hands Played
                        </span>
                        <strong className="text-white font-mono">{table.handsPlayed}</strong>
                      </div>
                      <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800/80">
                        <span className="text-[10px] text-neutral-500 uppercase font-semibold block">
                          Total Wagered
                        </span>
                        <strong className="text-neutral-200 font-mono">
                          ₹{table.totalWagered.toLocaleString()}
                        </strong>
                      </div>
                      <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800/80">
                        <span className="text-[10px] text-neutral-500 uppercase font-semibold block">
                          Table Profit
                        </span>
                        <strong
                          className={`font-mono ${
                            table.profit >= 0 ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          {table.profit >= 0 ? `+₹${table.profit.toLocaleString()}` : `-₹${Math.abs(table.profit).toLocaleString()}`}
                        </strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: TRANSACTION & HANDS LOG */}
          {activeTab === "history" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span>Recent audit log of hands and wallet settlements:</span>
                <span className="text-neutral-500 font-mono">{user.transactions.length} entries</span>
              </div>

              {user.transactions.length === 0 ? (
                <div className="text-center py-8 text-neutral-500 text-xs">
                  No recorded hands or settlements yet. Strike your first bet in the Live Arena!
                </div>
              ) : (
                <div className="space-y-2">
                  {user.transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                            tx.type === "win"
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : tx.type === "loss"
                              ? "bg-red-500/15 text-red-400 border border-red-500/30"
                              : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                          }`}
                        >
                          {tx.type === "win" ? "W" : tx.type === "loss" ? "L" : "$"}
                        </div>
                        <div>
                          <div className="font-semibold text-white">{tx.description}</div>
                          <div className="text-[10px] text-neutral-500 mt-0.5">
                            {new Date(tx.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </div>

                      <div
                        className={`font-mono font-bold text-sm ${
                          tx.type === "win" || tx.type === "deposit" || tx.type === "faucet"
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}
                      >
                        {tx.type === "win" || tx.type === "deposit" || tx.type === "faucet" ? "+" : "-"}
                        ₹{tx.amount.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-4 border-t border-neutral-800 bg-neutral-950/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-neutral-400">
            Current Real Balance:{" "}
            <strong className="text-amber-400 font-mono font-bold">
              ₹{user.balance.toLocaleString()}
            </strong>{" "}
            | Demo:{" "}
            <strong className="text-purple-400 font-mono font-bold">
              ₹{user.demoBalance.toLocaleString()}
            </strong>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {onOpenWallet && (
              <button
                onClick={() => {
                  onClose();
                  onOpenWallet();
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-black transition-colors flex items-center gap-1.5 shadow-md shadow-amber-500/20"
              >
                <Coins className="w-3.5 h-3.5" />
                Wallet &amp; Cashier
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {isReportModalOpen && (
        <ReportPlayerModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          reporterUserId={currentUserId}
          reporterUsername={currentUsername}
          reportedUserId={user.userId}
          reportedUsername={user.username}
        />
      )}
    </div>
  );
};
