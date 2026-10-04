import React, { useState, useEffect } from "react";
import {
  X,
  History,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  ShieldCheck,
  Download,
  Filter,
  Search,
  Sparkles,
  Coins,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
} from "lucide-react";
import { UserWallet, UserBetHistoryItem, UserBetHistoryResponse } from "../types";

interface UserBetHistoryModalProps {
  user: UserWallet;
  isOpen: boolean;
  onClose: () => void;
  lang?: "bn" | "en";
}

export const UserBetHistoryModal: React.FC<UserBetHistoryModalProps> = ({
  user,
  isOpen,
  onClose,
  lang = "bn",
}) => {
  const [data, setData] = useState<UserBetHistoryResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedTable, setSelectedTable] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedBalanceType, setSelectedBalanceType] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedBetId, setExpandedBetId] = useState<string | null>(null);
  const [disputeBet, setDisputeBet] = useState<UserBetHistoryItem | null>(null);
  const [disputeIssueType, setDisputeIssueType] = useState<string>("Result Dispute");
  const [disputeDesc, setDisputeDesc] = useState<string>("");
  const [disputeSubmitting, setDisputeSubmitting] = useState<boolean>(false);
  const [disputeMsg, setDisputeMsg] = useState<string | null>(null);

  const handleSubmittingDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeBet || !disputeDesc.trim()) {
      alert(isBn ? "অনুগ্রহ করে অভিযোগের বিবরণ উল্লেখ করুন।" : "Please provide dispute description.");
      return;
    }
    setDisputeSubmitting(true);
    setDisputeMsg(null);
    try {
      const res = await fetch("/api/disputes/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.userId,
          username: user.username,
          roundNumber: disputeBet.roundNumber,
          tableSlug: disputeBet.tableSlug,
          tableName: disputeBet.tableName,
          betAmount: disputeBet.amount,
          side: disputeBet.side,
          issueType: disputeIssueType,
          description: disputeDesc.trim(),
          dragonCard: disputeBet.dragonCard,
          tigerCard: disputeBet.tigerCard,
          result: disputeBet.result,
          serverSeedHash: disputeBet.serverSeedHash,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setDisputeMsg(json.message || (isBn ? "অভিযোগ সফলভাবে জমা হয়েছে।" : "Dispute submitted successfully."));
        setTimeout(() => {
          setDisputeBet(null);
          setDisputeDesc("");
          setDisputeMsg(null);
        }, 2000);
      } else {
        alert(json.error || "Failed to submit dispute.");
      }
    } catch {
      alert("Network error submitting dispute.");
    } finally {
      setDisputeSubmitting(false);
    }
  };

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/wallet/${user.userId}/bets?username=${encodeURIComponent(user.username)}`);
      if (res.ok) {
        const json: UserBetHistoryResponse = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error("Failed to fetch user bet history:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen, user.userId]);

  if (!isOpen) return null;

  const bets = data?.bets || [];

  const filteredBets = bets.filter((b) => {
    if (selectedTable !== "ALL" && b.tableSlug !== selectedTable) return false;
    if (selectedStatus !== "ALL") {
      if (selectedStatus === "UNMATCHED") {
        if (!b.unmatchedAmount || b.unmatchedAmount <= 0) return false;
      } else if (selectedStatus === "REFUNDED") {
        if (b.status !== "REFUNDED" && b.status !== "TIE_REFUND" && (!b.returnedAmount || b.returnedAmount <= 0)) return false;
      } else if (b.status !== selectedStatus) {
        return false;
      }
    }
    if (selectedBalanceType !== "ALL" && b.balanceType !== selectedBalanceType) return false;
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      const matchRound = String(b.roundNumber).includes(q);
      const matchSide = b.side.toLowerCase().includes(q);
      const matchTable = b.tableName.toLowerCase().includes(q);
      if (!matchRound && !matchSide && !matchTable) return false;
    }
    return true;
  });

  const exportCSV = () => {
    if (!bets.length) return;
    const headers = [
      "Round #",
      "Table",
      "Side",
      "Stake (Tk)",
      "Matched (Tk)",
      "Refunded (Tk)",
      "Status",
      "Payout (Tk)",
      "Net P&L (Tk)",
      "Dragon Card",
      "Tiger Card",
      "Winner",
      "Timestamp",
    ];
    const rows = bets.map((b) => [
      b.roundNumber,
      `"${b.tableName}"`,
      b.side,
      b.amount,
      b.matchedAmount,
      b.returnedAmount,
      b.status,
      b.payout,
      b.netPnL,
      b.dragonCard ? `"${b.dragonCard.display}"` : "N/A",
      b.tigerCard ? `"${b.tigerCard.display}"` : "N/A",
      b.result || "N/A",
      b.timestamp,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `bet_history_${user.username}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isBn = lang === "bn";
  const netProfit = data?.netPnL || 0;
  const isProfit = netProfit >= 0;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative bg-[#0b0f19] border border-neutral-800 text-neutral-100 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
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
        <div className="px-5 py-4 border-b border-neutral-800/80 bg-neutral-900/60 flex items-center justify-between shrink-0 pr-14 sm:pr-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-wide text-white">
                  {isBn ? "বিস্তারিত বাজি ইতিহাস ও লেজার" : "Detailed Bet History & Ledger"}
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-neutral-800 border border-neutral-700 text-amber-300">
                  @{user.username}
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                {isBn
                  ? "প্রতিটি রাউন্ডের ফলাফল, ম্যাচ হওয়া বাজি, আনম্যাচড অটো-রিফান্ড এবং নেট P&L"
                  : "Transparent round results, matched stakes, auto-refunds, and net P&L audit"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exportCSV}
              disabled={!bets.length}
              title={isBn ? "CSV স্টেটমেন্ট ডাউনলোড করুন" : "Download CSV Ledger"}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-neutral-200 border border-neutral-700 transition-colors disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>{isBn ? "CSV এক্সপোর্ট" : "Export CSV"}</span>
            </button>
            <button
              onClick={fetchHistory}
              title={isBn ? "রিফ্রেশ করুন" : "Refresh"}
              className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
            >
              <RotateCcw className={`w-4 h-4 ${loading ? "animate-spin text-amber-400" : ""}`} />
            </button>
          </div>
        </div>

        {/* Aggregated KPI Dashboard Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 p-4 bg-neutral-950/60 border-b border-neutral-800/80 shrink-0">
          {/* Total Wagered */}
          <div className="bg-neutral-900/70 border border-neutral-800 rounded-xl p-3">
            <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">
              {isBn ? "মোট বাজি ধরা হয়েছে" : "Total Wagered"}
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-base sm:text-lg font-black font-mono text-white">
                ৳{(data?.totalWagered || 0).toLocaleString()}
              </span>
              <span className="text-[10px] text-neutral-500 font-mono">({data?.totalBetsCount || 0} {isBn ? "টি বাজি" : "bets"})</span>
            </div>
          </div>

          {/* Matched vs Returned */}
          <div className="bg-neutral-900/70 border border-neutral-800 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">
                {isBn ? "ম্যাচ বনাম ফেরত" : "Matched vs Returned"}
              </span>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">100% P2P</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs font-mono">
              <span className="text-neutral-300">
                M: ৳{(data?.totalMatched || 0).toLocaleString()}
              </span>
              <span className="text-emerald-400 font-bold">
                +৳{(data?.totalReturned || 0).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Net P&L */}
          <div className={`rounded-xl p-3 border ${isProfit ? "bg-emerald-950/20 border-emerald-500/30" : "bg-rose-950/20 border-rose-500/30"}`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">
                {isBn ? "নেট লাভ / ক্ষতি (P&L)" : "Net Profit & Loss"}
              </span>
              {isProfit ? (
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
              )}
            </div>
            <div className="mt-1">
              <span className={`text-base sm:text-lg font-black font-mono ${isProfit ? "text-emerald-400" : "text-rose-400"}`}>
                {isProfit ? "+" : ""}৳{netProfit.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Win Rate */}
          <div className="bg-neutral-900/70 border border-neutral-800 rounded-xl p-3">
            <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">
              {isBn ? "জয়ের হার (Win Rate)" : "Win Rate"}
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-base sm:text-lg font-black font-mono text-amber-300">
                {data?.winRate || 0}%
              </span>
              <span className="text-[10px] text-neutral-500">
                ({data?.totalWon ? `+৳${data.totalWon.toLocaleString()}` : ""})
              </span>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="px-4 py-2.5 bg-neutral-900/40 border-b border-neutral-800/80 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Table Filter */}
            <div className="flex items-center bg-neutral-950 p-1 rounded-lg border border-neutral-800 text-[11px] font-semibold">
              <button
                onClick={() => setSelectedTable("ALL")}
                className={`px-2 py-0.5 rounded ${selectedTable === "ALL" ? "bg-amber-500 text-neutral-950 font-bold" : "text-neutral-400 hover:text-white"}`}
              >
                {isBn ? "সব টেবিল" : "All"}
              </button>
              <button
                onClick={() => setSelectedTable("express")}
                className={`px-2 py-0.5 rounded ${selectedTable === "express" ? "bg-amber-500 text-neutral-950 font-bold" : "text-neutral-400 hover:text-white"}`}
              >
                ⚡ Express
              </button>
              <button
                onClick={() => setSelectedTable("classic")}
                className={`px-2 py-0.5 rounded ${selectedTable === "classic" ? "bg-amber-500 text-neutral-950 font-bold" : "text-neutral-400 hover:text-white"}`}
              >
                🎯 Classic
              </button>
              <button
                onClick={() => setSelectedTable("vip")}
                className={`px-2 py-0.5 rounded ${selectedTable === "vip" ? "bg-amber-500 text-neutral-950 font-bold" : "text-neutral-400 hover:text-white"}`}
              >
                👑 VIP
              </button>
            </div>

            {/* Status Filter */}
            <div className="flex items-center bg-neutral-950 p-1 rounded-lg border border-neutral-800 text-[11px] font-semibold overflow-x-auto">
              <button
                onClick={() => setSelectedStatus("ALL")}
                className={`px-2 py-0.5 rounded whitespace-nowrap ${selectedStatus === "ALL" ? "bg-neutral-700 text-white font-bold" : "text-neutral-400 hover:text-white"}`}
              >
                {isBn ? "সব স্ট্যাটাস" : "All"}
              </button>
              <button
                onClick={() => setSelectedStatus("WON")}
                className={`px-2 py-0.5 rounded whitespace-nowrap ${selectedStatus === "WON" ? "bg-emerald-600 text-white font-bold" : "text-neutral-400 hover:text-emerald-400"}`}
              >
                {isBn ? "জয়" : "Won"}
              </button>
              <button
                onClick={() => setSelectedStatus("LOST")}
                className={`px-2 py-0.5 rounded whitespace-nowrap ${selectedStatus === "LOST" ? "bg-rose-600 text-white font-bold" : "text-neutral-400 hover:text-rose-400"}`}
              >
                {isBn ? "পরাজয়" : "Lost"}
              </button>
              <button
                onClick={() => setSelectedStatus("UNMATCHED")}
                className={`px-2 py-0.5 rounded whitespace-nowrap ${selectedStatus === "UNMATCHED" ? "bg-cyan-600 text-white font-bold" : "text-neutral-400 hover:text-cyan-400"}`}
              >
                {isBn ? "অনম্যাচড ফেরত" : "Unmatched"}
              </button>
              <button
                onClick={() => setSelectedStatus("REFUNDED")}
                className={`px-2 py-0.5 rounded whitespace-nowrap ${selectedStatus === "REFUNDED" ? "bg-blue-600 text-white font-bold" : "text-neutral-400 hover:text-blue-400"}`}
              >
                {isBn ? "রিফান্ড" : "Refund"}
              </button>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-48">
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={isBn ? "রাউন্ড # বা সাইড খুঁজুন..." : "Search round / side..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-8 pr-3 py-1 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-500/50"
            />
          </div>
        </div>

        {/* Bets Scrollable Table / Cards */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-neutral-400 space-y-3">
              <RotateCcw className="w-8 h-8 animate-spin text-amber-500" />
              <p className="text-sm font-semibold">
                {isBn ? "বাজি ইতিহাস লোড হচ্ছে..." : "Loading bet history from ledger..."}
              </p>
            </div>
          ) : filteredBets.length === 0 ? (
            <div className="text-center py-16 text-neutral-500 bg-neutral-900/30 rounded-xl border border-dashed border-neutral-800">
              <History className="w-10 h-10 mx-auto text-neutral-600 mb-2" />
              <p className="text-sm font-bold text-neutral-400">
                {isBn ? "কোন বাজি রেকর্ড পাওয়া যায়নি" : "No betting records found"}
              </p>
              <p className="text-xs text-neutral-600 mt-1">
                {isBn ? "ফিল্টার পরিবর্তন করুন অথবা লাইভ টেবিলে বাজি ধরুন।" : "Try changing filters or place bets in the live arena."}
              </p>
            </div>
          ) : (
            filteredBets.map((b) => {
              const isWin = b.status === "WON";
              const isLost = b.status === "LOST";
              const isRefund = b.status === "REFUNDED";
              const isTieRefund = b.status === "TIE_REFUND";
              const isActive = b.status === "ACTIVE";
              const isExpanded = expandedBetId === b.id;

              return (
                <div
                  key={b.id}
                  className={`bg-neutral-900/70 border rounded-xl transition-all duration-150 overflow-hidden ${
                    isWin
                      ? "border-emerald-500/30 hover:border-emerald-500/60"
                      : isTieRefund
                      ? "border-amber-500/40 hover:border-amber-500/70"
                      : isLost
                      ? "border-neutral-800 hover:border-rose-900/40"
                      : isRefund
                      ? "border-cyan-500/30 hover:border-cyan-500/60"
                      : "border-amber-500/30"
                  }`}
                >
                  <div
                    onClick={() => setExpandedBetId(isExpanded ? null : b.id)}
                    className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none hover:bg-neutral-900"
                  >
                    {/* Left: Round & Side Details */}
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-neutral-950 border border-neutral-800 flex flex-col items-center justify-center shrink-0">
                        <span className="text-[9px] text-neutral-500 uppercase font-mono">RND</span>
                        <span className="text-xs font-black font-mono text-amber-400">#{b.roundNumber}</span>
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                              b.side === "DRAGON"
                                ? "bg-red-500/20 text-red-400 border border-red-500/40"
                                : b.side === "TIGER"
                                ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                                : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                            }`}
                          >
                            {b.side}
                          </span>
                          <span className="text-xs font-semibold text-neutral-300">
                            {b.tableName}
                          </span>
                          <span className="text-[10px] text-neutral-500 font-mono">
                            {new Date(b.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                          </span>
                        </div>

                        {/* Cards dealt summary */}
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-neutral-400 font-mono">
                          {b.dragonCard && b.tigerCard ? (
                            <span>
                              🐉 <strong className="text-red-400">{b.dragonCard.display}</strong> vs 🐯{" "}
                              <strong className="text-amber-400">{b.tigerCard.display}</strong>
                              {" · "}
                              <span className="text-neutral-300 font-bold uppercase">{b.result} WINS</span>
                            </span>
                          ) : (
                            <span className="text-amber-400 italic">
                              {isActive ? "Dealing in progress..." : "Round completed"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Amounts, Refunds, and Status */}
                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                      {/* Stake & Refund Breakdown */}
                      <div className="text-right font-mono">
                        <div className="text-xs font-bold text-white">
                          ৳{b.amount.toLocaleString()}
                        </div>
                        <div className="text-[10px] flex flex-col items-end gap-0.5 text-neutral-400">
                          <span>M: ৳{b.matchedAmount.toLocaleString()}</span>
                          {b.unmatchedAmount > 0 && (
                            <span className="text-cyan-400 font-bold bg-cyan-950/80 px-1 py-0.2 rounded border border-cyan-800 text-[9px]">
                              ৳{b.unmatchedAmount.toLocaleString()} {isBn ? "অনম্যাচড ফেরত" : "unmatched ref"}
                            </span>
                          )}
                          {b.unmatchedAmount <= 0 && b.returnedAmount > 0 && (
                            <span className="text-emerald-400 font-bold text-[9px]">
                              (৳{b.returnedAmount.toLocaleString()} {isBn ? "ফেরত" : "ret"})
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Net P&L / Payout / Refund Badge Column */}
                      <div className="text-right flex flex-col items-end gap-1 min-w-[90px]">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-lg text-xs font-black font-mono ${
                            isWin
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                              : isTieRefund
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                              : isLost
                              ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                              : isRefund
                              ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                              : "bg-neutral-800 text-neutral-300 border border-neutral-700"
                          }`}
                        >
                          {isWin
                            ? `WIN +৳${b.netPnL.toLocaleString()}`
                            : isTieRefund
                            ? "50% REFUND"
                            : isLost
                            ? `LOST -৳${Math.abs(b.netPnL).toLocaleString()}`
                            : isRefund
                            ? "100% REFUND"
                            : "ACTIVE"}
                        </span>

                        {/* Unmatched Refund inside Result/Payout column */}
                        {b.unmatchedAmount > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-cyan-950 text-cyan-300 border border-cyan-500/50 shadow-sm">
                            <span>+৳{b.unmatchedAmount.toLocaleString()}</span>
                            <span>{isBn ? "অনম্যাচড ফেরত" : "REFUND"}</span>
                          </span>
                        )}
                      </div>

                      <ChevronRight
                        className={`w-4 h-4 text-neutral-500 transition-transform ${isExpanded ? "rotate-90 text-amber-400" : ""}`}
                      />
                    </div>
                  </div>

                  {/* Expanded Audit Card: Provably Fair Verification details */}
                  {isExpanded && (
                    <div className="px-4 py-3 bg-neutral-950/80 border-t border-neutral-800 text-xs text-neutral-300 space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                        <div className="bg-neutral-900 p-2 rounded-lg border border-neutral-800">
                          <span className="text-[10px] text-neutral-500 uppercase block">
                            {isBn ? "ক্রিপ্টোগ্রাফিক সার্ভার সীড হ্যাশ" : "SHA-256 Server Seed Hash"}
                          </span>
                          <span className="text-amber-300 break-all select-all font-mono text-[10px]">
                            {b.serverSeedHash || "Published at round initiation"}
                          </span>
                        </div>
                        <div className="bg-neutral-900 p-2 rounded-lg border border-neutral-800">
                          <span className="text-[10px] text-neutral-500 uppercase block">
                            {isBn ? "রিভিলড সার্ভার সীড (পোস্ট-রাউন্ড)" : "Revealed Server Seed (Post-Round)"}
                          </span>
                          <span className="text-emerald-400 break-all select-all font-mono text-[10px]">
                            {b.serverSeed || "Will reveal after settlement"}
                          </span>
                        </div>
                      </div>

                      {/* Transparent matching ledger note & Dispute button */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-neutral-400 bg-neutral-900/40 px-3 py-2 rounded-lg border border-neutral-800/80">
                        <div className="flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>
                            {isBn
                              ? `P2P ম্যাচিং: ৳${b.matchedAmount.toLocaleString()} ম্যাচ হয়েছে। বাকি ৳${b.unmatchedAmount.toLocaleString()} স্বয়ংক্রিয়ভাবে ওয়ালেটে রিফান্ড করা হয়েছে।`
                              : `P2P Matched: ৳${b.matchedAmount.toLocaleString()} in play. Unmatched ৳${b.unmatchedAmount.toLocaleString()} instantly refunded to balance.`}
                          </span>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                          {b.payout > 0 && (
                            <span className="text-emerald-400 font-bold font-mono">
                              {isBn ? "পে-আউট:" : "Payout:"} ৳{b.payout.toLocaleString()}
                            </span>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDisputeBet(b);
                              setDisputeIssueType("Result Dispute");
                              setDisputeDesc("");
                              setDisputeMsg(null);
                            }}
                            className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1"
                          >
                            <span>⚠️ {isBn ? "রাউন্ড কমপ্লেইন করুন" : "Report / Dispute Round"}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* SUBMIT DISPUTE MODAL */}
        {disputeBet && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#0f1422] border border-neutral-800 text-white rounded-2xl p-5 max-w-md w-full space-y-4 shadow-2xl">
              <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-rose-400">
                    {isBn ? "রাউন্ড সংক্রান্ত কমপ্লেইন / ডিসপিউট" : "Submit Round Dispute"}
                  </h3>
                  <p className="text-xs text-neutral-400 font-mono">
                    Round #{disputeBet.roundNumber} • {disputeBet.tableName}
                  </p>
                </div>
                <button onClick={() => setDisputeBet(null)} className="text-neutral-400 hover:text-white">✕</button>
              </div>

              {disputeMsg ? (
                <div className="p-4 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-bold text-center">
                  {disputeMsg}
                </div>
              ) : (
                <form onSubmit={handleSubmittingDispute} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-neutral-400 mb-1 font-bold">
                      {isBn ? "সমস্যার ধরন্ (Issue Category)" : "Issue Category"}
                    </label>
                    <select
                      value={disputeIssueType}
                      onChange={(e) => setDisputeIssueType(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-white font-bold"
                    >
                      <option value="Result Dispute">Result Dispute (ফলাফল সংক্রান্ত আপত্তি)</option>
                      <option value="Unmatched Bet Refund">Unmatched Bet Refund Issue (অনম্যাচড ফান্ড সমস্যা)</option>
                      <option value="Lag / Disconnect">Lag / Connection Disconnect (নেটওয়ার্ক সমস্যা)</option>
                      <option value="Payout Error">Payout Error (পে-আউট অমিল)</option>
                      <option value="Provably Fair Verification">Provably Fair Verification (হ্যাশ চেক)</option>
                      <option value="Other">Other (অন্যান্য)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-neutral-400 mb-1 font-bold">
                      {isBn ? "অভিযোগের বিস্তারিত বিবরণ (Detailed Complaint)" : "Detailed Description"}
                    </label>
                    <textarea
                      rows={3}
                      placeholder={isBn ? "এই রাউন্ডে কী সমস্যা হয়েছে বিস্তারিত লিখুন..." : "Describe what went wrong in this round..."}
                      value={disputeDesc}
                      onChange={(e) => setDisputeDesc(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-white resize-none"
                      required
                    />
                  </div>

                  <div className="p-3 bg-neutral-900 rounded-xl border border-neutral-800 text-[11px] text-neutral-400 space-y-1">
                    <div>Bet Amount: <strong className="text-white">৳{disputeBet.amount}</strong> ({disputeBet.side})</div>
                    <div>Cards: <strong className="text-white">{disputeBet.dragonCard?.display || "N/A"} vs {disputeBet.tigerCard?.display || "N/A"}</strong></div>
                    <div>Server Hash: <strong className="text-amber-400 font-mono text-[10px]">{disputeBet.serverSeedHash?.substring(0, 16)}...</strong></div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setDisputeBet(null)}
                      className="px-4 py-2 bg-neutral-800 text-neutral-300 rounded-xl font-bold hover:bg-neutral-700"
                    >
                      {isBn ? "বাতিল" : "Cancel"}
                    </button>
                    <button
                      type="submit"
                      disabled={disputeSubmitting}
                      className="px-4 py-2 bg-rose-500 hover:bg-rose-400 text-white rounded-xl font-bold transition-all"
                    >
                      {disputeSubmitting ? (isBn ? "জমা হচ্ছে..." : "Submitting...") : (isBn ? "অভিযোগ জমা দিন" : "Submit Complaint")}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-3 border-t border-neutral-800/80 bg-neutral-900/60 flex items-center justify-between text-xs text-neutral-400 shrink-0">
          <div className="flex items-center gap-1.5 text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              {isBn
                ? "১০০% নির্ভুল এবং ক্রিপ্টোগ্রাফিক্যালি অডিটেড বেটিং লেজার"
                : "100% Cryptographically Audited & Matched Betting Records"}
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs transition-colors shadow-sm"
          >
            {isBn ? "বন্ধ করুন" : "Close"}
          </button>
        </div>

      </div>
    </div>
  );
};
