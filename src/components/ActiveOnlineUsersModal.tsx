import React, { useState, useEffect } from "react";
import {
  Users,
  X,
  Search,
  RefreshCw,
  Shield,
  Trophy,
  Activity,
  Flame,
  CheckCircle2,
} from "lucide-react";

interface UserSummary {
  userId: string;
  username: string;
  vipTier: string;
  gamesPlayed: number;
  totalWon: number;
  stats?: {
    winRate?: number;
  };
  balance: number;
  demoBalance: number;
}

interface ActiveOnlineUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onlineCount: number;
  lang?: "bn" | "en";
}

export const ActiveOnlineUsersModal: React.FC<ActiveOnlineUsersModalProps> = ({
  isOpen,
  onClose,
  onlineCount,
  lang = "bn",
}) => {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/transparency/users");
      if (res.ok) {
        const data = await res.json();
        if (data.users && Array.isArray(data.users)) {
          setUsers(data.users);
        }
      }
    } catch (e) {
      console.error("Failed to fetch active users:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = users.filter((u) =>
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative bg-[#0D111A] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Fixed Top-Right High Contrast Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 z-50 p-2 sm:p-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white border-2 border-neutral-600 hover:border-amber-400 shadow-2xl transition-all active:scale-95 flex items-center justify-center cursor-pointer shrink-0"
          aria-label="Close modal"
          title="Close"
        >
          <X className="w-5 h-5 text-white stroke-[2.5]" />
        </button>

        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-4 pr-14 sm:pr-16 border-b border-white/10 flex items-center justify-between bg-[#121824]/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 relative shrink-0">
              <Users className="w-5 h-5" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 absolute top-1 right-1 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>{lang === "bn" ? "সক্রিয় অনলাইন প্লেয়ার তালিকা" : "Active Online Players"}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30">
                  {onlineCount.toLocaleString()} {lang === "bn" ? "অনলাইন" : "Live"}
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                {lang === "bn"
                  ? "বর্তমানে ক্যাসিনো অ্যারেনায় সক্রিয় খেলোয়াড় ও তাদের লাইভ স্ট্যাটাস"
                  : "Currently connected casino players and live gaming status"}
              </p>
            </div>
          </div>
        </div>

        {/* Search & Stats Bar */}
        <div className="p-3 sm:p-4 border-b border-white/5 bg-[#0B0E14] flex flex-col sm:flex-row gap-2.5 items-center justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={lang === "bn" ? "ইউজারনেম দিয়ে খুঁজুন..." : "Search by username..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-neutral-900 border border-neutral-800 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <span className="text-xs text-neutral-400">
              {filtered.length} {lang === "bn" ? "জন প্লেয়ার তালিকাভুক্ত" : "players listed"}
            </span>
            <button
              onClick={fetchUsers}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-xs font-semibold text-neutral-300 border border-neutral-800 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${loading ? "animate-spin" : ""}`} />
              <span>{lang === "bn" ? "রিফ্রেশ" : "Refresh"}</span>
            </button>
          </div>
        </div>

        {/* Players List Table / Cards */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2">
          {loading ? (
            <div className="py-16 text-center space-y-2">
              <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mx-auto opacity-70" />
              <p className="text-xs text-neutral-400">
                {lang === "bn" ? "অনলাইন ইউজার ডাটা লোড হচ্ছে..." : "Loading active players..."}
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-neutral-500 text-xs">
              {lang === "bn" ? "কোনো সক্রিয় প্লেয়ার পাওয়া যায়নি" : "No players found matching your search"}
            </div>
          ) : (
            filtered.map((player, idx) => {
              const winRate = player.stats?.winRate ?? 0;
              const tableLocations = ["⚡ Express Table", "🎯 Classic Arena", "👑 VIP Dragon Lounge", "⚔️ 1v1 P2P Duel"];
              const randomLocation = tableLocations[idx % tableLocations.length];

              return (
                <div
                  key={player.userId || idx}
                  className="bg-[#121722] hover:bg-[#161D2B] border border-white/5 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-700 flex items-center justify-center text-neutral-950 font-black text-sm shadow-md">
                        {player.username.charAt(0).toUpperCase()}
                      </div>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#121722] absolute -bottom-0.5 -right-0.5" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white tracking-wide">
                          {player.username}
                        </span>
                        <span className="text-[10px] bg-amber-500/20 text-amber-400 font-bold px-1.5 py-0.2 rounded border border-amber-500/30 uppercase">
                          {player.vipTier || "Bronze"}
                        </span>
                      </div>
                      <div className="text-[11px] text-neutral-400 flex items-center gap-2 mt-0.5 font-mono">
                        <span className="text-emerald-400 flex items-center gap-1 font-sans">
                          <CheckCircle2 className="w-3 h-3" />
                          {randomLocation}
                        </span>
                        <span>•</span>
                        <span>{player.gamesPlayed ?? 0} {lang === "bn" ? "রাউন্ড" : "rounds"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 sm:gap-5 self-end sm:self-auto text-right font-mono">
                    <div>
                      <div className="text-[10px] text-neutral-400 uppercase font-sans">
                        {lang === "bn" ? "উইন রেট" : "Win Rate"}
                      </div>
                      <div className="text-xs font-bold text-emerald-400">
                        {winRate}%
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] text-neutral-400 uppercase font-sans">
                        {lang === "bn" ? "স্ট্যাটাস" : "Status"}
                      </div>
                      <div className="text-xs font-bold text-neutral-200 flex items-center gap-1">
                        <Activity className="w-3 h-3 text-emerald-400 animate-pulse" />
                        <span>Online</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-3 bg-[#0B0E14] border-t border-white/10 flex items-center justify-between text-xs text-neutral-400">
          <div className="flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>{lang === "bn" ? "প্রুভড ফেয়ার লাইভ মেম্বারশিপ নেটওয়ার্ক" : "Provably Fair Live Player Network"}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl transition-colors"
          >
            {lang === "bn" ? "বন্ধ করুন" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
};
