import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Screen Wake Lock Hook & Utility
 * Keeps display light always ON while the user is on the site / playing.
 * - Primary: HTML5 Screen Wake Lock API (navigator.wakeLock)
 * - Auto-reacquires when tab returns to visible (after switching apps/tabs)
 * - Auto-acquires on initial mount and user touch/click gesture
 * - Fallback: Invisible muted looping video element for browsers without WakeLock API
 */

export function useWakeLock(initialEnabled: boolean = true) {
  const [isEnabled, setIsEnabled] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem("dt_keep_screen_awake");
      return stored !== null ? stored === "true" : initialEnabled;
    } catch {
      return initialEnabled;
    }
  });

  const [isActive, setIsActive] = useState<boolean>(false);
  const [isSupported, setIsSupported] = useState<boolean>(true);

  const sentinelRef = useRef<any>(null);
  const fallbackVideoRef = useRef<HTMLVideoElement | null>(null);

  // Helper to request native wake lock
  const acquireNative = useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined" || !("wakeLock" in navigator)) {
      return false;
    }
    if (document.visibilityState !== "visible") {
      return false;
    }
    try {
      // Release existing if any
      if (sentinelRef.current) {
        try {
          await sentinelRef.current.release();
        } catch {}
        sentinelRef.current = null;
      }

      const sentinel = await (navigator as any).wakeLock.request("screen");
      sentinelRef.current = sentinel;
      setIsActive(true);

      sentinel.addEventListener("release", () => {
        if (sentinelRef.current === sentinel) {
          sentinelRef.current = null;
          setIsActive(false);
        }
      });
      return true;
    } catch {
      // Permission denied or low-battery system policy
      return false;
    }
  }, []);

  // Fallback: Invisible dummy stream only for legacy browsers lacking WakeLock API
  const acquireFallback = useCallback(() => {
    if (typeof document === "undefined") return;
    try {
      if (!fallbackVideoRef.current) {
        const video = document.createElement("video");
        video.setAttribute("playsinline", "");
        video.setAttribute("muted", "");
        video.setAttribute("loop", "");
        video.setAttribute("aria-hidden", "true");
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.hidden = true;
        video.style.display = "none";
        video.style.position = "absolute";
        video.style.width = "0px";
        video.style.height = "0px";
        video.style.opacity = "0";
        video.style.pointerEvents = "none";

        // Minimal empty WebM 1-frame looping video data URI
        video.src =
          "data:video/webm;base64,GkXfo0AgQoaBAUL3gQFC8oEEQvOBCEKCQAR3ZWJtQoeBAkKFgQIYUkoAkExhbWFzZXQAcGNtX3Nwb3RfMzJraHoAcGNtX3Nwb3RfMzJraHoARGFuZyBNYXRyb3NrYSByZWxlYXNlIDQuMC4wCVdlYk0gMi4wLjAAB0lAxYEDAAAAAAABs4EB84EEU21hcnRDb2RlY1NldABhZGYB";

        document.body.appendChild(video);
        fallbackVideoRef.current = video;
      }
      fallbackVideoRef.current.play().then(() => {
        setIsActive(true);
      }).catch(() => {});
    } catch {}
  }, []);

  // Main acquire orchestrator
  const requestWakeLock = useCallback(async () => {
    if (!isEnabled) return;
    const hasWakeLockApi = typeof window !== "undefined" && "wakeLock" in navigator;
    setIsSupported(hasWakeLockApi);

    if (hasWakeLockApi) {
      await acquireNative();
    } else {
      acquireFallback();
    }
  }, [isEnabled, acquireNative, acquireFallback]);

  // Release wake lock
  const releaseWakeLock = useCallback(async () => {
    if (sentinelRef.current) {
      try {
        await sentinelRef.current.release();
      } catch {}
      sentinelRef.current = null;
    }
    if (fallbackVideoRef.current) {
      try {
        fallbackVideoRef.current.pause();
      } catch {}
    }
    setIsActive(false);
  }, []);

  // Toggle user preference
  const toggleWakeLock = useCallback((forced?: boolean) => {
    setIsEnabled((prev) => {
      const next = typeof forced === "boolean" ? forced : !prev;
      try {
        localStorage.setItem("dt_keep_screen_awake", String(next));
      } catch {}
      return next;
    });
  }, []);

  // Lifecycle & events
  useEffect(() => {
    if (isEnabled) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }
  }, [isEnabled, requestWakeLock, releaseWakeLock]);

  // Re-acquire on visibility change (browser releases wake lock when minimized)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && isEnabled) {
        requestWakeLock();
      } else if (document.visibilityState === "hidden") {
        setIsActive(false);
      }
    };

    // User gesture listener to acquire if browser required interaction
    const handleUserGesture = () => {
      if (isEnabled && !isActive) {
        requestWakeLock();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pointerdown", handleUserGesture, { passive: true });
    window.addEventListener("touchstart", handleUserGesture, { passive: true });
    window.addEventListener("click", handleUserGesture, { passive: true });

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pointerdown", handleUserGesture);
      window.removeEventListener("touchstart", handleUserGesture);
      window.removeEventListener("click", handleUserGesture);
      releaseWakeLock();
      if (fallbackVideoRef.current && fallbackVideoRef.current.parentNode) {
        fallbackVideoRef.current.parentNode.removeChild(fallbackVideoRef.current);
        fallbackVideoRef.current = null;
      }
    };
  }, [isEnabled, isActive, requestWakeLock, releaseWakeLock]);

  return {
    isSupported,
    isEnabled,
    isActive,
    toggleWakeLock,
    requestWakeLock,
    releaseWakeLock,
  };
}
