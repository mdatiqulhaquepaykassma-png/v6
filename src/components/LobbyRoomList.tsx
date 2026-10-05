import React from 'react';
import { Virtuoso } from 'react-virtuoso';
import { Swords } from 'lucide-react';
import { UserWallet } from '../types';
import { P2PRoomCard, EnrichedP2PRoom } from './P2PRoomCard';

export interface LobbyRoomListProps {
  rooms: EnrichedP2PRoom[];
  user: UserWallet | null;
  loading: boolean;
  copiedRoomId: string | null;
  currencySymbol: string;
  onAccept: (roomId: string) => void;
  onCancel: (roomId: string) => void;
  onToggleFavorite: (roomId: string) => void;
  isFavorite: (roomId: string) => boolean;
  onShare: (roomId: string) => void;
  onSelectNotes: (opponent: { id: string; name: string }) => void;
  getActivityColor: (score?: number) => string;
  onClearFilters?: () => void;
}

export const LobbyRoomList = React.memo<LobbyRoomListProps>(
  ({
    rooms,
    user,
    loading,
    copiedRoomId,
    currencySymbol,
    onAccept,
    onCancel,
    onToggleFavorite,
    isFavorite,
    onShare,
    onSelectNotes,
    getActivityColor,
    onClearFilters,
  }) => {
    if (rooms.length === 0) {
      return (
        <div className="text-center py-12 bg-neutral-950 rounded-2xl border border-neutral-800/80 space-y-2">
          <Swords className="w-8 h-8 text-neutral-600 mx-auto" />
          <p className="text-xs font-bold text-neutral-400">No rooms match your filter.</p>
          {onClearFilters && (
            <button
              onClick={onClearFilters}
              className="text-xs text-amber-400 underline cursor-pointer"
            >
              Clear search filters
            </button>
          )}
        </div>
      );
    }

    // Direct mapping for small lists (<= 6 items) for zero-overhead rendering
    if (rooms.length <= 6) {
      return (
        <div className="space-y-2.5">
          {rooms.map((room) => {
            const isOwnRoom = user ? room.creatorId === user.userId : false;
            const isInvitedForUser =
              !!user &&
              !!room.invitedUsername &&
              room.invitedUsername.toLowerCase() === user.username.toLowerCase();
            const isFav = isFavorite(room.id);
            const isCopied = copiedRoomId === room.id;

            return (
              <P2PRoomCard
                key={room.id}
                room={room}
                isOwnRoom={isOwnRoom}
                isInvitedForUser={isInvitedForUser}
                isFavorite={isFav}
                isCopied={isCopied}
                loading={loading}
                currencySymbol={currencySymbol}
                onAccept={onAccept}
                onCancel={onCancel}
                onToggleFavorite={onToggleFavorite}
                onShare={onShare}
                onSelectNotes={onSelectNotes}
                getActivityColor={getActivityColor}
              />
            );
          })}
        </div>
      );
    }

    // High-performance Virtualized Windowing list via react-virtuoso for larger datasets
    return (
      <Virtuoso
        useWindowScroll
        data={rooms}
        computeItemKey={(_index, room) => room.id}
        defaultItemHeight={82}
        overscan={{ main: 600, reverse: 600 }}
        style={{ width: '100%' }}
        itemContent={(_index, room) => {
          const isOwnRoom = user ? room.creatorId === user.userId : false;
          const isInvitedForUser =
            !!user &&
            !!room.invitedUsername &&
            room.invitedUsername.toLowerCase() === user.username.toLowerCase();
          const isFav = isFavorite(room.id);
          const isCopied = copiedRoomId === room.id;

          return (
            <div
              className="pb-2.5"
              style={{
                contain: 'layout style paint',
                contentVisibility: 'auto',
                containIntrinsicSize: '0 82px',
              }}
            >
              <P2PRoomCard
                key={room.id}
                room={room}
                isOwnRoom={isOwnRoom}
                isInvitedForUser={isInvitedForUser}
                isFavorite={isFav}
                isCopied={isCopied}
                loading={loading}
                currencySymbol={currencySymbol}
                onAccept={onAccept}
                onCancel={onCancel}
                onToggleFavorite={onToggleFavorite}
                onShare={onShare}
                onSelectNotes={onSelectNotes}
                getActivityColor={getActivityColor}
              />
            </div>
          );
        }}
      />
    );
  }
);
