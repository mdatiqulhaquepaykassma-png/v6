import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { PWAInstallProvider } from './utils/usePWAInstall.tsx';
import { initAutoUpdater } from './utils/autoUpdater.ts';
import './index.css';

const init = async () => {
  // Start continuous deployment auto-updater & cache cleaner
  initAutoUpdater();

  // Automatically register and update service worker in production builds with immediate claim
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      registerSW({
        immediate: true,
        onNeedRefresh() {
          console.log('[PWA] New content available. Updating...');
        },
      });
    } catch (e) {
      console.debug('Service worker registration:', e);
    }
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        <PWAInstallProvider>
          <App />
        </PWAInstallProvider>
      </ErrorBoundary>
    </StrictMode>,
  );
};

init();
