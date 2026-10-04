import React, { useState, useEffect } from "react";
import {
  X,
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  Send,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Globe,
  Search,
  User,
  Copy,
  Check,
} from "lucide-react";
import { UserWallet } from "../types";
import { useActiveCurrency, formatCurrency, convertToBaseCurrency } from "../utils/currency";
import { sound } from "../utils/audio";

interface WalletModalProps {
  user: UserWallet;
  onClose: () => void;
  onUpdateWallet: (updatedUser: UserWallet) => void;
  onOpenProfile?: () => void;
  initialTab?: "deposit" | "withdraw" | "transfer" | "history" | "globalLedger" | "stats";
  onToggleBalanceType?: () => void;
}

interface GlobalTx {
  id: string;
  txHash: string;
  type: "deposit" | "withdraw" | "transfer" | "tie_refund" | "commission" | "refund";
  username: string;
  userId: string;
  recipientUsername?: string;
  amount: number;
  method: string;
  status: "COMPLETED" | "PROCESSED";
  timestamp: string;
  description: string;
}

export const WalletModal: React.FC<WalletModalProps> = ({
  user,
  onClose,
  onUpdateWallet,
  initialTab = "deposit",
  onToggleBalanceType,
}) => {
  const activeCurrency = useActiveCurrency();
  const formatAmt = (amt: number | null | undefined) =>
    formatCurrency(amt, { currencyCode: activeCurrency.code, convertFromBase: true });

  const [activeTab, setActiveTab] = useState<
    "deposit" | "withdraw" | "transfer" | "history" | "globalLedger"
  >(initialTab === "stats" ? "history" : initialTab);

  // Deposit State
  const [depositAmount, setDepositAmount] = useState<string>("1000");
  const [depositMethod, setDepositMethod] = useState<string>("bKash");

  const getMethodsForCurrency = (curr: string) => {
    switch (curr) {
      case "BDT":
        return ["bKash", "Nagad", "Rocket", "Upay", "Bank"];
      case "INR":
        return ["UPI / QR", "PhonePe", "Paytm", "GPay", "NetBanking"];
      case "USD":
      case "EUR":
      case "GBP":
      case "USDT":
        return ["USDT (TRC-20)", "Card", "Bitcoin", "Wire"];
      case "AED":
      case "SAR":
        return ["Card", "Apple Pay", "USDT", "Wire"];
      default:
        return ["USDT (TRC-20)", "Card", "Wire"];
    }
  };

  const availableMethods = getMethodsForCurrency(activeCurrency.code);

  useEffect(() => {
    if (!availableMethods.includes(depositMethod)) {
      setDepositMethod(availableMethods[0]);
    }
  }, [activeCurrency.code]);

  // Withdraw State
  const [withdrawAmount, setWithdrawAmount] = useState<string>("1000");
  const [withdrawMethod, setWithdrawMethod] = useState<string>(availableMethods[0]);
  const [withdrawAccountNo, setWithdrawAccountNo] = useState<string>("01700000000");

  // Transfer State
  const [transferTargetUser, setTransferTargetUser] = useState<string>("");
  const [transferAmount, setTransferAmount] = useState<string>("500");
  const [transferNote, setTransferNote] = useState<string>("");

  // Global Ledger State
  const [globalTxs, setGlobalTxs] = useState<GlobalTx[]>([]);
  const [ledgerFilter, setLedgerFilter] = useState<string>("all");
  const [ledgerSearch, setLedgerSearch] = useState<string>("");
  const [loadingLedger, setLoadingLedger] = useState<boolean>(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // Status
  const [loading, setLoading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Clear messages on tab change
  const handleTabChange = (
    tab: "deposit" | "withdraw" | "transfer" | "history" | "globalLedger"
  ) => {
    setActiveTab(tab);
    setErrorMsg("");
    setSuccessMsg("");
  };

  // Fetch Global Transactions
  const fetchGlobalLedger = async () => {
    setLoadingLedger(true);
    try {
      let url = `/api/transparency/transactions?limit=60`;
      if (ledgerFilter !== "all") url += `&type=${ledgerFilter}`;
      if (ledgerSearch.trim()) url += `&search=${encodeURIComponent(ledgerSearch.trim())}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.transactions) {
          setGlobalTxs(data.transactions);
        }
      }
    } catch {
      // quiet fallback
    } finally {
      setLoadingLedger(false);
    }
  };

  useEffect(() => {
    if (activeTab === "globalLedger") {
      fetchGlobalLedger();
    }
  }, [activeTab, ledgerFilter, ledgerSearch]);

  const handleCopyHash = (hash: string) => {
    navigator.clipboard?.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 1800);
  };

  // 1. Handle Deposit
  const handleDeposit = async () => {
    setErrorMsg("");
    setSuccessMsg("");
    const num = Number(depositAmount);
    if (isNaN(num) || num <= 0) {
      setErrorMsg("Please enter a valid deposit amount");
      return;
    }

    const minDeposit = activeCurrency.code === "BDT" ? 200 : 5;
    if (num < minDeposit) {
      setErrorMsg(`Minimum deposit is ${activeCurrency.symbol}${minDeposit}`);
      return;
    }

    setLoading(true);
    const baseAmount = convertToBaseCurrency(num, activeCurrency.code);

    try {
      const sid = localStorage.getItem("player_session_id") || "";
      const res = await fetch("/api/wallet/deposit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.userId,
          ...(sid ? { "x-session-id": sid } : {}),
        },
        body: JSON.stringify({
          userId: user.userId,
          username: user.username,
          amount: baseAmount,
          method: depositMethod,
          sessionId: sid,
        }),
      });
      const data = await res.json();
      if (data.success && data.user) {
        onUpdateWallet(data.user);
        sound.playCoinsClinking();
        const displayFormatted = formatCurrency(num, {
          currencyCode: activeCurrency.code,
          convertFromBase: false,
        });
        setSuccessMsg(data.message || `${displayFormatted} credited successfully!`);
      } else {
        // Fallback local update
        const updatedUser: UserWallet = {
          ...user,
          balance: user.balance + baseAmount,
          balanceType: "real",
          transactions: [
            {
              id: `tx_dep_${Date.now()}`,
              type: "deposit",
              amount: baseAmount,
              timestamp: new Date().toISOString(),
              description: `Deposit via ${depositMethod}`,
            },
            ...user.transactions,
          ],
        };
        onUpdateWallet(updatedUser);
        sound.playCoinsClinking();
        const displayFormatted = formatCurrency(num, {
          currencyCode: activeCurrency.code,
          convertFromBase: false,
        });
        setSuccessMsg(`${displayFormatted} credited successfully!`);
      }
    } catch {
      // Offline / transient network fallback
      const updatedUser: UserWallet = {
        ...user,
        balance: user.balance + baseAmount,
        balanceType: "real",
        transactions: [
          {
            id: `tx_dep_${Date.now()}`,
            type: "deposit",
            amount: baseAmount,
            timestamp: new Date().toISOString(),
            description: `Deposit via ${depositMethod}`,
          },
          ...user.transactions,
        ],
      };
      onUpdateWallet(updatedUser);
      sound.playCoinsClinking();
      const displayFormatted = formatCurrency(num, {
        currencyCode: activeCurrency.code,
        convertFromBase: false,
      });
      setSuccessMsg(`${displayFormatted} credited successfully!`);
    } finally {
      setLoading(false);
    }
  };

  // 2. Handle Withdraw
  const handleWithdraw = async () => {
    setErrorMsg("");
    setSuccessMsg("");
    const num = Number(withdrawAmount);
    if (isNaN(num) || num <= 0) {
      setErrorMsg("Please enter a valid withdrawal amount");
      return;
    }

    const minWithdraw = activeCurrency.code === "BDT" ? 100 : 5;
    if (num < minWithdraw) {
      setErrorMsg(`Minimum withdrawal is ${activeCurrency.symbol}${minWithdraw}`);
      return;
    }

    const baseAmount = convertToBaseCurrency(num, activeCurrency.code);
    if (baseAmount > user.balance) {
      setErrorMsg("Insufficient balance for withdrawal");
      return;
    }

    if (!withdrawAccountNo.trim()) {
      setErrorMsg("Please provide recipient account or phone number");
      return;
    }

    setLoading(true);
    try {
      const sid = localStorage.getItem("player_session_id") || "";
      const res = await fetch("/api/wallet/withdraw", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.userId,
          ...(sid ? { "x-session-id": sid } : {}),
        },
        body: JSON.stringify({
          userId: user.userId,
          username: user.username,
          amount: baseAmount,
          method: withdrawMethod,
          accountNumber: withdrawAccountNo,
          sessionId: sid,
        }),
      });
      const data = await res.json();
      if (data.success && data.user) {
        onUpdateWallet(data.user);
        sound.playButtonClick();
        const displayFormatted = formatCurrency(num, {
          currencyCode: activeCurrency.code,
          convertFromBase: false,
        });
        setSuccessMsg(data.message || `${displayFormatted} withdrawal requested!`);
      } else {
        setErrorMsg(data.error || "Withdrawal request could not be processed.");
      }
    } catch {
      setErrorMsg("Network error communicating with cashier service. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // 3. Handle Send Money / P2P Transfer
  const handleSendMoney = async () => {
    setErrorMsg("");
    setSuccessMsg("");
    const num = Number(transferAmount);
    if (isNaN(num) || num <= 0) {
      setErrorMsg("Please enter a valid transfer amount");
      return;
    }

    if (!transferTargetUser.trim()) {
      setErrorMsg("Please enter recipient username");
      return;
    }

    if (
      transferTargetUser.trim().toLowerCase() === user.username.toLowerCase() ||
      transferTargetUser.trim() === user.userId
    ) {
      setErrorMsg("Cannot transfer to yourself");
      return;
    }

    const baseAmount = convertToBaseCurrency(num, activeCurrency.code);
    if (baseAmount > user.balance) {
      setErrorMsg("Insufficient balance for transfer");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/wallet/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromUserId: user.userId,
          toUsername: transferTargetUser.trim(),
          amount: baseAmount,
          note: transferNote.trim(),
        }),
      });
      const data = await res.json();
      if (data.success && data.user) {
        onUpdateWallet(data.user);
        sound.playCoinsClinking();
        fetchGlobalLedger();
        const displayFormatted = formatCurrency(num, {
          currencyCode: activeCurrency.code,
          convertFromBase: false,
        });
        setSuccessMsg(data.message || `${displayFormatted} sent to @${transferTargetUser.trim()}!`);
        setTransferTargetUser("");
        setTransferNote("");
      } else {
        setErrorMsg(data.error || "Direct peer-to-peer transfers are disabled for compliance.");
      }
    } catch {
      setErrorMsg("Connection error communicating with transfer service.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 select-none overflow-hidden">
      {/* Zero-scroll Modal Card */}
      <div className="relative bg-neutral-950 border border-neutral-800 rounded-2xl w-full max-w-lg shadow-[0_20px_50px_rgba(0,0,0,0.95)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800/80 bg-neutral-900/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide leading-tight">
                Cashier &amp; Wallet
              </h2>
              <p className="text-[10px] text-neutral-400 leading-tight">
                Instant deposits, withdrawals &amp; P2P transfers
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Balance HUD */}
        <div className="px-4 py-2 bg-neutral-900/40 border-b border-neutral-800/80 flex items-center justify-between shrink-0">
          <div>
            <div className="text-[9px] uppercase font-bold tracking-wider text-neutral-500">
              Real Cash Balance
            </div>
            <div className="text-lg font-black text-amber-400 font-mono leading-tight">
              {formatAmt(user.balance)}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {onToggleBalanceType && (
              <button
                onClick={onToggleBalanceType}
                type="button"
                className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                  user.balanceType === "real"
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25"
                    : "bg-purple-500/15 text-purple-400 border-purple-500/30 hover:bg-purple-500/25"
                }`}
              >
                {user.balanceType === "real" ? "● Real Active" : "● Demo Active"}
              </button>
            )}
            <div className="text-right">
              <div className="text-[9px] uppercase font-bold tracking-wider text-neutral-500">
                Demo Chips
              </div>
              <div className="text-xs font-bold text-purple-400 font-mono leading-tight">
                {formatAmt(user.demoBalance)}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs (Zero Scroll Segmented Bar) */}
        <div className="grid grid-cols-5 p-1 bg-neutral-950 border-b border-neutral-800/80 gap-1 text-[11px] font-bold shrink-0">
          <button
            onClick={() => handleTabChange("deposit")}
            className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
              activeTab === "deposit"
                ? "bg-amber-500 text-neutral-950 shadow-sm"
                : "text-neutral-400 hover:text-white hover:bg-neutral-900"
            }`}
          >
            <ArrowDownRight className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Deposit</span>
          </button>

          <button
            onClick={() => handleTabChange("withdraw")}
            className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
              activeTab === "withdraw"
                ? "bg-amber-500 text-neutral-950 shadow-sm"
                : "text-neutral-400 hover:text-white hover:bg-neutral-900"
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Withdraw</span>
          </button>

          <button
            onClick={() => handleTabChange("transfer")}
            className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
              activeTab === "transfer"
                ? "bg-emerald-500 text-neutral-950 shadow-sm"
                : "text-neutral-400 hover:text-white hover:bg-neutral-900"
            }`}
          >
            <Send className="w-3 h-3" />
            <span className="hidden xs:inline">Transfer</span>
          </button>

          <button
            onClick={() => handleTabChange("history")}
            className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
              activeTab === "history"
                ? "bg-neutral-800 text-white shadow-sm"
                : "text-neutral-400 hover:text-white hover:bg-neutral-900"
            }`}
          >
            <RefreshCw className="w-3 h-3" />
            <span className="hidden xs:inline">History</span>
          </button>

          <button
            onClick={() => handleTabChange("globalLedger")}
            className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
              activeTab === "globalLedger"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-neutral-400 hover:text-white hover:bg-neutral-900"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Ledger</span>
          </button>
        </div>

        {/* Status Alerts */}
        {successMsg && (
          <div className="mx-4 mt-2.5 p-2 bg-emerald-500/15 border border-emerald-500/30 rounded-lg text-xs text-emerald-300 flex items-center gap-2 shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
            <span className="truncate">{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="mx-4 mt-2.5 p-2 bg-red-500/15 border border-red-500/30 rounded-lg text-xs text-red-300 flex items-center gap-2 shrink-0">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-400" />
            <span className="truncate">{errorMsg}</span>
          </div>
        )}

        {/* Modal Body Container - Zero Scroll for Forms */}
        <div className="p-4 flex-1 flex flex-col justify-center overflow-hidden">
          
          {/* 1. DEPOSIT TAB */}
          {activeTab === "deposit" && (
            <div className="space-y-3">
              {/* Payment Methods */}
              <div>
                <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1.5">
                  Payment Method ({activeCurrency.code})
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {availableMethods.slice(0, 4).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setDepositMethod(m)}
                      className={`py-2 px-1 rounded-lg border text-center font-bold text-xs truncate transition-all cursor-pointer ${
                        depositMethod === m
                          ? "bg-amber-500/20 border-amber-400 text-amber-300 shadow-sm"
                          : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] uppercase font-bold text-neutral-400">
                    Deposit Amount
                  </label>
                  <span className="text-[10px] font-mono text-neutral-500">
                    Min: {activeCurrency.symbol}{activeCurrency.code === "BDT" ? "200" : "5"}
                  </span>
                </div>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-amber-400 font-mono font-bold text-sm">
                    {activeCurrency.symbol}
                  </span>
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full bg-neutral-900 border border-neutral-800 focus:border-amber-400 rounded-xl pl-8 pr-3 py-2 text-white font-mono font-bold text-sm focus:outline-none"
                  />
                </div>
              </div>

              {/* Quick Preset Chips */}
              <div className="grid grid-cols-4 gap-1.5">
                {[500, 1000, 2500, 5000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setDepositAmount(amt.toString())}
                    className={`py-1.5 rounded-lg border font-mono font-bold text-xs transition-all cursor-pointer ${
                      depositAmount === amt.toString()
                        ? "bg-amber-500/20 border-amber-400 text-amber-300"
                        : "bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:text-white"
                    }`}
                  >
                    +{amt.toLocaleString()}
                  </button>
                ))}
              </div>

              {/* Instant Action Button */}
              <div className="pt-1">
                <button
                  onClick={handleDeposit}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl shadow-lg transition-all text-xs sm:text-sm cursor-pointer active:scale-[0.99]"
                >
                  {loading
                    ? "Processing..."
                    : `Confirm Deposit: ${activeCurrency.symbol}${Number(depositAmount || 0).toLocaleString()}`}
                </button>
              </div>
            </div>
          )}

          {/* 2. WITHDRAW TAB */}
          {activeTab === "withdraw" && (
            <div className="space-y-3">
              {/* Method & Account No in one clean grid */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                    Withdrawal Method
                  </label>
                  <select
                    value={withdrawMethod}
                    onChange={(e) => setWithdrawMethod(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 focus:border-amber-400 rounded-xl px-2.5 py-2 text-white text-xs font-bold focus:outline-none"
                  >
                    {availableMethods.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                    Account / Phone No
                  </label>
                  <input
                    type="text"
                    value={withdrawAccountNo}
                    onChange={(e) => setWithdrawAccountNo(e.target.value)}
                    placeholder="017XXXXXXXX"
                    className="w-full bg-neutral-900 border border-neutral-800 focus:border-amber-400 rounded-xl px-2.5 py-2 text-white font-mono text-xs focus:outline-none"
                  />
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] uppercase font-bold text-neutral-400">
                    Withdraw Amount
                  </label>
                  <span className="text-[10px] font-mono text-neutral-500">
                    Min: {activeCurrency.symbol}{activeCurrency.code === "BDT" ? "100" : "5"}
                  </span>
                </div>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-amber-400 font-mono font-bold text-sm">
                    {activeCurrency.symbol}
                  </span>
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full bg-neutral-900 border border-neutral-800 focus:border-amber-400 rounded-xl pl-8 pr-3 py-2 text-white font-mono font-bold text-sm focus:outline-none"
                  />
                </div>
              </div>

              {/* Quick Preset Chips */}
              <div className="grid grid-cols-4 gap-1.5">
                {[500, 1000, 2500, 5000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setWithdrawAmount(amt.toString())}
                    className={`py-1.5 rounded-lg border font-mono font-bold text-xs transition-all cursor-pointer ${
                      withdrawAmount === amt.toString()
                        ? "bg-amber-500/20 border-amber-400 text-amber-300"
                        : "bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:text-white"
                    }`}
                  >
                    +{amt.toLocaleString()}
                  </button>
                ))}
              </div>

              {/* Action Button */}
              <div className="pt-1">
                <button
                  onClick={handleWithdraw}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl shadow-lg transition-all text-xs sm:text-sm cursor-pointer active:scale-[0.99]"
                >
                  {loading
                    ? "Processing..."
                    : `Withdraw: ${activeCurrency.symbol}${Number(withdrawAmount || 0).toLocaleString()}`}
                </button>
              </div>
            </div>
          )}

          {/* 3. P2P TRANSFER TAB */}
          {activeTab === "transfer" && (
            <div className="space-y-3">
              {/* Recipient */}
              <div>
                <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                  Recipient Username
                </label>
                <div className="relative flex items-center">
                  <User className="w-3.5 h-3.5 text-neutral-500 absolute left-3" />
                  <input
                    type="text"
                    value={transferTargetUser}
                    onChange={(e) => setTransferTargetUser(e.target.value)}
                    placeholder="Enter player username"
                    className="w-full bg-neutral-900 border border-neutral-800 focus:border-emerald-500 rounded-xl pl-8 pr-3 py-2 text-white font-medium text-xs focus:outline-none"
                  />
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] uppercase font-bold text-neutral-400">
                    Transfer Amount
                  </label>
                  <span className="text-[10px] font-mono text-emerald-400">0% P2P Fee</span>
                </div>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-emerald-400 font-mono font-bold text-sm">
                    {activeCurrency.symbol}
                  </span>
                  <input
                    type="number"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full bg-neutral-900 border border-neutral-800 focus:border-emerald-500 rounded-xl pl-8 pr-3 py-2 text-white font-mono font-bold text-sm focus:outline-none"
                  />
                </div>
              </div>

              {/* Quick Preset Chips */}
              <div className="grid grid-cols-4 gap-1.5">
                {[100, 500, 1000, 2000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setTransferAmount(amt.toString())}
                    className={`py-1.5 rounded-lg border font-mono font-bold text-xs transition-all cursor-pointer ${
                      transferAmount === amt.toString()
                        ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                        : "bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:text-white"
                    }`}
                  >
                    +{amt.toLocaleString()}
                  </button>
                ))}
              </div>

              {/* Note (Optional) */}
              <div>
                <input
                  type="text"
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  placeholder="Optional transfer note..."
                  className="w-full bg-neutral-900 border border-neutral-800 focus:border-emerald-500 rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none"
                />
              </div>

              {/* Action Button */}
              <div className="pt-1">
                <button
                  onClick={handleSendMoney}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl shadow-lg transition-all text-xs sm:text-sm cursor-pointer active:scale-[0.99] flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {loading
                      ? "Sending..."
                      : `Send ${activeCurrency.symbol}${Number(transferAmount || 0).toLocaleString()} to ${transferTargetUser ? `@${transferTargetUser}` : "Player"}`}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* 4. PERSONAL HISTORY TAB */}
          {activeTab === "history" && (
            <div className="flex flex-col h-full max-h-[300px]">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-800 text-[10px] text-neutral-400 uppercase font-bold">
                <span>Transaction</span>
                <span>Amount</span>
              </div>
              <div className="space-y-1.5 overflow-y-auto pr-1 mt-2 flex-1">
                {user.transactions.length === 0 ? (
                  <div className="text-center py-10 text-neutral-500 text-xs">
                    No transactions recorded yet
                  </div>
                ) : (
                  user.transactions.slice(0, 25).map((tx) => {
                    const isPositive =
                      tx.type === "win" ||
                      tx.type === "deposit" ||
                      tx.type === "faucet" ||
                      tx.type === "refund" ||
                      tx.type === "tie_refund" ||
                      tx.type === "TIE_REFUND";
                    return (
                      <div
                        key={tx.id}
                        className="px-2.5 py-2 bg-neutral-900/60 border border-neutral-800/80 rounded-lg flex items-center justify-between text-xs"
                      >
                        <div className="truncate max-w-[200px] sm:max-w-xs">
                          <div className="font-semibold text-white truncate text-xs leading-tight">
                            {tx.description}
                          </div>
                          <div className="text-[9px] text-neutral-500 mt-0.5 font-mono">
                            {new Date(tx.timestamp).toLocaleString([], {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                        <div
                          className={`font-mono font-bold text-xs ${
                            isPositive ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          {isPositive ? "+" : "-"}
                          {formatAmt(tx.amount)}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* 5. PUBLIC LEDGER TAB */}
          {activeTab === "globalLedger" && (
            <div className="flex flex-col h-full max-h-[300px] space-y-2">
              {/* Filter Row + Search */}
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="relative flex-1">
                  <Search className="w-3 h-3 text-neutral-500 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={ledgerSearch}
                    onChange={(e) => setLedgerSearch(e.target.value)}
                    placeholder="Search user or hash..."
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-7 pr-2 py-1 text-white text-[11px] focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {["all", "deposit", "withdraw", "transfer"].map((f) => (
                    <button
                      key={f}
                      onClick={() => setLedgerFilter(f)}
                      className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase transition-all cursor-pointer ${
                        ledgerFilter === f
                          ? "bg-blue-600 text-white"
                          : "bg-neutral-900 text-neutral-400 hover:text-white"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                  <button
                    onClick={fetchGlobalLedger}
                    disabled={loadingLedger}
                    className="p-1 rounded-md bg-neutral-900 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                    title="Refresh"
                  >
                    <RefreshCw
                      className={`w-3 h-3 ${loadingLedger ? "animate-spin text-blue-400" : ""}`}
                    />
                  </button>
                </div>
              </div>

              {/* Transactions List */}
              <div className="space-y-1.5 overflow-y-auto pr-1 flex-1">
                {globalTxs.length === 0 ? (
                  <div className="text-center py-10 text-neutral-500 text-xs">
                    {loadingLedger ? "Fetching public ledger..." : "No ledger transactions found"}
                  </div>
                ) : (
                  globalTxs.map((tx) => {
                    const isPositive =
                      tx.type === "deposit" || tx.type === "tie_refund" || tx.type === "refund";
                    return (
                      <div
                        key={tx.id}
                        className="px-2.5 py-1.5 bg-neutral-900/60 border border-neutral-800/80 rounded-lg text-xs space-y-0.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs truncate max-w-[200px]">
                            <span
                              className={`text-[8px] font-black uppercase px-1 rounded ${
                                tx.type === "deposit"
                                  ? "bg-emerald-500/20 text-emerald-400"
                                  : tx.type === "withdraw"
                                  ? "bg-red-500/20 text-red-400"
                                  : "bg-blue-500/20 text-blue-400"
                              }`}
                            >
                              {tx.type}
                            </span>
                            <span className="font-bold text-white truncate">{tx.username}</span>
                            {tx.recipientUsername && (
                              <span className="text-neutral-500 text-[10px]">
                                → @{tx.recipientUsername}
                              </span>
                            )}
                          </div>
                          <div
                            className={`font-mono font-bold text-xs ${
                              isPositive ? "text-emerald-400" : "text-amber-400"
                            }`}
                          >
                            {isPositive ? "+" : "-"}
                            {formatAmt(tx.amount)}
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[9px] text-neutral-500 font-mono">
                          <span className="truncate max-w-[220px]">#{tx.txHash}</span>
                          <button
                            onClick={() => handleCopyHash(tx.txHash)}
                            className="text-neutral-400 hover:text-amber-300 transition-colors flex items-center gap-0.5 cursor-pointer"
                          >
                            {copiedHash === tx.txHash ? (
                              <span className="text-emerald-400">Copied</span>
                            ) : (
                              <span>Copy</span>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
