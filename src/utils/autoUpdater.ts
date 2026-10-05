/**
 * APEX Casino - Automatic Deployment Sync & Cache Purge Engine
 * Ensures users automatically receive the latest deployed version, new buttons,
 * and fixes without getting stuck on old Service Worker caches or stale assets.
 */

const PRESERVED_STORAGE_KEYS = [
  'dt_auth_token',
  'dt_user_id',
  'dt_session_id',
  'dt_saved_user',
  'dt_currency',
  'dt_lang',
  'dt_sound_enabled',
  'dt_voice_enabled',
  'dt_chip_preset',
  'dt_pwa_installed',
  'dt_active_table',
  'dt_admin_token',
];

let isPurgingAndReloading = false;

/**
 * Safely purges stale browser caches, unregisters legacy service workers,
 * preserves user login and preferences, and reloads to the fresh deployment.
 */
export async function purgeCachesAndReload(newVersion?: string) {
  if (isPurgingAndReloading || typeof window === 'undefined') return;
  isPurgingAndReloading = true;

  console.warn(`[AUTO-UPDATE] Purging old caches and reloading to new version: ${newVersion || 'latest'}...`);

  try {
    // 1. Backup critical user credentials and preferences
    const preservedData: Record<string, string> = {};
    for (const key of PRESERVED_STORAGE_KEYS) {
      try {
        const val = localStorage.getItem(key);
        if (val !== null) preservedData[key] = val;
      } catch {}
    }

    // 2. Unregister all existing Service Workers to drop old caches
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((reg) => reg.unregister()));
      } catch (err) {
        console.debug('[AUTO-UPDATE] SW unregister error:', err);
      }
    }

    // 3. Clear all CacheStorage entries
    if ('caches' in window) {
      try {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map((key) => caches.delete(key)));
      } catch (err) {
        console.debug('[AUTO-UPDATE] Cache delete error:', err);
      }
    }

    // 4. Clear sessionStorage and non-critical localStorage
    try {
      sessionStorage.clear();
      localStorage.clear();
    } catch {}

    // 5. Restore preserved credentials and save running version
    for (const [key, val] of Object.entries(preservedData)) {
      try {
        localStorage.setItem(key, val);
      } catch {}
    }

    if (newVersion) {
      try {
        localStorage.setItem('dt_app_running_version', newVersion);
        localStorage.setItem('apex_last_deploy_sync', newVersion);
      } catch {}
    }
  } catch (e) {
    console.error('[AUTO-UPDATE] Cache purge failed:', e);
  }

  // Force hard reload from server
  window.location.reload();
}

/**
 * Checks the server for a newer deployment version via sw-metadata.json or /api/version.
 */
export async function checkForUpdates(force = false): Promise<boolean> {
  if (typeof window === 'undefined' || isPurgingAndReloading) return false;

  try {
    const res = await fetch(`/sw-metadata.json?_t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      },
    }).catch(() => fetch(`/api/version?_t=${Date.now()}`, { cache: 'no-store' }));

    if (!res || !res.ok) return false;

    const data = await res.json();
    const serverIdentifier = data?.build_hash || data?.build_timestamp || data?.version;

    if (!serverIdentifier) return false;

    const currentVersion = localStorage.getItem('dt_app_running_version');
    const currentHash = localStorage.getItem('dt_last_build_hash');

    if (!currentVersion && !currentHash) {
      // First boot: set current versions
      localStorage.setItem('dt_app_running_version', String(serverIdentifier));
      localStorage.setItem('dt_last_build_hash', String(serverIdentifier));
      return false;
    }

    const isDifferent = (currentVersion && currentVersion !== String(serverIdentifier)) ||
                        (currentHash && currentHash !== String(serverIdentifier));

    if (isDifferent || force) {
      console.warn(`[AUTO-UPDATE] New deployment detected! Current: ${currentVersion || currentHash} -> Server: ${serverIdentifier}`);
      await purgeCachesAndReload(String(serverIdentifier));
      return true;
    }
  } catch (err) {
    // Network drop or offline, silently ignore
  }

  return false;
}

/**
 * Initializes continuous deployment checking and event listeners.
 */
export function initAutoUpdater() {
  if (typeof window === 'undefined') return;

  // 1. Initial check immediately on boot
  checkForUpdates();

  // 2. Periodic background check every 20 seconds
  const intervalId = setInterval(() => {
    checkForUpdates();
  }, 20000);

  // 3. Immediate check whenever user switches back to this tab
  const handleVisibility = () => {
    if (document.visibilityState === 'visible') {
      checkForUpdates();
    }
  };
  document.addEventListener('visibilitychange', handleVisibility);

  // 4. Auto-reload when new Service Worker takes control
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[AUTO-UPDATE] Service Worker controller changed. Reloading fresh assets...');
      window.location.reload();
    });
  }

  return () => {
    clearInterval(intervalId);
    document.removeEventListener('visibilitychange', handleVisibility);
  };
}
