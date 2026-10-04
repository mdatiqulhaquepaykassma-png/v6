import React, { useState, useEffect } from 'react';
import { Trophy, Sparkles, TrendingUp, Coins } from 'lucide-react';
import { LeaderboardEntry } from '../types';

interface LeaderboardProps {
  onOpenLiquidity?: () => void;
  currentUser?: {
    userId: string;
    username: string;
    stats?: {
      winRate?: number;
    };
  } | null;
}

export const Leaderboard = React.memo<LeaderboardProps>(({ onOpenLiquidity, currentUser }) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fallbackLeaderboard: LeaderboardEntry[] = [
    { userId: 'usr_101', username: 'DragonKing', balance: 85400, profit: 45000, winRate: 72, gamesPlayed: 142, vipTier: 'Master VIP' },
    { userId: 'usr_102', username: 'TigerMaster', balance: 62100, profit: 32000, winRate: 68, gamesPlayed: 110, vipTier: 'Diamond VIP' },
    { userId: 'usr_103', username: 'ApexPredator', balance: 41000, profit: 21500, winRate: 64, gamesPlayed: 95, vipTier: 'Platinum VIP' },
    { userId: 'usr_104', username: 'Velociraptor', balance: 38200, profit: 18400, winRate: 61, gamesPlayed: 88, vipTier: 'Gold VIP' },
    { userId: 'usr_105', username: 'KolkataKnight', balance: 29500, profit: 12100, winRate: 58, gamesPlayed: 74, vipTier: 'Silver VIP' },
  ];

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch(`/api/leaderboard?sortBy=profit`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setLeaderboard(data);
      } else {
        setLeaderboard((prev) => (prev.length > 0 ? prev : fallbackLeaderboard));
      }
    } catch {
      setLeaderboard((prev) => (prev.length > 0 ? prev : fallbackLeaderboard));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(() => fetchLeaderboard(), 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-neutral-900 via-neutral-900/90 to-neutral-900 border border-amber-500/30 rounded-3xl p-6 lg:p-8 shadow-xl text-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto mb-4 relative z-10 shadow-lg">
          <Trophy className="w-8 h-8" />
        </div>
        <h2 className="text-2xl lg:text-3xl font-black text-white relative z-10">Real-Time VIP Profit Leaderboard</h2>
        <p className="text-sm text-neutral-400 mt-1 max-w-lg mx-auto relative z-10">
          টপ প্লেয়ারদের রিয়েল-টাইম নেট লাভ ও র‍্যাঙ্কিং। লাইভ সিঙ্ক প্রতি ৫ সেকেন্ড পর পর।
        </p>

        {onOpenLiquidity && (
          <div className="mt-4 relative z-10">
            <button
              onClick={onOpenLiquidity}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition-all active:scale-95 shadow-lg shadow-emerald-950/40"
            >
              <Coins className="w-4 h-4 text-emerald-400" />
              <span>সাইটের মোট লিকুইডিটি ও সকল ইউজারের ব্যালেন্স লেজার দেখুন</span>
            </button>
          </div>
        )}
      </div>

      {/* Leaderboard Table Card */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-3 sm:p-5 bg-neutral-950 border-b border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2 text-[10px] sm:text-xs font-semibold text-amber-400 uppercase tracking-wider">
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 h-4" /> Global Profit Rankings
            </div>
          </div>

          <div className="text-[10px] text-neutral-500 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Live Sync</span>
          </div>
        </div>

        {loading ? (
          <div className="divide-y divide-neutral-850">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={`skel-leaderboard-${i}`} className="p-4 lg:p-5 flex items-center justify-between">
                <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-full skeleton-shimmer shrink-0" />
                  <div className="space-y-2 flex-1 min-w-0 max-w-xs">
                    <div className="h-4 w-32 rounded-md skeleton-shimmer" />
                    <div className="h-3 w-48 rounded-md skeleton-shimmer" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-6 w-24 rounded-lg skeleton-shimmer" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-neutral-800">
            {leaderboard.map((entry, index) => {
              const rank = index + 1;
              const isCurrentUser = currentUser?.userId === entry.userId;
              return (
                <div
                  key={entry.userId}
                  className={`p-4 lg:p-5 flex items-center justify-between transition-colors hover:bg-neutral-800/40 ${
                    isCurrentUser ? 'bg-amber-500/15 border-l-4 border-amber-400 shadow-inner' :
                    rank === 1 ? 'bg-amber-500/10 border-l-4 border-amber-500' :
                    rank === 2 ? 'bg-neutral-800/20 border-l-4 border-neutral-400' :
                    rank === 3 ? 'bg-amber-700/10 border-l-4 border-amber-700' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-8 text-center font-black text-lg shrink-0">
                      {rank === 1 ? (
                        <span className="text-amber-400">🥇</span>
                      ) : rank === 2 ? (
                        <span className="text-neutral-300">🥈</span>
                      ) : rank === 3 ? (
                        <span className="text-amber-600">🥉</span>
                      ) : (
                        <span className="text-neutral-500 text-sm">#{rank}</span>
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white flex items-center gap-2 flex-wrap">
                        <span>{entry.username}</span>
                        {entry.equippedTitle && (
                          <span className="text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-md font-semibold">
                            🏷️ {entry.equippedTitle}
                          </span>
                        )}
                        {isCurrentUser && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                            YOU
                          </span>
                        )}
                        <span className="text-[10px] bg-neutral-800 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5" /> {entry.vipTier}
                        </span>
                      </div>
                      <div className="text-xs text-neutral-400 mt-1 flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-amber-400">
                          🏆 ELO {entry.eloRating || 1000} ({entry.eloTier || 'Bronze'})
                        </span>
                        <span>•</span>
                        <span>{entry.gamesPlayed} Rounds Played</span>
                        <span>•</span>
                        <span className="text-neutral-300 font-semibold">{entry.winRate}% Win Rate</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 sm:gap-6">
                    {/* Net Profit */}
                    <div className="text-right min-w-[90px] sm:min-w-[110px]">
                      <div className="text-[10px] uppercase font-semibold text-neutral-400">Net Profit</div>
                      <div className={`text-sm lg:text-base font-black ${entry.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {entry.profit >= 0 ? '+' : ''}{entry.profit.toLocaleString()} <span className="text-xs font-normal text-neutral-400">CHIPS</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Clean Mobile End Spacer */}
        <div className="h-6 md:h-2" />
      </div>
    </div>
  );
});
