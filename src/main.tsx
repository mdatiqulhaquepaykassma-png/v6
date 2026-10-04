import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { BUILD_NUMBER } from './config/version';
import './index.css';

// Automated Deployment Sync: Force purge of stale browser cache & data on new version
const syncDeployment = async () => {
  if (typeof window === 'undefined') return;
  
  const LAST_SYNCED_VERSION_KEY = 'apex_last_synced_version';
  const lastVersion = localStorage.getItem(LAST_SYNCED_VERSION_KEY);
  
  if (lastVersion && lastVersion !== BUILD_NUMBER) {
    console.warn(`[SYNC] New deployment detected (${BUILD_NUMBER}). Purging browser cache and state...`);
    
    try {
      // 1. Unregister all service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      }
      
      // 2. Clear all named caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        for (const name of cacheNames) {
          await caches.delete(name);
        }
      }
      
      // 3. Clear LocalStorage and SessionStorage (browsing data)
      localStorage.clear();
      sessionStorage.clear();
      
      // 4. Update sync key and force hard reload
      localStorage.setItem(LAST_SYNCED_VERSION_KEY, BUILD_NUMBER);
      window.location.reload();
      return true; // Reloading, stop execution
    } catch (e) {
      console.error('[SYNC] Cache purge failed:', e);
    }
  } else if (!lastVersion) {
    localStorage.setItem(LAST_SYNCED_VERSION_KEY, BUILD_NUMBER);
  }
  return false;
};

// Background Polling: Periodically check if a new version is deployed on the server
const startBackgroundUpdatePolling = () => {
  if (import.meta.env.DEV) return;
  
  // Initial check after 30 seconds, then every 5 minutes
  setTimeout(() => {
    const poll = async () => {
      try {
        const res = await fetch('/api/version', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          // If server version is different from the version this client was bundled with
          if (data.version && data.version !== BUILD_NUMBER) {
            console.warn(`[UPDATE] New version available: ${data.version}. Automatic reload triggered.`);
            // Clear the sync key so the boot-up sync logic handles the purge on next load
            localStorage.removeItem('apex_last_synced_version');
            window.location.reload();
          }
        }
      } catch (e) {
        // Silent fail for background polling network issues
      }
    };
    
    poll();
    setInterval(poll, 1000 * 60 * 5); // 5 minute intervals
  }, 30000);
};

const init = async () => {
  const isReloading = await syncDeployment();
  if (isReloading) return;

  startBackgroundUpdatePolling();

  // Automatically register and update service worker in production builds
  if (import.meta.env.PROD && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      registerSW({ immediate: true });
    } catch (e) {
      console.debug('Service worker registration:', e);
    }
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
};

init();
