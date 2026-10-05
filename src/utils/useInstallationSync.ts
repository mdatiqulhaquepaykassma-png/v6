import { useState, useEffect, useCallback } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export interface InstallationSyncState {
  isInstalled: boolean;
  isStandalone: boolean;
  isInstallable: boolean;
  hasPrompt: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  directInstall: () => Promise<boolean>;
  openApp: () => Promise<void>;
}

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

/**
 * Custom event name for global zero-latency installation state synchronization
 */
export const PWA_SYNC_EVENT = 'dt_pwa_sync';

export const dispatchInstallSync = (detail: { isInstalled: boolean; hasPrompt?: boolean }) => {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(
      new CustomEvent(PWA_SYNC_EVENT, {
        detail,
      })
    );
  } catch (e) {
    console.debug('Sync dispatch error:', e);
  }
};

/**
 * useInstallationSync Hook
 * Listens for `appinstalled` and platform-specific `beforeinstallprompt` events,
 * and synchronizes 'Install' vs 'Open' UI states across all components with zero popups.
 */
export function useInstallationSync(): InstallationSyncState {
  const [isStandalone, setIsStandalone] = useState<boolean>(checkIsStandalone);
  const [hasPrompt, setHasPrompt] = useState<boolean>(() => {
    return typeof window !== 'undefined' && !!(window as any).__deferredInstallPrompt;
  });

  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    if (checkIsStandalone()) return true;
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('dt_pwa_installed') === 'true';
      } catch {}
    }
    return false;
  });

  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isAndroid, setIsAndroid] = useState<boolean>(false);

  // Direct installation trigger with ZERO intermediate popups
  const directInstall = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined') return false;

    const promptEvent: BeforeInstallPromptEvent | null =
      (window as any).__deferredInstallPrompt || null;

    if (promptEvent) {
      try {
        await promptEvent.prompt();
        const { outcome } = await promptEvent.userChoice;
        if (outcome === 'accepted') {
          (window as any).__deferredInstallPrompt = null;
          (window as any).__pwaInstalled = true;
          setIsInstalled(true);
          setHasPrompt(false);
          try {
            localStorage.setItem('dt_pwa_installed', 'true');
          } catch {}

          // Immediately broadcast state across all components
          dispatchInstallSync({ isInstalled: true, hasPrompt: false });
          return true;
        }
      } catch (err) {
        console.error('Direct install prompt failed:', err);
      }
    }

    return false;
  }, []);

  // Direct app opener
  const openApp = useCallback(async () => {
    if (typeof window === 'undefined') return;
    if (checkIsStandalone()) return;

    const host = window.location.host;
    const pathname = window.location.pathname || '/';
    const scheme = window.location.protocol.replace(':', '') || 'https';
    const ua = window.navigator.userAgent.toLowerCase();
    const isAndroidDevice = /android/.test(ua);

    if (isAndroidDevice) {
      try {
        window.location.href = `intent://${host}${pathname}#Intent;scheme=${scheme};action=android.intent.action.VIEW;end;`;
        return;
      } catch {}
    }

    try {
      window.location.href = window.location.origin + pathname;
    } catch {
      window.location.href = '/';
    }
  }, []);

  useEffect(() => {
    // 1. Device detection
    if (typeof window !== 'undefined') {
      const ua = window.navigator.userAgent.toLowerCase();
      setIsIOS(/iphone|ipad|ipod/.test(ua));
      setIsAndroid(/android/.test(ua));
    }

    // 2. Standalone media query listener
    const standaloneMQ = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = () => {
      const standalone = checkIsStandalone();
      setIsStandalone(standalone);
      if (standalone) {
        setIsInstalled(true);
        try {
          localStorage.setItem('dt_pwa_installed', 'true');
        } catch {}
        dispatchInstallSync({ isInstalled: true, hasPrompt: false });
      }
    };

    if (standaloneMQ.addEventListener) {
      standaloneMQ.addEventListener('change', handleDisplayModeChange);
    }

    // 3. Platform `beforeinstallprompt` event listener
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      (window as any).__deferredInstallPrompt = e;
      (window as any).__pwaInstalled = false;
      setHasPrompt(true);
      setIsInstalled(false);

      try {
        localStorage.removeItem('dt_pwa_installed');
      } catch {}

      // Immediately synchronize across all components
      dispatchInstallSync({ isInstalled: false, hasPrompt: true });
    };

    // 4. Native `appinstalled` event listener
    const handleAppInstalled = () => {
      (window as any).__deferredInstallPrompt = null;
      (window as any).__pwaInstalled = true;
      setIsInstalled(true);
      setHasPrompt(false);

      try {
        localStorage.setItem('dt_pwa_installed', 'true');
      } catch {}

      // Immediately switch UI to 'Open' state everywhere
      dispatchInstallSync({ isInstalled: true, hasPrompt: false });
    };

    // 5. Global synchronized event listener for instantaneous UI updates
    const handleCustomSync = (e: Event) => {
      const customEvent = e as CustomEvent<{ isInstalled: boolean; hasPrompt?: boolean }>;
      if (customEvent.detail) {
        setIsInstalled(customEvent.detail.isInstalled);
        if (typeof customEvent.detail.hasPrompt === 'boolean') {
          setHasPrompt(customEvent.detail.hasPrompt);
        }
      }
    };

    // 6. Verify via getInstalledRelatedApps where supported
    const verifyInstalled = async () => {
      const standalone = checkIsStandalone();
      setIsStandalone(standalone);
      if (standalone) {
        setIsInstalled(true);
        return;
      }

      if (typeof navigator !== 'undefined' && 'getInstalledRelatedApps' in navigator) {
        try {
          const apps = await (navigator as any).getInstalledRelatedApps();
          if (Array.isArray(apps)) {
            const installed = apps.length > 0;
            setIsInstalled(installed);
            if (!installed) {
              try {
                localStorage.removeItem('dt_pwa_installed');
              } catch {}
            }
            dispatchInstallSync({ isInstalled: installed, hasPrompt: !installed });
          }
        } catch {}
      }
    };

    verifyInstalled();

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener(PWA_SYNC_EVENT, handleCustomSync);
    window.addEventListener('focus', verifyInstalled);
    document.addEventListener('visibilitychange', verifyInstalled);

    return () => {
      if (standaloneMQ.removeEventListener) {
        standaloneMQ.removeEventListener('change', handleDisplayModeChange);
      }
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener(PWA_SYNC_EVENT, handleCustomSync);
      window.removeEventListener('focus', verifyInstalled);
      document.removeEventListener('visibilitychange', verifyInstalled);
    };
  }, []);

  const isInstallable = !isStandalone && (hasPrompt || isIOS || isAndroid || !isInstalled);

  return {
    isInstalled,
    isStandalone,
    isInstallable,
    hasPrompt,
    isIOS,
    isAndroid,
    directInstall,
    openApp,
  };
}
