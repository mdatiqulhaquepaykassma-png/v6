import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Swords,
  User,
  Shield,
  X,
  Sparkles,
  Zap,
  CheckCircle2,
  Copy,
  Check,
  AlertCircle,
  Clock,
  Coins,
  ArrowRight,
} from "lucide-react";
import { UserWallet, P2PRoom } from "../types";
import { sound } from "../utils/audio";

interface DirectChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserWallet;
  onChallengeCreated: (room: P2PRoom) => void;
  onUpdateWallet: (updatedUser: UserWallet) => void;
}

// Mock active online players for quick selection
const ONLINE_PLAYERS = [
  { username: "TigerMaster", winRate: "68%", level: "VIP Diamond", hands: 126 },
  { username: "Challenger99", winRate: "54%", level: "Silver", hands: 48 },
  { username: "DragonKing", winRate: "72%", level: "Master", hands: 210 },
  { username: "GoldRoller", winRate: "61%", level: "Gold", hands: 95 },
  { username: "ApexLegend", winRate: "80%", level: "Master", hands: 340 },
  { username: "ProBettor99", winRate: "58%", level: "Platinum", hands: 82 },
];

export const DirectChallengeModal: React.FC<DirectChallengeModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onChallengeCreated,
  onUpdateWallet,
}) => {
  const [targetUsername, setTargetUsername] = useState<string>("TigerMaster");
  const [stakeAmount, setStakeAmount] = useState<number>(500);
  const [choice, setChoice] = useState<"dragon" | "tiger">("dragon");
  const [isSingleRound, setIsSingleRound] = useState<boolean>(true);

  // Modal Step: 'form' -> 'confirm' -> 'success'
  const [step, setStep] = useState<"form" | "confirm" | "success">("form");
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [createdRoom, setCreatedRoom] = useState<P2PRoom | null>(null);
  const [copiedMatchId, setCopiedMatchId] = useState<boolean>(false);

  // Generate temporary shared match ID preview
  const tempMatchId = createdRoom
    ? createdRoom.id
    : `MATCH-${Math.floor(1000 + Math.random() * 9000)}-DT`;

  const opponentStake = stakeAmount;
  const totalPot = stakeAmount + opponentStake;
  const houseFee = Math.round(totalPot * 0.05); // 5% house rake
  const winnerPayout = totalPot - houseFee;

  const handleReviewChallenge = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!targetUsername.trim()) {
      setErrorMsg("Please select or enter an online player's username.");
      return;
    }

    if (targetUsername.trim().toLowerCase() === currentUser.username.toLowerCase()) {
      setErrorMsg("You cannot send a challenge invitation to yourself.");
      return;
    }

    if (currentUser.balance < stakeAmount) {
      setErrorMsg(`Insufficient balance. You need ৳${stakeAmount.toLocaleString()} chips.`);
      return;
    }

    sound.playButtonClick();
    setStep("confirm");
  };

  const handleConfirmAndSend = async () => {
    setErrorMsg("");
    setLoading(true);
    sound.playButtonClick();

    try {
      const res = await fetch("/api/rooms/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.userId,
          username: currentUser.username,
          amount: stakeAmount,
          acceptorAmount: opponentStake,
          odds: 2.0,
          choice,
          invitedUsername: targetUsername.trim().replace(/^@/, ""),
          isSingleRoundQuickChallenge: isSingleRound,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        sound.playCoinsClinking();
        setCreatedRoom(data.room);
        onUpdateWallet(data.user);
        onChallengeCreated(data.room);
        setStep("success");
      } else {
        setErrorMsg(data.error || "Failed to create direct challenge.");
        setStep("form");
      }
    } catch {
      setErrorMsg("Network error connecting to P2P server.");
      setStep("form");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyMatchId = () => {
    if (!createdRoom) return;
    sound.playButtonClick();
    const shareText = `⚔️ APEX Casino 1v1 Challenge! Match ID: #${createdRoom.id} vs @${createdRoom.invitedUsername || targetUsername}. Play at ${window.location.origin}`;
    navigator.clipboard.writeText(shareText);
    setCopiedMatchId(true);
    setTimeout(() => setCopiedMatchId(false), 2500);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 overflow-y-auto select-none">
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
            transition={{ duration: 0.2 }}
            className="w-full max-w-lg bg-[#0e131f] border-2 border-amber-500/50 rounded-3xl p-5 sm:p-6 shadow-[0_25px_60px_rgba(0,0,0,0.9)] text-white space-y-4 relative overflow-hidden"
          >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Swords className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                  <Sparkles className="w-3 h-3 animate-pulse" />
                  <span>Direct Player Challenge</span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-white">
                  Send Betting Invitation
                </h3>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* STEP 1: FORM INPUT */}
          {step === "form" && (
            <form onSubmit={handleReviewChallenge} className="space-y-4">
              {/* Target Online Player Selector */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                  Select or Search Online Player:
                </label>

                {/* Quick Select Online Players Chips */}
                <div className="grid grid-cols-3 gap-1.5 mb-2">
                  {ONLINE_PLAYERS.map((p) => (
                    <button
                      key={p.username}
                      type="button"
                      onClick={() => {
                        sound.playButtonClick();
                        setTargetUsername(p.username);
                      }}
                      className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                        targetUsername.toLowerCase() === p.username.toLowerCase()
                          ? "bg-amber-500/20 border-amber-400 text-amber-300 font-bold"
                          : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white"
                      }`}
                    >
                      <div className="text-xs font-mono font-bold truncate">@{p.username}</div>
                      <div className="text-[9px] text-neutral-500 flex justify-between">
                        <span>Win: {p.winRate}</span>
                        <span>{p.level}</span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Custom Username Input */}
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 font-mono text-xs">
                    @
                  </span>
                  <input
                    type="text"
                    value={targetUsername}
                    onChange={(e) => setTargetUsername(e.target.value)}
                    placeholder="Enter player username"
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-400 rounded-xl pl-8 pr-3 py-2 text-white font-mono text-xs outline-none"
                  />
                </div>
              </div>

              {/* Stake Amount Preset Buttons */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                  Challenge Stake Amount:
                </label>
                <div className="grid grid-cols-5 gap-1.5 mb-2">
                  {[100, 250, 500, 1000, 2500].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        sound.playButtonClick();
                        setStakeAmount(amt);
                      }}
                      className={`py-2 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
                        stakeAmount === amt
                          ? "bg-amber-500 text-neutral-950 border-amber-400 font-black shadow"
                          : "bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700"
                      }`}
                    >
                      ৳{amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chosen Side (Dragon or Tiger) */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                  Your Chosen Side:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setChoice("dragon")}
                    className={`py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider border transition-all cursor-pointer ${
                      choice === "dragon"
                        ? "bg-red-600/25 border-red-500 text-red-300 shadow-md shadow-red-600/20"
                        : "bg-neutral-950 border-neutral-800 text-neutral-400"
                    }`}
                  >
                    🐉 Dragon (1.9x)
                  </button>
                  <button
                    type="button"
                    onClick={() => setChoice("tiger")}
                    className={`py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider border transition-all cursor-pointer ${
                      choice === "tiger"
                        ? "bg-amber-600/25 border-amber-500 text-amber-300 shadow-md shadow-amber-600/20"
                        : "bg-neutral-950 border-neutral-800 text-neutral-400"
                    }`}
                  >
                    🐅 Tiger (1.9x)
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {errorMsg && (
                <div className="p-3 bg-red-500/15 border border-red-500/30 text-red-300 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Actions */}
              <button
                type="submit"
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-black text-xs uppercase tracking-wider shadow-lg transition-transform active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Review Challenge &amp; Temporary Match ID</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* STEP 2: CONFIRMATION POPUP */}
          {step === "confirm" && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-center">
                <div className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">
                  CONFIRMATION REQUIRED
                </div>
                <div className="text-xs text-neutral-300 mt-0.5">
                  Verify match parameters before sending invitation to player
                </div>
              </div>

              {/* Challenge Breakdown Card */}
              <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 space-y-3 font-mono text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-white/10">
                  <span className="text-neutral-400 font-sans">Target Opponent:</span>
                  <span className="font-bold text-amber-300">@{targetUsername}</span>
                </div>

                <div className="flex justify-between items-center pb-2 border-b border-white/10">
                  <span className="text-neutral-400 font-sans">Shared Temporary Match ID:</span>
                  <span className="font-bold text-white bg-neutral-900 px-2 py-0.5 rounded border border-neutral-700">
                    #{tempMatchId}
                  </span>
                </div>

                <div className="flex justify-between items-center pb-2 border-b border-white/10">
                  <span className="text-neutral-400 font-sans">Your Side &amp; Risk Stake:</span>
                  <span className="font-bold text-emerald-400">
                    {choice.toUpperCase()} · ৳{stakeAmount.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between items-center pb-2 border-b border-white/10">
                  <span className="text-neutral-400 font-sans">Opponent Required Stake:</span>
                  <span className="font-bold text-amber-400">৳{opponentStake.toLocaleString()}</span>
                </div>

                <div className="flex justify-between items-center pt-1 text-sm font-bold">
                  <span className="text-neutral-300 font-sans">Est. Winner Payout (5% House Rake):</span>
                  <span className="text-amber-300">৳{winnerPayout.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep("form")}
                  className="flex-1 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  Edit Parameters
                </button>

                <button
                  type="button"
                  onClick={handleConfirmAndSend}
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-black text-xs uppercase tracking-wider shadow-lg transition-transform active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Swords className="w-4 h-4" />
                  <span>{loading ? "Issuing..." : "Confirm & Send ⚔️"}</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: SUCCESS & SHARED MATCH ROOM ID LINK */}
          {step === "success" && createdRoom && (
            <div className="space-y-4 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 mx-auto animate-bounce">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h4 className="text-lg font-black text-white">Direct Challenge Sent!</h4>
                <p className="text-xs text-neutral-400 mt-1">
                  Invitation issued to <strong className="text-amber-300">@{targetUsername}</strong>. Share the temporary match ID below!
                </p>
              </div>

              {/* Shared Temporary Match Room ID Box */}
              <div className="p-4 bg-neutral-950 border-2 border-amber-500/40 rounded-2xl space-y-2">
                <div className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">
                  SHARED TEMPORARY MATCH ROOM ID
                </div>

                <div className="flex items-center justify-center gap-2 font-mono text-lg font-black text-white bg-black/60 p-2.5 rounded-xl border border-white/10 select-all">
                  <span>#{createdRoom.id}</span>
                </div>

                <button
                  onClick={handleCopyMatchId}
                  className="w-full py-2.5 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  {copiedMatchId ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400 font-black">Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-amber-400" />
                      <span>Copy Match ID &amp; Share Link</span>
                    </>
                  )}
                </button>
              </div>

              <button
                onClick={onClose}
                className="w-full py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Return to P2P Arena
              </button>
            </div>
          )}
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
};
