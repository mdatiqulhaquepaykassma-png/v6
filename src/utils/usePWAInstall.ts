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

export function usePWAInstall(): PWAInstallState {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  const checkIsStandalone = (): boolean => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      window.matchMedia('(display-mode: minimal-ui)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes('android-app://') ||
      window.location.search.includes('standalone=true')
    );
  };

  const checkStoredInstall = (): boolean => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem('dt_pwa_installed') === 'true';
    } catch {
      return false;
    }
  };

  const [isStandalone, setIsStandalone] = useState<boolean>(checkIsStandalone);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => checkIsStandalone() || checkStoredInstall());
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

    // Check pre-captured early event
    if (typeof window !== 'undefined' && (window as any).__deferredInstallPrompt) {
      setDeferredPrompt((window as any).__deferredInstallPrompt);
    }

    // Check getInstalledRelatedApps API if supported
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

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      (window as any).__deferredInstallPrompt = e;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      try {
        localStorage.setItem('dt_pwa_installed', 'true');
      } catch {}
      if (typeof window !== 'undefined') {
        (window as any).__deferredInstallPrompt = null;
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    const matchDisplay = window.matchMedia('(display-mode: standalone)');
    const handleDisplayChange = () => updateDisplayState();
    if (matchDisplay.addEventListener) {
      matchDisplay.addEventListener('change', handleDisplayChange);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
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
          try {
            localStorage.setItem('dt_pwa_installed', 'true');
          } catch {}
          setDeferredPrompt(null);
          if (typeof window !== 'undefined') {
            (window as any).__deferredInstallPrompt = null;
          }
          return true;
        }
      } catch (err) {
        console.error('Error triggering PWA install prompt:', err);
      }
    }
    return false;
  }, [deferredPrompt]);

  const openApp = useCallback(async () => {
    // If already running inside standalone app, nothing more needed
    if (checkIsStandalone()) {
      return;
    }

    // 1. If deferredPrompt is available, trigger native prompt immediately
    const promptEvent = deferredPrompt || (typeof window !== 'undefined' && (window as any).__deferredInstallPrompt);
    if (promptEvent) {
      try {
        await promptEvent.prompt();
        const { outcome } = await promptEvent.userChoice;
        if (outcome === 'accepted') {
          setIsInstalled(true);
          try {
            localStorage.setItem('dt_pwa_installed', 'true');
          } catch {}
          return;
        }
      } catch (e) {
        console.warn('Native prompt attempt during open:', e);
      }
    }

    // 2. On Android, launch Android Intent to directly trigger installed WebAPK
    if (typeof window !== 'undefined' && /android/i.test(navigator.userAgent)) {
      try {
        const host = window.location.host;
        const intentUrl = `intent://${host}/#Intent;scheme=https;action=android.intent.action.VIEW;end;`;
        window.location.href = intentUrl;
        return;
      } catch (e) {
        console.warn('Intent launch failed, trying fallback:', e);
      }
    }

    // 3. Direct link-capturing navigation
    try {
      const targetUrl = window.location.origin + '/?standalone=true';
      const a = document.createElement('a');
      a.href = targetUrl;
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      window.location.href = '/?standalone=true';
    }
  }, [deferredPrompt]);

  return {
    isInstallable: !!deferredPrompt,
    isInstalled: isStandalone || isInstalled,
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
