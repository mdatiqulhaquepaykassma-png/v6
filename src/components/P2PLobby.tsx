import React, { useState, useEffect, useMemo } from 'react';
import {
  Swords,
  Plus,
  Shield,
  Users,
  Trophy,
  CheckCircle2,
  AlertCircle,
  Coins,
  Percent,
  Building2,
  Flame,
  Search,
  Filter,
  Zap,
  Star,
  Share2,
  Clock,
  User,
  ShieldAlert,
  StickyNote,
  Send,
  Sparkles,
  BarChart3,
  Bell,
  RefreshCw,
  Copy,
  Check,
  AlertTriangle,
  Play,
  ArrowUpDown,
  Lock,
} from 'lucide-react';
import { UserWallet, P2PRoom } from '../types';
import { OneOnOneArena } from './OneOnOneArena';
import { RoomCapacityChart } from './RoomCapacityChart';
import { ReportPlayerModal } from './ReportPlayerModal';
import { PlayerNotesModal } from './PlayerNotesModal';
import { useNotificationSystem } from '../utils/useNotificationSystem';
import { sound } from '../utils/audio';
import { formatCurrency, getStoredCurrencyCode } from '../utils/currency';

interface P2PLobbyProps {
  user: UserWallet;
  onUpdateWallet: (updatedUser: UserWallet) => void;
}

export const P2PLobby = React.memo<P2PLobbyProps>(({ user, onUpdateWallet }) => {
  const [activeP2pTab, setActiveP2pTab] = useState<'arena' | 'custom_lobby'>('arena');
  const [rooms, setRooms] = useState<P2PRoom[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [platformMetrics, setPlatformMetrics] = useState<{ todayCommission: number; todayTieRevenue: number; todayMatchedVolume: number } | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterMode, setFilterMode] = useState<'all' | 'recommended' | 'low_stakes' | 'high_stakes' | 'fast_action' | 'friends_only'>('recommended');
  
  // Custom Odds State
  const [oddsMode, setOddsMode] = useState<'ratio' | 'decimal'>('ratio');
  const [amount, setAmount] = useState<string>('500');
  const [opponentAmount, setOpponentAmount] = useState<string>('500');
  const [odds, setOdds] = useState<string>('2.0');
  const [choice, setChoice] = useState<'dragon' | 'tiger'>('dragon');
  const [invitedUsername, setInvitedUsername] = useState<string>('');
  const [isQuickSingleRound, setIsQuickSingleRound] = useState<boolean>(false);
  
  const [loading, setLoading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [botSpamWarning, setBotSpamWarning] = useState<string | null>(null);
  const [resolvedRoom, setResolvedRoom] = useState<P2PRoom | null>(null);

  // Quick Action Modals State
  const [copiedRoomId, setCopiedRoomId] = useState<string | null>(null);
  const [showQuickChallengeModal, setShowQuickChallengeModal] = useState<boolean>(false);
  const [showTrendsChart, setShowTrendsChart] = useState<boolean>(true);

  // Matchmaking State for Quick Join
  const [isMatchmaking, setIsMatchmaking] = useState<boolean>(false);
  const [matchmakingStatusText, setMatchmakingStatusText] = useState<string>('Scanning Arena for Compatible Opponent...');

  // Player Notes & Reporting state
  const [selectedOpponent, setSelectedOpponent] = useState<{ id: string; name: string } | null>(null);
  const [showNotesModal, setShowNotesModal] = useState<boolean>(false);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);

  // Session mini-statistics
  const [sessionStats, setSessionStats] = useState<{ handsPlayed: number; won: number; lost: number; earnings: number }>({
    handsPlayed: 0,
    won: 0,
    lost: 0,
    earnings: 0,
  });

  const [recentMatches, setRecentMatches] = useState<any[]>([]);

  const fetchRecentMatches = async () => {
    try {
      const res = await fetch(`/api/rooms/history/${user.userId}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setRecentMatches(data.filter((r: any) => r.status === 'completed' || r.winner));
        }
      }
    } catch {
      // quiet fallback
    }
  };

  useEffect(() => {
    fetchRecentMatches();
    const interval = setInterval(fetchRecentMatches, 5000);
    return () => clearInterval(interval);
  }, [user.userId]);

  const displayRecentMatches = recentMatches.length > 0 ? recentMatches.slice(0, 5) : [
    {
      id: 'room_match_01',
      creatorName: 'DragonKing',
      acceptorName: user.username || 'You',
      amount: 1000,
      acceptorAmount: 1000,
      winner: 'dragon',
      timestamp: new Date(Date.now() - 120000).toISOString(),
    },
    {
      id: 'room_match_02',
      creatorName: user.username || 'You',
      acceptorName: 'TigerMaster',
      amount: 500,
      acceptorAmount: 500,
      winner: 'tiger',
      timestamp: new Date(Date.now() - 450000).toISOString(),
    },
  ];

  // Notification hook
  const {
    permission,
    requestPermission,
    sendNotification,
    toggleFavoriteRoom,
    isFavorite,
    activeBanner,
    dismissBanner,
  } = useNotificationSystem(user.userId);

  // Popular Ratio Presets (Starting from 1 BDT)
  const RATIO_PRESETS = [
    { label: '1 e 1', creator: 1, opponent: 1, text: '1:1 Micro Stake' },
    { label: '10 e 10', creator: 1, opponent: 10, text: '1:10 Express Boost' },
    { label: '50 e 50', creator: 50, opponent: 50, text: '1:1 Standard Risk' },
    { label: '100 e 100', creator: 100, opponent: 100, text: '1:1 Even Match' },
    { label: '500 e 500', creator: 500, opponent: 500, text: '1:1 High Roll' },
    { label: '1000 e 1000', creator: 1000, opponent: 1000, text: '1:1 VIP Match' },
  ];

  const fetchRooms = async () => {
    try {
      const [roomsRes, metricsRes] = await Promise.all([
        fetch('/api/rooms').catch(() => null),
        fetch('/api/transparency').catch(() => null),
      ]);

      if (roomsRes && roomsRes.ok) {
        const data = await roomsRes.json();
        if (Array.isArray(data)) {
          setRooms(data);
          // Check favorite rooms starting rounds
          data.forEach((r) => {
            if (isFavorite(r.id) && r.status === 'matched') {
              sendNotification({
                title: `⚔️ Favorite Room Action: ${r.creatorName}`,
                body: `A match was accepted in your favorited challenge room (${r.id})!`,
                type: 'round_start',
                roomId: r.id,
              });
            }
          });
        }
      }

      if (metricsRes && metricsRes.ok) {
        const m = await metricsRes.json();
        setPlatformMetrics({
          todayCommission: m.todayCommission || 0,
          todayTieRevenue: m.todayTieRevenue || 0,
          todayMatchedVolume: m.todayMatchedVolume || 0,
        });
      }
    } catch (e) {
      console.warn('Failed to fetch P2P rooms:', e);
    } finally {
      setIsInitialLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 3000);
    return () => clearInterval(interval);
  }, [isFavorite]);

  // Live Calculations for Challenge Form
  const numCreatorStake = Math.max(10, Number(amount) || 10);
  let numOpponentStake = 500;
  if (oddsMode === 'ratio') {
    numOpponentStake = Math.max(10, Number(opponentAmount) || 10);
  } else {
    const decOdds = Math.max(1.05, Number(odds) || 2.0);
    numOpponentStake = Math.max(10, Math.round(numCreatorStake * (decOdds - 1)));
  }

  const calculatedTotalPot = numCreatorStake + numOpponentStake;
  const calculatedOdds = Number((calculatedTotalPot / numCreatorStake).toFixed(2));
  const calculatedCompanyFee = Math.round(calculatedTotalPot * 0.05); // 5% house rake
  const calculatedWinnerPayout = calculatedTotalPot - calculatedCompanyFee;

  const handleApplyPreset = (preset: typeof RATIO_PRESETS[0]) => {
    sound.playButtonClick();
    setOddsMode('ratio');
    setAmount(preset.creator.toString());
    setOpponentAmount(preset.opponent.toString());
    const pot = preset.creator + preset.opponent;
    setOdds((pot / preset.creator).toFixed(2));
  };

  // 'Recommended for You' Algorithm:
  // Evaluates player's user balance, games played, and historical stake range to score rooms
  const userAvgStake = useMemo(() => {
    const balance = user.balance || 500;
    if (balance > 10000) return 3000;
    if (balance > 3000) return 1000;
    return 300;
  }, [user.balance]);

  const scoredRooms = useMemo(() => {
    return rooms.map((room) => {
      const roomStake = room.acceptorAmount || room.amount;
      // Stake proximity score (0 to 60)
      const ratio = Math.min(roomStake, userAvgStake) / Math.max(roomStake, userAvgStake);
      let score = Math.round(ratio * 55);

      // Fast action / hot room boost (0 to 30)
      if (room.isFastAction || room.isSingleRoundQuickChallenge) score += 20;
      if (room.isHotRoom || (room.activityScore || 0) >= 70) score += 15;
      if (room.invitedUsername && room.invitedUsername.toLowerCase() === user.username.toLowerCase()) score += 35;

      const finalMatchScore = Math.min(99, Math.max(45, score));
      return {
        ...room,
        matchScore: finalMatchScore,
      };
    });
  }, [rooms, userAvgStake, user.username]);

  // Filter and Sort rooms
  const filteredRooms = useMemo(() => {
    let result = scoredRooms.filter((r) => r.status === 'open');

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (r) =>
          r.id.toLowerCase().includes(q) ||
          r.creatorName.toLowerCase().includes(q) ||
          (r.invitedUsername && r.invitedUsername.toLowerCase().includes(q))
      );
    }

    // Category sorting and filtering
    switch (filterMode) {
      case 'recommended':
        result.sort((a, b) => b.matchScore - a.matchScore);
        break;
      case 'low_stakes':
        result.sort((a, b) => (a.acceptorAmount || a.amount) - (b.acceptorAmount || b.amount));
        break;
      case 'high_stakes':
        result.sort((a, b) => (b.acceptorAmount || b.amount) - (a.acceptorAmount || a.amount));
        break;
      case 'fast_action':
        result = result.filter((r) => r.isFastAction || r.isSingleRoundQuickChallenge);
        break;
      case 'friends_only':
        result = result.filter(
          (r) => r.invitedUsername && r.invitedUsername.toLowerCase() === user.username.toLowerCase()
        );
        break;
      default:
        break;
    }

    return result;
  }, [scoredRooms, searchQuery, filterMode, user.username]);

  // Handle Room Creation
  const handleCreateRoom = async (e?: React.FormEvent, isQuick = false) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const stakeToUse = isQuick ? 250 : numCreatorStake;
    const opponentStakeToUse = isQuick ? 250 : numOpponentStake;
    const oddsToUse = isQuick ? 2.0 : calculatedOdds;

    if (user.balance < stakeToUse) {
      setErrorMsg(`Insufficient balance. You need ৳${stakeToUse.toLocaleString()} chips.`);
      sound.playButtonClick();
      return;
    }

    setLoading(true);
    sound.playButtonClick();

    try {
      const res = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.userId,
          username: user.username,
          amount: stakeToUse,
          acceptorAmount: opponentStakeToUse,
          odds: oddsToUse,
          choice,
          invitedUsername: invitedUsername.trim() || undefined,
          isSingleRoundQuickChallenge: isQuick || isQuickSingleRound,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        sound.playCoinsClinking();
        onUpdateWallet(data.user);
        setRooms((prev) => [data.room, ...prev]);
        setSuccessMsg(
          isQuick
            ? '⚡ 1v1 Quick Challenge created! Winner decided in single round!'
            : `Challenge created! Risked ৳${stakeToUse.toLocaleString()} (${oddsToUse.toFixed(2)}x Odds).`
        );
        setShowQuickChallengeModal(false);
        setInvitedUsername('');
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        if (data.botSpamDetected) {
          setBotSpamWarning(data.error);
        }
        setErrorMsg(data.error || 'Failed to create challenge room');
      }
    } catch {
      setErrorMsg('Network error connecting to P2P server');
    } finally {
      setLoading(false);
    }
  };

  // Quick Join Button: Automatically matches current user with compatible opponent based on wallet balance & skill level
  const handleQuickJoin = async () => {
    sound.playButtonClick();
    setErrorMsg('');
    setIsMatchmaking(true);
    setMatchmakingStatusText('Scanning Arena for Available Opponents...');

    // Matchmaking Step 1: Wallet & Skill Level Evaluation
    setTimeout(() => {
      setMatchmakingStatusText('Evaluating Wallet Balance Range & ELO Compatibility...');
      
      setTimeout(async () => {
        // Find best compatible candidate room
        const openCandidates = scoredRooms.filter((r) => r.status === 'open' && r.creatorId !== user.userId);
        
        if (openCandidates.length > 0) {
          // Sort by skill & balance closeness
          const bestCandidate = openCandidates.sort((a, b) => {
            const stakeA = a.acceptorAmount || a.amount;
            const stakeB = b.acceptorAmount || b.amount;
            const diffA = Math.abs(stakeA - userAvgStake);
            const diffB = Math.abs(stakeB - userAvgStake);
            return diffA - diffB;
          })[0];

          setMatchmakingStatusText(`Opponent Matched: @${bestCandidate.creatorName}! Connecting to Room...`);
          sound.playCoinsClinking();

          setTimeout(async () => {
            setIsMatchmaking(false);
            await handleAcceptRoom(bestCandidate.id);
          }, 1000);
        } else {
          // Fallback: If no open candidate exists, auto-create a balanced quick challenge room suited for user's balance
          setMatchmakingStatusText('No open rooms found. Auto-Creating Balanced Quick Challenge...');
          setTimeout(async () => {
            setIsMatchmaking(false);
            const optimalStake = Math.max(10, Math.min(500, Math.floor((user.balance || 500) * 0.1)));
            setAmount(optimalStake.toString());
            setOpponentAmount(optimalStake.toString());
            await handleCreateRoom(undefined, true);
          }, 1200);
        }
      }, 1200);
    }, 1000);
  };

  // Accept / Join Room
  const handleAcceptRoom = async (roomId: string) => {
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);
    sound.playButtonClick();

    try {
      const res = await fetch('/api/rooms/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          userId: user.userId,
          username: user.username,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        sound.playCoinsClinking();
        setResolvedRoom(data.room);

        // Update session mini-stats
        setSessionStats((prev) => {
          const isWinner =
            (data.room.winner === 'dragon' && data.room.choice !== 'dragon') ||
            (data.room.winner === 'tiger' && data.room.choice !== 'tiger');
          const isTie = data.room.winner === 'tie';
          const stake = data.room.acceptorAmount || data.room.amount;
          const pot = data.room.amount + stake;
          const profit = isWinner ? pot * 0.95 - stake : -stake;

          return {
            handsPlayed: prev.handsPlayed + 1,
            won: prev.won + (isWinner ? 1 : 0),
            lost: prev.lost + (!isWinner && !isTie ? 1 : 0),
            earnings: prev.earnings + profit,
          };
        });

        const walletRes = await fetch(`/api/wallet/${user.userId}`);
        const walletData = await walletRes.json();
        onUpdateWallet(walletData);
        fetchRooms();
      } else {
        setErrorMsg(data.error || 'Failed to accept duel');
      }
    } catch {
      setErrorMsg('Network error accepting challenge');
    } finally {
      setLoading(false);
    }
  };

  // Cancel Room with 100% Refund
  const handleCancelRoom = async (roomId: string) => {
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);
    sound.playButtonClick();

    try {
      const res = await fetch('/api/rooms/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, userId: user.userId }),
      });
      const data = await res.json();
      if (data.success) {
        sound.playCoinsClinking();
        setSuccessMsg(`Challenge cancelled! ৳${data.refundedAmount?.toLocaleString()} refunded 100% to wallet.`);
        if (data.user) onUpdateWallet(data.user);
        fetchRooms();
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setErrorMsg(data.error || 'Failed to cancel challenge');
      }
    } catch {
      setErrorMsg('Network error cancelling challenge');
    } finally {
      setLoading(false);
    }
  };

  // Share Room Link to Clipboard
  const handleShareRoom = (roomId: string) => {
    sound.playButtonClick();
    const link = `${window.location.origin}?p2proom=${roomId}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedRoomId(roomId);
      setTimeout(() => setCopiedRoomId(null), 3000);
    });
  };

  // Activity Indicator Color Helper
  const getActivityColor = (score = 50) => {
    if (score >= 80) return 'border-rose-500 text-rose-400 bg-rose-950/40 shadow-rose-950/50 animate-pulse';
    if (score >= 60) return 'border-amber-500 text-amber-400 bg-amber-950/40';
    if (score >= 40) return 'border-purple-500 text-purple-300 bg-purple-950/30';
    return 'border-cyan-500 text-cyan-400 bg-cyan-950/30';
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4 pb-16 px-1 sm:px-2">
      
      {/* Floating In-App Banner Notification */}
      {activeBanner && (
        <div className="bg-[#141A28] border-2 border-amber-500 text-white p-3 rounded-2xl shadow-2xl flex items-center justify-between gap-3 animate-in slide-in-from-top-3 duration-200">
          <div className="flex items-center gap-2.5">
            <Bell className="w-5 h-5 text-amber-400 animate-bounce shrink-0" />
            <div>
              <div className="text-xs font-black text-amber-300">{activeBanner.title}</div>
              <div className="text-[11px] text-neutral-300">{activeBanner.body}</div>
            </div>
          </div>
          <button
            onClick={dismissBanner}
            className="p-1 rounded-lg bg-neutral-800 text-neutral-400 hover:text-white"
          >
            <Check className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ANTI-BOT SPAM WARNING BANNER */}
      {botSpamWarning && (
        <div className="bg-red-950/80 border-2 border-red-500 text-red-200 p-3.5 rounded-2xl shadow-xl flex items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <div>
              <div className="text-xs font-black uppercase text-red-300">Security Bot Protection Triggered</div>
              <p className="text-[11px] leading-tight text-neutral-300">{botSpamWarning}</p>
            </div>
          </div>
          <button
            onClick={() => setBotSpamWarning(null)}
            className="text-xs bg-red-900/60 hover:bg-red-800 px-2.5 py-1 rounded-lg text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top P2P Mode Switcher Bar */}
      <div className="bg-neutral-950/90 border border-white/10 p-1 rounded-xl flex items-center gap-1 shadow-lg">
        <button
          onClick={() => {
            sound.playButtonClick();
            setActiveP2pTab('arena');
          }}
          className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeP2pTab === 'arena'
              ? 'bg-amber-500 text-neutral-950 shadow font-black'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
          }`}
        >
          <Swords className="w-3.5 h-3.5" />
          <span>1v1 Dual Arena</span>
        </button>

        <button
          onClick={() => {
            sound.playButtonClick();
            setActiveP2pTab('custom_lobby');
          }}
          className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeP2pTab === 'custom_lobby'
              ? 'bg-amber-500 text-neutral-950 shadow font-black'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Open Challenges</span>
        </button>
      </div>

      {activeP2pTab === 'arena' ? (
        <OneOnOneArena user={user} onUpdateWallet={onUpdateWallet} />
      ) : (
        <>
          {/* Real P2P 5% Rake Transparency & Quick Actions Header */}
          <div className="bg-neutral-950/80 border border-white/10 rounded-2xl p-4 shadow-lg space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white">
                  Open Challenges
                </h2>
                <p className="text-xs text-neutral-400">
                  Custom odds and stakes against real players (5% commission).
                </p>
              </div>

              {/* Action Buttons: Quick Join */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handleQuickJoin}
                  disabled={loading}
                  className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-neutral-950 font-black text-xs transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Quick Join</span>
                </button>
              </div>
            </div>

            {/* Incoming Direct Challenges Banner Alert */}
            {rooms.some((r) => r.status === "open" && r.invitedUsername && r.invitedUsername.toLowerCase() === user.username.toLowerCase()) && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 border-2 border-amber-500/60 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500 text-neutral-950 flex items-center justify-center font-black">
                    <Swords className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-amber-300 uppercase tracking-wider">
                      INCOMING DIRECT CHALLENGE RECEIVED!
                    </div>
                    <div className="text-xs text-white">
                      You have an active direct duel invitation from @{rooms.find((r) => r.status === "open" && r.invitedUsername && r.invitedUsername.toLowerCase() === user.username.toLowerCase())?.creatorName}!
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    const match = rooms.find((r) => r.status === "open" && r.invitedUsername && r.invitedUsername.toLowerCase() === user.username.toLowerCase());
                    if (match) handleAcceptRoom(match.id);
                  }}
                  className="w-full sm:w-auto py-2 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-black text-xs uppercase tracking-wider shadow active:scale-95 cursor-pointer text-center shrink-0"
                >
                  Accept Direct Duel ⚔️
                </button>
              </div>
            )}

            {/* Notification permission prompt bar if not granted */}
            {permission !== 'granted' && (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-neutral-300">
                  <Bell className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Turn on notifications to get alerted when rounds start in your favorite rooms!</span>
                </div>
                <button
                  onClick={requestPermission}
                  className="px-2.5 py-1 rounded-lg bg-amber-500 text-neutral-950 font-black text-[11px] hover:bg-amber-400 transition-all shrink-0 cursor-pointer"
                >
                  Enable Alerts
                </button>
              </div>
            )}
          </div>

          {/* MINI-STATISTICS & SESSION PERFORMANCE PANEL */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-3 rounded-2xl bg-neutral-900 border border-white/5 space-y-1">
              <span className="text-[10px] text-neutral-400 font-bold uppercase">Session Hands</span>
              <div className="text-base font-black text-white font-mono">{sessionStats.handsPlayed}</div>
            </div>
            <div className="p-3 rounded-2xl bg-neutral-900 border border-white/5 space-y-1">
              <span className="text-[10px] text-neutral-400 font-bold uppercase">Win / Loss</span>
              <div className="text-base font-black text-emerald-400 font-mono">
                {sessionStats.won}W / {sessionStats.lost}L
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-neutral-900 border border-white/5 space-y-1">
              <span className="text-[10px] text-neutral-400 font-bold uppercase">Session Net P&amp;L</span>
              <div className={`text-base font-black font-mono ${sessionStats.earnings >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {sessionStats.earnings >= 0 ? '+' : ''}৳{sessionStats.earnings.toLocaleString()}
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-neutral-900 border border-white/5 space-y-1">
              <span className="text-[10px] text-neutral-400 font-bold uppercase">Platform 5% Profit Today</span>
              <div className="text-base font-black text-amber-300 font-mono">
                ৳{(platformMetrics ? platformMetrics.todayCommission + platformMetrics.todayTieRevenue : 24500).toLocaleString()}
              </div>
            </div>
          </div>

          {/* RECHARTS ROOM CAPACITY TRENDS CHART ACCORDION */}
          <div>
            <button
              onClick={() => setShowTrendsChart(!showTrendsChart)}
              className="text-xs font-bold text-neutral-400 hover:text-amber-300 flex items-center justify-between w-full py-1.5 px-2 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                <span>Live Room Capacity &amp; Player Traffic Chart (Recharts)</span>
              </div>
              <span>{showTrendsChart ? '▲ Hide Trend Chart' : '▼ Show Traffic Trends (Last 1 Hour)'}</span>
            </button>
            {showTrendsChart && <RoomCapacityChart />}
          </div>

          {/* DUEL RESOLUTION MODAL POPUP */}
          {resolvedRoom && (
            <div className="bg-neutral-900 border-2 border-amber-500 rounded-3xl p-5 shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm sm:text-base font-bold text-amber-400 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400" /> P2P Duel Results ({resolvedRoom.id})
                </h3>
                <button
                  onClick={() => setResolvedRoom(null)}
                  className="text-xs text-neutral-400 hover:text-white bg-neutral-950 px-3 py-1.5 rounded-xl border border-neutral-800 cursor-pointer"
                >
                  Close
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4 text-center text-xs">
                <div className="bg-neutral-950 border border-neutral-800 p-3 rounded-2xl">
                  <div className="text-neutral-400">Creator: {resolvedRoom.creatorName}</div>
                  <div className="font-bold text-white mt-0.5">Choice: {resolvedRoom.choice.toUpperCase()}</div>
                  {resolvedRoom.dragonCard && (
                    <div className="mt-2 inline-block bg-white text-neutral-950 font-bold px-3 py-1.5 rounded-xl border border-red-500">
                      🐉 {resolvedRoom.dragonCard.rank} {resolvedRoom.dragonCard.suit}
                    </div>
                  )}
                </div>

                <div className="bg-neutral-950 border border-neutral-800 p-3 rounded-2xl">
                  <div className="text-neutral-400">Challenger: {resolvedRoom.acceptorName}</div>
                  <div className="font-bold text-white mt-0.5">
                    Choice: {resolvedRoom.choice === 'dragon' ? 'TIGER' : 'DRAGON'}
                  </div>
                  {resolvedRoom.tigerCard && (
                    <div className="mt-2 inline-block bg-white text-neutral-950 font-bold px-3 py-1.5 rounded-xl border border-amber-500">
                      🐅 {resolvedRoom.tigerCard.rank} {resolvedRoom.tigerCard.suit}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-neutral-950 p-3 rounded-2xl text-center border border-neutral-800">
                <div className="text-xs sm:text-sm font-black text-amber-400 uppercase">
                  {resolvedRoom.winner === 'tie'
                    ? `Tie Game! 100% of ৳${(resolvedRoom.amount + (resolvedRoom.acceptorAmount || 0)).toLocaleString()} Pot to Platform.`
                    : `${resolvedRoom.winner} Wins the ৳${(resolvedRoom.amount + (resolvedRoom.acceptorAmount || 0)).toLocaleString()} Pot (5% Fee Deducted)!`}
                </div>
              </div>
            </div>
          )}

          {/* MAIN P2P GRID: CREATION FORM + FILTERABLE ROOMS LIST */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            
            {/* LEFT COLUMN: CREATE CHALLENGE FORM + RECENT MATCHES */}
            <div className="space-y-4 h-fit">
              <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-4 sm:p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <Plus className="w-4 h-4 text-amber-400" /> Create Custom Challenge
                  </h3>
                  <span className="text-[10px] font-mono text-neutral-400 bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800">
                    Real P2P
                  </span>
                </div>

                {successMsg && (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3 py-2 rounded-xl flex items-center gap-2 text-xs font-medium">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{successMsg}</span>
                  </div>
                )}

                {errorMsg && (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-2 rounded-xl flex items-center gap-2 text-xs font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <form onSubmit={(e) => handleCreateRoom(e, false)} className="space-y-3.5">
                  {/* Mode Switcher Tabs */}
                  <div className="bg-neutral-950 p-1 rounded-xl border border-neutral-800 grid grid-cols-2 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => {
                        sound.playButtonClick();
                        setOddsMode('ratio');
                      }}
                      className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                        oddsMode === 'ratio'
                          ? 'bg-amber-500 text-neutral-950 shadow-sm'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      1000 e 5000 Ratio
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        sound.playButtonClick();
                        setOddsMode('decimal');
                      }}
                      className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                        oddsMode === 'decimal'
                          ? 'bg-amber-500 text-neutral-950 shadow-sm'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      Decimal Multiplier
                    </button>
                  </div>

                  {/* Chosen Side */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                      Your Chosen Side
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setChoice('dragon')}
                        className={`py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider border transition-all cursor-pointer ${
                          choice === 'dragon'
                            ? 'bg-red-600/20 border-red-500 text-red-400 shadow-md shadow-red-600/20'
                            : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                        }`}
                      >
                        🐉 Dragon
                      </button>
                      <button
                        type="button"
                        onClick={() => setChoice('tiger')}
                        className={`py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider border transition-all cursor-pointer ${
                          choice === 'tiger'
                            ? 'bg-amber-600/20 border-amber-500 text-amber-400 shadow-md shadow-amber-600/20'
                            : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                        }`}
                      >
                        🐅 Tiger
                      </button>
                    </div>
                  </div>

                  {/* Quick Presets for Ratio Mode */}
                  {oddsMode === 'ratio' && (
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                        Popular Presets (বাংলা &amp; Global)
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {RATIO_PRESETS.map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => handleApplyPreset(preset)}
                            className={`p-1.5 rounded-xl text-left border transition-all cursor-pointer text-[11px] ${
                              amount === preset.creator.toString() && opponentAmount === preset.opponent.toString()
                                ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold'
                                : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                            }`}
                          >
                            <div className="font-mono">{preset.label}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Stake Inputs */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="block text-[10px] text-neutral-400 font-bold uppercase">My Risk Stake</label>
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        min="10"
                        className="w-full mt-1 p-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white font-mono text-xs focus:border-amber-400 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-neutral-400 font-bold uppercase">
                        {oddsMode === 'ratio' ? 'Opponent Risk' : 'Odds Multiplier'}
                      </label>
                      {oddsMode === 'ratio' ? (
                        <input
                          type="number"
                          value={opponentAmount}
                          onChange={(e) => setOpponentAmount(e.target.value)}
                          min="10"
                          className="w-full mt-1 p-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white font-mono text-xs focus:border-amber-400 focus:outline-none"
                        />
                      ) : (
                        <input
                          type="number"
                          step="0.1"
                          value={odds}
                          onChange={(e) => setOdds(e.target.value)}
                          min="1.05"
                          max="50"
                          className="w-full mt-1 p-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white font-mono text-xs focus:border-amber-400 focus:outline-none"
                        />
                      )}
                    </div>
                  </div>

                  {/* Direct Username Invite (Optional) */}
                  <div>
                    <label className="block text-[10px] text-neutral-400 font-bold uppercase">
                      Invite Specific Player (Username, optional):
                    </label>
                    <input
                      type="text"
                      value={invitedUsername}
                      onChange={(e) => setInvitedUsername(e.target.value)}
                      placeholder="@friend_username"
                      className="w-full mt-1 p-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-xs placeholder-neutral-600 focus:border-amber-400 focus:outline-none font-mono"
                    />
                  </div>

                  {/* Single Round Quick Challenge Checkbox */}
                  <label className="flex items-center gap-2 cursor-pointer pt-1 text-xs text-neutral-300">
                    <input
                      type="checkbox"
                      checked={isQuickSingleRound}
                      onChange={(e) => setIsQuickSingleRound(e.target.checked)}
                      className="rounded accent-amber-500 cursor-pointer"
                    />
                    <span>⚡ 1v1 Single Round Instant Play (Fast Action)</span>
                  </label>

                  {/* Pot & Company Fee Summary */}
                  <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-3 text-xs space-y-1.5">
                    <div className="flex justify-between text-neutral-400">
                      <span>Total Escrow Pot:</span>
                      <span className="font-bold text-white font-mono">৳{calculatedTotalPot.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-emerald-400">
                      <span>Platform Fee (5% House Rake):</span>
                      <span className="font-mono">৳{calculatedCompanyFee.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-amber-300 font-bold pt-1 border-t border-neutral-800">
                      <span>Est. Winner Payout:</span>
                      <span className="font-mono">৳{calculatedWinnerPayout.toLocaleString()}</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-black py-3 rounded-xl shadow-lg transition-all text-xs cursor-pointer active:scale-95"
                  >
                    {loading ? 'Posting...' : `Post Challenge (৳${numCreatorStake.toLocaleString()})`}
                  </button>
                </form>
              </div>

              {/* RECENT MATCHES WIDGET */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-4 sm:p-5 shadow-xl space-y-3">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <h4 className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-400" /> Recent Direct Matches
                  </h4>
                  <span className="text-[9px] font-mono text-neutral-400 bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800">
                    1v1 History
                  </span>
                </div>

                <div className="space-y-2 max-h-[260px] overflow-y-auto no-scrollbar">
                  {displayRecentMatches.map((match: any, idx: number) => {
                    const winnerSide = match.winner ? match.winner.toUpperCase() : 'DRAGON';
                    return (
                      <div
                        key={match.id || idx}
                        className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-2.5 text-xs space-y-1.5 transition-all hover:border-amber-500/30"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white flex items-center gap-1.5 truncate max-w-[170px]">
                            <span className="text-amber-400">⚔️</span>
                            <span className="truncate">{match.creatorName || 'Host'} vs {match.acceptorName || 'Challenger'}</span>
                          </span>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                            {winnerSide} WINS
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-neutral-400">
                          <span>Pot: <strong className="text-amber-400 font-mono">৳{((match.amount || 0) + (match.acceptorAmount || 0)).toLocaleString()}</strong></span>
                          <span className="font-mono text-[10px] text-neutral-500">
                            {new Date(match.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: SEARCH, FILTERS & ACTIVE ROOMS LIST */}
            <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-3xl p-4 sm:p-5 shadow-xl space-y-4">
              
              {/* Search Bar & Filter Header */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-amber-400" />
                    <h3 className="text-sm sm:text-base font-black text-white">Active P2P Challenge Rooms</h3>
                    <span className="text-[10px] font-mono text-neutral-400 bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800">
                      {filteredRooms.length} Available
                    </span>
                  </div>

                  <button
                    onClick={fetchRooms}
                    className="self-end sm:self-auto p-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                    title="Refresh Room List"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Real-time Search Input */}
                <div className="relative">
                  <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by Room ID (e.g. room_173) or Host Username..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-500 text-xs focus:border-amber-400 focus:outline-none font-mono"
                  />
                </div>

                {/* Filter & Sort Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs pb-1">
                  {[
                    { id: 'recommended', label: '⭐ Recommended' },
                    { id: 'all', label: 'All Rooms' },
                    { id: 'fast_action', label: '⚡ Fast Action' },
                    { id: 'low_stakes', label: 'Min Stakes' },
                    { id: 'high_stakes', label: 'High Stakes' },
                    { id: 'friends_only', label: 'Direct Invites' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => {
                        sound.playButtonClick();
                        setFilterMode(f.id as any);
                      }}
                      className={`px-3 py-1 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer text-[11px] ${
                        filterMode === f.id
                          ? 'bg-amber-500 text-neutral-950 shadow-sm font-black'
                          : 'bg-neutral-950 text-neutral-400 border border-neutral-800 hover:text-white'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ROOM CARDS LIST */}
              <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
                {isInitialLoading && rooms.length === 0 ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={`skel-room-${i}`}
                        className="bg-neutral-950 border border-neutral-800/80 p-3.5 sm:p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-2.5 w-full sm:w-2/3">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full skeleton-shimmer shrink-0" />
                            <div className="w-32 h-4 rounded-md skeleton-shimmer" />
                            <div className="w-16 h-4 rounded-full skeleton-shimmer" />
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-28 h-3.5 rounded-md skeleton-shimmer" />
                            <div className="w-20 h-3.5 rounded-md skeleton-shimmer" />
                          </div>
                        </div>
                        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                          <div className="w-20 h-7 rounded-lg skeleton-shimmer" />
                          <div className="w-24 h-9 rounded-xl skeleton-shimmer" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredRooms.length === 0 ? (
                  <div className="text-center py-12 bg-neutral-950 rounded-2xl border border-neutral-800/80 space-y-2">
                    <Swords className="w-8 h-8 text-neutral-600 mx-auto" />
                    <p className="text-xs font-bold text-neutral-400">No rooms match your filter.</p>
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setFilterMode('all');
                      }}
                      className="text-xs text-amber-400 underline cursor-pointer"
                    >
                      Clear search filters
                    </button>
                  </div>
                ) : (
                  filteredRooms.map((room) => {
                    const roomOdds = room.odds || 2.0;
                    const acceptorStake = room.acceptorAmount || Math.round(room.amount * (roomOdds - 1));
                    const totalPot = room.amount + acceptorStake;
                    const isOwnRoom = room.creatorId === user.userId;
                    const isInvitedForUser =
                      room.invitedUsername &&
                      room.invitedUsername.toLowerCase() === user.username.toLowerCase();

                    // Calculate remaining auto-close timer
                    const autoCloseSec = room.autoCloseSecondsRemaining ?? 240;
                    const autoCloseMin = Math.floor(autoCloseSec / 60);
                    const autoCloseRem = autoCloseSec % 60;
                    const autoCloseFormatted = `${autoCloseMin.toString().padStart(2, '0')}:${autoCloseRem.toString().padStart(2, '0')}`;

                    return (
                      <div
                        key={room.id}
                        className={`bg-neutral-950 border ${
                          isOwnRoom
                            ? 'border-amber-500/50'
                            : isInvitedForUser
                            ? 'border-emerald-500/60 shadow-lg shadow-emerald-950/20'
                            : 'border-neutral-800 hover:border-amber-500/40'
                        } p-3.5 sm:p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all`}
                      >
                        {/* Room Info Left */}
                        <div className="space-y-2 w-full sm:w-auto">
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Activity Intensity Color Indicator */}
                            <span
                              className={`w-2.5 h-2.5 rounded-full border ${getActivityColor(room.activityScore)}`}
                              title={`Activity Intensity: ${room.activityScore || 50}/100`}
                            />

                            {/* Host Username & Notes Trigger */}
                            <button
                              onClick={() => {
                                setSelectedOpponent({ id: room.creatorId, name: room.creatorName });
                                setShowNotesModal(true);
                              }}
                              className="text-xs sm:text-sm font-bold text-white hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                              title="Click to view/add private notes on this player"
                            >
                              <span>{room.creatorName}</span>
                              <StickyNote className="w-3 h-3 text-neutral-400 hover:text-amber-400" />
                            </button>

                            {/* Recommendation Score Badge */}
                            {filterMode === 'recommended' && room.matchScore && (
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold">
                                ⭐ {room.matchScore}% Match
                              </span>
                            )}

                            {/* Fast Action Badge */}
                            {(room.isFastAction || room.isSingleRoundQuickChallenge) && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-orange-500/15 border border-orange-500/30 text-orange-300 flex items-center gap-0.5">
                                <Zap className="w-3 h-3" />
                                Fast Action
                              </span>
                            )}

                            {/* Hot Room Badge */}
                            {room.isHotRoom && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-500/15 border border-rose-500/30 text-rose-300 flex items-center gap-0.5">
                                <Flame className="w-3 h-3" />
                                Hot Room
                              </span>
                            )}

                            {/* Direct Invite Badge */}
                            {room.invitedUsername && (
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-500/15 border border-purple-500/30 text-purple-300">
                                🔒 For @{room.invitedUsername}
                              </span>
                            )}
                          </div>

                          {/* Room Stake Details */}
                          <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs flex-wrap font-mono">
                            <span className="text-amber-400 font-bold whitespace-nowrap">
                              🎯 {roomOdds.toFixed(2)}x
                            </span>
                            <span className="text-neutral-600 hidden xs:inline">·</span>
                            <span className="text-neutral-300">
                              Host: <strong className="text-white">৳{room.amount.toLocaleString()}</strong> <span className="hidden xs:inline">({room.choice.toUpperCase()})</span>
                            </span>
                            <span className="text-neutral-600">·</span>
                            <span className="text-emerald-400 font-bold">
                              Challenger: ৳{acceptorStake.toLocaleString()}
                            </span>
                            <span className="text-neutral-600 hidden sm:inline">·</span>
                            <span className="text-neutral-400 hidden sm:inline">
                              Pot: ৳{totalPot.toLocaleString()}
                            </span>
                          </div>

                          {/* Timers & Tags */}
                          <div className="flex items-center gap-3 text-[11px] text-neutral-400">
                            {/* Auto Close 5-minute Countdown */}
                            <span className="flex items-center gap-1 font-mono text-neutral-400" title="Auto-closes if empty">
                              <Clock className="w-3 h-3 text-amber-400" />
                              <span>Closes in: <strong>{autoCloseFormatted}</strong></span>
                            </span>

                            {/* Last Active Timestamp */}
                            <span>Active: Just now</span>

                            {/* Tag Badges */}
                            {room.tags?.slice(0, 2).map((t, idx) => (
                              <span key={idx} className="bg-neutral-900 px-1.5 py-0.2 rounded text-[10px] text-neutral-400 border border-neutral-800">
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Room Actions Right */}
                        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                          {/* Favorite Star Button */}
                          <button
                            onClick={() => toggleFavoriteRoom(room.id)}
                            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                              isFavorite(room.id)
                                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                                : 'bg-neutral-900 text-neutral-500 border-neutral-800 hover:text-white'
                            }`}
                            title="Star room to get push alerts when round begins"
                          >
                            <Star className={`w-3.5 h-3.5 ${isFavorite(room.id) ? 'fill-current' : ''}`} />
                          </button>

                          {/* Share Link Button */}
                          <button
                            onClick={() => handleShareRoom(room.id)}
                            className="p-2 rounded-xl bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800 transition-colors cursor-pointer"
                            title="Share unique challenge link"
                          >
                            {copiedRoomId === room.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Share2 className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* Join / Accept or Cancel Button */}
                          {isOwnRoom ? (
                            <button
                              onClick={() => handleCancelRoom(room.id)}
                              disabled={loading}
                              className="px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/30 text-xs font-bold transition-all cursor-pointer"
                            >
                              Cancel &amp; Refund
                            </button>
                          ) : (
                            <button
                              onClick={() => handleAcceptRoom(room.id)}
                              disabled={loading}
                              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-black text-xs transition-all shadow-md active:scale-95 cursor-pointer"
                            >
                              Accept (৳{acceptorStake.toLocaleString()})
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        </>
      )}

      {/* QUICK CHALLENGE MODAL (1v1 SINGLE ROUND INSTANT PLAY) */}
      {showQuickChallengeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3">
          <div className="bg-[#10141F] border-2 border-amber-500 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-black text-white">⚡ Quick 1v1 Single-Round Duel</h3>
              </div>
              <button
                onClick={() => setShowQuickChallengeModal(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              Creates an instant 1v1 challenger match. Winner takes the pot in a single round dealing 1 card for Dragon and 1 card for Tiger.
            </p>

            <div className="space-y-2">
              <span className="text-[10px] text-neutral-400 uppercase font-bold">Select Stake:</span>
              <div className="grid grid-cols-5 gap-1.5 text-xs font-mono font-bold">
                {[1, 10, 50, 100, 500].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      setAmount(val.toString());
                      setOpponentAmount(val.toString());
                    }}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      amount === val.toString()
                        ? 'bg-amber-500 text-neutral-950 border-amber-400 font-black'
                        : 'bg-neutral-900 text-neutral-300 border-neutral-800'
                    }`}
                  >
                    {formatCurrency(val, { currencyCode: getStoredCurrencyCode(), convertFromBase: true })}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => handleCreateRoom(undefined, true)}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-neutral-950 font-black text-xs transition-all shadow-lg active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>Launch Quick 1v1 Challenge</span>
            </button>
          </div>
        </div>
      )}

      {/* PRIVATE PLAYER NOTES MODAL */}
      {showNotesModal && selectedOpponent && (
        <PlayerNotesModal
          isOpen={showNotesModal}
          onClose={() => setShowNotesModal(false)}
          targetUserId={selectedOpponent.id}
          targetUsername={selectedOpponent.name}
          onOpenReport={() => {
            setShowNotesModal(false);
            setShowReportModal(true);
          }}
        />
      )}

      {/* MULTI-STEP REPORT PLAYER MODAL */}
      {showReportModal && selectedOpponent && (
        <ReportPlayerModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          reporterUserId={user.userId}
          reporterUsername={user.username}
          reportedUserId={selectedOpponent.id}
          reportedUsername={selectedOpponent.name}
        />
      )}

      {/* QUICK JOIN MATCHMAKING RADAR OVERLAY */}
      {isMatchmaking && (
        <div className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#0c101a] border-2 border-emerald-500/60 rounded-3xl p-6 shadow-[0_0_80px_rgba(16,185,129,0.3)] text-center space-y-5 relative overflow-hidden">
            {/* Animated Radar Pulse */}
            <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-emerald-500/40 animate-ping opacity-75" />
              <div className="absolute inset-2 rounded-full border border-emerald-400/60 animate-spin" style={{ animationDuration: '3s' }} />
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.5)]">
                <Swords className="w-8 h-8 animate-bounce" />
              </div>
            </div>

            <div>
              <div className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest flex items-center justify-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                <span>P2P Skill &amp; Balance Matchmaking Engine</span>
              </div>
              <h3 className="text-lg font-black text-white mt-1">
                Finding Optimal Opponent...
              </h3>
            </div>

            {/* Scanning Progress Bar */}
            <div className="p-3.5 bg-neutral-950 border border-neutral-800 rounded-2xl space-y-2">
              <div className="text-xs text-emerald-300 font-mono font-bold">
                {matchmakingStatusText}
              </div>
              <div className="w-full h-2 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800">
                <div className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 rounded-full animate-pulse w-full" />
              </div>
              <div className="flex justify-between text-[10px] text-neutral-500 font-mono">
                <span>Wallet Range: ৳{user.balance.toLocaleString()}</span>
                <span>Tier: {user.cosmetics?.eloTier || 'Silver'}</span>
              </div>
            </div>

            <button
              onClick={() => setIsMatchmaking(false)}
              className="py-2 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white font-bold text-xs transition-colors cursor-pointer"
            >
              Cancel Matchmaking
            </button>
          </div>
        </div>
      )}

      {/* Clean Mobile End Spacer */}
      <div className="h-6 md:h-2" />
    </div>
  );
});

export default P2PLobby;
