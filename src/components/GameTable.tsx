import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Sparkles,
  RotateCcw,
  Zap,
  Flame,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Radio,
  ShieldCheck,
  TrendingUp,
  Users,
  CheckCircle2,
  BookOpen,
  Scale,
  Award,
  User,
  Check,
  Plus,
  Minus,
  RefreshCw,
  X,
  AlertCircle,
  HelpCircle,
  SlidersHorizontal,
  Swords,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Gift,
  History,
  Settings as SettingsIcon,
  Info,
  Maximize2,
  Minimize2,
  Star,
  Play,
  Crown,
  Lightbulb,
} from "lucide-react";
import { UserWallet, TableRound, RoadmapItem, LiveBetRecord } from "../types";
import { motion, AnimatePresence } from "framer-motion";
import { PlayingCard as PlayingCardComponent } from "./PlayingCard";
import { DealerAvatar } from "./DealerAvatar";
import { useSoundManager } from "../utils/useSoundManager";
import { useTableParallax } from "../utils/useTableParallax";
import { sound } from "../utils/audio";
import { haptics } from "../utils/haptics";
import { useActiveCurrency, formatCurrency } from "../utils/currency";
import { usePerformanceMode } from "../utils/performance";
import { useAdaptiveAsset } from "../utils/performanceAssetDelivery";
import { LiveChat } from "./LiveChat";
import { LiveBetFeed } from "./LiveBetFeed";
import { LiveAction } from "./LiveAction";
import { LiveBetTransparencyModal } from "./LiveBetTransparencyModal";
import { WinningSideConfetti } from "./WinningSideConfetti";
import { useRenderTracker, perfMonitor } from "../utils/perfDebugMonitor";
import virtualCasinoBg from "../assets/images/virtual_dragon_tiger_bg.webp";
import confetti from "canvas-confetti";

export const triggerBigWinConfetti = (isMassiveWin: boolean = false) => {
  // Center blast of luxury gold and vibrant casino confetti
  confetti({
    particleCount: isMassiveWin ? 140 : 80,
    spread: 80,
    origin: { y: 0.6 },
    colors: ["#F59E0B", "#FBBF24", "#10B981", "#EF4444", "#8B5CF6", "#FFFFFF", "#38BDF8"],
    zIndex: 9999,
  });

  // Left & Right Cannons for dramatic Big Win cascade
  setTimeout(() => {
    confetti({
      particleCount: isMassiveWin ? 80 : 50,
      angle: 60,
      spread: 60,
      origin: { x: 0.1, y: 0.7 },
      colors: ["#F59E0B", "#10B981", "#FDE047", "#FFFFFF"],
      zIndex: 9999,
    });
    confetti({
      particleCount: isMassiveWin ? 80 : 50,
      angle: 120,
      spread: 60,
      origin: { x: 0.9, y: 0.7 },
      colors: ["#F59E0B", "#EF4444", "#FDE047", "#FFFFFF"],
      zIndex: 9999,
    });
  }, 200);

  if (isMassiveWin) {
    setTimeout(() => {
      confetti({
        particleCount: 100,
        spread: 120,
        origin: { y: 0.45 },
        colors: ["#F59E0B", "#FBBF24", "#FFFFFF"],
        shapes: ["circle", "square"],
        zIndex: 9999,
      });
    }, 450);
  }
};

/**
 * Isolated Real-Time Server-Synchronized Clock.
 * Encapsulated in its own component to prevent churn / re-rendering of parent GameTable.
 */
const LiveSyncClock = React.memo(() => {
  const [timeStr, setTimeStr] = useState<string>("");
  const serverOffsetRef = useRef<number>(0);

  useEffect(() => {
    let isMounted = true;
    fetch("/api/time")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data.serverTime === "number" && isMounted) {
          serverOffsetRef.current = data.serverTime - Date.now();
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let intervalId: any;
    const update = () => {
      const now = new Date(Date.now() + serverOffsetRef.current);
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      const ss = String(now.getSeconds()).padStart(2, "0");
      const ms = String(Math.floor(now.getMilliseconds() / 100));
      setTimeStr(`${hh}:${mm}:${ss}.${ms}`);
    };
    update();
    intervalId = setInterval(update, 100);
    return () => clearInterval(intervalId);
  }, []);

  if (!timeStr) return null;

  return (
    <span className="text-[8px] sm:text-[9px] font-mono font-black text-amber-200 bg-amber-950/80 border border-amber-500/40 px-1.5 py-0.5 rounded flex items-center shadow-sm">
      <span className="tabular-nums">{timeStr}</span>
    </span>
  );
});

interface GameTableProps {
  user: UserWallet | null;
  selectedTableSlug: "express" | "classic" | "vip";
  onUpdateWallet: (updatedUser: UserWallet) => void;
  onOpenProvablyFair: () => void;
  onOpenRoadmap: () => void;
  onOpenBetHistory?: () => void;
  onOpenRules?: () => void;
  onOpenProfile?: () => void;
  onToggleBalanceType?: () => void;
  onNavigateToP2P?: () => void;
  onRequireLogin?: () => void;
  onSelectTable?: (table: "express" | "classic" | "vip") => void;
  lang?: "bn" | "en";
  latency?: number;
  onMeasurePing?: () => Promise<number>;
}

export const GameTable = React.memo<GameTableProps>(({
  user,
  selectedTableSlug,
  onUpdateWallet,
  onOpenProvablyFair,
  onOpenRoadmap,
  onOpenBetHistory,
  onOpenRules,
  onOpenProfile,
  onToggleBalanceType,
  onNavigateToP2P,
  onRequireLogin,
  onSelectTable,
  lang = "bn",
  latency = 24,
  onMeasurePing,
}) => {
  const [tableSelectorOpen, setTableSelectorOpen] = useState<boolean>(false);
  const [localLatency, setLocalLatency] = useState<number>(latency);
  const [isPingDropdownOpen, setIsPingDropdownOpen] = useState<boolean>(false);
  const [isTestingPing, setIsTestingPing] = useState<boolean>(false);
  const pingDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalLatency(latency);
  }, [latency]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pingDropdownRef.current && !pingDropdownRef.current.contains(e.target as Node)) {
        setIsPingDropdownOpen(false);
      }
    };
    if (isPingDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isPingDropdownOpen]);

  const handleTestPing = async () => {
    if (isTestingPing) return;
    setIsTestingPing(true);
    try {
      if (onMeasurePing) {
        const ms = await onMeasurePing();
        setLocalLatency(ms);
      } else {
        const start = performance.now();
        const res = await fetch("/api/time", { cache: "no-store" });
        if (res.ok) {
          const end = performance.now();
          setLocalLatency(Math.max(1, Math.round(end - start)));
        }
      }
    } catch {}
    finally {
      setIsTestingPing(false);
    }
  };
  useRenderTracker("GameTable");
  const soundManager = useSoundManager();
  const perf = usePerformanceMode();
  const { url: casinoBgUrl } = useAdaptiveAsset("casinoBg");

  // Table Limits & Chip Configuration per Table
  const tableConfigs: Record<
    "express" | "classic" | "vip",
    {
      minBet: number;
      maxBet: number;
      chips: number[];
      quickAddIncrements: number[];
      step: number;
      speedLabel: string;
      name: string;
    }
  > = {
    express: {
      minBet: 1,
      maxBet: 1000,
      chips: [1, 5, 10, 25, 50, 100, 250, 500],
      quickAddIncrements: [1, 5, 10, 50, 100],
      step: 1,
      speedLabel: "15s Speed",
      name: "Express Speed Arena",
    },
    classic: {
      minBet: 1,
      maxBet: 10000,
      chips: [1, 10, 25, 50, 100, 250, 500, 1000, 2500],
      quickAddIncrements: [1, 10, 50, 100, 500, 1000],
      step: 10,
      speedLabel: "30s Standard",
      name: "Classic High Table",
    },
    vip: {
      minBet: 1,
      maxBet: 100000,
      chips: [1, 100, 250, 500, 1000, 2500, 5000, 10000, 25000],
      quickAddIncrements: [1, 100, 500, 1000, 5000, 10000],
      step: 100,
      speedLabel: "30s VIP",
      name: "VIP Diamond Lounge",
    },
  };

  const activeCurrency = useActiveCurrency();
  const baseLimits = tableConfigs[selectedTableSlug] || tableConfigs.express;
  
  // Dynamically calculate limits so the minimum bet is exactly 1 BDT / 1 INR / 1 USD depending on active rate!
  const activeLimits = useMemo(() => ({
    ...baseLimits,
    minBet: 1 / activeCurrency.rateFromBase,
    chips: [
      1 / activeCurrency.rateFromBase,
      5 / activeCurrency.rateFromBase,
      10 / activeCurrency.rateFromBase,
      50 / activeCurrency.rateFromBase,
      100 / activeCurrency.rateFromBase,
      500 / activeCurrency.rateFromBase,
      1000 / activeCurrency.rateFromBase,
      5000 / activeCurrency.rateFromBase,
    ].filter(c => c >= 1 / activeCurrency.rateFromBase)
  }), [baseLimits, activeCurrency.rateFromBase]);

  const formatAmt = React.useCallback((amt: number | null | undefined, compact = false) =>
    formatCurrency(amt, { currencyCode: activeCurrency.code, convertFromBase: true, compact }),
    [activeCurrency.code]
  );

  // Streamlined Betting state (Side -> Amount -> Place)
  const [selectedSide, setSelectedSide] = useState<string | null>(null);
  const [selectedAmount, setSelectedAmount] = useState<number>(activeLimits.minBet);
  const [customAmountInput, setCustomAmountInput] = useState<string>("");
  const [showCustomInput, setShowCustomInput] = useState<boolean>(false);

  // Staged side bets for legacy chip-stack clicks
  const [dragonBet, setDragonBet] = useState<number>(0);
  const [tigerBet, setTigerBet] = useState<number>(0);
  const [lastPlacedBet, setLastPlacedBet] = useState<{ side: string; amount: number } | null>(null);

  // Modal and Toolbar states matching Petros04 / Iconic21 screenshots
  const [showLimitsDropdown, setShowLimitsDropdown] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [showSmartHintModal, setShowSmartHintModal] = useState<boolean>(false);
  const [settingsTab, setSettingsTab] = useState<"settings" | "mute">("settings");
  const [historyTab, setHistoryTab] = useState<"myBets" | "history" | "mute">("myBets");
  const [liveFeedTab, setLiveFeedTab] = useState<"live" | "history">("live");
  const [showLiveTransparencyModal, setShowLiveTransparencyModal] = useState<boolean>(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(true);
  const [volumeLevel, setVolumeLevel] = useState<number>(85);
  const [showWinnerList, setShowWinnerList] = useState<boolean>(true);
  const [showOtherReactions, setShowOtherReactions] = useState<boolean>(true);
  const [showRoadmapPanel, setShowRoadmapPanel] = useState<boolean>(typeof window !== "undefined" ? window.innerWidth >= 1024 : false);
  const [isListeningVoice, setIsListeningVoice] = useState<boolean>(false);
  const [voiceTranscript, setVoiceTranscript] = useState<string>("");
  const [voiceFeedback, setVoiceFeedback] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const recognitionRef = useRef<any>(null);

  // In-App Toast notification banner (replaces blocking window.alert)
  const [tableToast, setTableToast] = useState<string | null>(null);
  const showTableToast = (msg: string) => {
    setTableToast(msg);
    setTimeout(() => {
      setTableToast((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  // ResizeObserver state & ref for responsive card element auto-scaling
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const [cardScale, setCardScale] = useState<number>(1);
  const roadmapScrollRef = useRef<HTMLDivElement>(null);

  // Physical 3D Casino Table Parallax Engine (CSS transform variables)
  const { tableRef } = useTableParallax();

  // Pro Auto Bet Engine 2.0 State
  type AutoBetStrategy = "FLAT" | "MARTINGALE" | "ANTI_MARTINGALE" | "ALTERNATE";

  const [autoBetConfig, setAutoBetConfig] = useState<{
    isActive: boolean;
    strategy: AutoBetStrategy;
    side: "DRAGON" | "TIGER";
    baseAmount: number;
    currentStake: number;
    totalRounds: number; // 5, 10, 20, 50, 100, 9999
    roundsRemaining: number;
    roundsCompleted: number;
    totalWagered: number;
    totalProfitLoss: number;
    winsCount: number;
    lossesCount: number;
    stopOnWin: boolean;
    stopOnLoss: boolean;
    stopProfitTarget: number; // 0 = off, else target profit amount
    stopLossLimit: number; // 0 = off, else max loss limit amount
    maxStakeCap: number; // Max stake cap for Martingale safety
  }>({
    isActive: false,
    strategy: "FLAT",
    side: "DRAGON",
    baseAmount: activeLimits.minBet,
    currentStake: activeLimits.minBet,
    totalRounds: 10,
    roundsRemaining: 10,
    roundsCompleted: 0,
    totalWagered: 0,
    totalProfitLoss: 0,
    winsCount: 0,
    lossesCount: 0,
    stopOnWin: false,
    stopOnLoss: false,
    stopProfitTarget: 0,
    stopLossLimit: 0,
    maxStakeCap: activeLimits.maxBet,
  });

  const [showAutoBetModal, setShowAutoBetModal] = useState<boolean>(false);
  const autoBetProcessedRoundRef = useRef<number | null>(null);
  const autoBetPrevRoundRef = useRef<TableRound | null>(null);

  const [activeConfirmedBet, setActiveConfirmedBet] = useState<{
    id?: string;
    side: string;
    amount: number;
  } | null>(null);
  const [isPlacingBet, setIsPlacingBet] = useState<string | null>(null);
  const [betAcceptedToast, setBetAcceptedToast] = useState<{ amount: number; side: string } | null>(null);

  // Physics Flying Chips Animation State
  interface FlyingChip {
    id: string;
    amount: number;
    startX: number;
    startY: number;
    targetX: number;
    targetY: number;
    side: string;
  }
  const [flyingChips, setFlyingChips] = useState<FlyingChip[]>([]);

  const triggerFlyingChipAnimation = (side: string, amount: number) => {
    const chipId = `chip_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const normSide = side.toUpperCase();

    // Dynamically calculate target element center in real viewport pixels
    let targetX = window.innerWidth * 0.5;
    let targetY = window.innerHeight * 0.55;

    const targetEl =
      document.querySelector(`[data-bet-side="${normSide}"]`) ||
      document.querySelector(`[data-card-slot="${normSide.toLowerCase()}"]`);

    if (targetEl) {
      const rect = targetEl.getBoundingClientRect();
      targetX = rect.left + rect.width / 2;
      targetY = rect.top + rect.height / 2;
    } else {
      if (normSide.includes("DRAGON")) {
        targetX = window.innerWidth * 0.35;
        targetY = window.innerHeight * 0.55;
      } else if (normSide.includes("TIGER")) {
        targetX = window.innerWidth * 0.65;
        targetY = window.innerHeight * 0.55;
      }
    }

    // Origin: active chip carousel button or bottom HUD center
    let startX = window.innerWidth / 2;
    let startY = window.innerHeight - 60;
    const activeChipEl = document.querySelector('[data-chip-active="true"]');
    if (activeChipEl) {
      const sRect = activeChipEl.getBoundingClientRect();
      startX = sRect.left + sRect.width / 2;
      startY = sRect.top + sRect.height / 2;
    }

    setFlyingChips((prev) => [
      ...prev,
      {
        id: chipId,
        amount,
        startX,
        startY,
        targetX,
        targetY,
        side: normSide,
      },
    ]);

    setTimeout(() => {
      setFlyingChips((prev) => prev.filter((c) => c.id !== chipId));
    }, 650);
  };

  // UI helpers & Sheets
  const [showQuickGuide, setShowQuickGuide] = useState<boolean>(false);
  const [showRulesSheet, setShowRulesSheet] = useState<boolean>(false);
  const [showTrustBar, setShowTrustBar] = useState<boolean>(true);
  const [showProfileCard, setShowProfileCard] = useState<boolean>(true);
  const [showQuickNav, setShowQuickNav] = useState<boolean>(true);
  const [demoResetLoading, setDemoResetLoading] = useState<boolean>(false);
  const [cancelingBet, setCancelingBet] = useState<boolean>(false);
  const [showSidebarMobile, setShowSidebarMobile] = useState<boolean>(false);

  // Live Table Round State from Server
  const [currentRound, setCurrentRound] = useState<TableRound | null>(null);
  const [roadmap, setRoadmap] = useState<RoadmapItem[]>([]);

  useEffect(() => {
    if (roadmapScrollRef.current) {
      roadmapScrollRef.current.scrollLeft = roadmapScrollRef.current.scrollWidth;
    }
  }, [roadmap, showRoadmapPanel]);
  const [currentRoundBets, setCurrentRoundBets] = useState<LiveBetRecord[]>([]);
  const [recentSettledBets, setRecentSettledBets] = useState<LiveBetRecord[]>([]);
  const [dealerCommentary, setDealerCommentary] = useState<string>(
    "Welcome to the P2P Dragon Tiger Arena. Choose Dragon or Tiger to play!"
  );
  const [sidebarTab, setSidebarTab] = useState<"liveAction" | "chat" | "roadmap" | "guide">("liveAction");
  const [tieRefundBanner, setTieRefundBanner] = useState<{ amount: number; roundNumber: number } | null>(null);
  const [showWinCelebration, setShowWinCelebration] = useState<boolean>(false);
  const [lastWinPayout, setLastWinPayout] = useState<number>(0);
  const [isUserLastRoundWinner, setIsUserLastRoundWinner] = useState<boolean>(false);
  // AnimatePresence Winning-Side Confetti Particle System for High-Stakes Payout
  const [winningSideConfetti, setWinningSideConfetti] = useState<{
    side: "DRAGON" | "TIGER" | "TIE" | null;
    payout: number;
    multiplier: number;
    isUserWinner: boolean;
    activationKey: number;
  } | null>(null);
  const [slotPulse, setSlotPulse] = useState<{
    dragon: "WIN" | "LOSS" | "TIE" | null;
    tiger: "WIN" | "LOSS" | "TIE" | null;
    active: boolean;
  }>({ dragon: null, tiger: null, active: false });

  // Staggered cinematic card dealing step tracking
  const [dealingStep, setDealingStep] = useState<"IDLE" | "DEALING_CARDS" | "REVEAL_DRAGON" | "REVEAL_TIGER" | "WINNER_REVEALED">("IDLE");
  const dealingTimersRef = useRef<NodeJS.Timeout[]>([]);

  // Cleanup dealing timers on unmount
  useEffect(() => {
    return () => {
      dealingTimersRef.current.forEach((t) => clearTimeout(t));
    };
  }, []);

  const activeBalance = user ? (user.balanceType === "real" ? user.balance : user.demoBalance) : 0;

  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => !!document.fullscreenElement);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Synchronized Shoe Inspection Indicator when dealer checks the shoe
  const [isShoeInspecting, setIsShoeInspecting] = useState<boolean>(false);

  useEffect(() => {
    const handleDealerShoeCheck = () => {
      setIsShoeInspecting(true);
      const timer = setTimeout(() => setIsShoeInspecting(false), 3000);
      return () => clearTimeout(timer);
    };
    window.addEventListener("dealer-check-shoe", handleDealerShoeCheck);
    return () => window.removeEventListener("dealer-check-shoe", handleDealerShoeCheck);
  }, []);

  // ResizeObserver to watch container and dynamically scale internal card elements via CSS transform: scale()
  useEffect(() => {
    if (!gameContainerRef.current) return;
    const container = gameContainerRef.current;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        // Ignore unmeasured 0x0 or collapsed layout on reload
        if (width < 100 || height < 100) return;

        // Proportional scale factor: never let cards become unreadable or microscopic on mobile
        const scaleByWidth = width / 520;
        const scaleByHeight = height / 440;
        const minScale = Math.min(scaleByWidth, scaleByHeight);
        // Ensure scale stays within [0.82, 1.08] so cards remain clear, prominent, and proportional
        const boundedScale = Math.min(Math.max(minScale, 0.82), 1.08);
        const rounded = Number(boundedScale.toFixed(2));
        setCardScale((prev) => (Math.abs(prev - rounded) > 0.02 ? rounded : prev));
      }
    });

    observer.observe(container);
    return () => {
      observer.disconnect();
    };
  }, []);


  // Sync default amount when switching table
  useEffect(() => {
    if (selectedAmount < activeLimits.minBet || selectedAmount > activeLimits.maxBet) {
      setSelectedAmount(activeLimits.minBet);
      setCustomAmountInput(String(Math.round(activeLimits.minBet * activeCurrency.rateFromBase)));
    }
  }, [selectedTableSlug, activeLimits.minBet, activeLimits.maxBet, activeCurrency.rateFromBase]);

  // Check Onboarding Tutorial status
  useEffect(() => {
    const seen = localStorage.getItem("dt_tutorial_seen");
    if (!seen) {
      setShowQuickGuide(true);
    }
  }, []);

  const handleDismissTutorial = () => {
    setShowQuickGuide(false);
    localStorage.setItem("dt_tutorial_seen", "true");
  };

  // Pro Auto Bet Engine Automation Loop
  useEffect(() => {
    if (!currentRound) return;

    // 1. Auto Bet Execution during BETTING status
    if (
      autoBetConfig.isActive &&
      currentRound.status === "BETTING" &&
      currentRound.secondsRemaining > 2 &&
      autoBetProcessedRoundRef.current !== currentRound.roundNumber
    ) {
      const stakeToUse = autoBetConfig.currentStake;

      if (autoBetConfig.roundsRemaining > 0 && activeBalance >= stakeToUse) {
        autoBetProcessedRoundRef.current = currentRound.roundNumber;
        executeDirectBet(autoBetConfig.side, stakeToUse);

        setAutoBetConfig((prev) => {
          const nextRemaining = prev.roundsRemaining === 9999 ? 9999 : prev.roundsRemaining - 1;
          const isDone = nextRemaining <= 0;
          return {
            ...prev,
            roundsRemaining: nextRemaining,
            roundsCompleted: prev.roundsCompleted + 1,
            totalWagered: prev.totalWagered + stakeToUse,
            isActive: !isDone,
          };
        });
      } else {
        // Stop if balance is insufficient or rounds finished
        setAutoBetConfig((prev) => ({ ...prev, isActive: false }));
      }
    }

    // 2. Strategy Calculation & Stop Condition Checks when round settles
    if (
      autoBetConfig.isActive &&
      (currentRound.status === "SETTLING" || currentRound.status === "COMPLETED") &&
      currentRound.result &&
      autoBetPrevRoundRef.current?.roundNumber !== currentRound.roundNumber
    ) {
      autoBetPrevRoundRef.current = currentRound;
      const result = currentRound.result;
      const isWin = result === autoBetConfig.side;
      const isLoss = result !== "TIE" && result !== autoBetConfig.side;
      const isTie = result === "TIE";

      setAutoBetConfig((prev) => {
        let nextSide = prev.side;
        let nextStake = prev.baseAmount;
        let pnlDelta = 0;
        let newWins = prev.winsCount;
        let newLosses = prev.lossesCount;

        if (isWin) {
          pnlDelta = prev.currentStake; // net win
          newWins += 1;

          // Strategy logic after Win
          if (prev.strategy === "FLAT") {
            nextStake = prev.baseAmount;
          } else if (prev.strategy === "MARTINGALE") {
            // Reset to base amount on win!
            nextStake = prev.baseAmount;
          } else if (prev.strategy === "ANTI_MARTINGALE") {
            // Double stake on win!
            nextStake = Math.min(prev.maxStakeCap, prev.currentStake * 2);
          } else if (prev.strategy === "ALTERNATE") {
            nextSide = prev.side === "DRAGON" ? "TIGER" : "DRAGON";
            nextStake = prev.baseAmount;
          }
        } else if (isLoss) {
          pnlDelta = -prev.currentStake;
          newLosses += 1;

          // Strategy logic after Loss
          if (prev.strategy === "FLAT") {
            nextStake = prev.baseAmount;
          } else if (prev.strategy === "MARTINGALE") {
            // Double stake on loss!
            nextStake = Math.min(prev.maxStakeCap, prev.currentStake * 2);
          } else if (prev.strategy === "ANTI_MARTINGALE") {
            // Reset to base amount on loss!
            nextStake = prev.baseAmount;
          } else if (prev.strategy === "ALTERNATE") {
            nextSide = prev.side === "DRAGON" ? "TIGER" : "DRAGON";
            nextStake = prev.baseAmount;
          }
        } else if (isTie) {
          // Tie refunds stake or holds
          nextStake = prev.currentStake;
        }

        const newPnl = prev.totalProfitLoss + pnlDelta;

        // Check stop rules
        let shouldStop = false;
        if (isWin && prev.stopOnWin) shouldStop = true;
        if (isLoss && prev.stopOnLoss) shouldStop = true;
        if (prev.stopProfitTarget > 0 && newPnl >= prev.stopProfitTarget) shouldStop = true;
        if (prev.stopLossLimit > 0 && newPnl <= -prev.stopLossLimit) shouldStop = true;

        return {
          ...prev,
          side: nextSide,
          currentStake: nextStake,
          totalProfitLoss: newPnl,
          winsCount: newWins,
          lossesCount: newLosses,
          isActive: !shouldStop && prev.isActive,
        };
      });
    }
  }, [currentRound, autoBetConfig, activeBalance]);

  // Fetch initial roadmap, round info, and transparent live bets
  useEffect(() => {
    const fetchTableData = async () => {
      try {
        const safeFetchJson = async (url: string) => {
          try {
            const res = await fetch(url);
            if (!res.ok) return null;
            const contentType = res.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) return null;
            return await res.json();
          } catch {
            return null;
          }
        };

        const [tablesData, roadData, betsData] = await Promise.all([
          safeFetchJson("/api/tables"),
          safeFetchJson(`/api/tables/${selectedTableSlug}/roadmap`),
          safeFetchJson(`/api/tables/${selectedTableSlug}/bets`),
        ]);

        if (Array.isArray(tablesData)) {
          const match = tablesData.find((t: { config: { slug: string } }) => t.config.slug === selectedTableSlug);
          if (match) {
            setCurrentRound(match.currentRound);
          }
        }
        if (Array.isArray(roadData)) {
          setRoadmap(roadData);
        }
        if (betsData) {
          if (Array.isArray(betsData.currentRoundBets)) {
            setCurrentRoundBets(betsData.currentRoundBets);
          }
          if (Array.isArray(betsData.recentSettledBets)) {
            setRecentSettledBets(betsData.recentSettledBets);
          }
        }
      } catch (e) {
        console.error("Error fetching table data:", e);
      }
    };

    fetchTableData();
  }, [selectedTableSlug]);

  // WebSocket Live Subscription
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(`${protocol}//${window.location.host}`);

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "TIMER_TICK" && data.tableSlug === selectedTableSlug) {
          setCurrentRound((prev) => {
            if (!prev) return prev;
            if (
              prev.secondsRemaining === data.secondsRemaining &&
              prev.dragonPool === data.dragonPool &&
              prev.tigerPool === data.tigerPool &&
              prev.matchedAmount === data.matchedAmount
            ) {
              return prev;
            }
            return {
              ...prev,
              secondsRemaining: data.secondsRemaining,
              dragonPool: data.dragonPool,
              tigerPool: data.tigerPool,
              matchedAmount: data.matchedAmount,
            };
          });
          if (data.secondsRemaining === 5) {
            sound.announceLastBets();
          }
          if (data.secondsRemaining <= 5 && data.secondsRemaining > 0) {
            sound.playCountdownTick(data.secondsRemaining);
            try { haptics.urgent(); } catch {}
          }
        } else if (data.type === "ROUND_PHASE" && data.tableSlug === selectedTableSlug) {
          setCurrentRound((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              status: data.status,
              matchedAmount: data.matchedAmount,
              dragonPool: data.dragonPool !== undefined ? data.dragonPool : prev.dragonPool,
              tigerPool: data.tigerPool !== undefined ? data.tigerPool : prev.tigerPool,
            };
          });
          if (data.status === "BETTING") {
            // New betting round opened: gong chime + announce + chip drop
            sound.playRoundStartGong();
            sound.announcePlaceBets();
            sound.playChip(1.0);
            setWinningSideConfetti(null);
            setShowWinCelebration(false);
          } else if (data.status === "MATCHING" || data.status === "DEALING") {
            // Betting closed & matching phase started
            sound.announceBetsClosed();
            sound.playChipStack();
            const dPool = data.dragonPool || 0;
            const tPool = data.tigerPool || 0;
            const mAmount = data.matchedAmount || 0;
            const returnedTotal = Math.max(0, dPool + tPool - mAmount * 2);
            sound.announceMatchingPhase(dPool, tPool, mAmount, returnedTotal);
            // Instantly refresh wallet upon matching so unmatched refunds appear immediately
            if (user?.userId) {
              const sid = localStorage.getItem("player_session_id") || "";
              fetch(`/api/wallet/${encodeURIComponent(user.userId)}?username=${encodeURIComponent(user.username)}`, {
                headers: { "x-user-id": user.userId, ...(sid ? { "x-session-id": sid } : {}) },
              })
                .then((r) => r.json())
                .then((updated) => {
                  if (updated && updated.userId) onUpdateWallet(updated);
                })
                .catch(() => {});
            }
          }
        } else if (data.type === "ROUND_DEALING" && data.tableSlug === selectedTableSlug) {
          // Clear any pending dealing timers
          dealingTimersRef.current.forEach((t) => clearTimeout(t));
          dealingTimersRef.current = [];

          setDealingStep("DEALING_CARDS");
          // Staggered dealing sound sequence synced with card delivery and reveals
          sound.playCardSlide();

          const t1 = setTimeout(() => {
            sound.playCardSlide();
          }, 450);

          const t2 = setTimeout(() => {
            setDealingStep("REVEAL_DRAGON");
            if (data.dragonCard) {
              const dRank = data.dragonCard.rank || data.dragonCard.display || data.dragonCard.value;
              sound.playGranularCardSnap(dRank, "DRAGON");
            }
          }, 1200);

          const t3 = setTimeout(() => {
            setDealingStep("REVEAL_TIGER");
            if (data.tigerCard) {
              const tRank = data.tigerCard.rank || data.tigerCard.display || data.tigerCard.value;
              sound.playGranularCardSnap(tRank, "TIGER");
            }
          }, 2000);

          const t4 = setTimeout(() => {
            setDealingStep("WINNER_REVEALED");
          }, 2550);

          dealingTimersRef.current = [t1, t2, t3, t4];

          setCurrentRound((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              status: "DEALING",
              dragonCard: data.dragonCard,
              tigerCard: data.tigerCard,
              result: data.result,
            };
          });
        } else if (data.type === "NEW_BET" && data.tableSlug === selectedTableSlug) {
          if (data.bet) {
            setCurrentRoundBets((prev) => {
              if (prev.some((b) => b.id === data.bet.id)) return prev;
              return [data.bet, ...prev].slice(0, 60);
            });
            if (user?.userId && data.bet.userId === user.userId) {
              sound.playCoinsClinking();
              sound.playChipStack();
              setIsPlacingBet(null);
              setBetAcceptedToast({ amount: data.bet.amount, side: data.bet.side });
              setTimeout(() => setBetAcceptedToast(null), 3500);
            } else {
              sound.playChip(0.85);
            }
          }
        } else if (data.type === "BET_CANCELLED" && data.tableSlug === selectedTableSlug) {
          setCurrentRoundBets((prev) => prev.filter((b) => b.id !== data.betId));
          if (activeConfirmedBet?.id === data.betId) {
            setActiveConfirmedBet(null);
          }
        } else if (data.type === "ROUND_RESULT" && data.tableSlug === selectedTableSlug) {
          setCurrentRound(data.round);
          setRoadmap(data.roadmap);
          if (Array.isArray(data.settledBets)) {
            setRecentSettledBets((prev) => [...data.settledBets, ...prev].slice(0, 80));
          }

          const winner = data.round.result;
          if (winner) {
            const dRank = data.round.dragonCard?.display || "Card";
            const tRank = data.round.tigerCard?.display || "Card";
            let payout = 0;
            let didWin = false;
            let isUnmatchedRefund = false;
            let matchedAmount = 0;
            let unmatchedAmount = 0;

            // Find user's exact bet settlement from the server
            const userSettled = Array.isArray(data.settledBets)
              ? data.settledBets.find((b: any) => (user?.userId && b.userId === user.userId) || (activeConfirmedBet && b.id === activeConfirmedBet.id))
              : null;

            if (userSettled) {
              matchedAmount = userSettled.matchedAmount !== undefined ? userSettled.matchedAmount : (activeConfirmedBet ? activeConfirmedBet.amount : 0);
              unmatchedAmount = userSettled.unmatchedAmount !== undefined ? userSettled.unmatchedAmount : 0;
              
              if (userSettled.status === "REFUNDED" || matchedAmount <= 0) {
                // Completely unmatched bet -> 100% refund, not a win or loss!
                isUnmatchedRefund = true;
                didWin = false;
                payout = 0;
              } else if (userSettled.status === "WON") {
                didWin = true;
                payout = userSettled.payout || Math.floor(matchedAmount * 1.9);
              } else {
                didWin = false;
                payout = 0;
              }
            } else if (activeConfirmedBet) {
              // Fallback calculation if not in array
              const dCard = data.round.dragonCard;
              const tCard = data.round.tigerCard;
              const dVal = dCard?.value ?? 0;
              const tVal = tCard?.value ?? 0;

              if (winner !== "TIE") {
                switch (activeConfirmedBet.side) {
                  case "DRAGON":
                    didWin = winner === "DRAGON";
                    break;
                  case "TIGER":
                    didWin = winner === "TIGER";
                    break;
                  case "DRAGON_EVEN":
                    didWin = dVal !== 7 && dVal % 2 === 0;
                    break;
                  case "DRAGON_ODD":
                    didWin = dVal !== 7 && dVal % 2 !== 0;
                    break;
                  case "DRAGON_SML":
                    didWin = dVal < 7;
                    break;
                  case "DRAGON_BIG":
                    didWin = dVal > 7;
                    break;
                  case "TIGER_EVEN":
                    didWin = tVal !== 7 && tVal % 2 === 0;
                    break;
                  case "TIGER_ODD":
                    didWin = tVal !== 7 && tVal % 2 !== 0;
                    break;
                  case "TIGER_SML":
                    didWin = tVal < 7;
                    break;
                  case "TIGER_BIG":
                    didWin = tVal > 7;
                    break;
                  default:
                    didWin = false;
                }
              }

              // Check if table had 0 total matched
              const roundTotalMatched = data.round?.matchedAmount || 0;
              if (roundTotalMatched <= 0) {
                isUnmatchedRefund = true;
                didWin = false;
                payout = 0;
              } else {
                matchedAmount = activeConfirmedBet.amount;
                if (didWin) {
                  payout = Math.floor(matchedAmount * 1.9);
                }
              }
            }

            setIsUserLastRoundWinner(didWin && payout > 0);
            setLastWinPayout(payout);

            if (didWin && payout > 0) {
              setShowWinCelebration(true);
              setTimeout(() => setShowWinCelebration(false), 2800);

              // Trigger Canvas Confetti Particle Blast on Win / Big Win!
              const isBigWin = payout >= 500 || matchedAmount >= 200;
              triggerBigWinConfetti(isBigWin);
            } else {
              setShowWinCelebration(false);
            }

            // Synchronize dynamic visual feedback pulse with sound engine win/loss triggers
            if (winner === "DRAGON") {
              if (activeConfirmedBet && activeConfirmedBet.side === "TIGER") {
                setSlotPulse({ dragon: "WIN", tiger: "LOSS", active: true });
              } else {
                setSlotPulse({ dragon: "WIN", tiger: null, active: true });
              }
            } else if (winner === "TIGER") {
              if (activeConfirmedBet && activeConfirmedBet.side === "DRAGON") {
                setSlotPulse({ dragon: "LOSS", tiger: "WIN", active: true });
              } else {
                setSlotPulse({ dragon: null, tiger: "WIN", active: true });
              }
            } else if (winner === "TIE") {
              setSlotPulse({ dragon: "TIE", tiger: "TIE", active: true });
            }

            sound.announceWinner(winner);
            sound.announceDetailedCardsAndResult(winner, dRank, tRank, payout, 0);
            soundManager.announceWinner(winner);
            soundManager.announceDetailedCardsAndResult(winner, dRank, tRank, payout, 0);

            // High-Stakes Payout Detection for AnimatePresence Winning-Side Confetti
            const roundMatched = data.round?.matchedAmount || 0;
            const totalWinningPoolPayout = Math.floor(roundMatched * 1.9);
            const userWonHigh = didWin && payout >= 100;
            const tableWonHigh =
              totalWinningPoolPayout >= 200 ||
              roundMatched >= 75 ||
              selectedTableSlug === "vip" ||
              (Array.isArray(data.settledBets) &&
                data.settledBets.some(
                  (b: any) =>
                    (b.status === "WON" || (b.payout && b.payout > 0)) &&
                    (b.payout >= 150 || b.amount >= 75)
                ));

            const isHighStakes = userWonHigh || tableWonHigh;

            if (isHighStakes && (winner === "DRAGON" || winner === "TIGER" || winner === "TIE")) {
              const resolvedPayout = payout > 0 ? payout : totalWinningPoolPayout > 0 ? totalWinningPoolPayout : 380;
              setWinningSideConfetti({
                side: winner,
                payout: resolvedPayout,
                multiplier: 1.9,
                isUserWinner: didWin,
                activationKey: Date.now(),
              });
              sound.playBigWin();
              sound.playCoinCascade();
            }

            if (activeConfirmedBet) {
              if (isUnmatchedRefund) {
                sound.playCoinsClinking();
                soundManager.triggerCoinsClinking();
                showTableToast(`ℹ️ কোনো প্রতিপক্ষ ম্যাচিং না হওয়ায় ৳${activeConfirmedBet.amount.toLocaleString()} সম্পূর্ণ রিফান্ড হয়েছে।`);
              } else if (didWin && payout > 0) {
                if (payout >= 500) {
                  sound.playBigWin();
                } else {
                  sound.playWinFanfare();
                }
                sound.playCoinsClinking();
                sound.announcePlayerWin(payout);
                soundManager.triggerWinningState(payout);
                try { haptics.win(); } catch {}

                if (unmatchedAmount > 0) {
                  showTableToast(`🎉 ৳${matchedAmount.toLocaleString()} ম্যাচ হয়ে জিতেছে (+৳${payout.toLocaleString()})! বাকি ৳${unmatchedAmount.toLocaleString()} রিফান্ড হয়েছে।`);
                }
              } else if (winner === "TIE") {
                sound.playLossSound();
                sound.announcePlayerLoss(matchedAmount || activeConfirmedBet.amount);
                soundManager.triggerLosingState(matchedAmount || activeConfirmedBet.amount);
                try { haptics.lose(); } catch {}
                showTableToast("টাই (Tie) ফলাফল: ১০০% টাকা কোম্পানি ফান্ডে বাজেয়াপ্ত হয়েছে (No Refund on Tie)।");
              } else {
                sound.playLossSound();
                sound.announcePlayerLoss(matchedAmount || activeConfirmedBet.amount);
                soundManager.triggerLosingState(matchedAmount || activeConfirmedBet.amount);
                try { haptics.lose(); } catch {}
                if (unmatchedAmount > 0) {
                  showTableToast(`৳${matchedAmount.toLocaleString()} ম্যাচিং পরাজিত। বাকি ৳${unmatchedAmount.toLocaleString()} রিফান্ড হয়েছে।`);
                }
              }
            } else {
              sound.playCoinsClinking();
              soundManager.triggerCoinsClinking();
            }

            setTimeout(() => {
              setSlotPulse({ dragon: null, tiger: null, active: false });
            }, 4500);
          }

          if (user?.userId) {
            const sid = localStorage.getItem("player_session_id") || "";
            fetch(`/api/wallet/${encodeURIComponent(user.userId)}?username=${encodeURIComponent(user.username)}`, {
              headers: { "x-user-id": user.userId, ...(sid ? { "x-session-id": sid } : {}) },
            })
              .then((r) => r.json())
              .then((updated) => {
                if (updated && updated.userId) onUpdateWallet(updated);
              })
              .catch(() => {});
          }

          fetch("/api/ai-dealer", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              lastWinner: data.round.result,
              tableSlug: selectedTableSlug,
            }),
          })
            .then((r) => r.json())
            .then((d) => {
              if (d.commentary) setDealerCommentary(d.commentary);
            })
            .catch(() => {});
        } else if (data.type === "NEW_ROUND" && data.tableSlug === selectedTableSlug) {
          dealingTimersRef.current.forEach((t) => clearTimeout(t));
          dealingTimersRef.current = [];
          setDealingStep("IDLE");
          setCurrentRound(data.round);
          setCurrentRoundBets([]);
          soundManager.triggerRoundInitiation();
          setActiveConfirmedBet(null);
          setIsPlacingBet(null);
          setTieRefundBanner(null);
          setShowWinCelebration(false);
          setSlotPulse({ dragon: null, tiger: null, active: false });

          setDragonBet(0);
          setTigerBet(0);
        }
      } catch (e) {
        console.error(e);
      }
    };

    return () => socket.close();
  }, [selectedTableSlug, user?.userId, activeConfirmedBet]);

  // Stepper and Chip Selection Handlers - 1-Tap Instant Bet Strike
  const handleSelectSide = (side: string) => {
    if (!user || !user.userId) {
      soundManager.playChip(1.2);
      setSelectedSide(side);
      showTableToast("বেট ধরতে অনুগ্রহ করে প্রথমে লগইন করুন।");
      onRequireLogin?.();
      return;
    }
    soundManager.playChip(1.2);
    setSelectedSide(side);
    const stakeAmount = selectedAmount > 0 ? selectedAmount : activeLimits.minBet;
    executeDirectBet(side, stakeAmount);
  };

  const handleChipSelect = (amt: number) => {
    soundManager.playChip(1.2);
    setSelectedAmount(amt);
    setCustomAmountInput(String(Math.round(amt * activeCurrency.rateFromBase)));
    setShowCustomInput(false);
  };

  const handleAdjustAmount = (delta: number) => {
    soundManager.playChip(1.0);
    setSelectedAmount((prev) => {
      const next = Math.max(activeLimits.minBet, Math.min(activeLimits.maxBet, prev + (delta / activeCurrency.rateFromBase)));
      setCustomAmountInput(String(Math.round(next * activeCurrency.rateFromBase)));
      return next;
    });
  };

  const handleToggleCustomInput = () => {
    if (!showCustomInput) {
      setCustomAmountInput(String(Math.round(selectedAmount * activeCurrency.rateFromBase)));
    }
    setShowCustomInput(!showCustomInput);
  };

  const handleAddCustomAmount = (increment: number) => {
    soundManager.playChip(1.1);
    const current = Number(customAmountInput) || 0;
    const next = Math.min(Math.round(activeLimits.maxBet * activeCurrency.rateFromBase), current + increment);
    setCustomAmountInput(String(next));
    setSelectedAmount(next / activeCurrency.rateFromBase);
  };

  const handleKeypadTap = (action: string) => {
    soundManager.playChip(1.0);
    if (action === "CLEAR") {
      setCustomAmountInput("");
      setSelectedAmount(0);
    } else if (action === "BACKSPACE") {
      const next = customAmountInput.slice(0, -1);
      setCustomAmountInput(next);
      setSelectedAmount((Number(next) || 0) / activeCurrency.rateFromBase);
    } else {
      const next = (customAmountInput + action).replace(/^0+(?=\d)/, "");
      setCustomAmountInput(next);
      setSelectedAmount((Number(next) || 0) / activeCurrency.rateFromBase);
    }
  };

  const handleCustomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    setCustomAmountInput(raw);
    if (raw !== "") {
      const parsed = Number(raw);
      if (!isNaN(parsed)) {
        setSelectedAmount(parsed / activeCurrency.rateFromBase);
      }
    } else {
      setSelectedAmount(0);
    }
  };

  const handleToggleVoiceListening = () => {
    if (isListeningVoice) {
      if (recognitionRef.current && recognitionRef.current.stop) {
        recognitionRef.current.stop();
      }
      setIsListeningVoice(false);
      setVoiceFeedback(null);
      return;
    }

    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setVoiceFeedback({ 
        message: "🎙️ আপনার ব্রাউজারে ভয়েস ইনপুট সক্রিয় নয় (Voice recognition not supported).", 
        type: "error" 
      });
      setTimeout(() => setVoiceFeedback(null), 3500);
      return;
    }

    try {
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListeningVoice(true);
        setVoiceFeedback({ message: "🎙️ Listening... Speak your bet (e.g. 'Bet 100 on Dragon')", type: "info" });
        soundManager.playButtonClick();
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result) => result.transcript)
          .join("");
        setVoiceTranscript(transcript);

        if (event.results[0]?.isFinal) {
          parseAndExecuteVoiceCommand(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        const errType = event?.error || "unknown";
        if (errType === "not-allowed" || errType === "service-not-allowed") {
          setVoiceFeedback({ message: "🎙️ মাইক্রোফোন পারমিশন প্রয়োজন (Microphone access denied).", type: "error" });
          setIsListeningVoice(false);
          setTimeout(() => setVoiceFeedback(null), 3500);
        } else if (errType === "no-speech" || errType === "aborted") {
          setIsListeningVoice(false);
          setVoiceFeedback(null);
        } else {
          setVoiceFeedback({ message: `Voice command unavailable (${errType}). Try again.`, type: "info" });
          setIsListeningVoice(false);
          setTimeout(() => setVoiceFeedback(null), 3000);
        }
      };

      recognition.onend = () => {
        setIsListeningVoice(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch {
      setVoiceFeedback({ message: "🎙️ ভয়েস রিকগনিশন শুরু করা যায়নি (Could not start voice recognition).", type: "error" });
      setIsListeningVoice(false);
      setTimeout(() => setVoiceFeedback(null), 3500);
    }
  };

  const parseAndExecuteVoiceCommand = (transcript: string) => {
    const lower = transcript.toLowerCase();
    let side: "DRAGON" | "TIGER" | "TIE" | null = null;
    if (lower.includes("dragon")) side = "DRAGON";
    else if (lower.includes("tiger")) side = "TIGER";
    else if (lower.includes("tie")) side = "TIE";

    const numbers = lower.match(/\d+/);
    const amount = numbers ? Number(numbers[0]) : Math.round(selectedAmount * activeCurrency.rateFromBase);

    if (side && amount > 0) {
      processVoiceCommand(transcript, side, amount / activeCurrency.rateFromBase);
    } else {
      setVoiceFeedback({ message: `Could not parse: "${transcript}". Say 'Bet 100 on Dragon'.`, type: "error" });
      setTimeout(() => setVoiceFeedback(null), 4000);
    }
  };

  const processVoiceCommand = (transcript: string, side: "DRAGON" | "TIGER" | "TIE", baseAmount: number) => {
    setVoiceFeedback({ message: `🎙️ "${transcript}" → Placing ${formatAmt(baseAmount)} on ${side}!`, type: "success" });
    soundManager.playChip(1.2);
    if (side === "DRAGON" || side === "TIGER") {
      executeDirectBet(side, baseAmount);
    } else {
      executeDirectBet("DRAGON", baseAmount);
    }
    setTimeout(() => {
      setIsListeningVoice(false);
      setVoiceFeedback(null);
      setVoiceTranscript("");
    }, 3500);
  };

  // Direct 1-Tap Bet Execution
  const executeDirectBet = async (side: string, amount: number) => {
    if (!user || !user.userId) {
      showTableToast("বেট ধরতে অনুগ্রহ করে প্রথমে লগইন করুন।");
      onRequireLogin?.();
      return;
    }
    if (currentRound && currentRound.status !== "BETTING") {
      showTableToast("⏳ Betting is closed for this round. Please wait for the next round.");
      return;
    }
    if (amount <= 0) return;
    if (amount < activeLimits.minBet) {
      showTableToast(`Minimum bet for this table is ${formatAmt(activeLimits.minBet)}.`);
      return;
    }
    if (amount > activeLimits.maxBet) {
      showTableToast(`Maximum bet for this table is ${formatAmt(activeLimits.maxBet)}.`);
      return;
    }
    if (activeBalance < amount) {
      showTableToast(`Your balance is ${formatAmt(activeBalance)}, so ${formatAmt(amount)} cannot be placed.`);
      return;
    }

    setIsPlacingBet(side);
    perfMonitor.recordInteraction(`Place Bet: ${side} (${amount})`);
    triggerFlyingChipAnimation(side, amount);
    try {
      const sid = localStorage.getItem("player_session_id") || "";
      const res = await fetch("/api/game/bet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.userId,
          ...(sid ? { "x-session-id": sid } : {}),
        },
        body: JSON.stringify({
          userId: user.userId,
          tableSlug: selectedTableSlug,
          side: side.toUpperCase(),
          amount: amount,
          balanceType: user.balanceType,
        }),
      });
      const data = await res.json();
      if (data.success) {
        soundManager.triggerCoinsClinking();
        setLastPlacedBet({ side, amount });
        setActiveConfirmedBet((prev) => {
          if (prev && prev.side === side) {
            return {
              id: data.bet?.id || prev.id,
              side: side,
              amount: prev.amount + amount,
            };
          }
          return {
            id: data.bet?.id,
            side: side,
            amount: amount,
          };
        });
        soundManager.announceBetAmount(amount, side);
        setBetAcceptedToast({ amount: amount, side: side });
        setTimeout(() => setBetAcceptedToast(null), 3500);
        if (data.bet) {
          setCurrentRoundBets((prev) => [data.bet, ...prev.filter((b) => b.id !== data.bet.id)]);
        }
        if (typeof data.newBalance === "number") {
          onUpdateWallet({
            ...user,
            [user.balanceType === "real" ? "balance" : "demoBalance"]: data.newBalance,
          });
        }
        const sid = localStorage.getItem("player_session_id") || "";
        fetch(`/api/wallet/${encodeURIComponent(user.userId)}?username=${encodeURIComponent(user.username)}`, {
          headers: { "x-user-id": user.userId, ...(sid ? { "x-session-id": sid } : {}) },
        })
          .then((r) => r.json())
          .then((updated) => {
            if (updated && updated.userId) onUpdateWallet(updated);
          })
          .catch(() => {});
      } else {
        soundManager.playButtonClick();
        showTableToast(data.error || "Failed to confirm bet");
      }
    } catch {
      showTableToast("Connection interrupted. Please verify your connection.");
    } finally {
      setIsPlacingBet(null);
    }
  };

  // Cancel Active Bet (1-Tap Refund)
  const handleCancelActiveBet = async () => {
    if (!user || !activeConfirmedBet || cancelingBet) return;
    setCancelingBet(true);
    try {
      const sid = localStorage.getItem("player_session_id") || "";
      const res = await fetch("/api/game/cancel-bet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.userId,
          ...(sid ? { "x-session-id": sid } : {}),
        },
        body: JSON.stringify({
          userId: user.userId,
          tableSlug: selectedTableSlug,
          betId: activeConfirmedBet.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        soundManager.playButtonClick();
        setActiveConfirmedBet(null);
        const headers: Record<string, string> = { "x-user-id": user.userId };
        if (sid) headers["x-session-id"] = sid;
        fetch(`/api/wallet/${user.userId}`, { headers })
          .then((r) => r.json())
          .then((updated) => onUpdateWallet(updated));
      } else {
        showTableToast(data.error || "Could not cancel bet");
      }
    } catch {
      showTableToast("Failed to cancel bet.");
    } finally {
      setCancelingBet(false);
    }
  };

  // 1-Tap Demo Balance Reset
  const handleResetDemoBalance = async () => {
    if (!user || demoResetLoading) return;
    setDemoResetLoading(true);
    try {
      const sid = localStorage.getItem("player_session_id") || "";
      const res = await fetch(`/api/wallet/${user.userId}/reset-demo`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.userId,
          ...(sid ? { "x-session-id": sid } : {}),
        },
      });
      const data = await res.json();
      if (data.success && data.user) {
        soundManager.triggerCoinsClinking();
        onUpdateWallet(data.user);
      }
    } catch {
      showTableToast("Failed to reset demo balance.");
    } finally {
      setDemoResetLoading(false);
    }
  };

  // Quick Action Buttons
  const handleFollowBet = (side: "dragon" | "tiger" | "tie", amount: number) => {
    if (!user || !user.userId) {
      showTableToast("বেট ধরতে অনুগ্রহ করে প্রথমে লগইন করুন।");
      onRequireLogin?.();
      return;
    }
    if (side === "tie") {
      showTableToast("Tie-তে বাজি ধরা যায় না। শুধুমাত্র Dragon বা Tiger বেছে নিন।");
      return;
    }
    const targetSide = side.toUpperCase() as "DRAGON" | "TIGER";
    setSelectedSide(targetSide);
    const clampedAmt = Math.max(activeLimits.minBet, Math.min(activeLimits.maxBet, amount));
    setSelectedAmount(clampedAmt);
    executeDirectBet(targetSide, clampedAmt);
  };

  const handleDoubleBet = () => {
    if (!user || !user.userId) {
      showTableToast("বেট ধরতে অনুগ্রহ করে প্রথমে লগইন করুন।");
      onRequireLogin?.();
      return;
    }
    soundManager.playChipStack();
    const doubled = selectedAmount * 2;
    if (doubled > activeLimits.maxBet) {
      showTableToast(`Cannot exceed table maximum limit of ৳${activeLimits.maxBet.toLocaleString()}.`);
      return;
    }
    if (activeBalance < doubled) {
      showTableToast("Insufficient balance to double bet.");
      return;
    }
    setSelectedAmount(doubled);
  };

  const handleRepeatBet = () => {
    if (!user || !user.userId) {
      showTableToast("বেট ধরতে অনুগ্রহ করে প্রথমে লগইন করুন।");
      onRequireLogin?.();
      return;
    }
    if (!lastPlacedBet) return;
    if (activeBalance < lastPlacedBet.amount) {
      showTableToast("Insufficient balance to repeat previous bet.");
      return;
    }
    soundManager.playChipStack();
    setSelectedSide(lastPlacedBet.side);
    setSelectedAmount(lastPlacedBet.amount);
    executeDirectBet(lastPlacedBet.side, lastPlacedBet.amount);
  };

  // Timer visualization and Human-friendly Round Phase Labels
  const maxTimer = currentRound?.totalDuration || 30;
  const timeLeft = currentRound?.secondsRemaining ?? maxTimer;
  const strokeDash = 264;
  const strokeDashoffset = strokeDash - (strokeDash * timeLeft) / maxTimer;

  const getPhaseDisplay = () => {
    if (!currentRound) return { label: "WAITING...", color: "text-neutral-400" };
    if (currentRound.status === "BETTING") {
      if (timeLeft <= 5) {
        return { label: `5 SECONDS LEFT (${timeLeft}s)`, color: "text-red-400 animate-pulse" };
      }
      return { label: `BETTING OPEN (${timeLeft}s)`, color: "text-emerald-400" };
    }
    if (currentRound.status === "MATCHING") {
      return { label: "BETTING CLOSED · MATCHING", color: "text-amber-400" };
    }
    if (currentRound.status === "DEALING") {
      return { label: "REVEALING CARDS", color: "text-blue-400 animate-pulse" };
    }
    if (currentRound.status === "SETTLING") {
      return { label: "CALCULATING RESULT", color: "text-purple-400" };
    }
    return { label: currentRound.status, color: "text-neutral-400" };
  };

  const phaseInfo = getPhaseDisplay();

  const getDealerStatus = () => {
    if (!currentRound) return "SHUFFLING";
    switch (currentRound.status) {
      case "BETTING":
        return "WAITING FOR BETS";
      case "DEALING":
        return "DEALING...";
      case "SETTLING":
        return "SHUFFLING";
      default:
        return "READY";
    }
  };

  // Matched calculation for active bet strictly isolated by balanceType (Real vs Real, Demo vs Demo)
  const activeBalanceType = user?.balanceType || "real";
  const sameTypeBets = currentRoundBets.filter(b => (b.balanceType || "real") === activeBalanceType);
  const currentDragonPool = sameTypeBets.length > 0
    ? sameTypeBets.filter(b => b.side === "DRAGON").reduce((sum, b) => sum + b.amount, 0)
    : (currentRound?.dragonPool || 0);

  const currentTigerPool = sameTypeBets.length > 0
    ? sameTypeBets.filter(b => b.side === "TIGER").reduce((sum, b) => sum + b.amount, 0)
    : (currentRound?.tigerPool || 0);

  const userActiveSidePool =
    activeConfirmedBet?.side === "DRAGON" ? currentDragonPool : currentTigerPool;
  const userOpposingSidePool =
    activeConfirmedBet?.side === "DRAGON" ? currentTigerPool : currentDragonPool;

  let userMatchedPortion = 0;
  let userWaitingPortion = 0;
  let matchPercentage = 100;

  if (activeConfirmedBet) {
    if (userActiveSidePool <= userOpposingSidePool) {
      userMatchedPortion = activeConfirmedBet.amount;
      userWaitingPortion = 0;
      matchPercentage = 100;
    } else {
      const matchRatio = userActiveSidePool > 0 ? userOpposingSidePool / userActiveSidePool : 1;
      userMatchedPortion = Math.floor(activeConfirmedBet.amount * matchRatio);
      userWaitingPortion = activeConfirmedBet.amount - userMatchedPortion;
      matchPercentage = Math.round(matchRatio * 100);
    }
  }

  // Validity checks for Place Bet button
  const isValidAmount =
    selectedAmount >= activeLimits.minBet && selectedAmount <= activeLimits.maxBet;
  const hasSufficientBalance = activeBalance >= selectedAmount;
  const isBettingOpen = currentRound?.status === "BETTING";
  const canPlaceBet = selectedSide && isValidAmount && hasSufficientBalance && isBettingOpen;

  // High-Stakes Atmosphere: Detect surge in betting volume to trigger Dealer calm/shush gestures
  const isBettingVolumeSpike = useMemo(() => {
    if (currentRound?.status !== "BETTING") return false;
    const betsCount = currentRoundBets.length;
    const totalPool = (currentRound?.dragonPool || 0) + (currentRound?.tigerPool || 0);
    return betsCount >= 5 || totalPool >= 4500;
  }, [currentRound, currentRoundBets]);

  // Smart Hint 10-Round Roadmap Analytical Engine
  const smartHint = useMemo(() => {
    const defaultHint = {
      suggestedSide: "DRAGON" as "DRAGON" | "TIGER",
      dragonCount: 0,
      tigerCount: 0,
      tieCount: 0,
      totalAnalyzed: 0,
      dragonPct: 50,
      tigerPct: 50,
      confidence: 50,
      pattern: "BALANCED" as "HOT_DRAGON" | "HOT_TIGER" | "BALANCED",
      reason: "Initial shoe phase. Dragon and Tiger are evenly matched.",
      recentList: [] as { roundNumber: number; result: "DRAGON" | "TIGER" | "TIE" }[],
    };

    if (!roadmap || roadmap.length === 0) return defaultHint;

    const last10 = roadmap.slice(-10);
    let dragonCount = 0;
    let tigerCount = 0;
    let tieCount = 0;

    last10.forEach((r) => {
      if (r.result === "DRAGON") dragonCount++;
      else if (r.result === "TIGER") tigerCount++;
      else if (r.result === "TIE") tieCount++;
    });

    const totalNonTie = dragonCount + tigerCount || 1;
    const total = last10.length;
    const dragonPct = Math.round((dragonCount / total) * 100);
    const tigerPct = Math.round((tigerCount / total) * 100);

    let suggestedSide: "DRAGON" | "TIGER" = "DRAGON";
    let pattern: "HOT_DRAGON" | "HOT_TIGER" | "BALANCED" = "BALANCED";

    if (dragonCount > tigerCount) {
      suggestedSide = "DRAGON";
      pattern = "HOT_DRAGON";
    } else if (tigerCount > dragonCount) {
      suggestedSide = "TIGER";
      pattern = "HOT_TIGER";
    } else {
      // If equal, check the most recent non-tie round to catch the latest trend
      const lastNonTie = [...last10].reverse().find((r) => r.result === "DRAGON" || r.result === "TIGER");
      suggestedSide = lastNonTie?.result === "TIGER" ? "TIGER" : "DRAGON";
      pattern = "BALANCED";
    }

    const winCount = suggestedSide === "DRAGON" ? dragonCount : tigerCount;
    const confidence = Math.round((winCount / totalNonTie) * 100);

    let reason = "";
    if (dragonCount > tigerCount) {
      reason = `Dragon has won ${dragonCount} of the last ${total} rounds (${dragonPct}% win rate), showing dominant table momentum.`;
    } else if (tigerCount > dragonCount) {
      reason = `Tiger has won ${tigerCount} of the last ${total} rounds (${tigerPct}% win rate), indicating a strong winning trend.`;
    } else {
      reason = `Dragon and Tiger are tied at ${dragonCount} wins each in the last ${total} rounds. Momentum slightly favors ${suggestedSide}.`;
    }

    return {
      suggestedSide,
      dragonCount,
      tigerCount,
      tieCount,
      totalAnalyzed: total,
      dragonPct,
      tigerPct,
      confidence: Math.max(50, confidence),
      pattern,
      reason,
      recentList: last10.map((r, i) => ({
        roundNumber: r.roundNumber || i + 1,
        result: r.result,
      })),
    };
  }, [roadmap]);

  return (
    <div className="w-full h-full flex-1 min-h-0 text-neutral-200 font-sans selection:bg-amber-500/30 overflow-hidden relative flex flex-col justify-between select-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1a1a1a] via-black to-black">
      {/* Rules & Transparency Modal */}
      <AnimatePresence>
        {showRulesSheet && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="max-w-xl w-full smart-glass rounded-[40px] p-8 relative overflow-hidden border-white/10"
            >
               <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                     <div className="p-2.5 rounded-2xl bg-violet-500/10 border border-violet-500/20">
                        <ShieldCheck className="w-6 h-6 text-violet-400" />
                     </div>
                     <h2 className="text-xl font-bold tracking-tight text-white uppercase">Fairness Decree</h2>
                  </div>
                  <button onClick={() => setShowRulesSheet(false)} className="p-2 rounded-full hover:bg-white/5 transition-colors"><X className="w-6 h-6 text-neutral-500" /></button>
               </div>
               
               <div className="space-y-6 text-sm text-neutral-400 leading-relaxed">
                  <p>Our P2P matching engine ensures players wager against players. The house retains a 5% commission on winning stakes to maintain the sanctum.</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                      <span className="block font-bold text-violet-400 mb-1">TIE REBATE</span>
                      <p>Matched bets are forfeited in a tie. Unmatched funds return to your treasury.</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                      <span className="block font-bold text-cyan-400 mb-1">DIVINE PROOF</span>
                      <p>Every hand is cryptographically sealed and verifiable.</p>
                    </div>
                  </div>
                  <button onClick={onOpenProvablyFair} className="w-full py-4 rounded-2xl bg-violet-500 text-white font-bold hover:bg-violet-600 transition-all shadow-lg shadow-violet-500/20">Verify Protocol</button>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Navigation Sidebar */}
      <AnimatePresence>
        {showSidebarMobile && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            className="fixed inset-y-0 right-0 z-[120] w-[80%] max-w-sm smart-glass border-l border-white/5 p-6 lg:hidden flex flex-col gap-6 shadow-2xl"
          >
             <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-widest text-neutral-500">Live Insights</span>
                <button onClick={() => setShowSidebarMobile(false)} className="p-2 rounded-xl bg-white/5 text-neutral-400"><X className="w-5 h-5" /></button>
             </div>
             
             <div className="flex-1 overflow-hidden flex flex-col gap-4">
                <div className="flex gap-1 p-1 bg-black/40 rounded-2xl border border-white/5">
                   {['liveAction', 'chat', 'roadmap'].map((t) => (
                     <button
                       key={t}
                       onClick={() => setSidebarTab(t as any)}
                       className={`flex-1 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${
                         sidebarTab === t ? "bg-white/10 text-white" : "text-neutral-500"
                       }`}
                     >
                       {t.replace('liveAction', 'Activity').replace('chat', 'Social').replace('roadmap', 'Data')}
                     </button>
                   ))}
                </div>
                <div className="flex-1 overflow-y-auto no-scrollbar">
                   {sidebarTab === 'liveAction' && <LiveAction currentRoundBets={currentRoundBets} currentUser={user || undefined} roundNumber={currentRound?.roundNumber} onFollowBet={handleFollowBet} />}
                   {sidebarTab === 'chat' && <LiveChat username={user?.username || "Guest"} onRequireLogin={onRequireLogin} />}
                   {sidebarTab === 'roadmap' && (
                     <div className="grid grid-cols-6 gap-2 pt-2">
                        {roadmap.slice(-42).map((r, i) => (
                          <div key={i} className={`aspect-square rounded-lg flex items-center justify-center text-[10px] font-bold border border-white/5 ${
                             r.result === "DRAGON" ? "bg-violet-500/20 text-violet-400" : 
                             r.result === "TIGER" ? "bg-cyan-500/20 text-cyan-400" : "bg-neutral-500/20 text-neutral-400"
                          }`}>{r.result.charAt(0)}</div>
                        ))}
                     </div>
                   )}
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Floating Coins & Grand Victory Celebration Overlay */}
      <AnimatePresence>
        {showWinCelebration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowWinCelebration(false)}
            className="fixed inset-0 cursor-pointer z-[120] overflow-hidden flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm select-none"
          >
            {/* 36 Dynamic Golden Coin & Gem Fountain */}
            {[...Array(36)].map((_, i) => {
              const angle = (i / 36) * Math.PI * 2;
              const distance = 180 + (i % 6) * 60;
              const destX = Math.cos(angle) * distance + (Math.random() - 0.5) * 60;
              const destY = Math.sin(angle) * distance - 100 + (Math.random() - 0.5) * 60;
              return (
                <motion.div
                  key={i}
                  initial={{
                    x: 0,
                    y: 40,
                    scale: 0.2,
                    opacity: 1,
                    rotate: 0,
                  }}
                  animate={{
                    x: destX,
                    y: destY,
                    scale: [0.2, 1.4, 0.9],
                    opacity: [1, 1, 0],
                    rotate: (i % 2 === 0 ? 1 : -1) * (360 + i * 30),
                  }}
                  transition={{
                    duration: 1.8 + (i % 4) * 0.2,
                    ease: [0.22, 1, 0.36, 1],
                    delay: (i % 6) * 0.04,
                  }}
                  className="absolute text-2xl sm:text-4xl drop-shadow-[0_0_20px_rgba(251,191,36,1)] select-none"
                >
                  {i % 4 === 0 ? "💎" : i % 3 === 0 ? "✨" : "🪙"}
                </motion.div>
              );
            })}

            {/* Grand Victory Marquee Banner */}
            <motion.div
              initial={{ scale: 0.3, opacity: 0, y: 60 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ type: "spring", stiffness: 360, damping: 18 }}
              className="relative px-8 sm:px-14 py-6 sm:py-8 bg-gradient-to-b from-neutral-950/95 via-amber-950/90 to-neutral-950/95 text-white font-black rounded-3xl shadow-[0_0_100px_rgba(251,191,36,0.9)] border-4 border-amber-400 flex flex-col items-center gap-2 z-50 max-w-sm sm:max-w-md text-center"
            >
              {/* Spinning Radiant Corona */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                className="absolute -inset-4 rounded-3xl border border-amber-400/40 pointer-events-none"
              />

              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-300 to-amber-600 flex items-center justify-center shadow-[0_0_30px_rgba(251,191,36,1)] border-2 border-yellow-200">
                <Crown className="w-9 h-9 sm:w-11 sm:h-11 text-neutral-950 fill-neutral-950" />
              </div>

              <span className="text-2xl sm:text-4xl font-black bg-gradient-to-r from-yellow-200 via-amber-300 to-yellow-400 bg-clip-text text-transparent drop-shadow uppercase tracking-wider">
                BIG WINNER!
              </span>

              <span className="text-xs sm:text-sm font-black text-amber-200/90 tracking-[0.25em] uppercase font-mono">
                {activeConfirmedBet?.side} TRIUMPH
              </span>

              {activeConfirmedBet && (
                <div className="mt-2 px-5 py-1.5 rounded-full bg-black/80 border border-amber-400 text-amber-300 font-mono font-black text-base sm:text-xl shadow-inner">
                  +{formatAmt(
                    lastWinPayout > 0 ? lastWinPayout : Math.floor(activeConfirmedBet.amount * 1.9),
                    true
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Slide-In Bet Accepted Server Notification Toast */}
      <AnimatePresence>
        {betAcceptedToast && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 450, damping: 22 }}
            className="absolute top-14 left-1/2 -translate-x-1/2 z-[120] pointer-events-none"
          >
            <div className="px-4 py-2.5 rounded-2xl bg-neutral-950/95 border-2 border-emerald-400/90 shadow-[0_10px_35px_rgba(16,185,129,0.5)] backdrop-blur-xl flex items-center gap-3 text-white">
              <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-400/80 flex items-center justify-center text-emerald-400 font-black text-xs shrink-0 animate-bounce">
                ✓
              </div>
              <div className="text-left">
                <div className="text-[9px] font-mono font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>BET CONFIRMED BY SERVER</span>
                </div>
                <div className="text-xs sm:text-sm font-black font-mono tracking-tight text-white flex items-center gap-1.5">
                  <span>{formatAmt(betAcceptedToast.amount)}</span>
                  <span className="text-amber-400 font-sans text-[10px]">ON</span>
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase text-[10px] font-mono">
                    {betAcceptedToast.side}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Physics Flying Chips Animation Layer */}
      <AnimatePresence>
        {flyingChips.map((chip) => (
          <motion.div
            key={chip.id}
            initial={{
              x: chip.startX - 20,
              y: chip.startY - 20,
              scale: 0.5,
              rotate: 0,
              opacity: 0,
            }}
            animate={{
              x: chip.targetX - 20,
              y: chip.targetY - 20,
              scale: [0.5, 1.25, 1],
              rotate: [0, -180, -360],
              opacity: [0, 1, 1],
            }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{
              duration: 0.52,
              ease: [0.19, 1, 0.22, 1],
            }}
            className="fixed top-0 left-0 z-[160] pointer-events-none transform-gpu"
          >
            <div className="relative">
              <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full border-2 shadow-[0_0_25px_rgba(245,158,11,0.9)] flex items-center justify-center font-black text-[9px] sm:text-[10px] font-mono ring-2 ring-black/80 ${
                chip.side.includes("DRAGON")
                  ? "bg-gradient-to-br from-red-600 via-rose-500 to-red-700 border-amber-300 text-white shadow-red-500/80"
                  : "bg-gradient-to-br from-amber-500 via-yellow-400 to-amber-600 border-white text-neutral-950 shadow-amber-500/80"
              }`}>
                <div className="w-6.5 h-6.5 sm:w-8 sm:h-8 rounded-full border border-dashed border-current/40 bg-white/20 backdrop-blur-xs flex items-center justify-center font-mono">
                  {formatAmt(chip.amount, true)}
                </div>
              </div>
              <div className={`absolute -inset-2 rounded-full border-2 animate-impact-ripple pointer-events-none ${
                chip.side.includes("DRAGON") ? "border-red-400" : "border-amber-400"
              }`} />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Voice Recognition Floating Feedback Banner */}
      <AnimatePresence>
        {(isListeningVoice || voiceFeedback) && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="absolute top-20 left-1/2 transform -translate-x-1/2 z-[110] bg-black/90 backdrop-blur-2xl border-2 border-red-500/80 rounded-2xl px-6 py-3 shadow-[0_10px_40px_rgba(239,68,68,0.5)] flex items-center gap-3 text-white pointer-events-auto"
          >
            <div className="w-3 h-3 rounded-full bg-red-500 animate-ping shrink-0" />
            <div className="flex flex-col">
              <span className="text-xs font-black uppercase tracking-wider text-red-400">
                🎙️ Voice Betting Assistant
              </span>
              <span className="text-sm font-mono font-bold text-amber-300">
                {voiceFeedback ? voiceFeedback.message : voiceTranscript ? `"${voiceTranscript}"` : "Listening... Say 'Bet 100 on Dragon'"}
              </span>
            </div>
            <button
              onClick={() => {
                if (recognitionRef.current && recognitionRef.current.stop) recognitionRef.current.stop();
                setIsListeningVoice(false);
                setVoiceFeedback(null);
              }}
              className="ml-3 p-1 rounded-lg bg-white/10 hover:bg-white/20 text-neutral-300"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Non-blocking Table Toast Banner */}
      <AnimatePresence>
        {tableToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-16 left-1/2 transform -translate-x-1/2 z-[140] bg-neutral-950/95 backdrop-blur-2xl border border-amber-500/80 rounded-2xl px-5 py-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.9)] flex items-center gap-2.5 text-amber-200 text-xs font-bold pointer-events-auto max-w-md text-center"
          >
            <span className="text-amber-400 shrink-0">⚠️</span>
            <span className="flex-1">{tableToast}</span>
            <button
              onClick={() => setTableToast(null)}
              className="p-1 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div 
        ref={gameContainerRef}
        className="w-full h-full flex-1 flex flex-col items-center justify-between p-0.5 xs:p-1 sm:p-2 md:p-3 relative overflow-hidden select-none box-border"
        style={{
          backgroundImage: `radial-gradient(circle at 50% 30%, rgba(20, 5, 5, 0.3) 0%, rgba(5, 2, 2, 0.92) 100%), url(${virtualCasinoBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* AnimatePresence Confetti Particle Effect (Winning Side Only on High-Stakes Payout) */}
        <WinningSideConfetti
          side={winningSideConfetti?.side || null}
          payout={winningSideConfetti?.payout}
          multiplier={winningSideConfetti?.multiplier}
          isUserWinner={winningSideConfetti?.isUserWinner}
          activationKey={winningSideConfetti?.activationKey}
          onComplete={() => setWinningSideConfetti(null)}
        />

        {/* Subtle Ambient Candlelight Sconces (Synced with Dealer Breathing Cycle) */}
        <div className="absolute top-1/4 left-4 sm:left-12 w-48 sm:w-64 h-48 sm:h-64 rounded-full bg-radial from-amber-500/20 via-amber-600/5 to-transparent blur-3xl pointer-events-none animate-candlelight-flicker" />
        <div className="absolute top-1/4 right-4 sm:right-12 w-48 sm:w-64 h-48 sm:h-64 rounded-full bg-radial from-amber-500/20 via-amber-600/5 to-transparent blur-3xl pointer-events-none animate-candlelight-flicker [animation-delay:-2s]" />

        {/* Floating Background Candle Flame Embers */}
        <div className="absolute top-12 left-8 sm:left-20 hidden md:flex flex-col items-center pointer-events-none opacity-60">
          <div className="w-2.5 h-4 bg-gradient-to-t from-amber-500 via-yellow-300 to-white rounded-full blur-[1px] animate-candlelight-flame shadow-[0_0_15px_rgba(251,191,36,0.8)]" />
          <div className="w-1.5 h-6 bg-neutral-900/80 rounded-b" />
        </div>
        <div className="absolute top-12 right-8 sm:right-20 hidden md:flex flex-col items-center pointer-events-none opacity-60 [animation-delay:-2s]">
          <div className="w-2.5 h-4 bg-gradient-to-t from-amber-500 via-yellow-300 to-white rounded-full blur-[1px] animate-candlelight-flame [animation-delay:-1.8s] shadow-[0_0_15px_rgba(251,191,36,0.8)]" />
          <div className="w-1.5 h-6 bg-neutral-900/80 rounded-b" />
        </div>

        {/* Floating Candlelight Dust Motes & Shimmering Ambient Particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
          {[
            { left: "15%", top: "45%", size: 3, anim: "animate-dust-slow", delay: "0s" },
            { left: "28%", top: "60%", size: 2, anim: "animate-dust-gentle", delay: "-3s" },
            { left: "42%", top: "35%", size: 2.5, anim: "animate-dust-sway", delay: "-7s" },
            { left: "65%", top: "50%", size: 3.5, anim: "animate-dust-slow", delay: "-10s" },
            { left: "78%", top: "65%", size: 2, anim: "animate-dust-gentle", delay: "-5s" },
            { left: "88%", top: "40%", size: 3, anim: "animate-dust-sway", delay: "-12s" },
            { left: "22%", top: "25%", size: 2, anim: "animate-dust-slow", delay: "-2s" },
            { left: "35%", top: "75%", size: 3, anim: "animate-dust-gentle", delay: "-8s" },
            { left: "55%", top: "30%", size: 2.5, anim: "animate-dust-sway", delay: "-4s" },
            { left: "72%", top: "70%", size: 2, anim: "animate-dust-slow", delay: "-14s" },
            { left: "82%", top: "28%", size: 3, anim: "animate-dust-gentle", delay: "-9s" },
            { left: "48%", top: "55%", size: 2, anim: "animate-dust-sway", delay: "-1s" },
            { left: "12%", top: "70%", size: 2.5, anim: "animate-dust-slow", delay: "-11s" },
            { left: "60%", top: "80%", size: 2, anim: "animate-dust-gentle", delay: "-6s" },
          ].map((mote, idx) => (
            <div
              key={idx}
              className={`absolute rounded-full bg-gradient-to-tr from-amber-300 via-yellow-200 to-white animate-mote-shimmer ${mote.anim}`}
              style={{
                left: mote.left,
                top: mote.top,
                width: `${mote.size}px`,
                height: `${mote.size}px`,
                animationDelay: mote.delay,
              }}
            />
          ))}
        </div>

        {/* SETTINGS MODAL (Screenshot 1 Exact Implementation) */}
        <AnimatePresence>
          {showSettingsModal && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="fixed inset-x-3 top-14 sm:absolute sm:inset-auto sm:top-16 sm:right-4 z-50 w-auto max-w-sm sm:w-80 bg-neutral-950/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 sm:p-5 shadow-[0_25px_60px_rgba(0,0,0,0.95)] text-neutral-200 select-none mx-auto sm:mx-0"
            >
               {/* Header Tabs & Close Button */}
               <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <span className="text-sm font-black text-white">Settings</span>
                  <div className="flex items-center gap-1 bg-black/60 rounded-xl p-1 border border-white/5">
                     <button
                       onClick={() => setSettingsTab("settings")}
                       className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                         settingsTab === "settings" ? "bg-white/10 text-white shadow" : "text-neutral-500 hover:text-neutral-300"
                       }`}
                     >
                       Settings
                     </button>
                     <button
                       onClick={() => setSettingsTab("mute")}
                       className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                         settingsTab === "mute" ? "bg-white/10 text-white shadow" : "text-neutral-500 hover:text-neutral-300"
                       }`}
                     >
                       Mute
                     </button>
                  </div>
                  <button
                    onClick={() => setShowSettingsModal(false)}
                    className="p-1 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
               </div>

               {/* Settings Controls */}
               <div className="space-y-4 py-4 text-xs font-medium">
                  {/* Sound Toggle */}
                  <div className="flex items-center justify-between">
                     <span className="text-neutral-300">Sound</span>
                     <button
                       onClick={() => setIsSoundEnabled(!isSoundEnabled)}
                       className={`w-10 h-5 flex items-center rounded-full p-1 transition-colors ${
                         isSoundEnabled ? "bg-amber-500 justify-end" : "bg-neutral-800 justify-start"
                       }`}
                     >
                       <span className="w-3.5 h-3.5 rounded-full bg-white shadow-md transform transition-transform" />
                     </button>
                  </div>

                  {/* Volume Slider */}
                  <div className="space-y-1.5">
                     <span className="text-neutral-300 block">Volume</span>
                     <div className="flex items-center gap-3 bg-amber-600/90 rounded-xl px-3 py-2">
                        <Volume2 className="w-4 h-4 text-neutral-950 shrink-0" />
                        <input 
                          type="range" 
                          min="0" 
                          max="100" 
                          value={volumeLevel} 
                          onChange={(e) => setVolumeLevel(Number(e.target.value))}
                          className="w-full accent-amber-300 cursor-pointer h-1.5 bg-black/30 rounded-lg" 
                        />
                     </div>
                  </div>

                  {/* Show Winner List Toggle */}
                  <div className="flex items-center justify-between pt-2">
                     <span className="text-neutral-300">Show winner list</span>
                     <button
                       onClick={() => setShowWinnerList(!showWinnerList)}
                       className={`w-10 h-5 flex items-center rounded-full p-1 transition-colors ${
                         showWinnerList ? "bg-amber-500 justify-end" : "bg-neutral-800 justify-start"
                       }`}
                     >
                       <span className="w-3.5 h-3.5 rounded-full bg-white shadow-md transform transition-transform" />
                     </button>
                  </div>

                  {/* Show Other Players Reactions Toggle */}
                  <div className="flex items-center justify-between">
                     <span className="text-neutral-300">Show other players reactions</span>
                     <button
                       onClick={() => setShowOtherReactions(!showOtherReactions)}
                       className={`w-10 h-5 flex items-center rounded-full p-1 transition-colors ${
                         showOtherReactions ? "bg-amber-500 justify-end" : "bg-neutral-800 justify-start"
                       }`}
                     >
                       <span className="w-3.5 h-3.5 rounded-full bg-white shadow-md transform transition-transform" />
                     </button>
                  </div>

                  {/* High-Stakes Confetti Preview Controls */}
                  <div className="pt-2 border-t border-white/10 space-y-2">
                     <div className="flex items-center justify-between text-[11px] text-amber-300 font-bold uppercase tracking-wider">
                       <span>Winning Side Confetti Test</span>
                       <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                     </div>
                     <div className="grid grid-cols-2 gap-2">
                       <button
                         onClick={() => {
                           setWinningSideConfetti({
                             side: "DRAGON",
                             payout: 950,
                             multiplier: 1.9,
                             isUserWinner: true,
                             activationKey: Date.now(),
                           });
                           sound.playBigWin();
                           sound.playCoinCascade();
                         }}
                         className="px-2 py-1.5 rounded-lg bg-red-950/80 hover:bg-red-900 border border-red-500/60 text-red-200 text-[10px] font-bold flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer"
                       >
                         <span>🐉</span>
                         <span>Test Dragon</span>
                       </button>
                       <button
                         onClick={() => {
                           setWinningSideConfetti({
                             side: "TIGER",
                             payout: 950,
                             multiplier: 1.9,
                             isUserWinner: true,
                             activationKey: Date.now(),
                           });
                           sound.playBigWin();
                           sound.playCoinCascade();
                         }}
                         className="px-2 py-1.5 rounded-lg bg-amber-950/80 hover:bg-amber-900 border border-amber-500/60 text-amber-200 text-[10px] font-bold flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer"
                       >
                         <span>🐯</span>
                         <span>Test Tiger</span>
                       </button>
                     </div>
                  </div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* LIVE BETS & WIN/LOSS TRANSPARENCY MODAL */}
        {showLiveTransparencyModal && (
          <LiveBetTransparencyModal
            isOpen={showLiveTransparencyModal}
            onClose={() => setShowLiveTransparencyModal(false)}
            currentRoundBets={currentRoundBets}
            recentSettledBets={recentSettledBets}
            currentRound={currentRound}
            currentUser={user}
            lang={lang}
            formatAmt={formatAmt}
            onFollowBet={handleFollowBet}
            isBettingOpen={isBettingOpen}
          />
        )}

        {/* MY BETS / HISTORY MODAL (Screenshot 2 Exact Implementation) */}
        <AnimatePresence>
          {showHistoryModal && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="fixed inset-x-3 top-14 sm:absolute sm:inset-auto sm:top-16 sm:right-4 z-50 w-auto max-w-md sm:w-96 bg-neutral-950/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 sm:p-5 shadow-[0_25px_60px_rgba(0,0,0,0.95)] text-neutral-200 select-none mx-auto sm:mx-0"
            >
               {/* Header Tabs & Close */}
               <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <span className="text-sm font-black text-white">My bets</span>
                  <div className="flex items-center gap-1 bg-black/60 rounded-xl p-1 border border-white/5">
                     <button
                       onClick={() => setHistoryTab("myBets")}
                       className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                         historyTab === "myBets" ? "bg-white/10 text-white shadow" : "text-neutral-500 hover:text-neutral-300"
                       }`}
                     >
                       My bets
                     </button>
                     <button
                       onClick={() => setHistoryTab("history")}
                       className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                         historyTab === "history" ? "bg-white/10 text-white shadow" : "text-neutral-500 hover:text-neutral-300"
                       }`}
                     >
                       History
                     </button>
                     <button
                       onClick={() => setHistoryTab("mute")}
                       className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                         historyTab === "mute" ? "bg-white/10 text-white shadow" : "text-neutral-500 hover:text-neutral-300"
                       }`}
                     >
                       Mute
                     </button>
                  </div>
                  <button
                    onClick={() => setShowHistoryModal(false)}
                    className="p-1 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
               </div>

               {/* Table Columns */}
               <div className="grid grid-cols-4 text-[10px] font-black text-neutral-400 uppercase tracking-wider py-2.5 border-b border-white/5 font-mono">
                  <span>Date</span>
                  <span>Game</span>
                  <span className="text-right">€ Bet</span>
                  <span className="text-right">€ Result</span>
               </div>

               {/* Bets List / Empty State */}
               <div className="min-h-[160px] max-h-[240px] overflow-y-auto no-scrollbar py-4 flex flex-col items-center justify-center">
                  {recentSettledBets.length > 0 ? (
                    <div className="w-full space-y-2 text-xs font-mono">
                       {recentSettledBets.slice(0, 8).map((b, i) => (
                         <div key={i} className="grid grid-cols-4 items-center text-[11px] py-1 border-b border-white/5">
                            <span className="text-neutral-400">{new Date(b.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            <span className="font-bold text-amber-400">{b.side}</span>
                            <span className="text-right font-mono">{formatAmt(b.amount)}</span>
                            <span className={`text-right font-mono font-black ${(b.payout ?? 0) > 0 ? "text-emerald-400" : "text-neutral-500"}`}>
                              {(b.payout ?? 0) > 0 ? `+${formatAmt(b.payout)}` : "0"}
                            </span>
                         </div>
                       ))}
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-neutral-500">No results</span>
                  )}
               </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CENTER LAYER: FULL-WIDTH LIVE CASINO STUDIO TABLE */}
        <div className="relative w-full flex-1 min-h-[210px] xs:min-h-[240px] sm:min-h-[280px] flex items-center justify-center my-auto py-0.5 sm:py-1 px-1 sm:px-2 overflow-visible">
           
           {/* FULL-WIDTH 3D OVAL TABLE CONTAINER - Seamlessly anchored without bottom gaps */}
           <div 
             ref={tableRef}
             className="table-parallax-container relative w-full max-w-5xl h-full min-h-[200px] xs:min-h-[230px] sm:min-h-[270px] md:min-h-[310px] max-h-[46vh] sm:max-h-[50vh] flex items-center justify-center select-none mx-auto"
           >
              {/* Main Oval Table Felt with Deep Mahogany Wood Rim & Brass Inlays */}
              <div 
                className="table-layer-rim relative w-full h-full rounded-[36px] xs:rounded-[52px] sm:rounded-[90px] md:rounded-[140px] overflow-hidden flex flex-col items-center justify-between p-1.5 xs:p-2 sm:p-4 md:p-5 transition-all shadow-[0_20px_50px_rgba(0,0,0,0.95)]"
                style={{
                  background: "radial-gradient(ellipse at 50% 38%, #ba1a1a 0%, #901616 38%, #6a1010 72%, #320505 100%)",
                  border: "5px sm:border-[10px] solid #1a0a05",
                  boxShadow: "inset 0 0 50px rgba(0,0,0,0.85), 0 15px 40px rgba(0,0,0,0.9), 0 0 0 1.5px #d97706, 0 0 0 3px #78350f",
                }}
              >
                 {/* Layer 3: Felt Texture, Noise Wear & Tear Overlay, Candlelight & Spotlight Glow */}
                 <div className="table-layer-felt absolute inset-0 pointer-events-none overflow-hidden rounded-[inherit]">
                   <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,rgba(255,255,255,0.25)_0%,transparent_65%)]" />
                   <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_25%,rgba(245,158,11,0.18)_0%,transparent_60%)] animate-candlelight-ambient" />
                   <div className="absolute -inset-[100%] animate-spotlight-sweep table-spotlight-beam opacity-75 mix-blend-screen" />
                   
                   {/* Subtle Wear & Tear Low-Opacity CSS Noise Overlay */}
                   <div className="absolute inset-0 felt-wear-tear-overlay opacity-90 pointer-events-none" />

                   {/* DYNAMIC GAME PHASE ATMOSPHERE OVERLAY: Warmer Amber (Betting) -> Cooler Blue (Dealing) -> Deep Red (Payout Settlement) */}
                   <div 
                     className={`absolute inset-0 transition-all duration-700 pointer-events-none rounded-[inherit] ${
                       currentRound?.status === "BETTING"
                         ? timeLeft <= 5
                           ? "table-state-overlay-betting-urgent opacity-100"
                           : "table-state-overlay-betting opacity-100"
                         : currentRound?.status === "MATCHING" || currentRound?.status === "DEALING"
                         ? "table-state-overlay-dealing opacity-100"
                         : "table-state-overlay-settling opacity-100"
                     }`} 
                   />

                   {/* Dealing Phase High-Tech Laser Sweep Sheen */}
                   <AnimatePresence>
                     {(currentRound?.status === "DEALING" || currentRound?.status === "MATCHING") && (
                       <motion.div
                         initial={{ opacity: 0 }}
                         animate={{ opacity: 1 }}
                         exit={{ opacity: 0 }}
                         className="absolute inset-0 pointer-events-none overflow-hidden rounded-[inherit]"
                       >
                         <div className="absolute inset-y-0 w-32 bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent blur-md animate-[laser-dealing-sweep_2.4s_ease-in-out_infinite]" />
                       </motion.div>
                     )}
                   </AnimatePresence>

                   {/* Settlement Phase Radial Edge Heat Burst */}
                   <AnimatePresence>
                     {(currentRound?.status === "SETTLING" || currentRound?.status === "COMPLETED") && (
                       <motion.div
                         initial={{ opacity: 0, scale: 0.95 }}
                         animate={{ opacity: 1, scale: 1 }}
                         exit={{ opacity: 0 }}
                         transition={{ duration: 0.6 }}
                         className="absolute inset-0 rounded-[inherit] bg-gradient-to-t from-red-600/20 via-transparent to-red-600/15 pointer-events-none"
                       />
                     )}
                   </AnimatePresence>

                   {/* Localized High-Traffic Baize Wear Footprint Under Dragon Card Position */}
                   <div className="card-slot-wear-footprint absolute left-[22%] sm:left-[26%] top-[48%] -translate-x-1/2 -translate-y-1/2 w-24 sm:w-32 h-32 sm:h-40 rounded-full opacity-65 pointer-events-none" />

                   {/* Localized High-Traffic Baize Wear Footprint Under Tiger Card Position */}
                   <div className="card-slot-wear-footprint absolute right-[22%] sm:right-[26%] top-[48%] translate-x-1/2 -translate-y-1/2 w-24 sm:w-32 h-32 sm:h-40 rounded-full opacity-65 pointer-events-none" />

                   {/* Card Slide Friction Path from Shoe to Table Surface */}
                   <div className="absolute top-[12%] left-1/2 -translate-x-1/2 w-48 sm:w-64 h-28 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,255,255,0.06)_0%,transparent_70%)] mix-blend-soft-light pointer-events-none" />
                 </div>

                 {/* TOP SECTION: BURN CARD (LEFT) & DECK SHOE (CENTER) */}
                 <div 
                   className="table-layer-cards-ui w-full flex items-start justify-between relative z-10 px-3 xs:px-6 sm:px-14 pt-1 sm:pt-2"
                   style={{
                     transform: `scale(${Math.min(cardScale, 1)})`,
                     transformOrigin: "top center",
                   }}
                 >
                    
                    {/* Top-Left: Face-down Burn / Discard Card with Criss-Cross Pattern */}
                    <div className="w-8 h-12 xs:w-10 xs:h-15 sm:w-13 sm:h-18 rounded-lg bg-neutral-900 border-2 border-amber-400/80 shadow-2xl rotate-[-15deg] overflow-hidden relative flex items-center justify-center transition-transform hover:rotate-[-12deg] shrink-0">
                       {/* Criss-Cross Diamond Card Back Pattern */}
                       <div 
                         className="absolute inset-0 opacity-85" 
                         style={{
                           backgroundImage: `repeating-linear-gradient(45deg, #0f0f0f 0, #0f0f0f 2px, #c5a880 0, #c5a880 3px), repeating-linear-gradient(-45deg, #0f0f0f 0, #0f0f0f 2px, #c5a880 0, #c5a880 3px)`,
                         }}
                       />
                       <div className="absolute inset-1 rounded border border-amber-200/50 pointer-events-none" />
                    </div>

                    {/* Top-Center: Live Dealing Deck Shoe with Ultra-Realistic 3D Card Ejection Physics */}
                    <div data-card-slot="shoe" className="relative flex flex-col items-center group shrink-0">
                       <div className="w-11 h-15 xs:w-13 xs:h-17 sm:w-16 sm:h-20 rounded-xl bg-gradient-to-b from-neutral-900 via-neutral-950 to-black border-2 border-amber-400 shadow-[0_12px_30px_rgba(0,0,0,0.95)] overflow-visible relative flex items-center justify-center">
                          {/* Criss-Cross Diamond Gold Foil Card Back Pattern */}
                          <div 
                            className="absolute inset-0 opacity-90 rounded-xl overflow-hidden" 
                            style={{
                              backgroundImage: `repeating-linear-gradient(45deg, #0f0f0f 0, #0f0f0f 2px, #d4af37 0, #d4af37 3.5px), repeating-linear-gradient(-45deg, #0f0f0f 0, #0f0f0f 2px, #d4af37 0, #d4af37 3.5px)`,
                            }}
                          />
                          <div className="absolute inset-1 rounded-lg border border-amber-200/60 pointer-events-none" />

                          {/* Shoe Dispenser Roller Mouth Glow */}
                          <div className="absolute -bottom-1 inset-x-2 h-1 bg-amber-400 rounded-full blur-[1px] opacity-80" />

                          {/* Live Shoe Optical Scanner Gleam when inspected by Dealer */}
                          <AnimatePresence>
                            {isShoeInspecting && (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none z-30"
                              >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/35 to-transparent animate-[shoe-optical-scan_2.4s_ease-in-out_infinite]" />
                                <div className="absolute -top-5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-black/95 border border-cyan-400/80 text-[7px] font-mono text-cyan-300 whitespace-nowrap shadow-md flex items-center gap-1">
                                  <span className="w-1 h-1 rounded-full bg-cyan-400 animate-ping" />
                                  <span>SHOE VERIFIED</span>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Live Dealing Ejection Flare when Cards slide out */}
                          <AnimatePresence>
                            {currentRound?.status === "DEALING" && (
                              <motion.div
                                initial={{ opacity: 0, scaleY: 0 }}
                                animate={{ opacity: [0, 1, 0.5, 1, 0], scaleY: [0, 1.2, 0.8, 1.1, 0] }}
                                transition={{ duration: 1.2, ease: "easeOut" }}
                                className="absolute -bottom-2 inset-x-1 h-3 rounded-full bg-gradient-to-r from-red-500 via-amber-300 to-cyan-400 blur-[2px] pointer-events-none z-30"
                              />
                            )}
                          </AnimatePresence>
                       </div>
                       {/* Stack Depth Layers */}
                       <div className="w-12 h-1 bg-amber-200 rounded-b shadow -mt-0.5" />
                       <div className="w-11 h-1 bg-neutral-400 rounded-b shadow -mt-0.5" />
                       <div className="w-10 h-1 bg-neutral-600 rounded-b shadow -mt-0.5" />
                    </div>

                    {/* Top-Right: Stylized Animated Dealer Avatar */}
                    <div className="relative z-20 flex items-center justify-center -mt-2 sm:-mt-3 scale-80 xs:scale-90 sm:scale-100 origin-top-right shrink-0">
                       <DealerAvatar
                         gameStatus={currentRound?.status || "BETTING"}
                         winnerResult={currentRound?.result}
                         dragonCardDisplay={currentRound?.dragonCard?.display}
                         tigerCardDisplay={currentRound?.tigerCard?.display}
                         timeLeft={timeLeft}
                         dealerCommentary={dealerCommentary}
                         isBigWin={showWinCelebration && lastWinPayout >= 500}
                         userWon={isUserLastRoundWinner}
                         userLost={Boolean(activeConfirmedBet && !isUserLastRoundWinner && currentRound?.result && currentRound.result !== "TIE" && (currentRound.matchedAmount || 0) > 0)}
                         bettingVolumeSpike={isBettingVolumeSpike}
                       />
                    </div>
                 </div>

                 {/* LIVING GOLDEN CHINESE DRAGON SPIRIT (LEFT FELT) */}
                 <motion.div
                   animate={{
                     scale: currentRound?.result === "DRAGON" && (currentRound.status === "SETTLING" || currentRound.status === "COMPLETED") ? [1, 1.08, 1] : [1, 1.02, 1],
                     opacity: currentRound?.result === "DRAGON" ? [0.6, 0.95, 0.6] : [0.35, 0.5, 0.35],
                   }}
                   transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                   className="absolute left-4 sm:left-12 top-1/2 -translate-y-1/2 w-48 sm:w-64 h-48 sm:h-64 pointer-events-none select-none"
                 >
                    <svg viewBox="0 0 200 200" className={`w-full h-full stroke-current fill-none stroke-[1.8] transition-all duration-500 ${
                      currentRound?.result === "DRAGON"
                        ? "text-red-400 drop-shadow-[0_0_25px_rgba(239,68,68,0.95)]"
                        : "text-amber-300/60 drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
                    }`}>
                      <path d="M40,100 C60,40 140,40 160,100 C180,160 100,180 60,140 C40,120 70,80 100,80 C130,80 140,110 120,130 C100,150 80,130 90,110" />
                      <circle cx="100" cy="80" r="15" />
                      <circle cx="96" cy="78" r="2.5" className={currentRound?.result === "DRAGON" ? "fill-red-400 animate-ping" : "fill-amber-300"} />
                      <path d="M85,75 Q90,65 100,75 Q110,65 115,75" />
                      <path d="M30,120 Q10,100 30,80 Q50,90 30,120" />
                      <path d="M170,120 Q190,100 170,80 Q150,90 170,120" />
                    </svg>
                 </motion.div>

                 {/* LIVING GOLDEN CHINESE TIGER SPIRIT (RIGHT FELT) */}
                 <motion.div
                   animate={{
                     scale: currentRound?.result === "TIGER" && (currentRound.status === "SETTLING" || currentRound.status === "COMPLETED") ? [1, 1.08, 1] : [1, 1.02, 1],
                     opacity: currentRound?.result === "TIGER" ? [0.6, 0.95, 0.6] : [0.35, 0.5, 0.35],
                   }}
                   transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                   className="absolute right-4 sm:right-12 top-1/2 -translate-y-1/2 w-48 sm:w-64 h-48 sm:h-64 pointer-events-none select-none"
                 >
                    <svg viewBox="0 0 200 200" className={`w-full h-full stroke-current fill-none stroke-[1.8] transition-all duration-500 ${
                      currentRound?.result === "TIGER"
                        ? "text-amber-400 drop-shadow-[0_0_25px_rgba(251,191,36,0.95)]"
                        : "text-amber-300/60 drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
                    }`}>
                      <circle cx="100" cy="100" r="50" />
                      <circle cx="85" cy="88" r="2.5" className={currentRound?.result === "TIGER" ? "fill-amber-300 animate-ping" : "fill-amber-300"} />
                      <circle cx="115" cy="88" r="2.5" className={currentRound?.result === "TIGER" ? "fill-amber-300 animate-ping" : "fill-amber-300"} />
                      <path d="M70,80 Q100,120 130,80" />
                      <path d="M80,110 L120,110" />
                      <path d="M90,130 L110,130" />
                      <path d="M60,60 Q70,40 90,55" />
                      <path d="M140,60 Q130,40 110,55" />
                      <path d="M60,140 C80,170 120,170 140,140" />
                    </svg>
                 </motion.div>

                 {/* DEALT PLAYING CARDS & DEDICATED FELT BOXES (Centerstage) */}
                 <div 
                   className="relative z-20 flex items-center justify-center gap-2 xs:gap-3 sm:gap-8 md:gap-12 my-auto max-w-full px-1"
                   style={{
                     transform: `scale(${cardScale})`,
                     transformOrigin: "center center",
                   }}
                 >
                    {/* DRAGON FELT CARD BOX */}
                    <div data-card-slot="dragon" className="flex flex-col items-center gap-1 shrink-0">
                       <motion.div
                         onClick={() => handleSelectSide("DRAGON")}
                         whileHover={{ scale: 1.03 }}
                         whileTap={{ scale: 0.97 }}
                         className={`relative w-16 h-22 xs:w-18 xs:h-26 sm:w-22 sm:h-32 rounded-xl xs:rounded-2xl flex items-center justify-center cursor-pointer transition-[border-color,background-color,box-shadow] duration-300 ${
                           currentRound?.result === "DRAGON" && (currentRound.status === "SETTLING" || currentRound.status === "COMPLETED")
                             ? "ring-4 ring-red-500 shadow-[0_0_40px_rgba(239,68,68,0.95)] bg-red-950/40"
                             : slotPulse.dragon === "WIN"
                             ? "ring-4 ring-red-500 shadow-[0_0_35px_rgba(239,68,68,0.9)] bg-red-950/40 animate-pulse"
                             : slotPulse.dragon === "LOSS"
                             ? "opacity-50 grayscale border-neutral-700 bg-neutral-950/40"
                             : selectedSide === "DRAGON"
                             ? "ring-4 ring-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.85)] bg-amber-950/30"
                             : "border-2 border-amber-400/60 bg-black/50 hover:border-amber-300 hover:bg-black/60 shadow-inner"
                         }`}
                         style={{
                           boxShadow: currentRound?.result === "DRAGON" || slotPulse.dragon === "WIN" ? "0 0 40px rgba(239,68,68,0.9), inset 0 0 25px rgba(239,68,68,0.5)" : "inset 0 0 20px rgba(0,0,0,0.85)",
                         }}
                       >
                          {/* Inner Felt Golden Border Line */}
                          <div className="absolute inset-1.5 rounded-xl border border-amber-400/35 pointer-events-none" />

                          <AnimatePresence>
                            {currentRound?.dragonCard ? (
                              <PlayingCardComponent 
                                key="dragon-card"
                                card={currentRound.dragonCard} 
                                side="DRAGON" 
                                isWinner={currentRound.result === "DRAGON"} 
                                gameStatus={currentRound.status}
                                isAlreadyRevealed={currentRound.status === "SETTLING" || currentRound.status === "COMPLETED"}
                                showWinnerCelebration={dealingStep === "WINNER_REVEALED" || currentRound.status === "SETTLING" || currentRound.status === "COMPLETED"}
                              />
                            ) : (
                              <motion.div
                                key="dragon-placeholder"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 0.75, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.7 }}
                                transition={{ duration: 0.25 }}
                                className="flex flex-col items-center justify-center hover:opacity-100 transition-opacity"
                              >
                                 <span className="text-3xl sm:text-4xl filter drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">🐉</span>
                                 <span className="text-[10px] font-black text-amber-200 tracking-wider mt-1 uppercase font-mono">DRAGON</span>
                                 <span className="text-[9px] font-bold text-amber-400/80 font-mono">1.9x</span>
                              </motion.div>
                            )}
                          </AnimatePresence>
                       </motion.div>
                       <span className="text-[10px] sm:text-[11px] font-black tracking-widest text-amber-300 uppercase drop-shadow font-mono flex items-center gap-1">
                         <span>DRAGON</span>
                       </span>
                    </div>

                    {/* TABLE CENTER: TIMER OR RESULT ANNOUNCEMENT */}
                    <div className="relative z-20 flex flex-col items-center justify-center min-w-[70px]">
                      {currentRound?.status === "BETTING" ? (
                        <>
                          <div className="relative w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center">
                             <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="42" stroke="rgba(0,0,0,0.65)" strokeWidth="8" fill="rgba(10,5,5,0.85)" />
                                <circle
                                  cx="50" cy="50" r="42"
                                  stroke={timeLeft <= 5 ? "#ef4444" : "#84cc16"}
                                  strokeWidth="8"
                                  strokeDasharray="264"
                                  strokeDashoffset={264 - (264 * timeLeft) / maxTimer}
                                  strokeLinecap="round"
                                  fill="transparent"
                                  className="transition-all duration-1000 ease-linear drop-shadow-[0_0_12px_rgba(132,204,22,0.9)]"
                                />
                             </svg>
                             <span className={`absolute text-base sm:text-lg font-black font-mono tabular-nums drop-shadow ${timeLeft <= 5 ? "text-red-400 animate-pulse scale-110" : "text-white"}`}>
                               {timeLeft}
                             </span>
                          </div>
                          <span className="text-[8px] font-black text-neutral-200 uppercase tracking-widest mt-1 opacity-90 drop-shadow">
                            BETTING
                          </span>
                        </>
                      ) : currentRound?.status === "DEALING" ? (
                        <motion.div
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="flex flex-col items-center justify-center text-center py-1"
                        >
                          {dealingStep === "DEALING_CARDS" ? (
                            <span className="px-3 py-1 rounded-full bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950 border border-amber-400/80 text-[10px] sm:text-xs font-black text-amber-300 uppercase tracking-wider shadow-[0_0_15px_rgba(251,191,36,0.6)] whitespace-nowrap animate-pulse flex items-center gap-1.5">
                              <Swords className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                              <span>DEALING CARDS...</span>
                            </span>
                          ) : dealingStep === "REVEAL_DRAGON" ? (
                            <span className="px-3 py-1 rounded-full bg-gradient-to-r from-red-950 via-neutral-900 to-red-950 border border-red-400/80 text-[10px] sm:text-xs font-black text-red-300 uppercase tracking-wider shadow-[0_0_15px_rgba(239,68,68,0.6)] whitespace-nowrap animate-pulse flex items-center gap-1.5">
                              <span>🐉</span>
                              <span>DRAGON: {currentRound?.dragonCard?.display || "..."}</span>
                            </span>
                          ) : dealingStep === "REVEAL_TIGER" ? (
                            <span className="px-3 py-1 rounded-full bg-gradient-to-r from-amber-950 via-neutral-900 to-amber-950 border border-amber-400/80 text-[10px] sm:text-xs font-black text-amber-300 uppercase tracking-wider shadow-[0_0_15px_rgba(251,191,36,0.6)] whitespace-nowrap animate-pulse flex items-center gap-1.5">
                              <span>🐯</span>
                              <span>TIGER: {currentRound?.tigerCard?.display || "..."}</span>
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full bg-gradient-to-r from-neutral-950 via-amber-950 to-neutral-950 border border-amber-400 text-[10px] sm:text-xs font-black text-amber-300 uppercase tracking-wider shadow-[0_0_20px_rgba(251,191,36,0.8)] whitespace-nowrap flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-bounce" />
                              <span>CALCULATING RESULT</span>
                            </span>
                          )}
                          <span className="text-[7px] font-black text-amber-200/90 uppercase tracking-widest mt-0.5 font-mono">
                            HIGH CARD WINS
                          </span>
                        </motion.div>
                      ) : (
                        <motion.div
                          initial={{ scale: 0, rotate: -10 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: "spring", stiffness: 420, damping: 18 }}
                          className="flex flex-col items-center justify-center text-center py-1"
                        >
                          <div className={`px-3 py-1 rounded-full border text-[10px] sm:text-xs font-black uppercase tracking-wider shadow-2xl whitespace-nowrap flex items-center gap-1.5 ${
                            currentRound?.result === "DRAGON"
                              ? "bg-gradient-to-r from-red-600 via-rose-500 to-red-600 text-white border-red-300 shadow-[0_0_25px_rgba(239,68,68,0.95)] ring-2 ring-red-400/60"
                              : currentRound?.result === "TIGER"
                              ? "bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-neutral-950 border-yellow-200 shadow-[0_0_25px_rgba(251,191,36,1)] ring-2 ring-amber-300/60"
                              : "bg-gradient-to-r from-teal-500 via-emerald-400 to-teal-500 text-neutral-950 border-teal-200 shadow-[0_0_25px_rgba(20,184,166,1)] ring-2 ring-teal-300/60"
                          }`}>
                            <span>{currentRound?.result === "DRAGON" ? "🐉" : currentRound?.result === "TIGER" ? "🐯" : "⚡"}</span>
                            <span>{currentRound?.result} WINS!</span>
                          </div>
                          
                          {/* Card Matchup Scoreline */}
                          {currentRound?.dragonCard && currentRound?.tigerCard && (
                            <div className="mt-1 px-2 py-0.5 rounded bg-black/80 border border-white/10 text-[8px] sm:text-[9px] font-mono font-black text-neutral-200 flex items-center gap-1.5 shadow">
                              <span className={currentRound.result === "DRAGON" ? "text-red-400 font-bold" : "text-neutral-400"}>
                                {currentRound.dragonCard.display} ({currentRound.dragonCard.value})
                              </span>
                              <span className="text-amber-400 text-[7px]">VS</span>
                              <span className={currentRound.result === "TIGER" ? "text-amber-400 font-bold" : "text-neutral-400"}>
                                {currentRound.tigerCard.display} ({currentRound.tigerCard.value})
                              </span>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </div>

                    {/* TIGER FELT CARD BOX */}
                    <div data-card-slot="tiger" className="flex flex-col items-center gap-1 shrink-0">
                       <motion.div
                         onClick={() => handleSelectSide("TIGER")}
                         whileHover={{ scale: 1.03 }}
                         whileTap={{ scale: 0.97 }}
                         className={`relative w-16 h-22 xs:w-18 xs:h-26 sm:w-22 sm:h-32 rounded-xl xs:rounded-2xl flex items-center justify-center cursor-pointer transition-[border-color,background-color,box-shadow] duration-300 ${
                           currentRound?.result === "TIGER" && (currentRound.status === "SETTLING" || currentRound.status === "COMPLETED")
                             ? "ring-4 ring-amber-500 shadow-[0_0_40px_rgba(245,158,11,0.95)] bg-amber-950/40"
                             : slotPulse.tiger === "WIN"
                             ? "ring-4 ring-amber-500 shadow-[0_0_35px_rgba(245,158,11,0.9)] bg-amber-950/40 animate-pulse"
                             : slotPulse.tiger === "LOSS"
                             ? "opacity-50 grayscale border-neutral-700 bg-neutral-950/40"
                             : selectedSide === "TIGER"
                             ? "ring-4 ring-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.85)] bg-amber-950/30"
                             : "border-2 border-amber-400/60 bg-black/50 hover:border-amber-300 hover:bg-black/60 shadow-inner"
                         }`}
                         style={{
                           boxShadow: currentRound?.result === "TIGER" || slotPulse.tiger === "WIN" ? "0 0 40px rgba(245,158,11,0.9), inset 0 0 25px rgba(245,158,11,0.5)" : "inset 0 0 20px rgba(0,0,0,0.85)",
                         }}
                       >
                          {/* Inner Felt Golden Border Line */}
                          <div className="absolute inset-1.5 rounded-xl border border-amber-400/35 pointer-events-none" />

                          <AnimatePresence>
                            {currentRound?.tigerCard ? (
                              <PlayingCardComponent 
                                key="tiger-card"
                                card={currentRound.tigerCard} 
                                side="TIGER" 
                                isWinner={currentRound.result === "TIGER"} 
                                gameStatus={currentRound.status}
                                isAlreadyRevealed={currentRound.status === "SETTLING" || currentRound.status === "COMPLETED"}
                                showWinnerCelebration={dealingStep === "WINNER_REVEALED" || currentRound.status === "SETTLING" || currentRound.status === "COMPLETED"}
                              />
                            ) : (
                              <motion.div
                                key="tiger-placeholder"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 0.75, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.7 }}
                                transition={{ duration: 0.25 }}
                                className="flex flex-col items-center justify-center hover:opacity-100 transition-opacity"
                              >
                                 <span className="text-3xl sm:text-4xl filter drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">🐯</span>
                                 <span className="text-[10px] font-black text-amber-200 tracking-wider mt-1 uppercase font-mono">TIGER</span>
                                 <span className="text-[9px] font-bold text-amber-400/80 font-mono">1.9x</span>
                              </motion.div>
                            )}
                          </AnimatePresence>
                       </motion.div>
                       <span className="text-[10px] sm:text-[11px] font-black tracking-widest text-amber-300 uppercase drop-shadow font-mono flex items-center gap-1">
                         <span>TIGER</span>
                       </span>
                    </div>
                 </div>

              </div>
           </div>
        </div>

         {/* BOTTOM LAYER: ICONIC21 INTEGRATED HUD CONSOLE */}
         <div className="relative z-30 w-full shrink-0 flex flex-col lg:flex-row items-stretch gap-1 sm:gap-1.5 bg-black/90 backdrop-blur-2xl p-1 sm:p-1.5 rounded-xl sm:rounded-2xl border border-white/10 shadow-2xl touch-manipulation">
            
            {/* LEFT: ROADMAP MATRIX (Bead Road & Big Road) */}
            <div className="w-full lg:w-[240px] xl:w-[270px] 2xl:w-[290px] shrink-0 flex flex-col justify-between bg-black/90 backdrop-blur-xl p-1 sm:p-2 rounded-xl border border-white/10 shadow-lg sticky top-1 transition-all overflow-visible z-40">
               {/* Header Stats Counter */}
               <div className="flex items-center justify-between pb-1 sm:pb-1.5 border-b border-white/10 text-xs font-mono font-bold">
                  <div className="flex items-center gap-1 sm:gap-1.5">
                     <span className="text-amber-400 font-black tracking-tight text-[10px] sm:text-xs">
                       #{currentRound?.roundNumber || 96}
                     </span>

                     <button
                       onClick={() => setShowRoadmapPanel(!showRoadmapPanel)}
                       className="px-1.5 py-0.5 rounded-md bg-white/10 hover:bg-white/20 text-[9px] text-amber-300 font-mono active:scale-95 transition-all cursor-pointer flex items-center gap-0.5"
                       title={showRoadmapPanel ? "Collapse Roadmap Matrix" : "Expand Roadmap Matrix"}
                     >
                       <span className="text-[8px]">{showRoadmapPanel ? "▲" : "▼"}</span>
                       <span className="text-[8px] uppercase tracking-wider hidden xs:inline">Road</span>
                     </button>

                     {/* Bet History Button */}
                     {onOpenBetHistory && (
                       <button
                         type="button"
                         onClick={() => {
                           sound.playButtonClick();
                           onOpenBetHistory();
                         }}
                         className="px-1.5 py-0.5 rounded-md bg-white/10 hover:bg-white/20 border border-white/10 text-[9px] text-amber-300 font-mono active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                         title={lang === "bn" ? "বেট হিস্টোরি" : "Bet History"}
                       >
                         <History className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                         <span className="text-[8px] uppercase tracking-wider hidden xs:inline">Hist</span>
                       </button>
                     )}

                     {/* Table Switcher Button directly inside Roadmap Header */}
                     {onSelectTable && (
                       <div className="relative">
                         <button
                           type="button"
                           onClick={() => {
                             sound.playButtonClick();
                             setTableSelectorOpen((prev) => !prev);
                           }}
                           className="px-1.5 py-0.5 rounded-md bg-gradient-to-r from-amber-500/25 via-yellow-500/35 to-amber-500/25 hover:from-amber-500/40 hover:to-yellow-500/50 border border-amber-400/70 text-[9px] font-black text-amber-300 font-mono flex items-center gap-1 shadow-[0_0_8px_rgba(245,158,11,0.3)] active:scale-95 transition-all cursor-pointer"
                           title={lang === "bn" ? "টেবিল পরিবর্তন করুন" : "Switch Table Arena"}
                         >
                           <span>{selectedTableSlug === "express" ? "⚡" : selectedTableSlug === "classic" ? "🎯" : "👑"}</span>
                           <span className="uppercase tracking-wider font-mono hidden xxs:inline">{selectedTableSlug}</span>
                           <ChevronDown className={`w-2.5 h-2.5 text-amber-400 transition-transform ${tableSelectorOpen ? "rotate-180" : ""}`} />
                         </button>

                         <AnimatePresence>
                           {tableSelectorOpen && (
                             <motion.div
                               initial={{ opacity: 0, y: -6, scale: 0.95 }}
                               animate={{ opacity: 1, y: 0, scale: 1 }}
                               exit={{ opacity: 0, y: -6, scale: 0.95 }}
                               transition={{ duration: 0.15 }}
                               className="absolute left-0 top-full mt-1.5 z-50 w-52 bg-neutral-950/95 backdrop-blur-2xl border border-amber-500/40 rounded-xl shadow-[0_15px_35px_rgba(0,0,0,0.9)] p-1.5 space-y-1"
                             >
                               <div className="px-2 py-1 text-[8.5px] font-mono font-bold text-neutral-400 uppercase border-b border-white/10">
                                 {lang === "bn" ? "টেবিল নির্বাচন করুন" : "Select Table Arena"}
                               </div>
                               {[
                                 { id: "express", name: "Express Speed", icon: "⚡", speed: "10s" },
                                 { id: "classic", name: "Classic Sanctum", icon: "🎯", speed: "15s" },
                                 { id: "vip", name: "VIP Diamond", icon: "👑", speed: "20s" },
                               ].map((tbl) => (
                                 <button
                                   key={tbl.id}
                                   type="button"
                                   onClick={() => {
                                     sound.playButtonClick();
                                     onSelectTable(tbl.id as "express" | "classic" | "vip");
                                     setTableSelectorOpen(false);
                                   }}
                                   className={`w-full text-left px-2 py-1.5 rounded-lg text-[9.5px] font-bold uppercase tracking-wider transition-all flex items-center justify-between cursor-pointer ${
                                     selectedTableSlug === tbl.id
                                       ? "bg-amber-500/20 text-amber-300 border border-amber-400/50"
                                       : "text-neutral-400 hover:bg-white/10 hover:text-white"
                                   }`}
                                 >
                                   <div className="flex items-center gap-1.5">
                                     <span>{tbl.icon}</span>
                                     <span className="font-mono">{tbl.name}</span>
                                   </div>
                                   <span className="text-[8px] font-mono text-emerald-400 font-black">{tbl.speed}</span>
                                 </button>
                               ))}
                             </motion.div>
                           )}
                         </AnimatePresence>
                       </div>
                     )}
                     <button
                       onClick={() => {
                         sound.playButtonClick();
                         setShowLiveTransparencyModal(true);
                       }}
                       className="px-1.5 py-0.5 rounded-md bg-amber-500/20 hover:bg-amber-500/35 border border-amber-500/40 text-[9px] text-amber-300 font-mono active:scale-95 transition-all cursor-pointer flex items-center gap-1 shadow-[0_0_8px_rgba(245,158,11,0.25)]"
                      title={lang === "bn" ? "লাইভ বেট ও উইন/লস ট্রান্সপারেন্সি" : "Live Bets & Win/Loss Transparency"}
                    >
                      <ShieldCheck className="w-2.5 h-2.5 text-amber-400" />
                      <span className="text-[8px] uppercase tracking-wider hidden xs:inline">Bets</span>
                    </button>
                 </div>
                 <div className="flex items-center gap-1 sm:gap-2">
                    {/* Compact Ping Badge with Small Dropdown */}
                    <div className="relative" ref={pingDropdownRef}>
                      <button
                        type="button"
                        onClick={() => {
                          sound.playButtonClick();
                          setIsPingDropdownOpen((prev) => !prev);
                        }}
                        className={`px-1.5 py-0.5 rounded flex items-center justify-center font-mono font-bold text-[8.5px] sm:text-[9.5px] transition-all cursor-pointer select-none active:scale-95 border ${
                          localLatency <= 60
                            ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-400 hover:border-emerald-400"
                            : localLatency <= 130
                            ? "bg-amber-950/80 border-amber-500/40 text-amber-300 hover:border-amber-400"
                            : "bg-rose-950/80 border-rose-500/40 text-rose-300 hover:border-rose-400"
                        }`}
                        title={lang === "bn" ? `সার্ভার পিং: ${localLatency}ms (ক্লিক করে ড্রপডাউন দেখুন)` : `Ping: ${localLatency}ms (Click for Dropdown)`}
                        aria-label="Server Ping"
                      >
                        <span className="tabular-nums font-black">{localLatency}ms</span>
                      </button>

                      {/* Small Dropdown Popover */}
                      <AnimatePresence>
                        {isPingDropdownOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: 6, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 6, scale: 0.95 }}
                            transition={{ duration: 0.12 }}
                            className="absolute right-0 bottom-full mb-1.5 z-50 w-44 bg-neutral-950/95 backdrop-blur-2xl border border-emerald-500/40 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.9)] p-2.5 space-y-2 text-left"
                          >
                            <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
                              <span className="text-[9px] font-mono uppercase tracking-wider text-neutral-400 font-bold">
                                {lang === "bn" ? "সার্ভার লেটেন্সি" : "Server Latency"}
                              </span>
                              <span
                                className={`text-[9.5px] font-mono font-black ${
                                  localLatency <= 60 ? "text-emerald-400" : localLatency <= 130 ? "text-amber-300" : "text-rose-400"
                                }`}
                              >
                                {localLatency}ms
                              </span>
                            </div>

                            <div className="space-y-1 text-[8.5px] font-mono text-neutral-300">
                              <div className="flex items-center justify-between">
                                <span className="text-neutral-500">Protocol:</span>
                                <span className="font-bold text-white">WSS (TLS 1.3)</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-neutral-500">Quality:</span>
                                <span className={`font-bold ${localLatency <= 60 ? "text-emerald-400" : "text-amber-300"}`}>
                                  {localLatency <= 60 ? "Ultra Fast" : "Good"}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-neutral-500">Sync:</span>
                                <span className="font-bold text-cyan-300">Instant Tick</span>
                              </div>
                            </div>

                            <button
                              type="button"
                              disabled={isTestingPing}
                              onClick={handleTestPing}
                              className="w-full py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-mono text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 active:scale-95 cursor-pointer disabled:opacity-50"
                            >
                              <RefreshCw className={`w-2.5 h-2.5 ${isTestingPing ? "animate-spin" : ""}`} />
                              <span>{isTestingPing ? "..." : lang === "bn" ? "টেস্ট পিং" : "Test Ping"}</span>
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <LiveSyncClock />
                    <span className="text-red-300 bg-red-950/80 border border-red-500/40 px-1.5 py-0.5 rounded flex items-center gap-1 font-bold text-[8.5px] sm:text-[9.5px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block animate-pulse" />
                      D:{roadmap.filter(r => r.result === "DRAGON").length}
                    </span>
                    <span className="text-amber-300 bg-amber-950/80 border border-amber-500/40 px-1.5 py-0.5 rounded flex items-center gap-1 font-bold text-[8.5px] sm:text-[9.5px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block animate-pulse" />
                      T:{roadmap.filter(r => r.result === "TIGER").length}
                    </span>
                    <span className="text-cyan-300 bg-cyan-950/80 border border-cyan-500/40 px-1.5 py-0.5 rounded flex items-center gap-1 font-bold text-[8.5px] sm:text-[9.5px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block" />
                      Tie:{roadmap.filter(r => r.result === "TIE").length}
                    </span>
                 </div>
              </div>

              {/* Collapsible Roadmap Grids with Auto-Scroll to Latest Results */}
              {showRoadmapPanel && (
                <div ref={roadmapScrollRef} className="my-1 sm:my-1.5 overflow-x-auto no-scrollbar scroll-smooth">
                  {/* Upper Grid: Bead Road (6 rows) */}
                  <div className="grid grid-rows-6 grid-flow-col gap-0.5 sm:gap-1 py-0.5 min-w-max">
                     {Array.from({ length: 36 }).map((_, i) => {
                        const r = roadmap[roadmap.length - 36 + i];
                        const res = r?.result;
                        return (
                          <div
                            key={i}
                            className={`w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 rounded-full flex items-center justify-center text-[7px] sm:text-[8px] font-black transition-all ${
                              res === "DRAGON"
                                ? "bg-gradient-to-br from-red-600 to-red-800 text-white border border-red-400/80 shadow-[0_0_6px_rgba(239,68,68,0.5)]"
                                : res === "TIGER"
                                ? "bg-gradient-to-br from-amber-400 to-yellow-600 text-neutral-950 border border-amber-300/80 shadow-[0_0_6px_rgba(245,158,11,0.5)]"
                                : res === "TIE"
                                ? "bg-gradient-to-br from-teal-400 to-cyan-600 text-neutral-950 border border-cyan-300/80 shadow-[0_0_6px_rgba(6,182,212,0.5)]"
                                : "bg-white/[0.04] border border-white/[0.06] text-transparent"
                            }`}
                          >
                             {res ? res.charAt(0) : ""}
                          </div>
                        );
                     })}
                  </div>

                  {/* Lower Grid: Big Road (Outcome rings) */}
                  <div className="grid grid-rows-4 grid-flow-col gap-0.5 sm:gap-1 pt-1 sm:pt-1.5 border-t border-white/10 min-w-max">
                     {Array.from({ length: 36 }).map((_, i) => {
                        const r = roadmap[roadmap.length - 36 + i];
                        const res = r?.result;
                        return (
                          <div key={i} className="w-3 h-3 sm:w-4 sm:h-4 flex items-center justify-center bg-white/[0.02] rounded-sm">
                             {res === "DRAGON" && <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full border-2 border-red-500 shadow-[0_0_4px_rgba(239,68,68,0.4)]" />}
                             {res === "TIGER" && <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full border-2 border-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.4)]" />}
                             {res === "TIE" && <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-cyan-400 shadow-[0_0_4px_rgba(34,211,238,0.6)]" />}
                          </div>
                        );
                     })}
                  </div>
                </div>
              )}
           </div>

           {/* CENTER: ICONIC21 DRAGON TIGER BETTING BOARD + CHIPS CAROUSEL */}
           <div className="flex-1 flex flex-col gap-1 sm:gap-2">
              
              {/* UPPER SECTION: DRAGON (Left) | TIE / SUITED TIE (Center) | TIGER (Right) */}
              <div className="grid grid-cols-12 gap-1 sm:gap-2 items-stretch">
                 
                 {/* DRAGON TAB (5 cols) */}
                 <motion.button
                   data-bet-side="DRAGON"
                   whileHover={{ scale: 1.01 }}
                   whileTap={{ scale: 0.98 }}
                   onClick={() => handleSelectSide("DRAGON")}
                   animate={selectedSide === "DRAGON" ? { scale: [1, 1.03, 1] } : { scale: 1 }}
                   disabled={isPlacingBet !== null || !isBettingOpen}
                   className={`bet-button col-span-5 relative rounded-xl p-1.5 sm:p-2.5 min-h-[60px] xs:min-h-[66px] sm:min-h-[76px] flex flex-col justify-between border-2 cursor-pointer overflow-hidden select-none transition-colors duration-200 ${
                     currentRound?.result === "DRAGON" && (currentRound.status === "SETTLING" || currentRound.status === "COMPLETED")
                       ? "bg-gradient-to-r from-red-600 via-rose-700 to-red-800 border-red-300 shadow-[0_0_25px_rgba(239,68,68,0.85)] text-white"
                       : slotPulse.dragon === "WIN"
                       ? "bg-gradient-to-r from-red-700 via-rose-800 to-red-900 border-red-400 shadow-[0_0_20px_rgba(239,68,68,0.7)] text-white animate-pulse"
                       : slotPulse.dragon === "LOSS"
                       ? "opacity-50 grayscale border-neutral-800 bg-neutral-950/70 text-neutral-400"
                       : selectedSide === "DRAGON"
                       ? "bg-gradient-to-r from-red-700 via-red-800 to-red-900 border-red-400 shadow-[0_0_20px_rgba(239,68,68,0.6)] text-white"
                       : "bg-gradient-to-r from-red-950/80 to-red-900/50 border-red-700/40 text-red-200 hover:border-red-400"
                   } ${!isBettingOpen ? "opacity-60 cursor-not-allowed" : ""}`}
                 >
                    {/* Top Stats Line: Percentage, Total Bet, Player count */}
                    <div className="flex items-center justify-between w-full text-[8px] sm:text-[9px] font-bold font-mono opacity-80">
                       <span className="px-1 py-0.5 rounded bg-black/40 text-white text-[7px] sm:text-[8px]">100%</span>
                       <div className="flex items-center gap-1 sm:gap-2">
                          <span>🪙 {formatAmt(currentDragonPool, true)}</span>
                          <span className="hidden xs:inline">👤 1</span>
                       </div>
                    </div>

                    {/* Center: Placed Casino Chip or Dragon Icon */}
                    <div className="my-0.5 sm:my-1.5 flex items-center justify-center relative">
                       {activeConfirmedBet?.side === "DRAGON" ? (
                         <motion.div
                           initial={{ scale: 0.3, opacity: 0 }}
                           animate={{ scale: [0.3, 1.3, 1], opacity: 1 }}
                           transition={{ type: "spring", stiffness: 420, damping: 18 }}
                           className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-red-500 via-white to-red-600 border-2 border-amber-300 shadow-[0_0_20px_rgba(239,68,68,0.95)] flex items-center justify-center font-black text-[8px] sm:text-[9px] text-neutral-950 font-mono animate-pulse"
                         >
                            {formatAmt(activeConfirmedBet.amount, true)}
                         </motion.div>
                       ) : isPlacingBet === "DRAGON" ? (
                         <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-dashed border-red-400 animate-spin flex items-center justify-center text-xs">
                           ⏳
                         </div>
                       ) : (
                         <span className="text-base sm:text-xl">🐉</span>
                       )}

                       {/* Mini Dealt Card Attached to Right of Dragon Tab */}
                       <AnimatePresence>
                         {currentRound?.dragonCard && (
                           <motion.div
                             initial={{ scale: 0, x: 20, y: "-50%", rotate: 15 }}
                             animate={{ scale: 1, x: 0, y: "-50%", rotate: 0 }}
                             exit={{ scale: 0, x: 20, y: "-50%" }}
                             transition={{ type: "spring", stiffness: 350, damping: 20 }}
                             className="absolute right-0 top-1/2 bg-white text-neutral-950 font-black px-1.5 py-0.5 rounded shadow-lg text-[10px] sm:text-xs font-mono border border-neutral-300 z-10"
                           >
                              {currentRound.dragonCard.display}
                           </motion.div>
                         )}
                       </AnimatePresence>
                    </div>

                    {/* Bottom: Title & Payout */}
                    <div className="flex items-center justify-between w-full">
                       <span className="text-[11px] sm:text-sm font-black tracking-wider uppercase">DRAGON</span>
                       <span className="text-[9px] sm:text-[10px] font-bold font-mono text-red-300">1.9x</span>
                    </div>
                 </motion.button>

                 {/* TIE & SUITED TIE (Center 2 cols) - 100% Company Capture */}
                 <div className="col-span-2 flex flex-col items-center justify-center gap-0.5 sm:gap-1 bg-gradient-to-b from-teal-900/90 to-neutral-950 rounded-xl border border-teal-500/40 p-1 sm:p-1.5 shadow-inner select-none text-center">
                    <div className="text-center leading-none">
                       <span className="text-[8px] sm:text-[9px] font-black text-amber-300 block uppercase">TIE</span>
                       <span className="text-[6.5px] sm:text-[7px] font-bold text-teal-300 font-mono block mt-0.5">COMPANY</span>
                    </div>

                    {/* 100% Fee Pill */}
                    <div className="px-1 py-0.5 rounded-full bg-teal-950 border border-teal-400/60 flex items-center justify-center text-[6px] sm:text-[7px] font-black text-amber-300">
                       100%
                    </div>

                    <div className="text-center leading-none">
                       <span className="text-[6px] sm:text-[6.5px] font-bold text-neutral-400 block uppercase">CAPTURE</span>
                    </div>
                 </div>

                 {/* TIGER TAB (5 cols) */}
                 <motion.button
                   data-bet-side="TIGER"
                   whileHover={{ scale: 1.01 }}
                   whileTap={{ scale: 0.98 }}
                   onClick={() => handleSelectSide("TIGER")}
                   animate={selectedSide === "TIGER" ? { scale: [1, 1.03, 1] } : { scale: 1 }}
                   disabled={isPlacingBet !== null || !isBettingOpen}
                   className={`bet-button col-span-5 relative rounded-xl p-1.5 sm:p-2.5 min-h-[60px] xs:min-h-[66px] sm:min-h-[76px] flex flex-col justify-between border-2 cursor-pointer overflow-hidden select-none transition-colors duration-200 ${
                     currentRound?.result === "TIGER" && (currentRound.status === "SETTLING" || currentRound.status === "COMPLETED")
                       ? "bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-700 border-yellow-200 shadow-[0_0_25px_rgba(245,158,11,0.85)] text-white"
                       : slotPulse.tiger === "WIN"
                       ? "bg-gradient-to-r from-amber-700 via-amber-800 to-yellow-900 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.7)] text-white animate-pulse"
                       : slotPulse.tiger === "LOSS"
                       ? "opacity-50 grayscale border-neutral-800 bg-neutral-950/70 text-neutral-400"
                       : selectedSide === "TIGER"
                       ? "bg-gradient-to-r from-amber-700 via-amber-800 to-yellow-900 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.6)] text-white"
                       : "bg-gradient-to-r from-amber-950/80 to-yellow-950/50 border-amber-700/40 text-amber-200 hover:border-amber-400"
                   } ${!isBettingOpen ? "opacity-60 cursor-not-allowed" : ""}`}
                 >
                    {/* Top Stats Line: Percentage, Total Bet, Player count */}
                    <div className="flex items-center justify-between w-full text-[8px] sm:text-[9px] font-bold font-mono opacity-80">
                       <div className="flex items-center gap-1 sm:gap-2">
                          <span>🪙 {formatAmt(currentTigerPool, true)}</span>
                          <span className="hidden xs:inline">👤 0</span>
                       </div>
                       <span className="px-1 py-0.5 rounded bg-black/40 text-white text-[7px] sm:text-[8px]">0%</span>
                    </div>

                    {/* Center: Placed Casino Chip or Tiger Icon */}
                    <div className="my-0.5 sm:my-1.5 flex items-center justify-center relative">
                       {/* Mini Dealt Card Attached to Left of Tiger Tab */}
                       <AnimatePresence>
                         {currentRound?.tigerCard && (
                           <motion.div
                             initial={{ scale: 0, x: -20, y: "-50%", rotate: -15 }}
                             animate={{ scale: 1, x: 0, y: "-50%", rotate: 0 }}
                             exit={{ scale: 0, x: -20, y: "-50%" }}
                             transition={{ type: "spring", stiffness: 350, damping: 20 }}
                             className="absolute left-0 top-1/2 bg-white text-neutral-950 font-black px-1.5 py-0.5 rounded shadow-lg text-[10px] sm:text-xs font-mono border border-neutral-300 z-10"
                           >
                              {currentRound.tigerCard.display}
                           </motion.div>
                         )}
                       </AnimatePresence>

                       {activeConfirmedBet?.side === "TIGER" ? (
                         <motion.div
                           initial={{ scale: 0.3, opacity: 0 }}
                           animate={{ scale: [0.3, 1.3, 1], opacity: 1 }}
                           transition={{ type: "spring", stiffness: 420, damping: 18 }}
                           className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-amber-400 via-white to-yellow-600 border-2 border-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.95)] flex items-center justify-center font-black text-[8px] sm:text-[9px] text-neutral-950 font-mono animate-pulse"
                         >
                            {formatAmt(activeConfirmedBet.amount, true)}
                         </motion.div>
                       ) : isPlacingBet === "TIGER" ? (
                         <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-dashed border-amber-400 animate-spin flex items-center justify-center text-xs">
                           ⏳
                         </div>
                       ) : (
                         <span className="text-base sm:text-xl">🐯</span>
                       )}
                    </div>

                    {/* Bottom: Title & Payout */}
                    <div className="flex items-center justify-between w-full">
                       <span className="text-[9px] sm:text-[10px] font-bold font-mono text-amber-300">1.9x</span>
                       <span className="text-[11px] sm:text-sm font-black tracking-wider uppercase">TIGER</span>
                    </div>
                 </motion.button>

              </div>

              {/* CHIP SELECTOR CAROUSEL & ACTION BUTTONS */}
               <div className="w-full shrink-0 flex items-center justify-between gap-0.5 xs:gap-1 sm:gap-2 py-1 px-1 xs:px-1.5 sm:px-2.5 overflow-x-auto no-scrollbar select-none bg-neutral-950/95 backdrop-blur-2xl rounded-xl border border-amber-500/35 shadow-[0_6px_24px_rgba(0,0,0,0.9)] touch-pan-x box-border">
                  {/* Left Action Controls: Undo, Double, Repeat */}
                  <div className="flex items-center gap-0.5 xs:gap-1 shrink-0">
                    {/* Undo / Cancel Button */}
                    <button
                      onClick={handleCancelActiveBet}
                      className="w-6 h-6 xs:w-6.5 xs:h-6.5 sm:w-7.5 sm:h-7.5 shrink-0 rounded-full bg-slate-900/95 hover:bg-slate-800 text-slate-200 border border-slate-600 flex items-center justify-center text-[10px] sm:text-xs font-black shadow active:scale-90 transition-transform cursor-pointer"
                      title="Undo / Cancel"
                    >
                      ↺
                    </button>

                    {/* Double (x2) Button */}
                    <button
                      onClick={handleDoubleBet}
                      className="w-6 h-6 xs:w-6.5 xs:h-6.5 sm:w-7.5 sm:h-7.5 shrink-0 rounded-full bg-slate-900/95 hover:bg-slate-800 text-slate-200 border border-slate-600 flex items-center justify-center text-[7.5px] xs:text-[8.5px] sm:text-[9.5px] font-black font-mono shadow cursor-pointer active:scale-90 transition-transform"
                      title="Double Bet (x2)"
                    >
                      x2
                    </button>

                    {/* Repeat (↻) Button */}
                    <button
                      onClick={handleRepeatBet}
                      disabled={!lastPlacedBet}
                      className="w-6 h-6 xs:w-6.5 xs:h-6.5 sm:w-7.5 sm:h-7.5 shrink-0 rounded-full bg-slate-900/95 hover:bg-slate-800 disabled:opacity-30 text-slate-200 border border-slate-600 flex items-center justify-center text-[10px] sm:text-xs font-black shadow cursor-pointer active:scale-90 transition-transform"
                      title="Repeat Previous Bet"
                    >
                      ↻
                    </button>
                  </div>

                  {/* Center: Authentic Casino Chips Set (1, 5, 25, 100, 500, 2.5K) - Highly Visible & Vibrant */}
                  <div className="flex items-center gap-0.5 xs:gap-1 sm:gap-1.5 shrink-0 px-0.5">
                     {[
                       { val: 1, label: "1", bg: "from-emerald-500 to-green-600 border-white text-white shadow-[0_0_8px_rgba(16,185,129,0.7)]" },
                       { val: 5, label: "5", bg: "from-orange-500 to-amber-600 border-white text-white shadow-[0_0_8px_rgba(249,115,22,0.7)]" },
                       { val: 25, label: "25", bg: "from-pink-500 to-rose-600 border-white text-white shadow-[0_0_8px_rgba(244,63,94,0.7)]" },
                       { val: 100, label: "100", bg: "from-red-500 via-red-600 to-rose-700 border-white text-white shadow-[0_0_10px_rgba(239,68,68,0.9)]" },
                       { val: 500, label: "500", bg: "from-purple-600 to-indigo-700 border-white text-white shadow-[0_0_8px_rgba(147,51,234,0.7)]" },
                       { val: 2500, label: "2.5K", bg: "from-neutral-900 via-amber-500 to-black border-amber-400 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.8)]" },
                     ].map((chip) => {
                       const chipAmount = chip.val / activeCurrency.rateFromBase;
                       const isSelected = selectedAmount === chipAmount;
                       return (
                         <motion.button
                           key={chip.val}
                           data-chip-active={isSelected ? "true" : "false"}
                           whileHover={{ y: -2, scale: 1.08 }}
                           whileTap={{ scale: 0.95 }}
                           onClick={() => handleChipSelect(chipAmount)}
                           className={`w-6 h-6 xs:w-6.5 xs:h-6.5 sm:w-7.5 sm:h-7.5 md:w-8.5 md:h-8.5 shrink-0 rounded-full flex items-center justify-center font-black text-[7.5px] xs:text-[8px] sm:text-[9px] md:text-[9.5px] font-mono bg-gradient-to-br border border-white/90 sm:border-2 cursor-pointer relative ${
                             chip.bg
                           } ${isSelected ? "ring-2 sm:ring-4 ring-amber-400 scale-110 shadow-[0_0_16px_rgba(251,191,36,0.95)] z-10" : ""}`}
                         >
                           {chip.label}
                         </motion.button>
                       );
                     })}
                  </div>

                  {/* Right Action & Balance Controls: Hint + High-Visibility Real Balance */}
                  <div className="flex items-center gap-0.5 xs:gap-1 shrink-0">
                    {/* Smart Hint Button (10-Round Roadmap Analysis) */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        sound.playButtonClick();
                        setShowSmartHintModal(true);
                      }}
                      className="px-1.5 xs:px-2 py-0.5 sm:py-1 rounded-full bg-gradient-to-r from-amber-500/20 via-yellow-500/30 to-amber-500/20 hover:from-amber-500/35 hover:to-yellow-500/40 text-amber-300 border border-amber-400/60 shadow-[0_0_10px_rgba(245,158,11,0.25)] flex items-center gap-0.5 xs:gap-1 shrink-0 cursor-pointer active:scale-90 transition-all group"
                      title="Smart Hint: 10-Round Roadmap Momentum Analysis"
                    >
                      <Lightbulb className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-yellow-300 animate-pulse group-hover:scale-110" />
                      <span className="text-[7px] xs:text-[7.5px] sm:text-[8.5px] font-black uppercase tracking-wider hidden xxs:inline">Hint</span>
                      {smartHint.suggestedSide && (
                        <span className={`px-1 py-0.2 rounded text-[6.5px] sm:text-[7.5px] font-black font-mono shadow ${
                          smartHint.suggestedSide === "DRAGON" ? "bg-red-600 text-white" : "bg-amber-400 text-neutral-950"
                        }`}>
                          {smartHint.suggestedSide.charAt(0)}
                        </span>
                      )}
                    </motion.button>

                    {/* Pure Balance Display (Only Amount) */}
                    <div className="flex items-center bg-gradient-to-r from-neutral-950 via-amber-950/40 to-neutral-950 border border-amber-500/40 px-2 py-0.5 sm:py-1 rounded-lg text-[8.5px] xs:text-[9.5px] sm:text-[10.5px] font-mono shrink-0 shadow-[0_0_12px_rgba(245,158,11,0.2)]">
                      <span className="text-amber-300 font-black">{formatAmt(activeBalance)}</span>
                    </div>
                  </div>
               </div>

            </div>

         </div>


      </div>

      {/* Auto Bet Setup Modal */}
      <AnimatePresence>
        {showAutoBetModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="smart-glass border-white/10 rounded-[40px] p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-8 shadow-[0_32px_64px_rgba(0,0,0,0.5)]"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-violet-500/10 flex items-center justify-center text-violet-400 border border-violet-500/20">
                    <Zap className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white tracking-tight">Automation Engine</h3>
                    <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Configure Strategic Execution</p>
                  </div>
                </div>

                <button
                  onClick={() => setShowAutoBetModal(false)}
                  className="p-3 rounded-full hover:bg-white/5 text-neutral-500 hover:text-white transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Strategy Selector */}
              <div className="space-y-4">
                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.2em] block ml-1">
                  System Strategy
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: "FLAT", name: "FLAT BET", desc: "Static execution" },
                    { id: "MARTINGALE", name: "MARTINGALE", desc: "2X on loss" },
                    { id: "ANTI_MARTINGALE", name: "ANTI-MART", desc: "2X on win" },
                    { id: "ALTERNATE", name: "ALTERNATE", desc: "Switch sides each round" },
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setAutoBetConfig((p) => ({ ...p, strategy: st.id as AutoBetStrategy }))}
                      className={`p-4 rounded-3xl text-left border transition-all flex flex-col gap-1 ${
                        autoBetConfig.strategy === st.id
                          ? "bg-violet-500/10 border-violet-500/40 ring-1 ring-violet-500/20"
                          : "bg-white/5 border-white/5 hover:border-white/10"
                      }`}
                    >
                      <span className={`text-[11px] font-black tracking-widest ${autoBetConfig.strategy === st.id ? "text-violet-400" : "text-neutral-400"}`}>{st.name}</span>
                      <span className="text-[9px] text-neutral-600 font-medium">{st.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Side & Base Amount */}
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-4">
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.2em] block ml-1">Initial Side</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setAutoBetConfig((p) => ({ ...p, side: "DRAGON" }))}
                      className={`flex-1 py-3 rounded-2xl font-bold text-[10px] tracking-widest border transition-all ${
                        autoBetConfig.side === "DRAGON" ? "bg-violet-500 text-white border-violet-400" : "bg-white/5 border-white/5 text-neutral-500"
                      }`}
                    >
                      DRAGON
                    </button>
                    <button
                      type="button"
                      onClick={() => setAutoBetConfig((p) => ({ ...p, side: "TIGER" }))}
                      className={`flex-1 py-3 rounded-2xl font-bold text-[10px] tracking-widest border transition-all ${
                        autoBetConfig.side === "TIGER" ? "bg-cyan-500 text-white border-cyan-400" : "bg-white/5 border-white/5 text-neutral-500"
                      }`}
                    >
                      TIGER
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.2em] block ml-1">Base Stake</label>
                  <div className="bg-black/40 rounded-2xl p-3 border border-white/5 flex items-center justify-between">
                    <span className="text-sm font-bold text-white">{formatAmt(autoBetConfig.baseAmount)}</span>
                    <button onClick={() => setAutoBetConfig(p => ({ ...p, baseAmount: activeLimits.chips[0], currentStake: activeLimits.chips[0] }))} className="text-[9px] font-bold text-violet-400 uppercase tracking-tighter">Reset</button>
                  </div>
                </div>
              </div>

              {/* Rounds Control */}
              <div className="space-y-4">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.2em]">Execution Rounds</label>
                  <span className="text-[10px] font-mono text-violet-400">{autoBetConfig.totalRounds === 9999 ? 'UNLIMITED' : `${autoBetConfig.totalRounds} ROUNDS`}</span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {[10, 20, 50, 100, 9999].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setAutoBetConfig((p) => ({ ...p, totalRounds: r, roundsRemaining: r }))}
                      className={`py-2.5 rounded-xl border text-[10px] font-bold transition-all ${
                        autoBetConfig.totalRounds === r ? "bg-white text-black border-white" : "bg-white/5 border-white/5 text-neutral-500 hover:border-white/10"
                      }`}
                    >
                      {r === 9999 ? "∞" : r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Launch Button */}
              <div className="pt-4">
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playButtonClick();
                    setAutoBetConfig((p) => ({
                      ...p,
                      isActive: true,
                      roundsRemaining: p.totalRounds,
                      roundsCompleted: 0,
                      totalWagered: 0,
                      totalProfitLoss: 0,
                      winsCount: 0,
                      lossesCount: 0,
                      currentStake: p.baseAmount,
                    }));
                    setShowAutoBetModal(false);
                  }}
                  className="w-full py-5 rounded-[24px] bg-white text-neutral-950 font-bold text-xs uppercase tracking-[0.3em] shadow-[0_12px_24px_rgba(255,255,255,0.1)] active:scale-95 transition-all"
                >
                  Initiate Cycle
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SMART HINT 10-ROUND ANALYSIS MODAL */}
      <AnimatePresence>
        {showSmartHintModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-xl flex items-center justify-center p-3 sm:p-4"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 15 }}
              className="smart-glass border border-amber-400/40 rounded-3xl p-5 sm:p-7 max-w-md w-full shadow-[0_25px_70px_rgba(0,0,0,0.95)] text-neutral-100 relative overflow-hidden"
            >
              {/* Glowing Corner Aura */}
              <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-amber-500/20 blur-2xl pointer-events-none" />
              <div className="absolute -bottom-12 -left-12 w-36 h-36 rounded-full bg-red-500/15 blur-2xl pointer-events-none" />

              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-white/10 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400/20 to-yellow-600/30 border border-amber-400/50 flex items-center justify-center text-amber-300 shadow">
                    <Lightbulb className="w-5 h-5 text-yellow-300 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                      <span>Smart Hint</span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/50 text-[9px] font-mono text-amber-300 font-bold uppercase">
                        10-Round AI Analysis
                      </span>
                    </h3>
                    <p className="text-[10px] text-neutral-400">Roadmap historical trend & momentum predictor</p>
                  </div>
                </div>

                <button
                  onClick={() => setShowSmartHintModal(false)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="py-4 space-y-4 relative z-10 text-xs">
                {/* Last 10 Rounds Result Sequence */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-mono">
                    Last 10 Rounds History ({smartHint.totalAnalyzed} recorded)
                  </span>
                  <div className="flex items-center gap-1 sm:gap-1.5 p-2 rounded-xl bg-black/60 border border-white/5 overflow-x-auto no-scrollbar">
                    {smartHint.recentList.length > 0 ? (
                      smartHint.recentList.map((item, idx) => (
                        <div
                          key={idx}
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-black font-mono text-[10px] sm:text-xs shrink-0 shadow border ${
                            item.result === "DRAGON"
                              ? "bg-red-600/30 text-red-300 border-red-500/50"
                              : item.result === "TIGER"
                              ? "bg-amber-500/30 text-amber-300 border-amber-400/50"
                              : "bg-teal-600/30 text-teal-300 border-teal-500/50"
                          }`}
                          title={`Round #${item.roundNumber}: ${item.result}`}
                        >
                          {item.result === "DRAGON" ? "🐉" : item.result === "TIGER" ? "🐯" : "🤝"}
                        </div>
                      ))
                    ) : (
                      <span className="text-neutral-500 text-[11px] py-1">No rounds recorded yet in this shoe</span>
                    )}
                  </div>
                </div>

                {/* Comparative Frequency Stats Bar */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 rounded-xl bg-red-950/40 border border-red-500/30">
                    <span className="text-[9px] text-red-300 font-bold uppercase block">Dragon</span>
                    <span className="text-base font-black text-red-400 font-mono">{smartHint.dragonCount}</span>
                    <span className="text-[9px] text-neutral-400 font-mono block">{smartHint.dragonPct}%</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/30">
                    <span className="text-[9px] text-amber-300 font-bold uppercase block">Tiger</span>
                    <span className="text-base font-black text-amber-400 font-mono">{smartHint.tigerCount}</span>
                    <span className="text-[9px] text-neutral-400 font-mono block">{smartHint.tigerPct}%</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-teal-950/40 border border-teal-500/30">
                    <span className="text-[9px] text-teal-300 font-bold uppercase block">Tie</span>
                    <span className="text-base font-black text-teal-400 font-mono">{smartHint.tieCount}</span>
                    <span className="text-[9px] text-neutral-400 font-mono block">
                      {smartHint.totalAnalyzed ? Math.round((smartHint.tieCount / smartHint.totalAnalyzed) * 100) : 0}%
                    </span>
                  </div>
                </div>

                {/* AI Recommendation Banner */}
                <div className={`p-3.5 rounded-2xl border flex flex-col gap-1.5 ${
                  smartHint.suggestedSide === "DRAGON"
                    ? "bg-gradient-to-r from-red-950/80 via-red-900/40 to-black border-red-500/60 shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                    : "bg-gradient-to-r from-amber-950/80 via-yellow-900/40 to-black border-amber-500/60 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-yellow-300" />
                      <span className="text-[10px] font-black tracking-wider uppercase text-neutral-300">
                        Suggested Recommendation
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-white/10 text-white font-mono font-bold text-[9px]">
                      {smartHint.confidence}% Confidence
                    </span>
                  </div>

                  <div className="text-sm sm:text-base font-black flex items-center gap-2">
                    <span className={smartHint.suggestedSide === "DRAGON" ? "text-red-400" : "text-amber-400"}>
                      SUGGESTION: BET ON {smartHint.suggestedSide}
                    </span>
                    <span className="text-base">{smartHint.suggestedSide === "DRAGON" ? "🐉" : "🐯"}</span>
                  </div>

                  <p className="text-[11px] text-neutral-300 leading-relaxed">
                    {smartHint.reason}
                  </p>
                </div>
              </div>

              {/* Footer CTA */}
              <div className="pt-2 flex items-center gap-2 relative z-10">
                <button
                  onClick={() => setShowSmartHintModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 font-bold transition-all text-xs cursor-pointer"
                >
                  Close
                </button>

                <button
                  onClick={() => {
                    handleSelectSide(smartHint.suggestedSide);
                    setShowSmartHintModal(false);
                    sound.playChip(1.2);
                    showTableToast(`💡 Smart Hint Applied: Selected ${smartHint.suggestedSide}`);
                  }}
                  className={`flex-[2] py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-lg cursor-pointer flex items-center justify-center gap-1.5 ${
                    smartHint.suggestedSide === "DRAGON"
                      ? "bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white shadow-red-600/30"
                      : "bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-neutral-950 shadow-amber-400/30"
                  }`}
                >
                  <span>Apply & Select {smartHint.suggestedSide}</span>
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
