import React, { useState, useEffect } from "react";
import { WifiOff, Wifi, Database } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface NetworkStatusBadgeProps {
  lang?: "bn" | "en";
}

export const NetworkStatusBadge: React.FC<NetworkStatusBadgeProps> = ({ lang = "bn" }) => {
  const [isOnline, setIsOnline] = useState<boolean>(() => typeof navigator !== "undefined" ? navigator.onLine : true);
  const [showRestoredNotice, setShowRestoredNotice] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowRestoredNotice(true);
      const timer = setTimeout(() => setShowRestoredNotice(false), 3500);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowRestoredNotice(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline && !showRestoredNotice) return null;

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.25 }}
          className="fixed top-14 sm:top-16 left-1/2 -translate-x-1/2 z-[110] bg-neutral-950/95 border border-amber-500/60 text-amber-300 px-3 sm:px-4 py-1.5 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.85)] backdrop-blur-md flex items-center gap-2 pointer-events-none select-none max-w-[92vw]"
        >
          <div className="relative flex items-center justify-center">
            <WifiOff className="w-3.5 h-3.5 text-amber-400 stroke-[2.2]" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
          </div>
          <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-mono font-bold tracking-tight">
            <span className="text-amber-400 font-black uppercase">
              {lang === "bn" ? "অফলাইন মোড" : "Offline Mode"}
            </span>
            <span className="text-amber-500/70 hidden xs:inline">•</span>
            <span className="text-amber-200/90 font-medium text-[9px] sm:text-[10px] flex items-center gap-1">
              <Database className="w-2.5 h-2.5 text-amber-400 hidden xs:inline" />
              {lang === "bn" ? "তথ্য লোকালি ক্যাশ করা হচ্ছে" : "Actions cached locally"}
            </span>
          </div>
        </motion.div>
      )}

      {isOnline && showRestoredNotice && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.25 }}
          className="fixed top-14 sm:top-16 left-1/2 -translate-x-1/2 z-[110] bg-emerald-950/95 border border-emerald-500/60 text-emerald-300 px-3 sm:px-4 py-1.5 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.85)] backdrop-blur-md flex items-center gap-2 pointer-events-none select-none"
        >
          <Wifi className="w-3.5 h-3.5 text-emerald-400 stroke-[2.2]" />
          <span className="text-[10px] sm:text-[11px] font-mono font-bold tracking-tight text-emerald-300">
            {lang === "bn" ? "অনলাইন সংযোগ পুনঃস্থাপিত হয়েছে" : "Connection Restored"}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
