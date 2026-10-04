import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Swords,
  X,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  User,
  Zap,
} from "lucide-react";
import { UserWallet, P2PRoom } from "../types";
import { sound } from "../utils/audio";

interface JoinByMatchIdModalProps {
  isOpen: boolean;
  onClose: () => void;
  rooms: P2PRoom[];
  currentUser: UserWallet;
  onAcceptRoom: (roomId: string) => void;
}

export const JoinByMatchIdModal: React.FC<JoinByMatchIdModalProps> = ({
  isOpen,
  onClose,
  rooms,
  currentUser,
  onAcceptRoom,
}) => {
  const [matchIdQuery, setMatchIdQuery] = useState<string>("");
  const [matchedRoom, setMatchedRoom] = useState<P2PRoom | null>(null);
  const [searched, setSearched] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  if (!isOpen) return null;

  const handleSearchMatch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg("");
    setMatchedRoom(null);
    setSearched(true);

    const cleanQuery = matchIdQuery.trim().replace(/^#/, "").toLowerCase();
    if (!cleanQuery) {
      setErrorMsg("Please enter a valid Match Room ID.");
      return;
    }

    // Search open rooms for exact or partial ID match
    const found = rooms.find(
      (r) =>
        r.status === "open" &&
        (r.id.toLowerCase() === cleanQuery ||
          r.id.toLowerCase().includes(cleanQuery) ||
          `match-${r.id.toLowerCase()}`.includes(cleanQuery))
    );

    if (found) {
      sound.playButtonClick();
      setMatchedRoom(found);
    } else {
      setErrorMsg(`No active open match found for ID #${matchIdQuery.trim()}. Check the ID and try again.`);
    }
  };

  const handleConfirmJoin = () => {
    if (!matchedRoom) return;
    sound.playButtonClick();
    onAcceptRoom(matchedRoom.id);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/85 backdrop-blur-md -z-10"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          className="w-full max-w-md bg-[#0e131f] border-2 border-amber-500/50 rounded-3xl p-5 sm:p-6 shadow-[0_25px_60px_rgba(0,0,0,0.9)] text-white space-y-4 relative overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-500/20 to-emerald-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
                <Search className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">
                  Join via Shared Match Room ID
                </h3>
                <p className="text-[10px] text-neutral-400">
                  Enter shared temporary match ID to enter duel
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearchMatch} className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                Paste / Enter Match Room ID:
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 font-mono text-xs">
                  #
                </span>
                <input
                  type="text"
                  value={matchIdQuery}
                  onChange={(e) => {
                    setMatchIdQuery(e.target.value);
                    setSearched(false);
                    setErrorMsg("");
                  }}
                  placeholder="e.g. room_17278028912 or MATCH-8921-DT"
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-400 rounded-xl pl-8 pr-20 py-2.5 text-white font-mono text-xs outline-none"
                />
                <button
                  type="submit"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs transition-colors cursor-pointer"
                >
                  Find
                </button>
              </div>
            </div>
          </form>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 bg-red-500/15 border border-red-500/30 text-red-300 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Matched Challenge Confirmation Popup */}
          {matchedRoom && (
            <div className="bg-neutral-950 border-2 border-amber-500/60 rounded-2xl p-4 space-y-3 font-mono text-xs">
              <div className="text-[10px] font-bold text-amber-400 uppercase tracking-widest text-center pb-2 border-b border-white/10">
                MATCH FOUND — CONFIRMATION POPUP
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-white/10">
                <span className="text-neutral-400 font-sans">Challenger:</span>
                <span className="font-bold text-amber-300">@{matchedRoom.creatorName}</span>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-white/10">
                <span className="text-neutral-400 font-sans">Challenger Choice:</span>
                <span className="font-bold text-white uppercase">{matchedRoom.choice}</span>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-white/10">
                <span className="text-neutral-400 font-sans">Your Required Risk Stake:</span>
                <span className="font-bold text-emerald-400">
                  ৳{(matchedRoom.acceptorAmount || matchedRoom.amount).toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between items-center pt-1 text-sm font-bold">
                <span className="text-neutral-300 font-sans">Est. Winner Payout:</span>
                <span className="text-amber-300">
                  ৳{Math.round((matchedRoom.amount + (matchedRoom.acceptorAmount || matchedRoom.amount)) * 0.95).toLocaleString()}
                </span>
              </div>

              <div className="pt-2 flex gap-2 font-sans">
                <button
                  type="button"
                  onClick={() => setMatchedRoom(null)}
                  className="flex-1 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Decline
                </button>

                <button
                  type="button"
                  onClick={handleConfirmJoin}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-neutral-950 font-black text-xs uppercase tracking-wider shadow-lg transition-transform active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Swords className="w-4 h-4" />
                  <span>Accept Duel ⚔️</span>
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
