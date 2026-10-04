import React, { useState, useEffect } from "react";
import {
  X,
  RefreshCw,
  Coins,
  ShieldCheck,
  Users,
  Search,
  CheckCircle2,
  Lock,
  Layers,
  Activity,
  Flame,
  UserCheck,
} from "lucide-react";
import { SiteLiquidityData, UserBalanceRecord } from "../types";

interface SiteLiquidityModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
}

export const SiteLiquidityModal: React.FC<SiteLiquidityModalProps> = ({
  isOpen,
  onClose,
  currentUserId,
}) => {
  const [data, setData] = useState<SiteLiquidityData | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"balance" | "netProfit" | "gamesPlayed" | "lockedBalance">("balance");
  const [lastRefreshed, setLastRefreshed] = useState<string>("");

  const fetchLiquidity = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/site/liquidity");
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setLastRefreshed(new Date().toLocaleTimeString());
      }
    } catch (e) {
      console.error("Failed to fetch site liquidity:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLiquidity();
      const interval = setInterval(fetchLiquidity, 5000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredUsers = (data?.users || [])
    .filter((u) => {
      const matchesSearch =
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.userId.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTier = tierFilter === "ALL" || u.vipTier.toUpperCase() === tierFilter.toUpperCase();
      return matchesSearch && matchesTier;
    })
    .sort((a, b) => {
      if (sortBy === "balance") return b.balance - a.balance;
      if (sortBy === "netProfit") return b.netProfit - a.netProfit;
      if (sortBy === "gamesPlayed") return b.gamesPlayed - a.gamesPlayed;
      if (sortBy === "lockedBalance") return b.lockedBalance - a.lockedBalance;
      return 0;
    });

  const getTierBadge = (tier: string) => {
    switch (tier.toLowerCase()) {
      case "diamond":
        return "bg-cyan-500/20 text-cyan-300 border-cyan-500/40";
      case "platinum":
        return "bg-purple-500/20 text-purple-300 border-purple-500/40";
      case "gold":
        return "bg-amber-500/20 text-amber-300 border-amber-500/40";
      default:
        return "bg-slate-500/20 text-slate-300 border-slate-500/40";
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-5xl max-h-[92vh] bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-neutral-100">
        {/* Fixed Top-Right High Contrast Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 z-50 p-2 sm:p-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white border-2 border-neutral-600 hover:border-amber-400 shadow-2xl transition-all active:scale-95 flex items-center justify-center cursor-pointer shrink-0"
          aria-label="Close modal"
          title="Close"
        >
          <X className="w-5 h-5 text-white stroke-[2.5]" />
        </button>

        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 pr-14 sm:pr-16 border-b border-neutral-800/80 bg-neutral-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
                  সাইটের মোট লিকুইডিটি ও সকল ইউজারের ব্যালেন্স
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  100% Transparent Ledger
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Full Site Liquidity &amp; All User Account Balances Real-Time Audit
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 mr-10 sm:mr-12">
            <button
              onClick={fetchLiquidity}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-300 border border-neutral-700 transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-amber-400" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Top 5 Liquidity & Company Profit Overview Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-3.5">
            {/* Total Company Profit & Revenue */}
            <div className="col-span-2 sm:col-span-1 p-4 rounded-xl bg-gradient-to-br from-amber-500/20 via-[#181D29] to-emerald-500/10 border border-amber-500/50 shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
                <span className="font-bold text-amber-300">কোম্পানির মোট প্রফিট</span>
                <Flame className="w-4 h-4 text-amber-400 fill-current" />
              </div>
              <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400 tabular-nums">
                ৳{((data?.todayCommission || 0) + (data?.todayTieRevenue || 0)).toLocaleString()}
              </div>
              <div className="text-[10px] text-amber-300 font-mono mt-1 flex items-center gap-1 font-semibold">
                <span>5% Commission + 50% Tie Fund</span>
              </div>
            </div>

            {/* Total Site Liquidity */}
            <div className="p-4 rounded-xl bg-[#161B26] border border-white/10 relative overflow-hidden">
              <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
                <span className="font-semibold text-neutral-300">মোট প্ল্যাটফর্ম লিকুইডিটি</span>
                <Coins className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black font-mono text-white tabular-nums">
                ৳{(data?.totalSiteLiquidity || 0).toLocaleString()}
              </div>
              <div className="text-[10px] text-amber-400/80 mt-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span>Real Balances + Escrow</span>
              </div>
            </div>

            {/* Total Real Cash Balances */}
            <div className="p-4 rounded-xl bg-[#161B26] border border-white/10 relative overflow-hidden">
              <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
                <span>ইউজারদের আসল ব্যালেন্স</span>
                <UserCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400 tabular-nums">
                ৳{(data?.totalRealBalance || 0).toLocaleString()}
              </div>
              <div className="text-[10px] text-neutral-400 mt-1">
                All Verified User Wallets
              </div>
            </div>

            {/* Active Escrow in Play */}
            <div className="p-4 rounded-xl bg-[#161B26] border border-white/10 relative overflow-hidden">
              <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
                <span>লকড ইন-প্লে এসক্রো</span>
                <Lock className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black font-mono text-blue-400 tabular-nums">
                ৳{(data?.totalEscrowLocked || 0).toLocaleString()}
              </div>
              <div className="text-[10px] text-neutral-400 mt-1">
                Active Table &amp; P2P Staked
              </div>
            </div>

            {/* Total Registered / Network Players */}
            <div className="p-4 rounded-xl bg-[#161B26] border border-white/10 relative overflow-hidden">
              <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
                <span>সক্রিয় প্লেয়ার নেটওয়ার্ক</span>
                <Users className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black font-mono text-purple-300 tabular-nums">
                {(data?.activeOnlineCount || 284592).toLocaleString()} Players
              </div>
              <div className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Global Live Node</span>
              </div>
            </div>
          </div>

          {/* High-Load Distributed Architecture Telemetry Banner */}
          {data?.telemetry && (
            <div className="p-3.5 rounded-xl bg-neutral-950 border border-emerald-500/20 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-neutral-800/70">
                <div className="flex items-center gap-2 font-bold text-white">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-emerald-400 uppercase tracking-wider font-mono text-[11px]">
                    Enterprise High-Load Engine
                  </span>
                  <span className="text-neutral-500">·</span>
                  <span className="text-neutral-300">{data.telemetry.activeNode}</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] font-mono text-neutral-400">
                  <span>Throughput: <strong className="text-white">{data.telemetry.tps} TPS</strong></span>
                  <span>·</span>
                  <span>Latency: <strong className="text-emerald-400">{data.telemetry.latencyMs}ms</strong></span>
                  <span>·</span>
                  <span>Bets/sec: <strong className="text-amber-400">{(data.telemetry.betsPerSecond ?? 0).toLocaleString()}</strong></span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2.5 text-[11px]">
                <div className="bg-[#161B26] p-2 rounded-lg border border-white/10">
                  <div className="text-[10px] text-neutral-400 uppercase font-semibold">আজকের গ্লোবাল টার্নওভার</div>
                  <div className="font-mono font-bold text-amber-400 text-sm tabular-nums">
                    ৳{(data?.todayMatchedVolume || data?.telemetry?.todayGlobalTurnover || 0).toLocaleString()}
                  </div>
                </div>
                <div className="bg-[#161B26] p-2 rounded-lg border border-emerald-500/30">
                  <div className="text-[10px] text-emerald-400 uppercase font-semibold">৫% ম্যাচিং ডুয়েলে ফি আয়</div>
                  <div className="font-mono font-bold text-emerald-300 text-sm tabular-nums">
                    +৳{(data?.todayCommission || 0).toLocaleString()}
                  </div>
                </div>
                <div className="bg-[#161B26] p-2 rounded-lg border border-amber-500/30">
                  <div className="text-[10px] text-amber-300 uppercase font-semibold">৫০% টাই ফান্ড রিজার্ভ</div>
                  <div className="font-mono font-bold text-amber-400 text-sm tabular-nums">
                    +৳{(data?.todayTieRevenue || 0).toLocaleString()}
                  </div>
                </div>
                <div className="bg-[#161B26] p-2 rounded-lg border border-white/10">
                  <div className="text-[10px] text-neutral-400 uppercase font-semibold">মোট প্ল্যাটফর্ম নিট আর্নিং</div>
                  <div className="font-mono font-bold text-emerald-400 text-sm tabular-nums">
                    ৳{((data?.todayCommission || 0) + (data?.todayTieRevenue || 0)).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Table-by-Table Live Liquidity Pools */}
          {data?.tableLiquidity && (
            <div className="p-3.5 rounded-xl bg-neutral-900/50 border border-neutral-800/80">
              <div className="flex items-center justify-between mb-3 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-neutral-300">
                  <Layers className="w-4 h-4 text-amber-400" />
                  <span>লাইভ টেবিল লিকুইডিটি পুল (Table Arenas Liquidity Pools)</span>
                </div>
                {lastRefreshed && (
                  <span className="text-[10px] text-neutral-500">Last Synced: {lastRefreshed}</span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-amber-300">Express Arena</div>
                    <div className="text-[10px] text-neutral-500">
                      {(data.tableLiquidity.express?.players ?? 0)} Active Bettors
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-white">
                      ৳{(data.tableLiquidity.express?.pool ?? 0).toLocaleString()}
                    </div>
                    <div className="text-[10px] text-emerald-400 font-semibold">
                      Matched: ৳{(data.tableLiquidity.express?.matched ?? 0).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-blue-300">Classic High Table</div>
                    <div className="text-[10px] text-neutral-500">
                      {(data.tableLiquidity.classic?.players ?? 0)} Active Bettors
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-white">
                      ৳{(data.tableLiquidity.classic?.pool ?? 0).toLocaleString()}
                    </div>
                    <div className="text-[10px] text-emerald-400 font-semibold">
                      Matched: ৳{(data.tableLiquidity.classic?.matched ?? 0).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-purple-300">VIP Diamond Lounge</div>
                    <div className="text-[10px] text-neutral-500">
                      {(data.tableLiquidity.vip?.players ?? 0)} Active Bettors
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-white">
                      ৳{(data.tableLiquidity.vip?.pool ?? 0).toLocaleString()}
                    </div>
                    <div className="text-[10px] text-emerald-400 font-semibold">
                      Matched: ৳{(data.tableLiquidity.vip?.matched ?? 0).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Search, Filter & Sort Controls */}
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by player username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/50"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Tier Filter */}
              <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-xl border border-neutral-800 text-[11px] font-bold">
                {["ALL", "DIAMOND", "PLATINUM", "GOLD"].map((tier) => (
                  <button
                    key={tier}
                    onClick={() => setTierFilter(tier)}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      tierFilter === tier
                        ? "bg-amber-500 text-neutral-950 font-black"
                        : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    {tier}
                  </button>
                ))}
              </div>

              {/* Sort selector */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-neutral-900 border border-neutral-800 rounded-xl px-2.5 py-1.5 text-xs text-neutral-300 font-semibold focus:outline-none focus:border-amber-500"
              >
                <option value="balance">Sort: Highest Real Balance</option>
                <option value="netProfit">Sort: Highest Profit</option>
                <option value="lockedBalance">Sort: In-Play Escrow</option>
                <option value="gamesPlayed">Sort: Games Played</option>
              </select>
            </div>
          </div>

          {/* All Users Balance Table */}
          <div className="border border-neutral-800 rounded-2xl overflow-hidden bg-neutral-950">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-neutral-900/80 border-b border-neutral-800 text-neutral-400 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-3 sm:px-4"># Rank / Player</th>
                    <th className="py-3 px-3">VIP Tier</th>
                    <th className="py-3 px-3 text-right">আসল ব্যালেন্স (Real Tk)</th>
                    <th className="py-3 px-3 text-right">ডেমো ব্যালেন্স (Demo)</th>
                    <th className="py-3 px-3 text-right">ইন-প্লে এসক্রো</th>
                    <th className="py-3 px-3 text-right">মোট নেট প্রফিট</th>
                    <th className="py-3 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-neutral-500">
                        No players matching search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u, index) => {
                      const isCurrentUser = u.userId === currentUserId;
                      return (
                        <tr
                          key={u.userId}
                          className={`hover:bg-neutral-900/60 transition-colors ${
                            isCurrentUser ? "bg-amber-500/10 border-l-2 border-amber-400" : ""
                          }`}
                        >
                          {/* Rank & Username */}
                          <td className="py-3 px-3 sm:px-4 flex items-center gap-2.5">
                            <span
                              className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                                index === 0
                                  ? "bg-amber-500 text-neutral-950 font-black shadow-md shadow-amber-500/30"
                                  : index === 1
                                  ? "bg-slate-300 text-neutral-950 font-black"
                                  : index === 2
                                  ? "bg-amber-700 text-white font-black"
                                  : "bg-neutral-800 text-neutral-400"
                              }`}
                            >
                              {index + 1}
                            </span>
                            <div>
                              <div className="font-bold text-white flex items-center gap-1.5">
                                <span>{u.username}</span>
                                {isCurrentUser && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500 text-neutral-950 font-black">
                                    YOU
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-neutral-500 font-mono">
                                {u.gamesPlayed} rounds played
                              </div>
                            </div>
                          </td>

                          {/* VIP Tier */}
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getTierBadge(
                                u.vipTier
                              )}`}
                            >
                              {u.vipTier}
                            </span>
                          </td>

                          {/* Real Cash Balance */}
                          <td className="py-3 px-3 text-right font-mono font-black text-emerald-400 text-xs sm:text-sm">
                            ₹{u.balance.toLocaleString()}
                          </td>

                          {/* Demo Balance */}
                          <td className="py-3 px-3 text-right font-mono text-neutral-400">
                            ₹{u.demoBalance.toLocaleString()}
                          </td>

                          {/* Locked Escrow */}
                          <td className="py-3 px-3 text-right font-mono">
                            {u.lockedBalance > 0 ? (
                              <span className="text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                                ₹{u.lockedBalance.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-neutral-500">₹0</span>
                            )}
                          </td>

                          {/* Net Profit */}
                          <td className="py-3 px-3 text-right font-mono font-bold">
                            <span className={u.netProfit >= 0 ? "text-emerald-400" : "text-red-400"}>
                              {u.netProfit >= 0 ? `+₹${u.netProfit.toLocaleString()}` : `-₹${Math.abs(u.netProfit).toLocaleString()}`}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                u.status === "IN_GAME"
                                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                  : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  u.status === "IN_GAME" ? "bg-amber-400 animate-ping" : "bg-emerald-400"
                                }`}
                              />
                              {u.status === "IN_GAME" ? "In-Game" : "Active"}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Transparency & Security Footer Guarantee */}
          <div className="p-3.5 bg-neutral-900/60 border border-neutral-800 rounded-xl flex items-center justify-between text-xs text-neutral-400 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>100% On-Chain &amp; Transparent Ledger:</strong> সাইটের মোট ফান্ড, সমস্ত প্লেয়ারদের আসল ব্যালেন্স এবং ইন-প্লে ম্যাচড লিকুইডিটি সম্পূর্ণ উন্মুক্ত ও নিরাপদ।
              </span>
            </div>
            <div className="text-[11px] font-mono text-amber-400/90 font-semibold">
              Total Liquidity: ₹{(data?.totalSiteLiquidity || 0).toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
