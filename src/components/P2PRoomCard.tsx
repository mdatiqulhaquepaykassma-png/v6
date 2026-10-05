import React from 'react';
import {
  Users,
  StickyNote,
  Zap,
  Flame,
  Clock,
  Star,
  Share2,
  Check,
} from 'lucide-react';
import { P2PRoom } from '../types';

export interface EnrichedP2PRoom extends P2PRoom {
  matchScore?: number;
  latencyMs?: number;
  playerCount?: number;
}

export interface P2PRoomCardProps {
  room: EnrichedP2PRoom;
  isOwnRoom: boolean;
  isInvitedForUser: boolean;
  isFavorite: boolean;
  isCopied: boolean;
  loading: boolean;
  currencySymbol: string;
  onAccept: (roomId: string) => void;
  onCancel: (roomId: string) => void;
  onToggleFavorite: (roomId: string) => void;
  onShare: (roomId: string) => void;
  onSelectNotes: (opponent: { id: string; name: string }) => void;
  getActivityColor: (score?: number) => string;
}

export const P2PRoomCard = React.memo<P2PRoomCardProps>(
  ({
    room,
    isOwnRoom,
    isInvitedForUser,
    isFavorite,
    isCopied,
    loading,
    currencySymbol,
    onAccept,
    onCancel,
    onToggleFavorite,
    onShare,
    onSelectNotes,
    getActivityColor,
  }) => {
    const roomOdds = room.odds || 2.0;
    const acceptorStake = room.acceptorAmount || Math.round(room.amount * (roomOdds - 1));
    const totalPot = room.amount + acceptorStake;

    const autoCloseSec = room.autoCloseSecondsRemaining ?? 240;
    const autoCloseMin = Math.floor(autoCloseSec / 60);
    const autoCloseRem = autoCloseSec % 60;
    const autoCloseFormatted = `${autoCloseMin.toString().padStart(2, '0')}:${autoCloseRem.toString().padStart(2, '0')}`;

    return (
      <div
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
              onClick={() => onSelectNotes({ id: room.creatorId, name: room.creatorName })}
              className="text-xs sm:text-sm font-bold text-white hover:text-amber-300 flex items-center gap-1 cursor-pointer"
              title="Click to view/add private notes on this player"
            >
              <span>{room.creatorName}</span>
              <StickyNote className="w-3 h-3 text-neutral-400 hover:text-amber-400" />
            </button>

            {/* Recommendation Score Badge */}
            {room.matchScore !== undefined && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold">
                ⭐ {room.matchScore}% Match
              </span>
            )}

            {/* Latency (Ping) Badge */}
            <span
              className={`text-[10px] font-mono px-1.5 py-0.2 rounded border flex items-center gap-0.5 font-bold ${
                (room.latencyMs || 20) <= 25
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                  : (room.latencyMs || 20) <= 45
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                  : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
              }`}
              title="Real-time room network latency"
            >
              <Zap className="w-2.5 h-2.5" />
              <span>{room.latencyMs || 20}ms</span>
            </span>

            {/* Player / Spectator Count Badge */}
            <span
              className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 flex items-center gap-1 font-bold"
              title="Total players and spectators in this duel room"
            >
              <Users className="w-2.5 h-2.5" />
              <span>{room.playerCount || 1} Online</span>
            </span>

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
              Host: <strong className="text-white">{currencySymbol}{room.amount.toLocaleString()}</strong> <span className="hidden xs:inline">({room.choice.toUpperCase()})</span>
            </span>
            <span className="text-neutral-600">·</span>
            <span className="text-emerald-400 font-bold">
              Challenger: {currencySymbol}{acceptorStake.toLocaleString()}
            </span>
            <span className="text-neutral-600 hidden sm:inline">·</span>
            <span className="text-neutral-400 hidden sm:inline">
              Pot: {currencySymbol}{totalPot.toLocaleString()}
            </span>
          </div>

          {/* Timers & Tags */}
          <div className="flex items-center gap-3 text-[11px] text-neutral-400">
            {/* Auto Close Countdown */}
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
            onClick={() => onToggleFavorite(room.id)}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              isFavorite
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                : 'bg-neutral-900 text-neutral-500 border-neutral-800 hover:text-white'
            }`}
            title="Star room to get push alerts when round begins"
          >
            <Star className={`w-3.5 h-3.5 ${isFavorite ? 'fill-current' : ''}`} />
          </button>

          {/* Share Link Button */}
          <button
            onClick={() => onShare(room.id)}
            className="p-2 rounded-xl bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800 transition-colors cursor-pointer"
            title="Share unique challenge link"
          >
            {isCopied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Share2 className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Join / Accept or Cancel Button */}
          {isOwnRoom ? (
            <button
              onClick={() => onCancel(room.id)}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/30 text-xs font-bold transition-all cursor-pointer"
            >
              Cancel &amp; Refund
            </button>
          ) : (
            <button
              onClick={() => onAccept(room.id)}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-black text-xs transition-all shadow-md active:scale-95 cursor-pointer"
            >
              Accept ({currencySymbol}{acceptorStake.toLocaleString()})
            </button>
          )}
        </div>
      </div>
    );
  },
  (prev, next) => {
    return (
      prev.room.id === next.room.id &&
      prev.room.status === next.room.status &&
      prev.room.amount === next.room.amount &&
      prev.room.acceptorAmount === next.room.acceptorAmount &&
      prev.room.odds === next.room.odds &&
      prev.room.choice === next.room.choice &&
      prev.room.activityScore === next.room.activityScore &&
      prev.room.autoCloseSecondsRemaining === next.room.autoCloseSecondsRemaining &&
      prev.room.matchScore === next.room.matchScore &&
      prev.room.latencyMs === next.room.latencyMs &&
      prev.room.playerCount === next.room.playerCount &&
      prev.isOwnRoom === next.isOwnRoom &&
      prev.isInvitedForUser === next.isInvitedForUser &&
      prev.isFavorite === next.isFavorite &&
      prev.isCopied === next.isCopied &&
      prev.loading === next.loading &&
      prev.currencySymbol === next.currencySymbol
    );
  }
);
