import React, { useState, useEffect, useCallback, useRef } from "react";
import { UserWallet, TableRound, RoadmapItem, HighLoadTelemetry } from "./types";
import { LoginScreen } from "./components/LoginScreen";
import { Navbar } from "./components/Navbar";
import { GameTable } from "./components/GameTable";
import { P2PLobby } from "./components/P2PLobby";
import { Leaderboard } from "./components/Leaderboard";
import { WalletModal } from "./components/WalletModal";
import { ProvablyFairModal } from "./components/ProvablyFairModal";
import { RoadmapModal } from "./components/RoadmapModal";
import { AdminDashboard } from "./components/AdminDashboard";
import { AdminLogin } from "./components/AdminLogin";
import { AdminModal } from "./components/AdminModal"; // Kept if needed elsewhere, but plan to remove usage
import { UserProfileModal } from "./components/UserProfileModal";
import { SiteLiquidityModal } from "./components/SiteLiquidityModal";
import { RegulatoryFooter } from "./components/RegulatoryFooter";
import { UserBetHistoryModal } from "./components/UserBetHistoryModal";
import { GameRulesModal } from "./components/GameRulesModal";
import { TransparencyCharterModal } from "./components/TransparencyCharterModal";
import { SideNavDrawer } from "./components/SideNavDrawer";
import { ActiveOnlineUsersModal } from "./components/ActiveOnlineUsersModal";
import { AutoLogoutTimer } from "./components/AutoLogoutTimer";
import { GlobalShortcuts } from "./components/GlobalShortcuts";
import { MobileBottomNav } from "./components/MobileBottomNav";
import { CurrencySelectorModal } from "./components/CurrencySelectorModal";
import { TableEntryTransition } from "./components/TableEntryTransition";
import { NetworkStatusBadge } from "./components/NetworkStatusBadge";
import { usePWAInstall } from "./utils/usePWAInstall";
import { useWakeLock } from "./utils/useWakeLock";
import { useDrag } from "@use-gesture/react";
import { motion, AnimatePresence } from "framer-motion";
import { sound } from "./utils/audio";
import { getStoredCurrencyCode, setStoredCurrencyCode } from "./utils/currency";
import { perfMonitor, useRenderTracker } from "./utils/perfDebugMonitor";
import { ShieldAlert, RefreshCw, Sparkles, X } from "lucide-react";
import { BUILD_NUMBER } from "./config/version";

export default function App() {
  useRenderTracker("App");
  const [user, setUser] = useState<UserWallet | null>(null);
  const [authScreenMode, setAuthScreenMode] = useState<"signin" | "signup" | null>(null);
  const [forcedLogoutReason, setForcedLogoutReason] = useState<string | null>(null);

  // Screen Wake Lock: Keeps display light always ON while on site
  const wakeLock = useWakeLock(true);

  const [newVersionAvailable, setNewVersionAvailable] = useState<boolean>(false);
  const [latestServerVersion, setLatestServerVersion] = useState<string | null>(null);
  const [isReloadingVersion, setIsReloadingVersion] = useState<boolean>(false);

  const handleReloadNewVersion = async () => {
    setIsReloadingVersion(true);
    try {
      if (latestServerVersion) {
        localStorage.setItem("dt_app_running_version", latestServerVersion);
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
      }
    } catch {}
    window.location.reload();
  };

  // Auto-Update & Non-Intrusive Version Check with 5-min localStorage Cache
  useEffect(() => {
    const FIVE_MINUTES_MS = 5 * 60 * 1000;

    const checkVersion = async () => {
      try {
        const now = Date.now();
        const lastCheckStr = localStorage.getItem("dt_last_version_check_time");

        // Prevent redundant API calls if checked within the last 5 minutes
        if (lastCheckStr) {
          const lastCheckTime = Number(lastCheckStr);
          if (now - lastCheckTime < FIVE_MINUTES_MS) {
            return;
          }
        }

        const res = await fetch("/api/version", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data && data.version) {
            localStorage.setItem("dt_last_version_check_time", now.toString());

            const runningVersion = localStorage.getItem("dt_app_running_version");
            if (!runningVersion) {
              localStorage.setItem("dt_app_running_version", data.version);
            } else if (runningVersion !== data.version) {
              console.log("[AUTO-UPDATE] Mismatch detected: Server =", data.version, "| Client =", runningVersion);
              setLatestServerVersion(data.version);
              setNewVersionAvailable(true);
            }
          }
        }
      } catch {}
    };

    checkVersion();
    const interval = setInterval(checkVersion, 30000);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkVersion();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // Single-Device Session Enforcement Listener & Self-Healing Cloud Restore
  useEffect(() => {
    const checkSession = async () => {
      try {
        const sid = localStorage.getItem("player_session_id");
        const storedUid = localStorage.getItem("dt_user_id");
        const storedUname = localStorage.getItem("dt_username");
        const backupRaw = localStorage.getItem("dt_user_profile_backup");

        if (sid) {
          const res = await fetch("/api/auth/me", {
            headers: { "x-session-id": sid },
            credentials: "include",
          });

          if (res.ok) {
            const data = await res.json();
            if (data.success && data.user) {
              setUser(data.user);
              localStorage.setItem("dt_user_profile_backup", JSON.stringify(data.user));
              if (data.sessionId) {
                localStorage.setItem("player_session_id", data.sessionId);
              }
              return;
            }
          }
        }

        // Self-Healing Cloud Sync: Re-hydrate database if server container was redeployed
        if (backupRaw) {
          try {
            const parsedBackup = JSON.parse(backupRaw);
            if (parsedBackup && parsedBackup.userId) {
              const syncRes = await fetch("/api/sync/client-state", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ clientProfile: parsedBackup }),
              });
              if (syncRes.ok) {
                const syncData = await syncRes.json();
                if (syncData.success && syncData.user) {
                  setUser(syncData.user);
                  localStorage.setItem("dt_user_id", syncData.user.userId);
                  localStorage.setItem("dt_username", syncData.user.username);
                  return;
                }
              }
            }
          } catch {}
        }

        // Fallback: If user ID exists in localStorage
        if (storedUid) {
          const res = await fetch(`/api/wallet/${encodeURIComponent(storedUid)}?username=${encodeURIComponent(storedUname || "")}`, {
            headers: { "x-user-id": storedUid },
          });
          if (res.ok) {
            const data = await res.json();
            if (data && data.userId) {
              const storedType = localStorage.getItem("dt_balance_type") as "real" | "demo" | null;
              setUser({
                ...data,
                balanceType: storedType || data.balanceType || "real",
              });
              return;
            }
          }
        }

        // Clean up on invalid or expired session
        localStorage.removeItem("player_session_id");
        localStorage.removeItem("dt_user_id");
        localStorage.removeItem("dt_username");
        setUser(null);
      } catch {
        // Leave guest on network error
      }
    };
    checkSession();
  }, []);

  useEffect(() => {
    if (!user) return;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;

    const connect = () => {
      try {
        ws = new WebSocket(`${protocol}//${window.location.host}`);
        ws.onopen = () => {
          const sessionId = localStorage.getItem("player_session_id") || "";
          ws?.send(JSON.stringify({ type: "IDENTIFY", userId: user.userId, sessionId }));
        };
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "SESSION_RESTORED" && data.sessionId) {
              localStorage.setItem("player_session_id", data.sessionId);
            }
            if (data.type === "FORCE_LOGOUT") {
              setForcedLogoutReason(data.reason || "আপনার অ্যাকাউন্টে অন্য একটি ডিভাইস থেকে লগইন করা হয়েছে।");
              setUser(null);
              localStorage.removeItem("player_session_id");
            }
          } catch {}
        };
        ws.onclose = (event) => {
          if (event.code === 4001) return; // Evicted intentionally
          reconnectTimeout = setTimeout(connect, 3500);
        };
      } catch {}
    };

    connect();

    return () => {
      clearTimeout(reconnectTimeout);
      if (ws) ws.close();
    };
  }, [user]);
  const [activeTab, setActiveTab] = useState<"game" | "p2p" | "leaderboard">("game");
  const [tabDirection, setTabDirection] = useState<number>(1);
  const [selectedTable, setSelectedTable] = useState<"express" | "classic" | "vip">("classic");
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const [lang, setLang] = useState<"bn" | "en">("bn");
  const [telemetry, setTelemetry] = useState<HighLoadTelemetry | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<string>(getStoredCurrencyCode());
  const [isCurrencySelectorOpen, setIsCurrencySelectorOpen] = useState<boolean>(false);

  // Modals & Overlays state
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [isOnlineUsersOpen, setIsOnlineUsersOpen] = useState<boolean>(false);
  const [showRegulatoryFooter, setShowRegulatoryFooter] = useState<boolean>(true);
  const [isWalletOpen, setIsWalletOpen] = useState<boolean>(false);
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);
  const [isProvablyFairOpen, setIsProvablyFairOpen] = useState<boolean>(false);
  const [isRoadmapOpen, setIsRoadmapOpen] = useState<boolean>(false);
  const [isMerchantOpen, setIsMerchantOpen] = useState<boolean>(false);
  const [isLiquidityOpen, setIsLiquidityOpen] = useState<boolean>(false);
  const [isBetHistoryOpen, setIsBetHistoryOpen] = useState<boolean>(false);
  const [isGameRulesOpen, setIsGameRulesOpen] = useState<boolean>(false);
  const [isTransparencyOpen, setIsTransparencyOpen] = useState<boolean>(false);
  const [transparencyTab, setTransparencyTab] = useState<"charter" | "comparison" | "proofOfReserves" | "liveLedger" | "publicUsers">("charter");
  const [isReferralOpen, setIsReferralOpen] = useState<boolean>(false);
  const [latency, setLatency] = useState<number>(24);
  const latencyRef = useRef<number>(24);

  const measurePing = useCallback(async (): Promise<number> => {
    const start = performance.now();
    try {
      const res = await fetch("/api/time", { cache: "no-store" });
      if (res.ok) {
        const end = performance.now();
        const rtt = Math.max(1, Math.round(end - start));
        latencyRef.current = rtt;
        setLatency(rtt);
        return rtt;
      }
    } catch {}
    return latencyRef.current;
  }, []);

  // Periodic background ping check every 15 seconds
  useEffect(() => {
    measurePing();
    const interval = setInterval(measurePing, 15000);
    return () => clearInterval(interval);
  }, [measurePing]);

  // Cinematic Door Opening / Table Entry Transition State
  const [tableTransitionOpen, setTableTransitionOpen] = useState<boolean>(false);
  const [transitionTableName, setTransitionTableName] = useState<string>("Classic Sanctum");
  const [transitionTableIcon, setTransitionTableIcon] = useState<string>("🎯");

  // Direct PWA Install Trigger Hook
  const {
    isInstallable,
    isInstalled,
    isStandalone,
    isIOS,
    isAndroid,
    hasPrompt,
    install,
    openApp,
  } = usePWAInstall();

  const handleTriggerInstallApp = async () => {
    sound.playButtonClick();
    await install();
  };

  // Active round reference for Provably Fair modal
  const [activeRound, setActiveRound] = useState<TableRound | null>(null);
  const [tableRoadmap, setTableRoadmap] = useState<RoadmapItem[]>([]);

  // Hook to detect screen orientation and aspect ratio changes, dynamically toggling 'compact-mode' on root element
  useEffect(() => {
    const checkCompactMode = () => {
      const isLandscape = window.innerWidth > window.innerHeight;
      const isMobile = window.innerWidth <= 1024 || window.innerHeight <= 600;
      const isCompact = isLandscape && isMobile;
      if (isCompact) {
        document.documentElement.classList.add("compact-mode");
      } else {
        document.documentElement.classList.remove("compact-mode");
      }
    };
    checkCompactMode();
    window.addEventListener("resize", checkCompactMode);
    window.addEventListener("orientationchange", checkCompactMode);
    return () => {
      window.removeEventListener("resize", checkCompactMode);
      window.removeEventListener("orientationchange", checkCompactMode);
    };
  }, []);

  // Telemetry periodic fetch for high-load state
  useEffect(() => {
    const fetchTelemetry = async () => {
      try {
        const res = await fetch("/api/system/telemetry");
        if (res.ok) {
          const data = await res.json();
          setTelemetry(data);
        }
      } catch {
        // Fallback default high-load values
      }
    };
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 6000);
    return () => clearInterval(interval);
  }, []);

  // Listen for custom currency changes across the app
  useEffect(() => {
    const handleCurrencyChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ code: string }>;
      if (customEvent.detail?.code) {
        setSelectedCurrency(customEvent.detail.code);
      }
    };
    window.addEventListener("currency-change", handleCurrencyChange);
    return () => window.removeEventListener("currency-change", handleCurrencyChange);
  }, []);

  const [swipeNotice, setSwipeNotice] = useState<string | null>(null);

  const tabSequence: Array<"game" | "p2p" | "leaderboard"> = ["game", "p2p", "leaderboard"];
  const tabIndexMap: Record<"game" | "p2p" | "leaderboard", number> = {
    game: 0,
    p2p: 1,
    leaderboard: 2,
  };

  const handleSelectTableWithTransition = useCallback((tableSlug: "express" | "classic" | "vip") => {
    const tableInfo = {
      express: { name: "Express Turbo", icon: "⚡" },
      classic: { name: "Classic Sanctum", icon: "🎯" },
      vip: { name: "VIP Saloon", icon: "👑" },
    }[tableSlug] || { name: "Classic Sanctum", icon: "🎯" };

    setTransitionTableName(tableInfo.name);
    setTransitionTableIcon(tableInfo.icon);
    setTableTransitionOpen(true);
    setSelectedTable(tableSlug);
    perfMonitor.recordInteraction(`Select Table: ${tableSlug}`);

    setActiveTab((prev) => {
      if (prev !== "game") {
        setTabDirection(-1);
        return "game";
      }
      return prev;
    });
  }, []);

  const handleCloseTableTransition = useCallback(() => {
    setTableTransitionOpen(false);
  }, []);

  const isInitialMount = useRef(true);
  useEffect(() => {
    isInitialMount.current = false;
  }, []);

  const handleTabChange = useCallback((newTab: "game" | "p2p" | "leaderboard") => {
    setActiveTab((prevTab) => {
      if (newTab === prevTab) return prevTab;
      const dir = tabIndexMap[newTab] > tabIndexMap[prevTab] ? 1 : -1;
      setTabDirection(dir);
      perfMonitor.recordInteraction(`Switch Tab to: ${newTab}`);
      return newTab;
    });
  }, []);

  const handleOpenBetHistoryModal = useCallback(() => {
    setUser((currentUser) => {
      if (!currentUser) {
        setAuthScreenMode("signin");
      } else {
        setIsBetHistoryOpen(true);
      }
      return currentUser;
    });
  }, []);

  const handleOpenGameRulesModal = useCallback(() => {
    setIsGameRulesOpen(true);
  }, []);

  const handleOpenProfileModal = useCallback(() => {
    setUser((currentUser) => {
      if (!currentUser) {
        setAuthScreenMode("signin");
      } else {
        setIsProfileOpen(true);
      }
      return currentUser;
    });
  }, []);

  const handleNavigateToP2PTab = useCallback(() => {
    handleTabChange("p2p");
  }, [handleTabChange]);

  const handleRequireLoginAuth = useCallback(() => {
    setAuthScreenMode("signin");
  }, []);

  const tabSlideVariants = {
    initial: (dir: number) => {
      if (isInitialMount.current || dir === 0) {
        return { opacity: 1, x: 0, scale: 1 };
      }
      return {
        opacity: 0,
        x: dir > 0 ? 45 : -45,
        scale: 0.99,
      };
    },
    animate: {
      opacity: 1,
      x: 0,
      scale: 1,
      transition: { duration: 0.28, ease: "easeOut" as const },
    },
    exit: (dir: number) => ({
      opacity: 0,
      x: dir > 0 ? -45 : 45,
      scale: 0.99,
      transition: { duration: 0.2, ease: "easeIn" as const },
    }),
  };

  const bindTabSwipe = useDrag(
    ({ swipe: [swipeX], movement: [mx], direction: [dirX], event, last }) => {
      // Ignore drags originating inside horizontal scrollable elements, modals, or fixed overlays
      const isAnyModalOpen =
        isWalletOpen ||
        isProfileOpen ||
        isProvablyFairOpen ||
        isRoadmapOpen ||
        isMerchantOpen ||
        isLiquidityOpen ||
        isBetHistoryOpen ||
        isGameRulesOpen ||
        isTransparencyOpen ||
        isReferralOpen ||
        isMenuOpen ||
        isOnlineUsersOpen ||
        isCurrencySelectorOpen ||
        tableTransitionOpen;

      if (isAnyModalOpen) return;

      const targetEl = event.target as HTMLElement | null;
      if (
        targetEl &&
        targetEl.closest(".no-scrollbar, .overflow-x-auto, input[type='range'], [data-prevent-swipe='true'], [role='dialog'], [role='alertdialog'], .fixed")
      ) {
        return;
      }

      if (last) {
        const currentIndex = tabSequence.indexOf(activeTab);

        // Swipe Left -> Next Tab
        if (swipeX < 0 || (mx < -50 && dirX < 0)) {
          if (currentIndex < tabSequence.length - 1) {
            sound.playButtonClick();
            const nextTab = tabSequence[currentIndex + 1];
            handleTabChange(nextTab);
            const label = nextTab === "p2p" ? "1v1 Duels" : "Leaderboard";
            setSwipeNotice(`Swiped to ${label} ➔`);
            setTimeout(() => setSwipeNotice(null), 1500);
          }
        }
        // Swipe Right -> Previous Tab
        else if (swipeX > 0 || (mx > 50 && dirX > 0)) {
          if (currentIndex > 0) {
            sound.playButtonClick();
            const prevTab = tabSequence[currentIndex - 1];
            handleTabChange(prevTab);
            const label = prevTab === "game" ? "Live Arena" : "1v1 Duels";
            setSwipeNotice(`⬅ Swiped to ${label}`);
            setTimeout(() => setSwipeNotice(null), 1500);
          }
        }
      }
    },
    {
      axis: "x",
      filterTaps: true,
      pointer: { touch: true },
      swipe: { distance: 30, velocity: 0.15 },
    }
  );

  const [currentRoute, setCurrentRoute] = useState<string>(() => {
    return window.location.pathname + window.location.hash;
  });

  // Admin and Route Navigation Listener
  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentRoute(window.location.pathname + window.location.hash);
    };
    handleLocationChange();
    window.addEventListener("popstate", handleLocationChange);
    window.addEventListener("hashchange", handleLocationChange);
    return () => {
      window.removeEventListener("popstate", handleLocationChange);
      window.removeEventListener("hashchange", handleLocationChange);
    };
  }, []);

  // Real-time balance and user state polling loop (every 2.5s)
  useEffect(() => {
    if (!user?.userId) return;
    const interval = setInterval(() => {
      fetchUser(user.userId, user.username);
    }, 2500);
    return () => clearInterval(interval);
  }, [user?.userId, user?.username]);

  const fetchUser = async (userId: string, username: string) => {
    if (!userId || userId === "undefined" || userId.trim() === "") {
      handleLogout();
      return;
    }
    try {
      const sid = localStorage.getItem("player_session_id") || "";
      const headers: Record<string, string> = { "x-user-id": userId };
      if (sid) headers["x-session-id"] = sid;

      const res = await fetch(`/api/wallet/${encodeURIComponent(userId)}?username=${encodeURIComponent(username)}`, { headers });
      if (!res.ok) {
        return;
      }
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        return;
      }
      const data = await res.json();
      if (data && data.userId) {
        const storedType = localStorage.getItem("dt_balance_type") as "real" | "demo" | null;
        setUser((prev) => {
          if (!prev) {
            return {
              ...data,
              balanceType: storedType || data.balanceType || "real",
            };
          }
          const targetType = storedType || data.balanceType || prev.balanceType || "real";
          if (
            prev.balance === data.balance &&
            prev.demoBalance === data.demoBalance &&
            prev.balanceType === targetType &&
            prev.username === data.username
          ) {
            return prev;
          }
          return {
            ...prev,
            ...data,
            balance: typeof data.balance === "number" ? data.balance : prev.balance,
            balanceType: targetType,
          };
        });
        localStorage.setItem("dt_user_id", userId);
        localStorage.setItem("dt_username", username);
        localStorage.setItem("dt_user_profile_backup", JSON.stringify(data));
      }
    } catch {
      // Ignore transient network errors
    }
  };

  const handleLoginSuccess = (loggedInUser: UserWallet) => {
    setUser(loggedInUser);
    setAuthScreenMode(null);
    localStorage.setItem("dt_user_id", loggedInUser.userId);
    localStorage.setItem("dt_username", loggedInUser.username);
    localStorage.setItem("dt_user_profile_backup", JSON.stringify(loggedInUser));
  };

  const handleLogout = async () => {
    const sid = localStorage.getItem("player_session_id") || "";
    const currentUid = user?.userId || localStorage.getItem("dt_user_id") || "";

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(sid ? { "x-session-id": sid } : {}),
          ...(currentUid ? { "x-user-id": currentUid } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ sessionId: sid, userId: currentUid }),
      });
    } catch {}

    localStorage.removeItem("dt_user_id");
    localStorage.removeItem("dt_username");
    localStorage.removeItem("player_session_id");
    sessionStorage.clear();
    setUser(null);
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sound.sfxEnabled = next;
  };

  const handleToggleVoice = () => {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    sound.voiceEnabled = next;
  };

  const handleToggleBalanceType = useCallback(async () => {
    if (!user) return;
    const targetType: "demo" | "real" = user.balanceType === "real" ? "demo" : "real";
    
    // 1. Instant optimistic UI update and local persistence
    setUser((prev) => (prev ? { ...prev, balanceType: targetType } : null));
    localStorage.setItem("dt_balance_type", targetType);
    sound.playButtonClick();

    try {
      const sid = localStorage.getItem("player_session_id") || "";
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "x-user-id": user.userId,
      };
      if (sid) headers["x-session-id"] = sid;

      const res = await fetch(`/api/wallet/${encodeURIComponent(user.userId)}/toggle-balance`, {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({ balanceType: targetType, userId: user.userId, sessionId: sid }),
      });
      const data = await res.json();
      
      // 2. Explicit state check to ensure UI reflects target balance mode
      if (data.success && data.user) {
        setUser((prev) => {
          const resolvedType = (data.user.balanceType || targetType) as "demo" | "real";
          if (!prev) return { ...data.user, balanceType: resolvedType };
          return {
            ...data.user,
            balanceType: resolvedType,
          };
        });
        localStorage.setItem("dt_balance_type", data.user.balanceType || targetType);
      } else {
        setUser((prev) => (prev ? { ...prev, balanceType: targetType } : null));
      }
    } catch (e) {
      console.error("Failed to toggle balance type on server:", e);
      setUser((prev) => (prev ? { ...prev, balanceType: targetType } : null));
    }
  }, [user]);

  const handleOpenRoadmap = async () => {
    try {
      const res = await fetch(`/api/tables/${selectedTable}/roadmap`);
      const data = await res.json();
      setTableRoadmap(data);
    } catch (e) {
      console.error(e);
    }
    setIsRoadmapOpen(true);
  };

  const handleOpenProvablyFair = async () => {
    try {
      const res = await fetch("/api/tables");
      const tables = await res.json();
      const match = tables.find((t: { config: { slug: string } }) => t.config.slug === selectedTable);
      if (match) setActiveRound(match.currentRound);
    } catch (e) {
      console.error(e);
    }
    setIsProvablyFairOpen(true);
  };

  const handleCloseAllModals = () => {
    setIsWalletOpen(false);
    setIsProfileOpen(false);
    setIsProvablyFairOpen(false);
    setIsRoadmapOpen(false);
    setIsMerchantOpen(false);
    setIsLiquidityOpen(false);
    setIsBetHistoryOpen(false);
    setIsGameRulesOpen(false);
    setIsTransparencyOpen(false);
    setIsReferralOpen(false);
    setIsMenuOpen(false);
    setIsOnlineUsersOpen(false);
  };

  // Updated state-driven admin route handler
  const isAdminRoute =
    currentRoute.includes("/admin") ||
    currentRoute.includes("#/admin") ||
    currentRoute.includes("#admin");

  const isAdminLogin =
    currentRoute.includes("/admin/login") ||
    currentRoute.includes("#/admin/login");

  const isAdminAuthorized =
    localStorage.getItem("admin_token") !== null ||
    sessionStorage.getItem("admin_authorized") === "true";

  if (isAdminRoute) {
    if (!isAdminAuthorized || isAdminLogin) {
      return (
        <AdminLogin
          onLoginSuccess={() => {
            sessionStorage.setItem("admin_authorized", "true");
            window.location.hash = "#/admin";
            setCurrentRoute(window.location.pathname + "#/admin");
          }}
          onBackToGame={() => {
            window.location.hash = "#/";
            setCurrentRoute(window.location.pathname + "#/");
          }}
        />
      );
    }
    return (
      <AdminDashboard
        onExit={() => {
          window.location.hash = "#/";
          setCurrentRoute(window.location.pathname + "#/");
        }}
        onLogout={() => {
          localStorage.removeItem("admin_token");
          sessionStorage.removeItem("admin_authorized");
          sessionStorage.removeItem("admin_user");
          window.location.hash = "#/admin/login";
          setCurrentRoute(window.location.pathname + "#/admin/login");
        }}
      />
    );
  }

  if (authScreenMode) {
    return (
      <LoginScreen
        initialMode={authScreenMode}
        onLoginSuccess={handleLoginSuccess}
        onOpenInstallApp={handleTriggerInstallApp}
        onBackAsGuest={() => setAuthScreenMode(null)}
      />
    );
  }

  return (
    <div className="fixed inset-0 w-full h-[100dvh] max-h-[100dvh] text-neutral-100 flex flex-col font-sans selection:bg-amber-500 selection:text-neutral-950 overflow-hidden bg-[#02050b] select-none">
      {/* Immersive Atmospheric Glows (Strictly inert and placed behind all interactive layers) */}
      <div
        aria-hidden="true"
        style={{ pointerEvents: "none", zIndex: -10 }}
        className="fixed inset-0 -z-10 pointer-events-none select-none overflow-hidden"
      >
        <div
          style={{ pointerEvents: "none", zIndex: -10 }}
          className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full animate-pulse pointer-events-none select-none"
        />
        <div
          style={{ pointerEvents: "none", zIndex: -10 }}
          className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-600/10 blur-[120px] rounded-full animate-pulse pointer-events-none select-none"
        />
        <div
          style={{ pointerEvents: "none", zIndex: -10 }}
          className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-red-600/5 blur-[100px] rounded-full pointer-events-none select-none"
        />
        <div
          style={{ pointerEvents: "none", zIndex: -10 }}
          className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.04] mix-blend-overlay pointer-events-none select-none"
        />
      </div>

      <div className={`w-full flex-1 flex flex-col relative z-10 h-full max-h-full overflow-hidden min-h-0 ${activeTab === "game" ? "pb-14 md:pb-0" : "pb-0"}`}>
        {/* Inactivity Security Auto-Logout (30 mins) */}
        <AutoLogoutTimer onLogout={handleLogout} timeoutMinutes={30} warningMinutes={2} />

        {/* Global Keyboard Shortcut Listener */}
        <GlobalShortcuts
          onOpenWallet={() => {
            if (!user) {
              setAuthScreenMode("signin");
            } else {
              setIsWalletOpen(true);
            }
          }}
          onOpenLeaderboard={() => handleTabChange("leaderboard")}
          onOpenGame={() => handleTabChange("game")}
          onOpenP2P={() => handleTabChange("p2p")}
          onOpenMenu={() => setIsMenuOpen(true)}
          onCloseModals={handleCloseAllModals}
        />

        <Navbar
          user={user}
          activeTab={activeTab}
          setActiveTab={handleTabChange}
          selectedTable={selectedTable}
          onSelectTable={handleSelectTableWithTransition}
          soundEnabled={soundEnabled}
          onToggleSound={handleToggleSound}
          voiceEnabled={voiceEnabled}
          onToggleVoice={handleToggleVoice}
          onOpenWallet={() => {
            if (!user) {
              setAuthScreenMode("signin");
            } else {
              setIsWalletOpen(true);
            }
          }}
          onOpenLogin={() => setAuthScreenMode("signin")}
          onOpenRegister={() => setAuthScreenMode("signup")}
          onOpenProvablyFair={handleOpenProvablyFair}
          onOpenRoadmap={handleOpenRoadmap}
          onOpenMerchant={() => setIsMerchantOpen(true)}
          onOpenSiteLiquidity={() => setIsLiquidityOpen(true)}
          onOpenBetHistory={() => {
            if (!user) {
              setAuthScreenMode("signin");
            } else {
              setIsBetHistoryOpen(true);
            }
          }}
          onOpenRules={() => setIsGameRulesOpen(true)}
          onOpenTransparency={() => {
            setTransparencyTab("charter");
            setIsTransparencyOpen(true);
          }}
          onOpenReferral={() => setIsReferralOpen(true)}
          onOpenCurrencySelector={() => setIsCurrencySelectorOpen(true)}
          onOpenInstallApp={handleTriggerInstallApp}
          isStandalone={isStandalone}
          isInstalled={isInstalled}
          selectedCurrency={selectedCurrency}
          onOpenMenu={() => setIsMenuOpen(true)}
          onOpenOnlineUsers={() => setIsOnlineUsersOpen(true)}
          onLogout={handleLogout}
          onToggleBalanceType={handleToggleBalanceType}
          lang={lang}
          onToggleLang={() => setLang((l) => (l === "bn" ? "en" : "bn"))}
          telemetryPlayerCount={telemetry?.totalActivePlayers ?? 1}
          tablePlayerCounts={telemetry?.tableActivePlayers}
        />

        {/* Offline Network Status Badge */}
        <NetworkStatusBadge lang={lang} />

        {/* Swipe Feedback Toast Notice */}
        <AnimatePresence>
          {swipeNotice && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              className="fixed top-16 left-1/2 -translate-x-1/2 z-[90] bg-neutral-900/95 border border-amber-500/50 text-amber-300 px-4 py-2 rounded-full shadow-[0_10px_25px_rgba(0,0,0,0.8)] font-black text-xs tracking-wider font-mono flex items-center gap-2 pointer-events-none select-none"
            >
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>{swipeNotice}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Gesture Swipe Container for Tab Navigation */}
        <div {...bindTabSwipe()} className="w-full flex-1 flex flex-col relative touch-pan-y min-h-0 overflow-hidden">
          <AnimatePresence mode="wait" initial={false} custom={tabDirection}>
            <motion.main
              key={activeTab}
              custom={tabDirection}
              variants={tabSlideVariants}
              initial={isInitialMount.current ? false : "initial"}
              animate="animate"
              exit="exit"
              className={`w-full relative flex-1 h-full min-h-0 flex flex-col ${
                activeTab === "game"
                  ? "max-w-none p-0 overflow-hidden"
                  : "max-w-7xl mx-auto px-1.5 sm:px-4 lg:px-8 py-1.5 sm:py-3 pb-36 sm:pb-28 overflow-y-auto overscroll-y-contain custom-scrollbar touch-pan-y"
              }`}
            >
            {activeTab === "game" && (
              <motion.div
                key={`game-table-container-${selectedTable}`}
                initial={false}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="w-full h-full max-h-full flex flex-col flex-1 min-h-0 overflow-hidden"
              >
                <GameTable
                  user={user}
                  selectedTableSlug={selectedTable}
                  onUpdateWallet={setUser}
                  onOpenProvablyFair={handleOpenProvablyFair}
                  onOpenRoadmap={handleOpenRoadmap}
                  onOpenBetHistory={handleOpenBetHistoryModal}
                  onOpenRules={handleOpenGameRulesModal}
                  onOpenProfile={handleOpenProfileModal}
                  onToggleBalanceType={handleToggleBalanceType}
                  onNavigateToP2P={handleNavigateToP2PTab}
                  onRequireLogin={handleRequireLoginAuth}
                  onSelectTable={handleSelectTableWithTransition}
                  lang={lang}
                  latency={latency}
                  onMeasurePing={measurePing}
                />
              </motion.div>
            )}
            {activeTab === "p2p" && (
              <P2PLobby
                user={user}
                onUpdateWallet={setUser}
                onRequireLogin={() => setAuthScreenMode("signin")}
              />
            )}
            {activeTab === "leaderboard" && (
              <Leaderboard
                onOpenLiquidity={() => setIsLiquidityOpen(true)}
                currentUser={user}
              />
            )}
          </motion.main>
        </AnimatePresence>
      </div>

      {/* Cinematic Door Opening / Table Entry Transition Overlay */}
      <TableEntryTransition
        isOpen={tableTransitionOpen}
        tableName={transitionTableName}
        tableIcon={transitionTableIcon}
        onComplete={handleCloseTableTransition}
      />

      {/* Side Navigation Menu Drawer */}
      <SideNavDrawer
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        user={user}
        onOpenLogin={() => {
          setIsMenuOpen(false);
          setAuthScreenMode("signin");
        }}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        lang={lang}
        onToggleLang={() => setLang((l) => (l === "bn" ? "en" : "bn"))}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        voiceEnabled={voiceEnabled}
        onToggleVoice={handleToggleVoice}
        wakeLockEnabled={wakeLock.isEnabled}
        wakeLockActive={wakeLock.isActive}
        onToggleWakeLock={wakeLock.toggleWakeLock}
        onOpenWallet={() => {
          setIsMenuOpen(false);
          if (!user) {
            setAuthScreenMode("signin");
          } else {
            setIsWalletOpen(true);
          }
        }}
        onOpenProfile={() => {
          setIsMenuOpen(false);
          if (!user) {
            setAuthScreenMode("signin");
          } else {
            setIsProfileOpen(true);
          }
        }}
        onOpenProvablyFair={() => {
          setIsMenuOpen(false);
          handleOpenProvablyFair();
        }}
        onOpenRoadmap={() => {
          setIsMenuOpen(false);
          handleOpenRoadmap();
        }}
        onOpenRules={() => {
          setIsMenuOpen(false);
          setIsGameRulesOpen(true);
        }}
        onOpenTransparency={() => {
          setIsMenuOpen(false);
          setTransparencyTab("charter");
          setIsTransparencyOpen(true);
        }}
        onOpenPublicUsers={() => {
          setIsMenuOpen(false);
          setTransparencyTab("publicUsers");
          setIsTransparencyOpen(true);
        }}
        onOpenBetHistory={() => {
          setIsMenuOpen(false);
          if (!user) {
            setAuthScreenMode("signin");
          } else {
            setIsBetHistoryOpen(true);
          }
        }}
        onOpenSiteLiquidity={() => {
          setIsMenuOpen(false);
          setIsLiquidityOpen(true);
        }}
        onOpenReferral={() => {
          setIsMenuOpen(false);
          if (!user) {
            setAuthScreenMode("signin");
          } else {
            setIsReferralOpen(true);
          }
        }}
        onOpenCurrencySelector={() => {
          setIsMenuOpen(false);
          setIsCurrencySelectorOpen(true);
        }}
        onOpenInstallApp={() => {
          setIsMenuOpen(false);
          handleTriggerInstallApp();
        }}
        isStandalone={isStandalone}
        isInstalled={isInstalled}
        selectedCurrency={selectedCurrency}
        onOpenMerchant={() => {
          setIsMenuOpen(false);
          setIsMerchantOpen(true);
        }}
        onOpenAdmin={() => {
          setIsMenuOpen(false);
          window.location.hash = "#/admin";
          setCurrentRoute(window.location.pathname + "#/admin");
        }}
        onToggleRegulatoryFooter={() => setShowRegulatoryFooter((prev) => !prev)}
        showRegulatoryFooter={showRegulatoryFooter}
        onToggleBalanceType={handleToggleBalanceType}
        onLogout={() => {
          setIsMenuOpen(false);
          handleLogout();
        }}
      />

      {/* Online Active Users Transparency Modal */}
      {isOnlineUsersOpen && (
        <ActiveOnlineUsersModal
          isOpen={isOnlineUsersOpen}
          onClose={() => setIsOnlineUsersOpen(false)}
          onlineCount={telemetry?.totalActivePlayers ?? 0}
          lang={lang}
        />
      )}

      {/* MODALS */}

      {isBetHistoryOpen && user && (
        <UserBetHistoryModal
          user={user}
          isOpen={isBetHistoryOpen}
          onClose={() => setIsBetHistoryOpen(false)}
          lang={lang}
        />
      )}

      {isGameRulesOpen && (
        <GameRulesModal
          isOpen={isGameRulesOpen}
          onClose={() => setIsGameRulesOpen(false)}
          lang={lang}
        />
      )}

      {isTransparencyOpen && (
        <TransparencyCharterModal
          isOpen={isTransparencyOpen}
          onClose={() => setIsTransparencyOpen(false)}
          lang={lang}
          onOpenProvablyFair={handleOpenProvablyFair}
          onOpenLiquidity={() => setIsLiquidityOpen(true)}
          initialTab={transparencyTab}
        />
      )}

      {isLiquidityOpen && (
        <SiteLiquidityModal
          isOpen={isLiquidityOpen}
          onClose={() => setIsLiquidityOpen(false)}
          currentUserId={user?.userId || "guest"}
        />
      )}

      {isProfileOpen && user && (
        <UserProfileModal
          user={user}
          onClose={() => setIsProfileOpen(false)}
          onOpenWallet={() => {
            setIsProfileOpen(false);
            setIsWalletOpen(true);
          }}
          onUpdateWallet={setUser}
          onOpenReferral={() => setIsReferralOpen(true)}
        />
      )}

      {isWalletOpen && user && (
        <WalletModal
          user={user}
          onClose={() => setIsWalletOpen(false)}
          onUpdateWallet={setUser}
          onOpenProfile={() => setIsProfileOpen(true)}
          onToggleBalanceType={handleToggleBalanceType}
        />
      )}

      {isProvablyFairOpen && (
        <ProvablyFairModal
          currentRound={activeRound}
          onClose={() => setIsProvablyFairOpen(false)}
        />
      )}

      {isRoadmapOpen && (
        <RoadmapModal
          tableName={selectedTable.toUpperCase()}
          roadmap={tableRoadmap}
          onClose={() => setIsRoadmapOpen(false)}
        />
      )}

      {isCurrencySelectorOpen && (
        <CurrencySelectorModal
          selectedCurrency={selectedCurrency}
          onSelectCurrency={(code) => {
            setSelectedCurrency(code);
            setStoredCurrencyCode(code);
          }}
          onClose={() => setIsCurrencySelectorOpen(false)}
          baseBalance={user?.balance || 50000}
        />
      )}

      {/* Mobile Fixed Bottom Navigation Bar (Always visible) */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenWallet={() => {
          if (!user) {
            setAuthScreenMode("signin");
          } else {
            setIsWalletOpen(true);
          }
        }}
        onOpenBetHistory={() => {
          if (!user) {
            setAuthScreenMode("signin");
          } else {
            setIsBetHistoryOpen(true);
          }
        }}
        onOpenInstallApp={handleTriggerInstallApp}
        isStandalone={isStandalone}
        isInstalled={isInstalled}
        user={user}
        selectedCurrency={selectedCurrency}
        onOpenLogin={() => setAuthScreenMode("signin")}
      />

      {/* Non-intrusive New Version Available Toast */}
      <AnimatePresence>
        {newVersionAvailable && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-[99990] max-w-sm w-[calc(100vw-2rem)] md:w-80 bg-neutral-900/95 backdrop-blur-xl border border-amber-500/40 rounded-2xl p-4 shadow-[0_12px_40px_rgba(0,0,0,0.8),0_0_20px_rgba(245,158,11,0.2)] text-white select-none"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400 shadow-inner">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-bold text-xs text-amber-400 tracking-wide uppercase">
                    New Version Available
                  </h4>
                  <button
                    onClick={() => setNewVersionAvailable(false)}
                    className="p-1 -mr-1 -mt-1 text-neutral-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                    title="Dismiss"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[11px] text-neutral-300 mt-0.5 leading-snug">
                  A new update is available. Click reload to apply the latest build.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={handleReloadNewVersion}
                    disabled={isReloadingVersion}
                    className="flex-1 py-2 px-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-extrabold text-xs rounded-xl shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isReloadingVersion ? "animate-spin" : ""}`} />
                    <span>{isReloadingVersion ? "Updating..." : "Reload"}</span>
                  </button>
                  <button
                    onClick={() => setNewVersionAvailable(false)}
                    className="py-2 px-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold rounded-xl border border-white/5 transition-colors cursor-pointer"
                  >
                    Later
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Single-Device Force Logout Alert Dialog */}
      {forcedLogoutReason && (
        <div role="alertdialog" className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 select-none">
          <div className="bg-neutral-900 border border-amber-500/40 rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <h2 className="text-white font-black text-lg tracking-wide">আপনি লগ আউট হয়েছেন</h2>
            <p className="text-neutral-300 text-xs leading-relaxed">{forcedLogoutReason}</p>
            <p className="text-neutral-500 text-[11px] leading-tight">
              নিরাপত্তার জন্য একসাথে শুধু একটি ডিভাইসে খেলা যায়। আপনি যদি এই লগইন না করে থাকেন,
              অনুগ্রহ করে এখনই পাসওয়ার্ড পরিবর্তন করুন।
            </p>
            <button
              onClick={() => {
                setForcedLogoutReason(null);
                window.location.reload();
              }}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer active:scale-95"
            >
              আবার লগইন করুন (Login Again)
            </button>
          </div>
        </div>
      )}
    </div>
  </div>
  );
}
