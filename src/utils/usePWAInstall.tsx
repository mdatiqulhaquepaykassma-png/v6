import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type PWAInstallStatus = 'installable' | 'installed' | 'unknown';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export interface PWAInstallContextType {
  installStatus: PWAInstallStatus;
  isStandalone: boolean;
  isInstallable: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isSafari: boolean;
  isChrome: boolean;
  isMobile: boolean;
  hasPrompt: boolean;
  install: () => Promise<boolean>;
  openApp: () => Promise<void>;
}

/**
 * Strict check for standalone PWA mode using matchMedia('(display-mode: standalone)').
 * Returns true ONLY if the current window is launched as an installed PWA (Home Screen app / WebAPK).
 * Does NOT return true for regular browser tabs.
 */
export const checkIsStandalone = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const isStandaloneMQ = window.matchMedia('(display-mode: standalone)').matches;
    const isIOSStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    const isAndroidTWA = typeof document !== 'undefined' && document.referrer.startsWith('android-app://');
    return isStandaloneMQ || isIOSStandalone || isAndroidTWA;
  } catch {
    return false;
  }
};

const checkStoredInstall = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem('dt_pwa_installed') === 'true';
  } catch {
    return false;
  }
};

const defaultContextValue: PWAInstallContextType = {
  installStatus: 'unknown',
  isStandalone: false,
  isInstallable: false,
  isInstalled: false,
  isIOS: false,
  isAndroid: false,
  isSafari: false,
  isChrome: false,
  isMobile: false,
  hasPrompt: false,
  install: async () => false,
  openApp: async () => {},
};

export const PWAInstallContext = createContext<PWAInstallContextType>(defaultContextValue);

export const PWAInstallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() => {
    if (typeof window !== 'undefined' && (window as any).__deferredInstallPrompt) {
      return (window as any).__deferredInstallPrompt;
    }
    return null;
  });

  const [isStandalone, setIsStandalone] = useState<boolean>(checkIsStandalone);
  const [isStoredInstalled, setIsStoredInstalled] = useState<boolean>(checkStoredInstall);

  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isSafari, setIsSafari] = useState(false);
  const [isChrome, setIsChrome] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // 1. Primary state detection via window.matchMedia('(display-mode: standalone)')
    const standaloneMQ = window.matchMedia('(display-mode: standalone)');
    const updateDisplayState = (e?: MediaQueryListEvent | MediaQueryList) => {
      const stand = (e ? e.matches : standaloneMQ.matches) || checkIsStandalone();
      setIsStandalone(stand);
      if (stand) {
        setIsStoredInstalled(true);
        try {
          localStorage.setItem('dt_pwa_installed', 'true');
        } catch {}
      }
    };

    updateDisplayState();

    if (standaloneMQ.addEventListener) {
      standaloneMQ.addEventListener('change', updateDisplayState);
    }

    // 2. Pre-captured early event from window
    if (typeof window !== 'undefined' && (window as any).__deferredInstallPrompt) {
      setDeferredPrompt((window as any).__deferredInstallPrompt);
    }

    // 3. getInstalledRelatedApps API for Chromium based platforms
    if (typeof navigator !== 'undefined' && 'getInstalledRelatedApps' in navigator) {
      (navigator as any).getInstalledRelatedApps()
        .then((relatedApps: any[]) => {
          if (Array.isArray(relatedApps) && relatedApps.length > 0) {
            setIsStoredInstalled(true);
            try {
              localStorage.setItem('dt_pwa_installed', 'true');
            } catch {}
          }
        })
        .catch(() => {});
    }

    // 4. Device and User Agent detection
    if (typeof window !== 'undefined') {
      const ua = window.navigator.userAgent.toLowerCase();
      const iosDevice = /iphone|ipad|ipod/.test(ua);
      const androidDevice = /android/.test(ua);
      const mobileDevice = iosDevice || androidDevice || /mobile/.test(ua);

      const isSafariBrowser =
        iosDevice || (ua.includes('safari') && !ua.includes('chrome') && !ua.includes('android'));
      const isChromeBrowser = ua.includes('chrome') || ua.includes('crios');

      setIsIOS(iosDevice);
      setIsAndroid(androidDevice);
      setIsMobile(mobileDevice);
      setIsSafari(isSafariBrowser);
      setIsChrome(isChromeBrowser);
    }

    // 5. Native and custom installation event handlers
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      (window as any).__deferredInstallPrompt = e;
      (window as any).__pwaInstalled = false;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsStoredInstalled(true);
      setDeferredPrompt(null);
      (window as any).__deferredInstallPrompt = null;
      (window as any).__pwaInstalled = true;
      try {
        localStorage.setItem('dt_pwa_installed', 'true');
      } catch {}
    };

    const handlePromptReady = (e: any) => {
      if (e?.detail) {
        setDeferredPrompt(e.detail);
      }
    };

    const handleCustomStatusChange = (e: any) => {
      if (e?.detail?.installed) {
        setIsStoredInstalled(true);
        setDeferredPrompt(null);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('dt_pwa_prompt_ready', handlePromptReady);
    window.addEventListener('dt_pwa_status_change', handleCustomStatusChange);

    return () => {
      if (standaloneMQ.removeEventListener) {
        standaloneMQ.removeEventListener('change', updateDisplayState);
      }
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('dt_pwa_prompt_ready', handlePromptReady);
      window.removeEventListener('dt_pwa_status_change', handleCustomStatusChange);
    };
  }, []);

  const install = useCallback(async (): Promise<boolean> => {
    const promptEvent = deferredPrompt || (typeof window !== 'undefined' && (window as any).__deferredInstallPrompt);
    if (promptEvent) {
      try {
        await promptEvent.prompt();
        const { outcome } = await promptEvent.userChoice;
        if (outcome === 'accepted') {
          setIsStoredInstalled(true);
          setDeferredPrompt(null);
          if (typeof window !== 'undefined') {
            (window as any).__deferredInstallPrompt = null;
            (window as any).__pwaInstalled = true;
          }
          try {
            localStorage.setItem('dt_pwa_installed', 'true');
            window.dispatchEvent(new CustomEvent('dt_pwa_status_change', { detail: { installed: true } }));
          } catch {}
          return true;
        }
      } catch (err) {
        console.error('Error triggering PWA install prompt:', err);
      }
    }
    return false;
  }, [deferredPrompt]);

  const openApp = useCallback(async () => {
    if (checkIsStandalone()) return;
    try {
      window.location.href = window.location.origin + '/';
    } catch {
      window.location.href = '/';
    }
  }, []);

  // Compute clear installStatus enum: 'installable' | 'installed' | 'unknown'
  let installStatus: PWAInstallStatus = 'unknown';
  if (isStandalone || isStoredInstalled) {
    installStatus = 'installed';
  } else if (deferredPrompt) {
    installStatus = 'installable';
  } else if (isIOS || isAndroid || isMobile) {
    installStatus = 'installable';
  }

  const isInstalled = installStatus === 'installed';
  const isInstallable = installStatus === 'installable';

  const contextValue: PWAInstallContextType = {
    installStatus,
    isStandalone,
    isInstallable,
    isInstalled,
    isIOS,
    isAndroid,
    isSafari,
    isChrome,
    isMobile,
    hasPrompt: !!deferredPrompt,
    install,
    openApp,
  };

  return (
    <PWAInstallContext.Provider value={contextValue}>
      {children}
    </PWAInstallContext.Provider>
  );
};

export const usePWAInstall = (): PWAInstallContextType => {
  return useContext(PWAInstallContext);
};
