import React, { useState } from 'react';
import { Smartphone, Download, X, Sparkles } from 'lucide-react';
import { useInstallationSync } from '../utils/useInstallationSync';

interface PWAInstallBannerProps {
  lang?: string;
}

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({ lang = 'bn' }) => {
  const {
    isStandalone,
    isInstalled,
    directInstall,
    openApp,
  } = useInstallationSync();

  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const dismissTime = localStorage.getItem('dt_pwa_banner_dismissed_at');
      if (dismissTime) {
        const timePassed = Date.now() - parseInt(dismissTime, 10);
        // Show again after 15 minutes if still not installed
        if (timePassed < 15 * 60 * 1000) return true;
      }
    } catch {}
    return false;
  });

  const [installing, setInstalling] = useState(false);

  // If the app is currently running in standalone PWA mode or already installed, do NOT show banner
  if (isStandalone || isInstalled) {
    return null;
  }

  // If user dismissed it recently, do not render
  if (dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem('dt_pwa_banner_dismissed_at', Date.now().toString());
    } catch {}
  };

  const handleInstallClick = async () => {
    setInstalling(true);
    try {
      const success = await directInstall();
      if (success) {
        setDismissed(true);
      } else {
        await openApp();
      }
    } finally {
      setInstalling(false);
    }
  };

  return (
    <div className="fixed bottom-16 sm:bottom-6 left-3 right-3 sm:left-auto sm:right-6 z-40 max-w-sm sm:max-w-md bg-gradient-to-br from-neutral-950 via-[#120f0a] to-neutral-950 border-2 border-amber-500/60 rounded-2xl p-3.5 sm:p-4 shadow-[0_10px_35px_rgba(0,0,0,0.85)] animate-in slide-in-from-bottom-5 duration-300 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
            <Smartphone className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs sm:text-sm font-black text-white tracking-wide">
                {lang === 'bn' ? 'অ্যাপ ইনস্টল করুন' : 'Install Sanctum App'}
              </span>
              <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-400/40 text-[9px] font-black rounded-md uppercase">
                PWA
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-neutral-300 mt-0.5 leading-snug">
              {lang === 'bn'
                ? 'অ্যাপ আনইনস্টল বা মিসিং? ফুলস্ক্রিন ফাস্ট গেমপ্লে ও নো-ল্যাগ অভিজ্ঞতার জন্য এখনই ইনস্টল করুন।'
                : 'App not installed or uninstalled? Install now for full-screen immersive play and zero lag.'}
            </p>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          title={lang === 'bn' ? 'পরে' : 'Dismiss'}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-white/10">
        <div className="flex items-center gap-1 text-[10px] text-amber-400 font-bold">
          <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
          <span>{lang === 'bn' ? '১০০% ফুলস্ক্রিন + ফাস্ট লোডিং' : '100% Full-Screen + Zero Lag'}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleDismiss}
            className="px-2.5 py-1 text-[10px] sm:text-xs font-bold text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            {lang === 'bn' ? 'পরে' : 'Later'}
          </button>

          <button
            onClick={handleInstallClick}
            disabled={installing}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-950/40 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{installing ? (lang === 'bn' ? 'ইনস্টল হচ্ছে...' : 'Installing...') : (lang === 'bn' ? 'ইনস্টল করুন' : 'Install App')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
