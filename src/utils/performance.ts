import { useState, useEffect } from "react";

export interface PerformanceProfile {
  isLowEnd: boolean;
  isSlowNetwork: boolean;
  reducedMotion: boolean;
  maxParticles: number;
  enableHeavyBlurs: boolean;
  enable3DSheen: boolean;
}

// Global cached profile
let cachedProfile: PerformanceProfile | null = null;

export function detectPerformanceProfile(): PerformanceProfile {
  if (cachedProfile) return cachedProfile;

  if (typeof window === "undefined") {
    return {
      isLowEnd: false,
      isSlowNetwork: false,
      reducedMotion: false,
      maxParticles: 40,
      enableHeavyBlurs: true,
      enable3DSheen: true,
    };
  }

  // 1. Hardware Concurrency & Memory
  const nav = window.navigator as any;
  const cores = nav.hardwareConcurrency || 4;
  const memory = nav.deviceMemory || 4; // in GB
  const isLowHardware = cores <= 4 || memory < 3;

  // 2. Network speed detection
  const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
  let isSlowNetwork = false;
  if (connection) {
    const effType = connection.effectiveType;
    const saveData = connection.saveData;
    isSlowNetwork = Boolean(saveData || effType === "slow-2g" || effType === "2g" || effType === "3g");
  }

  // 3. User motion preferences
  const reducedMotionQuery = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  const reducedMotion = Boolean(reducedMotionQuery?.matches);

  // 4. Mobile user-agent check
  const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(nav.userAgent || "");
  const isLowEnd = isMobile && (isLowHardware || isSlowNetwork || memory <= 2);

  cachedProfile = {
    isLowEnd,
    isSlowNetwork,
    reducedMotion,
    maxParticles: isLowEnd ? 12 : 36,
    enableHeavyBlurs: !isLowEnd,
    enable3DSheen: !isLowEnd,
  };

  return cachedProfile;
}

export function usePerformanceMode(): PerformanceProfile {
  const [profile, setProfile] = useState<PerformanceProfile>(detectPerformanceProfile);

  useEffect(() => {
    const handleNetworkChange = () => {
      cachedProfile = null;
      setProfile(detectPerformanceProfile());
    };

    const nav = window.navigator as any;
    const conn = nav.connection || nav.mozConnection || nav.webkitConnection;
    if (conn) {
      conn.addEventListener("change", handleNetworkChange);
    }

    return () => {
      if (conn) conn.removeEventListener("change", handleNetworkChange);
    };
  }, []);

  return profile;
}
