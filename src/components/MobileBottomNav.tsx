import React from "react";
import { Swords, Trophy, Wallet, Gamepad2, Smartphone, History } from "lucide-react";
import { UserWallet } from "../types";
import { sound } from "../utils/audio";
import { formatCurrency, getStoredCurrencyCode } from "../utils/currency";

interface MobileBottomNavProps {
  activeTab: "game" | "p2p" | "leaderboard";
  setActiveTab: (tab: "game" | "p2p" | "leaderboard") => void;
  onOpenWallet: () => void;
  onOpenBetHistory?: () => void;
  onOpenInstallApp?: () => void;
  isStandalone?: boolean;
  isInstalled?: boolean;
  user: UserWallet | null;
  openRoomsCount?: number;
  selectedCurrency?: string;
  onOpenLogin?: () => void;
}

export const MobileBottomNav = React.memo<MobileBottomNavProps>(({
  activeTab,
  setActiveTab,
  onOpenWallet,
  onOpenBetHistory,
  onOpenInstallApp,
  isStandalone = false,
  user,
  openRoomsCount = 0,
  selectedCurrency,
  onOpenLogin,
}) => {
  const activeCurrencyCode = selectedCurrency || getStoredCurrencyCode();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-neutral-950/95 backdrop-blur-2xl border-t border-white/10 px-2 pt-1.5 pb-2.5 flex items-center justify-around safe-area-pb shadow-[0_-8px_32px_rgba(0,0,0,0.8)]">
      {/* 1. Game Table (Arena) */}
      <button
        type="button"
        onClick={() => {
          sound.playButtonClick();
          setActiveTab("game");
        }}
        className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
          activeTab === "game"
            ? "text-amber-400 font-black"
            : "text-neutral-500 hover:text-neutral-300"
        }`}
      >
        <Gamepad2 className={`w-5 h-5 ${activeTab === "game" ? "stroke-[2.5] text-amber-400" : "stroke-[1.75]"}`} />
        <span className="text-[9px] uppercase tracking-wider font-bold">Arena</span>
      </button>

      {/* 2. P2P Lobby (Dual) */}
      <button
        type="button"
        onClick={() => {
          sound.playButtonClick();
          setActiveTab("p2p");
        }}
        className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer relative ${
          activeTab === "p2p"
            ? "text-amber-400 font-black"
            : "text-neutral-500 hover:text-neutral-300"
        }`}
      >
        <div className="relative">
          <Swords className={`w-5 h-5 ${activeTab === "p2p" ? "stroke-[2.5] text-amber-400" : "stroke-[1.75]"}`} />
          {openRoomsCount > 0 && (
            <span className="absolute -top-1 -right-2 w-3.5 h-3.5 bg-violet-500 text-white rounded-full text-[8px] flex items-center justify-center font-bold animate-pulse">
              {openRoomsCount}
            </span>
          )}
        </div>
        <span className="text-[9px] uppercase tracking-wider font-bold">Duel</span>
      </button>

      {/* 3. Install App (In the middle between DUAL and ELITE) */}
      {onOpenInstallApp && !isStandalone && (
        <button
          type="button"
          onClick={() => {
            sound.playButtonClick();
            onOpenInstallApp();
          }}
          className="flex-1 flex flex-col items-center justify-center gap-1 text-amber-300 hover:text-amber-200 transition-all cursor-pointer active:scale-95 group"
        >
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.3)] group-hover:scale-105 transition-transform">
            <Smartphone className="w-4 h-4 animate-pulse stroke-[2.2]" />
          </div>
          <span className="text-[8.5px] font-black uppercase tracking-wider text-amber-300">
            Install
          </span>
        </button>
      )}

      {/* 4. Leaderboard (Elite) */}
      <button
        type="button"
        onClick={() => {
          sound.playButtonClick();
          setActiveTab("leaderboard");
        }}
        className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
          activeTab === "leaderboard"
            ? "text-amber-400 font-black"
            : "text-neutral-500 hover:text-neutral-300"
        }`}
      >
        <Trophy className={`w-5 h-5 ${activeTab === "leaderboard" ? "stroke-[2.5] text-amber-400" : "stroke-[1.75]"}`} />
        <span className="text-[9px] uppercase tracking-wider font-bold">Elite</span>
      </button>

      {/* 5. Wallet */}
      <button
        type="button"
        onClick={() => {
          sound.playButtonClick();
          onOpenWallet();
        }}
        className="flex-1 flex flex-col items-center justify-center gap-1 text-neutral-400 hover:text-white transition-all cursor-pointer active:scale-95"
      >
        <div className="w-7 h-7 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
          <Wallet className="w-3.5 h-3.5" />
        </div>
        <span className="text-[8.5px] font-mono font-black text-white tabular-nums">
          {user
            ? formatCurrency(user.balanceType === "real" ? user.balance : user.demoBalance, {
                currencyCode: activeCurrencyCode,
                convertFromBase: true,
                compact: true,
              })
            : "Wallet"}
        </span>
      </button>
    </nav>
  );
});

export default MobileBottomNav;
