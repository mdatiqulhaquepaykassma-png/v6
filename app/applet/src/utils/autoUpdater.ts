/**
 * APEX Casino - Safe Deployment Sync & Cache Manager
 * Prevents infinite auto-reload loops while ensuring players can refresh
 * when a genuine new version is released.
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
  'dt_app_running_version',
  'dt_last_build_hash',
];

let isPurgingAndReloading = false;

// Infinite reload loop protection breaker (minimum 60s cooldown between reloads)
const RELOAD_COOLDOWN_MS = 60000;

function canAutoReload(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const lastReload = sessionStorage.getItem('dt_last_auto_reload_ts');
    if (lastReload) {
      const elapsed = Date.now() - Number(lastReload);
      if (elapsed < RELOAD_COOLDOWN_MS) {
        console.warn(`[AUTO-UPDATE] Reload cooldown active (${Math.round((RELOAD_COOLDOWN_MS - elapsed) / 1000)}s left). Skipping auto-reload.`);
        return false;
      }
    }
  } catch {}
  return true;
}

function markAutoReloaded() {
  try {
    sessionStorage.setItem('dt_last_auto_reload_ts', String(Date.now()));
  } catch {}
}

/**
 * Safely purges stale caches, unregisters old service workers,
 * preserves user login and preferences, and reloads to the fresh deployment.
 */
export async function purgeCachesAndReload(newVersion?: string) {
  if (isPurgingAndReloading || typeof window === 'undefined') return;
  if (!canAutoReload()) return;

  isPurgingAndReloading = true;
  markAutoReloaded();

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

    // 2. Unregister legacy Service Workers to drop stale caches
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((reg) => reg.unregister()));
      } catch (err) {
        console.debug('[AUTO-UPDATE] SW unregister error:', err);
      }
    }

    // 3. Clear CacheStorage
    if ('caches' in window) {
      try {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map((key) => caches.delete(key)));
      } catch (err) {
        console.debug('[AUTO-UPDATE] Cache delete error:', err);
      }
    }

    // 4. Clear non-critical localStorage
    try {
      localStorage.clear();
    } catch {}

    // 5. Restore preserved credentials and sync running version
    for (const [key, val] of Object.entries(preservedData)) {
      try {
        localStorage.setItem(key, val);
      } catch {}
    }

    if (newVersion) {
      try {
        localStorage.setItem('dt_app_running_version', newVersion);
        localStorage.setItem('dt_last_build_hash', newVersion);
        localStorage.setItem('apex_last_deploy_sync', newVersion);
      } catch {}
    }
  } catch (e) {
    console.error('[AUTO-UPDATE] Cache purge failed:', e);
  }

  // Force clean reload
  window.location.reload();
}

/**
 * Checks the server for a newer deployment version without triggering disruptive reload loops.
 */
export async function checkForUpdates(force = false): Promise<boolean> {
  if (typeof window === 'undefined' || isPurgingAndReloading) return false;

  try {
    const res = await fetch(`/api/version?_t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      },
    }).catch(() => null);

    if (!res || !res.ok) return false;

    const data = await res.json();
    const serverIdentifier = data?.version || data?.build_hash || data?.build_timestamp;

    if (!serverIdentifier) return false;

    const currentVersion = localStorage.getItem('dt_app_running_version');

    if (!currentVersion) {
      // First boot: store current server version
      localStorage.setItem('dt_app_running_version', String(serverIdentifier));
      localStorage.setItem('dt_last_build_hash', String(serverIdentifier));
      return false;
    }

    const isDifferent = currentVersion !== String(serverIdentifier);

    if (isDifferent) {
      console.log(`[AUTO-UPDATE] New version available on server: ${serverIdentifier} (Current: ${currentVersion})`);
      
      // Notify custom event so UI (toast) can show non-intrusively instead of forcing hard reload
      window.dispatchEvent(
        new CustomEvent('dt_new_version_available', {
          detail: { newVersion: String(serverIdentifier) },
        })
      );

      // Only hard reload if explicitly forced by user action
      if (force && canAutoReload()) {
        await purgeCachesAndReload(String(serverIdentifier));
        return true;
      }
    }
  } catch {
    // Silently ignore network drop or offline
  }

  return false;
}

/**
 * Initializes continuous deployment checking safely without disruptive reload loops.
 */
export function initAutoUpdater() {
  if (typeof window === 'undefined') return;

  // Initial check after 3 seconds so initial page load is never interrupted
  const initialTimeout = setTimeout(() => {
    checkForUpdates();
  }, 3000);

  // Periodic check every 2 minutes (120s) instead of aggressive 20s
  const intervalId = setInterval(() => {
    checkForUpdates();
  }, 120000);

  // Check on tab re-focus (throttled)
  let lastTabCheck = Date.now();
  const handleVisibility = () => {
    if (document.visibilityState === 'visible' && Date.now() - lastTabCheck > 60000) {
      lastTabCheck = Date.now();
      checkForUpdates();
    }
  };
  document.addEventListener('visibilitychange', handleVisibility);

  return () => {
    clearTimeout(initialTimeout);
    clearInterval(intervalId);
    document.removeEventListener('visibilitychange', handleVisibility);
  };
}
