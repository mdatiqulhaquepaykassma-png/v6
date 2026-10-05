import { useEffect, useState, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export interface PWAInstallState {
  isInstallable: boolean;
  isInstalled: boolean;
  isStandalone: boolean;
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
 * Strict check for standalone PWA mode.
 * Returns true ONLY if the current window is launched as an installed PWA (Home Screen app / WebAPK).
 * Does NOT return true for regular browser tabs (even with full-screen or minimal-ui dynamic address bar).
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

export function usePWAInstall(): PWAInstallState {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() => {
    if (typeof window !== 'undefined' && (window as any).__deferredInstallPrompt) {
      return (window as any).__deferredInstallPrompt;
    }
    return null;
  });

  const [isStandalone, setIsStandalone] = useState<boolean>(checkIsStandalone);

  // If running standalone, it is definitely installed.
  // If a deferred install prompt is already pending, it is NOT yet installed.
  // Otherwise, fallback to stored install status.
  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    if (checkIsStandalone()) return true;
    if (typeof window !== 'undefined' && (window as any).__deferredInstallPrompt) return false;
    return checkStoredInstall();
  });

  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isSafari, setIsSafari] = useState(false);
  const [isChrome, setIsChrome] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const updateDisplayState = () => {
      const stand = checkIsStandalone();
      setIsStandalone(stand);
      if (stand) {
        setIsInstalled(true);
        try {
          localStorage.setItem('dt_pwa_installed', 'true');
        } catch {}
      }
    };

    updateDisplayState();

    // Check pre-captured early event from window
    if (typeof window !== 'undefined' && (window as any).__deferredInstallPrompt) {
      setDeferredPrompt((window as any).__deferredInstallPrompt);
      setIsInstalled(false);
    }

    // Check getInstalledRelatedApps API if supported in Chromium
    if (typeof navigator !== 'undefined' && 'getInstalledRelatedApps' in navigator) {
      (navigator as any).getInstalledRelatedApps()
        .then((relatedApps: any[]) => {
          if (Array.isArray(relatedApps) && relatedApps.length > 0) {
            setIsInstalled(true);
            try {
              localStorage.setItem('dt_pwa_installed', 'true');
            } catch {}
          }
        })
        .catch(() => {});
    }

    // User Agent & Device Detection
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

    // When the browser offers an installation prompt, the app is definitely NOT installed yet
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      (window as any).__deferredInstallPrompt = e;
      (window as any).__pwaInstalled = false;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstalled(false);
      try {
        localStorage.removeItem('dt_pwa_installed');
      } catch {}
    };

    // When the user installs the PWA, transition state immediately without reload
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      (window as any).__deferredInstallPrompt = null;
      (window as any).__pwaInstalled = true;
      try {
        localStorage.setItem('dt_pwa_installed', 'true');
      } catch {}
    };

    // Listen to custom early-capture signals from index.html
    const handlePromptReady = (e: any) => {
      if (e?.detail) {
        setDeferredPrompt(e.detail);
        setIsInstalled(false);
      }
    };

    const handleCustomStatusChange = (e: any) => {
      if (e?.detail?.installed) {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('dt_pwa_prompt_ready', handlePromptReady);
    window.addEventListener('dt_pwa_status_change', handleCustomStatusChange);

    const matchDisplay = window.matchMedia('(display-mode: standalone)');
    const handleDisplayChange = () => updateDisplayState();
    if (matchDisplay.addEventListener) {
      matchDisplay.addEventListener('change', handleDisplayChange);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('dt_pwa_prompt_ready', handlePromptReady);
      window.removeEventListener('dt_pwa_status_change', handleCustomStatusChange);
      if (matchDisplay.removeEventListener) {
        matchDisplay.removeEventListener('change', handleDisplayChange);
      }
    };
  }, []);

  const install = useCallback(async (): Promise<boolean> => {
    const promptEvent = deferredPrompt || (typeof window !== 'undefined' && (window as any).__deferredInstallPrompt);
    if (promptEvent) {
      try {
        await promptEvent.prompt();
        const { outcome } = await promptEvent.userChoice;
        if (outcome === 'accepted') {
          setIsInstalled(true);
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
    // If already inside standalone app, no action needed
    if (checkIsStandalone()) return;

    // Direct navigation in browser
    try {
      window.location.href = window.location.origin + '/';
    } catch {
      window.location.href = '/';
    }
  }, []);

  // Compute final reactive installation state
  const effectiveInstalled = isStandalone || (!deferredPrompt && isInstalled);

  return {
    isInstallable: !!deferredPrompt,
    isInstalled: effectiveInstalled,
    isStandalone,
    isIOS,
    isAndroid,
    isSafari,
    isChrome,
    isMobile,
    hasPrompt: !!deferredPrompt,
    install,
    openApp,
  };
}
