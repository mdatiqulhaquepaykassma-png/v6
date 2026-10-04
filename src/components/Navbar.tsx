import React, { useState, useRef, useEffect } from "react";
import {
  Shield,
  Wallet,
  Gamepad2,
  ChevronDown,
  Swords,
  Trophy,
  Smartphone,
  Plus,
  Volume2,
  VolumeX,
  History,
} from "lucide-react";
import { UserWallet } from "../types";
import { formatCurrency, CURRENCIES, getStoredCurrencyCode } from "../utils/currency";
import { motion, AnimatePresence } from "framer-motion";
import { BrandLogo } from "./BrandLogo";

interface NavbarProps {
  user: UserWallet;
  activeTab: "game" | "p2p" | "leaderboard";
  setActiveTab: (tab: "game" | "p2p" | "leaderboard") => void;
  selectedTable: "express" | "classic" | "vip";
  onSelectTable: (table: "express" | "classic" | "vip") => void;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  voiceEnabled?: boolean;
  onToggleVoice?: () => void;
  onOpenWallet: () => void;
  onOpenMenu: () => void;
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
  selectedTable,
  onSelectTable,
  soundEnabled = true,
  onToggleSound,
  onOpenWallet,
  onOpenBetHistory,
  onOpenMenu,
  onOpenInstallApp,
  isStandalone = false,
  selectedCurrency,
  lang = "bn",
  telemetryPlayerCount = 1,
  tablePlayerCounts,
}) => {
  const [tableDropdownOpen, setTableDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeCurrencyCode = selectedCurrency || getStoredCurrencyCode();
  const activeCurrencyConfig = CURRENCIES[activeCurrencyCode] || CURRENCIES.INR;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setTableDropdownOpen(false);
      }
    };
    if (tableDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [tableDropdownOpen]);

  // Real active counts calculation per table
  const realTableCounts = {
    express: tablePlayerCounts?.express ?? (selectedTable === "express" ? Math.max(1, telemetryPlayerCount) : 0),
    classic: tablePlayerCounts?.classic ?? (selectedTable === "classic" ? Math.max(1, telemetryPlayerCount) : 0),
    vip: tablePlayerCounts?.vip ?? (selectedTable === "vip" ? Math.max(1, telemetryPlayerCount) : 0),
  };

  const tableOptions: Array<{
    id: "express" | "classic" | "vip";
    name: string;
    icon: string;
    speed: string;
    minBetFormatted: string;
    maxBetFormatted: string;
    realActiveCount: number;
  }> = [
    {
      id: "express",
      name: "Express",
      icon: "⚡",
      speed: "10s",
      minBetFormatted: formatCurrency(1 / activeCurrencyConfig.rateFromBase, { currencyCode: activeCurrencyCode, convertFromBase: true }),
      maxBetFormatted: formatCurrency(1000, { currencyCode: activeCurrencyCode, convertFromBase: true }),
      realActiveCount: realTableCounts.express,
    },
    {
      id: "classic",
      name: "Classic",
      icon: "🎯",
      speed: "15s",
      minBetFormatted: formatCurrency(1 / activeCurrencyConfig.rateFromBase, { currencyCode: activeCurrencyCode, convertFromBase: true }),
      maxBetFormatted: formatCurrency(10000, { currencyCode: activeCurrencyCode, convertFromBase: true }),
      realActiveCount: realTableCounts.classic,
    },
    {
      id: "vip",
      name: "VIP",
      icon: "👑",
      speed: "20s",
      minBetFormatted: formatCurrency(1 / activeCurrencyConfig.rateFromBase, { currencyCode: activeCurrencyCode, convertFromBase: true }),
      maxBetFormatted: formatCurrency(100000, { currencyCode: activeCurrencyCode, convertFromBase: true }),
      realActiveCount: realTableCounts.vip,
    },
  ];

  const currentTable = tableOptions.find((t) => t.id === selectedTable) || tableOptions[0];
  const currentBalance = user.balanceType === "real" ? user.balance : user.demoBalance;

  return (
    <header className="bg-neutral-950/95 backdrop-blur-2xl border-b border-white/10 sticky top-0 z-50 px-2 sm:px-4 lg:px-6 py-1.5 sm:py-2 shadow-2xl w-full select-none m-0">
      <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-1.5 sm:gap-3">
        
        {/* Zone 1: Brand & Table Selector */}
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

          {/* Table Switcher Dropdown */}
          <div ref={dropdownRef} className="relative ml-1 sm:ml-2">
            <button
              onClick={() => setTableDropdownOpen(!tableDropdownOpen)}
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[9px] sm:text-[10px] font-bold text-amber-300 transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <span>{currentTable.icon}</span>
              <span className="uppercase tracking-wider font-mono">{currentTable.name}</span>
              <ChevronDown className={`w-3 h-3 text-neutral-400 transition-transform ${tableDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {tableDropdownOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 w-60 sm:w-64 bg-neutral-900/95 backdrop-blur-2xl border border-amber-500/30 rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.9)] py-2 z-50 overflow-hidden"
                >
                  <div className="px-3 py-1 border-b border-white/5 text-[9px] font-mono font-bold text-neutral-400 uppercase">
                    Select Table Arena
                  </div>
                  {tableOptions.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        onSelectTable(t.id);
                        setTableDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-between ${
                        selectedTable === t.id 
                          ? "bg-amber-500/15 text-amber-300 border-l-2 border-amber-400" 
                          : "text-neutral-400 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{t.icon}</span>
                        <div>
                          <div className="font-mono text-white text-[11px]">{t.name}</div>
                          <div className="text-[8px] text-neutral-400 lowercase font-mono">
                            {t.minBetFormatted} - {t.maxBetFormatted}
                          </div>
                        </div>
                      </div>
                      <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30">
                        {t.speed}
                      </span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Zone 2: Navigation Tabs (Desktop & Tablet) */}
        <nav className="hidden md:flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-white/10 shadow-inner">
          <button
            onClick={() => setActiveTab('game')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
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
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'p2p' 
                ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-neutral-950 shadow-md font-black" 
                : "text-neutral-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Swords className="w-3.5 h-3.5" />
            <span>1v1 Dual</span>
          </button>

          {/* INSTALL APP BUTTON (In the middle between DUAL and ELITE) */}
          {onOpenInstallApp && !isStandalone && (
            <button
              onClick={onOpenInstallApp}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/40 shadow-sm active:scale-95"
              title={lang === "bn" ? "অ্যাপ ইনস্টল ও ওপেন গাইড" : "Install Mobile App"}
            >
              <Smartphone className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>{lang === "bn" ? "ইনস্টল" : "Install"}</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'leaderboard' 
                ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-neutral-950 shadow-md font-black" 
                : "text-neutral-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Elite</span>
          </button>
        </nav>

        {/* Zone 3: Wallet, Sound & Menu Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          
          {/* Sound Toggle Button (Hidden on Mobile, available in Menu) */}
          {onToggleSound && (
            <button
              onClick={onToggleSound}
              className="hidden sm:flex w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 items-center justify-center text-neutral-300 hover:text-amber-300 transition-all active:scale-90 cursor-pointer"
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
              className="hidden md:flex items-center gap-1 bg-gradient-to-r from-neutral-900 to-amber-950/60 hover:from-neutral-800 hover:to-amber-900/80 border border-amber-500/40 hover:border-amber-400 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer text-amber-300 text-xs font-bold"
              title={lang === "bn" ? "বেটিং হিস্ট্রি দেখুন" : "Bet History"}
            >
              <History className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[9.5px] font-black uppercase tracking-wider font-mono">
                {lang === "bn" ? "হিস্ট্রি" : "History"}
              </span>
            </button>
          )}

          {/* Wallet / Balance Indicator & Quick Deposit (Hidden on Mobile, available in Mobile Bottom Nav) */}
          <button
            onClick={onOpenWallet}
            className="hidden sm:flex items-center gap-1 sm:gap-2 bg-gradient-to-r from-neutral-900 to-neutral-950 border border-amber-500/30 hover:border-amber-400 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl transition-all shadow-inner active:scale-95 group cursor-pointer"
          >
            <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <Wallet className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            </div>
            <div className="flex flex-col items-start leading-none">
              <span className="text-[7px] font-bold text-neutral-400 uppercase tracking-wider hidden xs:inline">
                {user.balanceType === "real" ? "REAL" : "DEMO"}
              </span>
              <span className="text-[10px] sm:text-[11px] font-black text-amber-300 font-mono tracking-tight">
                {formatCurrency(currentBalance, {
                  currencyCode: activeCurrencyCode,
                  convertFromBase: true,
                })}
              </span>
            </div>
            <div className="w-4 h-4 rounded bg-amber-400 text-neutral-950 flex items-center justify-center shadow ml-0.5">
              <Plus className="w-3 h-3 stroke-[3]" />
            </div>
          </button>

          {/* Menu Button */}
          <div className="flex items-center gap-1">
            <button
              onClick={onOpenMenu}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white transition-all active:scale-90 cursor-pointer"
              title="Menu"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-[2.2]">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
});

export default Navbar;
