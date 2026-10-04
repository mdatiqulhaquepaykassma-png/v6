import React, { useState, useEffect } from "react";
import { X, ShieldAlert, BarChart3, Users, DollarSign, Settings, RefreshCw, CheckCircle, Trash2, AlertTriangle, Coins } from "lucide-react";

interface AdminModalProps {
  onClose: () => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({ onClose }) => {
  const [isAuthorized, setIsAuthorized] = useState<boolean>(() => {
    return sessionStorage.getItem("admin_authorized") === "true";
  });
  const [adminUsername, setAdminUsername] = useState<string>("");
  const [adminPassword, setAdminPassword] = useState<string>("");
  const [authError, setAuthError] = useState<string | null>(null);

  const [stats, setStats] = useState<{
    metrics: {
      todayMatchedVolume: number;
      todayCommission: number;
      todayTieRevenue: number;
      totalRoundsPlayed: number;
    };
    totalSiteLiquidity?: number;
    totalRealBalance?: number;
    totalDemoBalance?: number;
    totalEscrowLocked?: number;
    tables: {
      slug: string;
      name: string;
      minBet: number;
      maxBet: number;
      timer: number;
      dragonPool: number;
      tigerPool: number;
      matchedAmount: number;
      playersOnline: number;
    }[];
    usersCount: number;
    users?: {
      userId: string;
      username: string;
      balance: number;
      demoBalance: number;
      kycStatus: string;
      gamesPlayed: number;
    }[];
  } | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState<boolean>(false);

  const fetchStats = async () => {
    if (!isAuthorized) return;
    try {
      const res = await fetch("/api/admin/stats");
      const data = await res.json();
      setStats(data);
    } catch (e) {
      console.error("Failed to load admin stats:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      fetchStats();
      const interval = setInterval(fetchStats, 3000);
      return () => clearInterval(interval);
    }
  }, [isAuthorized]);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminUsername === "admin" && adminPassword === "123456") {
      setIsAuthorized(true);
      sessionStorage.setItem("admin_authorized", "true");
      setAuthError(null);
    } else {
      setAuthError("ভুল অ্যাডমিন ইউজারনেম অথবা পাসওয়ার্ড! পুনরায় চেষ্টা করুন।");
    }
  };

  const handleUpdateTable = async (slug: string, minBet: number, maxBet: number) => {
    try {
      const res = await fetch("/api/admin/table/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, minBet, maxBet }),
      });
      if (res.ok) {
        setSaveSuccess(`Updated ${slug} table limits`);
        setTimeout(() => setSaveSuccess(null), 3000);
        fetchStats();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleResetDatabase = async () => {
    if (!window.confirm("⚠️ ARE YOU SURE? This will permanently delete and wipe all databases, registered users, bets, transaction histories, and reset all metrics and pools to 0!")) {
      return;
    }

    setIsResetting(true);
    try {
      const res = await fetch("/api/database/reset", {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setSaveSuccess("Database completely cleaned and reset to 0!");
        setTimeout(() => setSaveSuccess(null), 4000);
        fetchStats();
      } else {
        alert("Failed to reset database: " + data.error);
      }
    } catch (e) {
      console.error(e);
      alert("Error resetting database");
    } finally {
      setIsResetting(false);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
        <div className="relative bg-[#0F131C] border-2 border-amber-500/40 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-6">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 border border-neutral-700 hover:border-amber-400 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="text-center space-y-2 pt-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-amber-400 mx-auto">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <h2 className="text-lg font-black text-white tracking-wide">অ্যাডমিন লগইন (Secure Login)</h2>
            <p className="text-xs text-neutral-400">অ্যাডমিন কনসোল অ্যাক্সেস করতে অনুগ্রহ করে পাসওয়ার্ড দিন</p>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">ইউজারনেম</label>
              <input
                type="text"
                required
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                placeholder="Enter Username"
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500/60 rounded-xl px-3.5 py-2.5 text-white text-xs outline-none font-bold transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">পাসওয়ার্ড</label>
              <input
                type="password"
                required
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Enter Password"
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500/60 rounded-xl px-3.5 py-2.5 text-white text-xs outline-none font-bold transition-all"
              />
            </div>

            {authError && (
              <div className="p-3 bg-red-500/15 border border-red-500/30 text-red-400 rounded-xl text-xs font-bold text-center">
                {authError}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 text-xs font-black rounded-xl transition-all shadow-md shadow-amber-500/15 cursor-pointer active:scale-95"
            >
              🔒 প্রবেশ করুন (Verify Auth)
            </button>
          </form>
        </div>
      </div>
    );
  }

  const [activeAdminTab, setActiveAdminTab] = useState<"overview" | "users" | "tables">("overview");
  const [userSearchQuery, setUserSearchQuery] = useState<string>("");
  const [selectedUserToEdit, setSelectedUserToEdit] = useState<{
    userId: string;
    username: string;
    balance: number;
    demoBalance: number;
    kycStatus: string;
  } | null>(null);
  const [balanceEditAmount, setBalanceEditAmount] = useState<string>("");
  const [balanceEditType, setBalanceEditType] = useState<"add" | "subtract">("add");
  const [balanceEditIsDemo, setBalanceEditIsDemo] = useState<boolean>(false);

  const handleModifyBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserToEdit || !balanceEditAmount) return;

    try {
      const res = await fetch("/api/admin/user/balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUserToEdit.userId,
          type: balanceEditType,
          amount: Number(balanceEditAmount),
          isDemo: balanceEditIsDemo,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSaveSuccess(`Successfully ${balanceEditType === "add" ? "added" : "deducted"} ৳${Number(balanceEditAmount).toLocaleString()} ${balanceEditIsDemo ? "Demo" : "Real"} chip balance to @${selectedUserToEdit.username}!`);
        setBalanceEditAmount("");
        setSelectedUserToEdit(null);
        setTimeout(() => setSaveSuccess(null), 4000);
        fetchStats();
      } else {
        alert(data.error || "Failed to update balance");
      }
    } catch (err) {
      console.error(err);
      alert("Error modifying user balance");
    }
  };

  const handleChangeKycStatus = async (userId: string, newStatus: string) => {
    try {
      const res = await fetch("/api/admin/user/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, kycStatus: newStatus }),
      });
      if (res.ok) {
        setSaveSuccess(`Updated KYC status of user to ${newStatus.toUpperCase()}`);
        setTimeout(() => setSaveSuccess(null), 3000);
        fetchStats();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filter users based on query
  const filteredUsers = stats?.users?.filter((u: any) => {
    const q = userSearchQuery.toLowerCase().trim();
    return u.username.toLowerCase().includes(q) || u.userId.toLowerCase().includes(q);
  }) || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
      <div className="relative bg-[#0B0E14] border-2 border-amber-500/30 rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col my-4 max-h-[92vh]">
        {/* Fixed Top-Right Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 z-50 p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white border border-neutral-700 hover:border-amber-400 shadow-2xl transition-all active:scale-95 flex items-center justify-center cursor-pointer"
          aria-label="Close modal"
          title="Close"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-4 border-b border-white/10 bg-neutral-950/80 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                Executive Admin Console — (God Mode)
              </h2>
              <p className="text-[11px] sm:text-xs text-neutral-400 font-medium">
                Live monitoring of game rooms, instant player wallet adjustment, and database ledger logs
              </p>
            </div>
          </div>

          {/* System Status badge */}
          <div className="self-start sm:self-center bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-mono text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap">
            System Online
          </div>
        </div>

        {/* Admin Navigation Tabs */}
        <div className="flex bg-neutral-900/60 border-b border-white/5 p-1 px-3 sm:px-6 gap-1 sm:gap-2 overflow-x-auto shrink-0 select-none">
          <button
            onClick={() => setActiveAdminTab("overview")}
            className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeAdminTab === "overview"
                ? "bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20"
                : "text-neutral-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Overview & Revenue
          </button>
          <button
            onClick={() => setActiveAdminTab("users")}
            className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeAdminTab === "users"
                ? "bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20"
                : "text-neutral-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            User Manager ({stats?.usersCount || 0})
          </button>
          <button
            onClick={() => setActiveAdminTab("tables")}
            className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeAdminTab === "tables"
                ? "bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20"
                : "text-neutral-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            Live Rooms limits
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6">
          {saveSuccess && (
            <div className="p-3 bg-emerald-500/15 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2 animate-pulse">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-bold">{saveSuccess}</span>
            </div>
          )}

          {/* TAB 1: OVERVIEW */}
          {activeAdminTab === "overview" && (
            <div className="space-y-6">
              {/* Site Liquidity Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-neutral-950 border border-white/5 p-4 rounded-2xl shadow-md">
                  <div className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">মোট প্ল্যাটফর্ম লিকুইডিটি</div>
                  <div className="text-xl sm:text-2xl font-mono font-black text-white mt-1">
                    ৳{(stats?.totalSiteLiquidity || 0).toLocaleString()}
                  </div>
                  <div className="text-[9px] text-neutral-400 font-medium mt-0.5">Real Chips + Escrow</div>
                </div>

                <div className="bg-neutral-950 border border-white/5 p-4 rounded-2xl shadow-md">
                  <div className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">সকল ইউজারের ব্যালেন্স</div>
                  <div className="text-xl sm:text-2xl font-mono font-black text-emerald-400 mt-1">
                    ৳{(stats?.totalRealBalance || 0).toLocaleString()}
                  </div>
                  <div className="text-[9px] text-neutral-400 font-medium mt-0.5">Across {stats?.usersCount || 0} Player accounts</div>
                </div>

                <div className="bg-neutral-950 border border-white/5 p-4 rounded-2xl shadow-md">
                  <div className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">লকড ইন-প্লে এসক্রো</div>
                  <div className="text-xl sm:text-2xl font-mono font-black text-blue-400 mt-1">
                    ৳{(stats?.totalEscrowLocked || 0).toLocaleString()}
                  </div>
                  <div className="text-[9px] text-neutral-400 font-medium mt-0.5">Active Live & Duel Wagers</div>
                </div>

                <div className="bg-neutral-950 border border-white/5 p-4 rounded-2xl shadow-md">
                  <div className="text-[10px] uppercase font-bold text-purple-400 tracking-wider">মোট ডেমো ব্যালেন্স</div>
                  <div className="text-xl sm:text-2xl font-mono font-black text-purple-300 mt-1">
                    ৳{(stats?.totalDemoBalance || 0).toLocaleString()}
                  </div>
                  <div className="text-[9px] text-neutral-400 font-medium mt-0.5">Practice Chips</div>
                </div>
              </div>

              {/* Revenue & Commission LEDGER Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-neutral-900 border border-white/5 p-4 rounded-2xl">
                  <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                    Today's Matched Volume
                  </div>
                  <div className="text-xl font-black text-amber-300 mt-1 font-mono">
                    ৳{stats?.metrics.todayMatchedVolume.toLocaleString() || "0"}
                  </div>
                  <div className="text-[10px] text-emerald-400 mt-1 font-medium">100% P2P Balanced</div>
                </div>

                <div className="bg-neutral-900 border border-white/5 p-4 rounded-2xl">
                  <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                    Platform Commission (5%)
                  </div>
                  <div className="text-xl font-black text-emerald-400 mt-1 font-mono">
                    ৳{stats?.metrics.todayCommission.toLocaleString() || "0"}
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-1 font-medium">House Revenue</div>
                </div>

                <div className="bg-neutral-900 border border-white/5 p-4 rounded-2xl">
                  <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                    Tie Retention Fund (50%)
                  </div>
                  <div className="text-xl font-black text-blue-400 mt-1 font-mono">
                    ৳{stats?.metrics.todayTieRevenue.toLocaleString() || "0"}
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-1 font-medium">Retained on tie results</div>
                </div>

                <div className="bg-neutral-900 border border-white/5 p-4 rounded-2xl">
                  <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                    Rounds Completed
                  </div>
                  <div className="text-xl font-black text-purple-400 mt-1 font-mono">
                    {stats?.metrics.totalRoundsPlayed.toLocaleString() || "0"}
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-1 font-medium">Across all arenas</div>
                </div>
              </div>

              {/* System Clean & Reset Danger Zone */}
              <div className="p-4 bg-red-950/20 border-2 border-red-500/30 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-red-300 uppercase tracking-wider">🚨 Database Wipe & Hard Reset 🚨</h4>
                    <p className="text-[11px] text-neutral-400">
                      Delete all player databases, bets, transactions, referrals, and reset metrics to ৳0! This is irreversible.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleResetDatabase}
                  disabled={isResetting}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-black rounded-xl transition-all shadow-md shadow-red-950 flex items-center gap-2 cursor-pointer shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                  {isResetting ? "Cleaning All Databases..." : "Wipe and Reset to ৳0"}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: USER MANAGER */}
          {activeAdminTab === "users" && (
            <div className="space-y-6">
              {/* Filter and balance adjustment overlay */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-neutral-950 p-4 rounded-2xl border border-white/5">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="প্লেয়ার সার্চ করুন (Username or User ID)..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl py-2 px-3 pl-9 text-xs text-white placeholder-neutral-500 font-bold focus:border-amber-500/60 outline-none transition-all"
                  />
                  <ShieldAlert className="absolute left-3 top-2.5 w-4 h-4 text-neutral-500" />
                </div>
                <div className="text-[11px] font-bold text-neutral-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  সার্চ করা হচ্ছে: <span className="text-white">{filteredUsers.length} জন প্লেয়ার</span>
                </div>
              </div>

              {/* Edit User Balance Modal/Card overlay */}
              {selectedUserToEdit && (
                <div className="p-4 sm:p-5 bg-neutral-950 border-2 border-amber-500/40 rounded-2xl space-y-4 shadow-xl">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-2">
                      <Coins className="w-4 h-4" />
                      ব্যালেন্স মডিফাই করুন — @{selectedUserToEdit.username}
                    </h4>
                    <button
                      onClick={() => setSelectedUserToEdit(null)}
                      className="text-neutral-500 hover:text-white text-xs font-bold"
                    >
                      বাতিল করুন
                    </button>
                  </div>

                  <form onSubmit={handleModifyBalance} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold block mb-1">অ্যাকশন সিলেক্ট করুন</label>
                      <select
                        value={balanceEditType}
                        onChange={(e) => setBalanceEditType(e.target.value as any)}
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 text-xs text-white font-bold outline-none focus:border-amber-500/40"
                      >
                        <option value="add">➕ ব্যালেন্স যোগ করুন (Add)</option>
                        <option value="subtract">➖ ব্যালেন্স কর্তন করুন (Subtract)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold block mb-1">অ্যামাউন্ট (৳ / Chips)</label>
                      <input
                        type="number"
                        required
                        value={balanceEditAmount}
                        onChange={(e) => setBalanceEditAmount(e.target.value)}
                        placeholder="৳ সংখ্যা লিখুন"
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2 px-3 text-xs text-white font-black font-mono outline-none focus:border-amber-500/40"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold block mb-1">ব্যালেন্সের ধরণ</label>
                      <select
                        value={balanceEditIsDemo ? "demo" : "real"}
                        onChange={(e) => setBalanceEditIsDemo(e.target.value === "demo")}
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 text-xs text-white font-bold outline-none focus:border-amber-500/40"
                      >
                        <option value="real">🟢 Real Wallet</option>
                        <option value="demo">🟣 Demo Wallet</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-black rounded-xl transition-all shadow-md cursor-pointer active:scale-95"
                    >
                      আপডেট নিশ্চিত করুন
                    </button>
                  </form>
                </div>
              )}

              {/* Users Ledger Table */}
              <div className="border border-white/5 rounded-2xl overflow-hidden bg-neutral-950 shadow-inner">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-neutral-900/80 border-b border-white/10 text-neutral-400 font-black tracking-wider text-[10px] uppercase">
                        <th className="p-3.5 pl-4">ইউজারনেম (User ID)</th>
                        <th className="p-3.5">Real ব্যালেন্স</th>
                        <th className="p-3.5">Demo ব্যালেন্স</th>
                        <th className="p-3.5">KYC স্ট্যাটাস</th>
                        <th className="p-3.5 text-center">মোট গেম</th>
                        <th className="p-3.5 text-right pr-4">অ্যাকশন</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-medium text-neutral-200">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-neutral-500 font-bold">
                            কোন প্লেয়ারের প্রোফাইল পাওয়া যায়নি!
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((p: any) => (
                          <tr key={p.userId} className="hover:bg-white/5 transition-all">
                            <td className="p-3.5 pl-4 flex flex-col">
                              <span className="font-extrabold text-white text-xs">@{p.username}</span>
                              <span className="text-[10px] text-neutral-500 font-mono">{p.userId}</span>
                            </td>
                            <td className="p-3.5 font-bold font-mono text-emerald-400">
                              ৳{p.balance.toLocaleString()}
                            </td>
                            <td className="p-3.5 font-bold font-mono text-purple-300">
                              ৳{p.demoBalance.toLocaleString()}
                            </td>
                            <td className="p-3.5">
                              <select
                                value={p.kycStatus}
                                onChange={(e) => handleChangeKycStatus(p.userId, e.target.value)}
                                className={`text-[10px] font-black rounded px-2 py-1 bg-neutral-900 border border-neutral-800 cursor-pointer ${
                                  p.kycStatus === "verified" ? "text-emerald-400" : "text-amber-400"
                                }`}
                              >
                                <option value="unverified">⚠️ Unverified</option>
                                <option value="pending">⏳ Pending Review</option>
                                <option value="verified">✅ Verified VIP</option>
                                <option value="banned">🚫 Banned Account</option>
                              </select>
                            </td>
                            <td className="p-3.5 text-center font-bold font-mono text-white">
                              {p.gamesPlayed}
                            </td>
                            <td className="p-3.5 text-right pr-4">
                              <button
                                onClick={() => {
                                  setSelectedUserToEdit({
                                    userId: p.userId,
                                    username: p.username,
                                    balance: p.balance,
                                    demoBalance: p.demoBalance,
                                    kycStatus: p.kycStatus,
                                  });
                                  setBalanceEditAmount("");
                                }}
                                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer shadow-sm active:scale-95"
                              >
                                Adjust Fund
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LIVE ROOMS */}
          {activeAdminTab === "tables" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {stats?.tables.map((tbl) => (
                  <div key={tbl.slug} className="bg-neutral-950 border border-white/5 rounded-2xl p-5 space-y-4 shadow-lg">
                    <div className="flex items-center justify-between pb-2 border-b border-white/5">
                      <div>
                        <span className="text-sm font-black text-white block">{tbl.name} Arena</span>
                        <span className="text-[10px] text-neutral-500 font-mono uppercase">{tbl.slug} table</span>
                      </div>
                      <span className="text-[10px] px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/30 font-black animate-pulse">
                        ⏱ {tbl.timer}s Left
                      </span>
                    </div>

                    <div className="space-y-2 text-xs font-semibold text-neutral-300">
                      <div className="flex justify-between">
                        <span>Dragon Pool (ড্রাগন পুল):</span>
                        <span className="text-blue-400 font-mono font-bold">৳{tbl.dragonPool.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tiger Pool (টাইগার পুল):</span>
                        <span className="text-red-400 font-mono font-bold">৳{tbl.tigerPool.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>P2P Matching:</span>
                        <span className="text-emerald-400 font-mono font-bold">৳{tbl.matchedAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between pb-2 border-b border-white/5">
                        <span>Players Online:</span>
                        <span className="text-white font-mono">{tbl.playersOnline} Players</span>
                      </div>
                    </div>

                    {/* Betting configuration panel */}
                    <div className="space-y-3 pt-1">
                      <h5 className="text-[10px] font-black text-amber-300 uppercase tracking-wider">Modify Betting Limits</h5>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="text-[10px] text-neutral-400 block mb-1">Min Bet (৳)</label>
                          <input
                            type="number"
                            defaultValue={tbl.minBet}
                            onBlur={(e) => handleUpdateTable(tbl.slug, Number(e.target.value), tbl.maxBet)}
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-2.5 py-1.5 text-white font-bold text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-neutral-400 block mb-1">Max Bet (৳)</label>
                          <input
                            type="number"
                            defaultValue={tbl.maxBet}
                            onBlur={(e) => handleUpdateTable(tbl.slug, tbl.minBet, Number(e.target.value))}
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-2.5 py-1.5 text-white font-bold text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-neutral-950/80 flex items-center justify-between shrink-0">
          <div className="text-[10px] text-neutral-500 font-mono">
            Connected to Live Secure Node: 127.0.0.1:3000
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-black rounded-xl transition-colors cursor-pointer active:scale-95"
          >
            Close Console
          </button>
        </div>
      </div>
    </div>
  );
};
