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

const init = async () => {
  const isReloading = await syncDeployment();
  if (isReloading) return;

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
