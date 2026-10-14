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
  stakeAmount?: number;
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

const P2PRoomCardComponent: React.FC<P2PRoomCardProps> = ({
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
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
            }`}
          >
            <Zap className="w-2.5 h-2.5" />
            {room.latencyMs || 20}ms
          </span>

          {/* Player / Spectator Count Badge */}
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-800/80 border border-neutral-700/60 text-neutral-300 flex items-center gap-1">
            <Users className="w-2.5 h-2.5 text-neutral-400" />
            {room.playerCount ?? (room.status === 'open' ? 1 : 2)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
              room.choice === 'dragon'
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
            }`}
          >
            Host: {room.choice}
          </span>
          <span className="text-xs text-neutral-400">
            Stake:{' '}
            <strong className="text-white">
              {currencySymbol}
              {(room.stakeAmount ?? room.amount).toLocaleString()}
            </strong>
          </span>
          <span className="text-xs text-neutral-400">
            Odds: <strong className="text-amber-400">{roomOdds}x</strong>
          </span>
        </div>
      </div>

      {/* Room Info Right / Action */}
      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
        {/* Favorite Toggle Button */}
        <button
          onClick={() => onToggleFavorite(room.id)}
          className={`p-2 rounded-xl border transition-colors cursor-pointer ${
            isFavorite
              ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
              : 'bg-neutral-900 text-neutral-400 hover:text-white border-neutral-800'
          }`}
          title={isFavorite ? 'Remove from favorites' : 'Add to favorite hosts'}
        >
          <Star className={`w-3.5 h-3.5 ${isFavorite ? 'fill-current' : ''}`} />
        </button>

        {/* Share Duel Button */}
        <button
          onClick={() => onShare(room.id)}
          className="p-2 rounded-xl bg-neutral-900 text-neutral-400 hover:text-white border-neutral-800 transition-colors cursor-pointer"
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
};

/**
 * Custom equality check for React.memo to ensure Room Card only re-renders
 * when specific properties like playerCount, stakeAmount / amount, status, or interactive states change.
 */
export const areRoomCardPropsEqual = (prev: P2PRoomCardProps, next: P2PRoomCardProps): boolean => {
  // 1. Primary check: specific properties playerCount or stakeAmount / amount changes
  const prevStake = prev.room.stakeAmount ?? prev.room.amount;
  const nextStake = next.room.stakeAmount ?? next.room.amount;
  if (prevStake !== nextStake) return false;
  if (prev.room.playerCount !== next.room.playerCount) return false;

  // 2. Secondary check: Room status, pot, odds, countdown & interactive states
  return (
    prev.room.id === next.room.id &&
    prev.room.status === next.room.status &&
    prev.room.amount === next.room.amount &&
    prev.room.acceptorAmount === next.room.acceptorAmount &&
    prev.room.odds === next.room.odds &&
    prev.room.choice === next.room.choice &&
    prev.room.creatorId === next.room.creatorId &&
    prev.room.creatorName === next.room.creatorName &&
    prev.room.creatorTitle === next.room.creatorTitle &&
    prev.room.invitedUsername === next.room.invitedUsername &&
    prev.room.activityScore === next.room.activityScore &&
    prev.room.autoCloseSecondsRemaining === next.room.autoCloseSecondsRemaining &&
    prev.room.matchScore === next.room.matchScore &&
    prev.room.latencyMs === next.room.latencyMs &&
    prev.room.spectatorCount === next.room.spectatorCount &&
    prev.isOwnRoom === next.isOwnRoom &&
    prev.isInvitedForUser === next.isInvitedForUser &&
    prev.isFavorite === next.isFavorite &&
    prev.isCopied === next.isCopied &&
    prev.loading === next.loading &&
    prev.currencySymbol === next.currencySymbol
  );
};

export const P2PRoomCard = React.memo<P2PRoomCardProps>(
  P2PRoomCardComponent,
  areRoomCardPropsEqual
);

P2PRoomCard.displayName = 'P2PRoomCard';
