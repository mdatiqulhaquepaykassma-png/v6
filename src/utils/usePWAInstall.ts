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
  openApp: () => void;
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
      document.referrer.includes('android-app://')
    );
  };

  const [isStandalone, setIsStandalone] = useState<boolean>(checkIsStandalone);
  const [isInstalled, setIsInstalled] = useState<boolean>(checkIsStandalone);
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
      }
    };

    updateDisplayState();

    // Check pre-captured early event
    if (typeof window !== 'undefined' && (window as any).__deferredInstallPrompt) {
      setDeferredPrompt((window as any).__deferredInstallPrompt);
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

  const openApp = useCallback(() => {
    // If running in standalone mode, already open
    if (checkIsStandalone()) {
      return;
    }
    // Attempt standard navigation or trigger install
    try {
      window.location.href = '/';
    } catch (e) {
      console.error(e);
    }
  }, []);

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

