import React from "react";
import {
  Gamepad2,
  Swords,
  Trophy,
  Smartphone,
  Volume2,
  VolumeX,
  History,
  Wallet,
  Plus,
  Activity,
} from "lucide-react";
import { UserWallet } from "../types";
import { BrandLogo } from "./BrandLogo";
import { AnimatedRollingBalance } from "./AnimatedRollingBalance";
import { CURRENCIES } from "../utils/currency";

interface NavbarProps {
  user: UserWallet | null;
  activeTab: "game" | "p2p" | "leaderboard";
  setActiveTab: (tab: "game" | "p2p" | "leaderboard") => void;
  selectedTable: "express" | "classic" | "vip";
  onSelectTable?: (table: "express" | "classic" | "vip") => void;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  voiceEnabled?: boolean;
  onToggleVoice?: () => void;
  onOpenWallet: () => void;
  onOpenMenu: () => void;
  onOpenLogin?: () => void;
  onOpenRegister?: () => void;
  onOpenInstallApp?: () => void;
  isStandalone?: boolean;
  isInstalled?: boolean;
  onOpenOnlineUsers?: () => void;
  onOpenQuickDeposit?: () => void;
  onOpenProfile?: () => void;
  onOpenProvablyFair?: () => void;
  onOpenRoadmap?: () => void;
  onOpenAdmin?: () => void;
  onOpenMerchant?: () => void;
  onOpenSiteLiquidity?: () => void;
  onOpenBetHistory?: () => void;
  onOpenRules?: () => void;
  onOpenTransparency?: () => void;
  onOpenPublicUsers?: () => void;
  onOpenReferral?: () => void;
  onOpenCurrencySelector?: () => void;
  selectedCurrency?: string;
  onLogout?: () => void;
  onToggleBalanceType?: () => void;
  lang?: "bn" | "en";
  onToggleLang?: () => void;
  telemetryPlayerCount?: number;
  tablePlayerCounts?: {
    express: number;
    classic: number;
    vip: number;
  };
}

export const Navbar = React.memo<NavbarProps>(({
  user,
  activeTab,
  setActiveTab,
  soundEnabled = true,
  onToggleSound,
  onOpenWallet,
  onOpenBetHistory,
  onOpenMenu,
  onOpenLogin,
  onOpenRegister,
  onOpenInstallApp,
  isStandalone = false,
  selectedCurrency,
  lang = "bn",
}) => {
  const currencyCfg = (selectedCurrency && CURRENCIES[selectedCurrency]) || CURRENCIES.BDT || {
    symbol: "৳",
    symbolPosition: "prefix" as const,
    decimals: 2,
  };

  return (
    <header className="bg-neutral-950/95 backdrop-blur-2xl border-b border-amber-500/20 sticky top-0 z-50 px-2 sm:px-4 lg:px-6 h-12 sm:h-14 flex items-center shadow-[0_4px_25px_rgba(0,0,0,0.85)] w-full select-none m-0">
      <div className="max-w-[1600px] w-full mx-auto flex items-center justify-between gap-1.5 sm:gap-3">
        
        {/* Zone 1: Brand Logo & Title */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <div 
            onClick={() => setActiveTab("game")}
            className="flex items-center gap-1.5 sm:gap-2 group cursor-pointer"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl overflow-hidden border border-amber-400/60 shadow-[0_0_15px_rgba(245,158,11,0.5)] transition-transform group-hover:scale-105 shrink-0 bg-black flex items-center justify-center">
              <BrandLogo priority alt="APEX Dragon Tiger" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-xs sm:text-sm font-black tracking-[0.15em] text-white">SANCTUM</span>
              <span className="text-[7px] sm:text-[7.5px] font-bold text-amber-400 uppercase tracking-widest mt-0.5">DRAGON TIGER</span>
            </div>
          </div>
        </div>

        {/* Zone 2: Navigation Tabs (Tablet & Desktop) */}
        <nav className="hidden md:flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-white/10 shadow-inner">
          <button
            onClick={() => setActiveTab('game')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'game' 
                ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-neutral-950 shadow-md font-black" 
                : "text-neutral-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            <span>Arena</span>
          </button>

          <button
            onClick={() => setActiveTab('p2p')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'p2p' 
                ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-neutral-950 shadow-md font-black" 
                : "text-neutral-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Swords className="w-3.5 h-3.5" />
            <span>1v1 Duel</span>
          </button>

          {/* INSTALL APP BUTTON (In the middle between DUAL and ELITE) */}
          {onOpenInstallApp && !isStandalone && (
            <button
              onClick={onOpenInstallApp}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/40 shadow-sm active:scale-95"
              title={lang === "bn" ? "অ্যাপ ইনস্টল ও ওপেন গাইড" : "Install Mobile App"}
            >
              <Smartphone className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>{lang === "bn" ? "ইনস্টল" : "Install"}</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'leaderboard' 
                ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-neutral-950 shadow-md font-black" 
                : "text-neutral-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Elite</span>
          </button>
        </nav>

        {/* Zone 3: Controls, Wallet & Menu Button with Build Number */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">

          {/* Sound Toggle Button (Hidden on Mobile, available in Menu) */}
          {onToggleSound && (
            <button
              onClick={onToggleSound}
              className="hidden md:flex w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 items-center justify-center text-neutral-300 hover:text-amber-300 transition-all active:scale-90 cursor-pointer"
              title={soundEnabled ? "Mute Game Sound" : "Enable Game Sound"}
            >
              {soundEnabled ? (
                <Volume2 className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 text-neutral-500" />
              )}
            </button>
          )}

          {/* Bet History Quick Access Button (Hidden on Mobile, available in Side Menu) */}
          {onOpenBetHistory && (
            <button
              onClick={onOpenBetHistory}
              className="hidden lg:flex items-center gap-1 bg-gradient-to-r from-neutral-900 to-amber-950/60 hover:from-neutral-800 hover:to-amber-900/80 border border-amber-500/40 hover:border-amber-400 px-2 sm:px-2.5 py-1 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer text-amber-300 text-xs font-bold"
              title={lang === "bn" ? "বেটিং হিস্ট্রি দেখুন" : "Bet History"}
            >
              <History className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[9.5px] font-black uppercase tracking-wider font-mono">
                {lang === "bn" ? "হিস্ট্রি" : "History"}
              </span>
            </button>
          )}

          {/* User Wallet Balance Display with Fluid Number-Scrolling Animation */}
          {user && (
            <div className="flex items-center gap-1 sm:gap-1.5">
              <button
                type="button"
                onClick={onOpenWallet}
                className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 md:px-3 py-1 sm:py-1.5 rounded-xl bg-gradient-to-r from-neutral-900 via-neutral-900/90 to-amber-950/40 hover:from-neutral-800 hover:to-amber-900/60 border border-amber-500/40 hover:border-amber-400 transition-all shadow-md shadow-black/60 cursor-pointer active:scale-95 shrink-0 group"
                title={lang === "bn" ? "ওয়ালেট ও ব্যালেন্স (ক্লিক করে ডিপোজিট/উইথড্র করুন)" : "Wallet & Balance (Click to Deposit/Withdraw)"}
                aria-label="User Wallet & Balance"
              >
                {/* Balance Mode Indicator Badge */}
                <span
                  className={`text-[8px] sm:text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md leading-none tracking-wider ${
                    user.balanceType === "real"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.2)]"
                      : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                  }`}
                >
                  {user.balanceType === "real" ? "REAL" : "DEMO"}
                </span>

                {/* Subtle Number-Scrolling Animation */}
                <div className="flex items-center text-xs sm:text-sm font-black text-amber-300 group-hover:text-amber-200 transition-colors">
                  <AnimatedRollingBalance
                    value={user.balanceType === "real" ? user.balance : user.demoBalance}
                    currencySymbol={currencyCfg.symbol}
                    symbolPosition={currencyCfg.symbolPosition}
                    decimals={currencyCfg.decimals === 0 ? 0 : 2}
                  />
                </div>

                {/* Plus / Quick Deposit Icon */}
                <div className="w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-lg bg-amber-500/20 group-hover:bg-amber-500/30 text-amber-300 border border-amber-400/40 flex items-center justify-center text-[10px] font-black transition-transform group-hover:scale-110 ml-0.5 shrink-0">
                  <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-[3]" />
                </div>
              </button>
            </div>
          )}

          {/* Login / Register for Guests */}
          {!user && (
            <div className="flex items-center gap-1 sm:gap-1.5">
              <button
                type="button"
                onClick={onOpenLogin}
                className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-neutral-950 font-black text-xs transition-all shadow-md shadow-amber-950/40 cursor-pointer active:scale-95 shrink-0"
              >
                {lang === "bn" ? "লগইন" : "Login"}
              </button>
              <button
                type="button"
                onClick={onOpenRegister || onOpenLogin}
                className="hidden sm:inline-flex px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs border border-white/15 hover:border-amber-400/50 transition-all cursor-pointer active:scale-95 shadow-sm shrink-0"
              >
                {lang === "bn" ? "রেজিস্টার" : "Sign Up"}
              </button>
            </div>
          )}

          {/* Menu Button */}
          <button
            type="button"
            onClick={onOpenMenu}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 border border-white/15 hover:border-amber-400/60 flex items-center justify-center text-white transition-all active:scale-95 cursor-pointer shrink-0 shadow-sm group"
            title="Menu"
            aria-label="Menu"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-current fill-none stroke-[2.2] text-neutral-300 group-hover:text-amber-400 transition-colors">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
});

export default Navbar;
