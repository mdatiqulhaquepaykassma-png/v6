import React, { useState, useEffect, useRef, useCallback } from "react";
import { ShieldAlert, Clock, LogOut, RefreshCw } from "lucide-react";
import { sound } from "../utils/audio";

interface AutoLogoutTimerProps {
  onLogout: () => void;
  timeoutMinutes?: number; // default 30
  warningMinutes?: number; // default 2
}

export const AutoLogoutTimer: React.FC<AutoLogoutTimerProps> = ({
  onLogout,
  timeoutMinutes = 30,
  warningMinutes = 2,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(timeoutMinutes * 60);
  const [showWarning, setShowWarning] = useState<boolean>(false);
  const lastActivityRef = useRef<number>(Date.now());

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    setShowWarning(false);
  }, []);

  // Listen to user events
  useEffect(() => {
    const events = ["mousedown", "mousemove", "keydown", "touchstart", "scroll", "wheel", "click"];
    
    // Throttle activity recording to once every 5 seconds
    let lastRecorded = 0;
    const handleActivity = () => {
      const now = Date.now();
      if (now - lastRecorded > 4000) {
        lastRecorded = now;
        lastActivityRef.current = now;
        setShowWarning(false);
      }
    };

    events.forEach((ev) => window.addEventListener(ev, handleActivity, { passive: true }));

    const checkInterval = setInterval(() => {
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - lastActivityRef.current) / 1000);
      const remaining = Math.max(0, timeoutMinutes * 60 - elapsedSeconds);
      setSecondsRemaining(remaining);

      // Warning when within warningMinutes
      if (remaining <= warningMinutes * 60 && remaining > 0) {
        setShowWarning(true);
      } else if (remaining > warningMinutes * 60) {
        setShowWarning(false);
      }

      // Time expired
      if (remaining <= 0) {
        clearInterval(checkInterval);
        sound.speak("Session timed out due to 30 minutes of inactivity. Logging out securely.");
        onLogout();
      }
    }, 1000);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handleActivity));
      clearInterval(checkInterval);
    };
  }, [timeoutMinutes, warningMinutes, onLogout]);

  if (!showWarning) return null;

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const timeFormatted = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm px-3 animate-in slide-in-from-top-4 duration-200">
      <div className="bg-[#191008] border-2 border-amber-500 rounded-2xl p-4 shadow-2xl shadow-black/90 text-white flex flex-col gap-2.5 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 animate-pulse" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1.5 text-xs font-black text-amber-300">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Inactivity Auto-Logout Security</span>
            </div>
            <p className="text-[11px] text-neutral-300 leading-tight mt-0.5">
              Wallet session will lock in <strong className="text-white font-mono text-xs">{timeFormatted}</strong> to protect your funds.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1 border-t border-white/10">
          <button
            onClick={resetTimer}
            className="flex-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Stay Signed In</span>
          </button>

          <button
            onClick={onLogout}
            className="py-2 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-red-400 text-xs font-bold transition-all border border-neutral-700 cursor-pointer flex items-center gap-1"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout Now</span>
          </button>
        </div>
      </div>
    </div>
  );
};
