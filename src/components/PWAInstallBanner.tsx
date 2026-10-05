import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X, Sparkles, CheckCircle2, Share } from 'lucide-react';
import { usePWAInstall } from '../utils/usePWAInstall';

interface PWAInstallBannerProps {
  lang?: string;
}

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({ lang = 'bn' }) => {
  const {
    isStandalone,
    isInstalled,
    isIOS,
    isSafari,
    hasPrompt,
    install,
  } = usePWAInstall();

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

  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installing, setInstalling] = useState(false);

  // If the app is currently running in standalone PWA mode (Home Screen WebAPK), do NOT show banner
  if (isStandalone) {
    return null;
  }

  // If user dismissed it recently, do not render
  if (dismissed && !showIOSGuide) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem('dt_pwa_banner_dismissed_at', Date.now().toString());
    } catch {}
  };

  const handleInstallClick = async () => {
    if (isIOS || (isSafari && !hasPrompt)) {
      setShowIOSGuide(true);
      return;
    }

    setInstalling(true);
    try {
      const success = await install();
      if (success) {
        setDismissed(true);
      }
    } finally {
      setInstalling(false);
    }
  };

  return (
    <>
      {/* Dynamic Re-install / Install Banner when running in regular browser */}
      {!dismissed && (
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
      )}

      {/* iOS / Safari Step-by-Step Installation Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-3">
          <div className="bg-[#10141F] border-2 border-amber-500 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-black text-white">
                  {lang === 'bn' ? '📱 iOS / Safari তে ইনস্টল করুন' : '📱 Install on iOS / Safari'}
                </h3>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-white/5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-neutral-300">
              <div className="flex items-start gap-2.5 bg-white/5 p-2.5 rounded-xl border border-white/5">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-black text-xs flex items-center justify-center shrink-0">1</span>
                <div>
                  <p className="font-bold text-white">
                    {lang === 'bn' ? 'Safari ব্রাউজারে শেয়ার (Share) বাটনে ট্যাপ করুন' : 'Tap the Share button in Safari'}
                  </p>
                  <div className="flex items-center gap-1 text-[11px] text-neutral-400 mt-0.5">
                    <Share className="w-3.5 h-3.5 text-blue-400" />
                    <span>{lang === 'bn' ? 'স্ক্রিনের নিচে বা উপরে শেয়ার আইকন পাবেন' : 'Bottom toolbar of Safari browser'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5 bg-white/5 p-2.5 rounded-xl border border-white/5">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-black text-xs flex items-center justify-center shrink-0">2</span>
                <div>
                  <p className="font-bold text-white">
                    {lang === 'bn' ? '"Add to Home Screen" অপশনটি সিলেক্ট করুন' : 'Select "Add to Home Screen"'}
                  </p>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    {lang === 'bn' ? 'মেনু স্ক্রল করে নিচে "Add to Home Screen" বাটনে ট্যাপ করুন' : 'Scroll down the share sheet and tap Add to Home Screen'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 bg-white/5 p-2.5 rounded-xl border border-white/5">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-black text-xs flex items-center justify-center shrink-0">3</span>
                <div>
                  <p className="font-bold text-white">
                    {lang === 'bn' ? 'উপরে "Add" এ ক্লিক করে হোমস্ক্রিনে যুক্ত করুন' : 'Tap "Add" in top right corner'}
                  </p>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    {lang === 'bn' ? 'এরপর হোমস্ক্রিন থেকে সরাসরি অ্যাপ ওপেন করে খেলুন!' : 'Launch directly from your Home Screen anytime!'}
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 font-black text-xs shadow-md active:scale-95 cursor-pointer"
            >
              {lang === 'bn' ? 'বুঝেছি (Got It)' : 'Got It'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
