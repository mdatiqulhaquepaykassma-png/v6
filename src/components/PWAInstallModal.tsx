import React, { useState } from "react";
import {
  Download,
  Share2,
  X,
  CheckCircle2,
  Sparkles,
  Smartphone,
  Apple,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { sound } from "../utils/audio";
import { BrandLogo } from "./BrandLogo";

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: "bn" | "en";
  hasPrompt: boolean;
  isStandalone: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  onTriggerInstall: () => Promise<boolean>;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  isOpen,
  onClose,
  lang = "bn",
  hasPrompt,
  isStandalone,
  isIOS,
  onTriggerInstall,
}) => {
  const [installing, setInstalling] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  const handleDirectInstall = async () => {
    sound.playButtonClick();
    setInstalling(true);
    try {
      const success = await onTriggerInstall();
      if (success) {
        sound.playWinFanfare();
        setInstallSuccess(true);
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } finally {
      setInstalling(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-sm bg-[#090d15] border border-amber-500/40 rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col text-neutral-100 relative"
          >
          {/* Close button */}
          <button
            onClick={() => {
              sound.playButtonClick();
              onClose();
            }}
            className="absolute top-3.5 right-3.5 z-20 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>

          {/* Glowing App Hero Card */}
          <div className="pt-8 pb-4 px-6 flex flex-col items-center text-center bg-gradient-to-b from-amber-500/15 via-transparent to-transparent">
            <div className="relative mb-3">
              <div className="w-24 h-24 rounded-3xl overflow-hidden border-2 border-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.5)] bg-black shrink-0">
                <BrandLogo priority alt="APEX Dragon Tiger" />
              </div>
              <div className="absolute -bottom-1.5 -right-1.5 px-2 py-0.5 rounded-full bg-amber-500 text-neutral-950 font-black text-[9px] uppercase tracking-wider font-mono shadow-md">
                APP
              </div>
            </div>

            <h3 className="text-xl font-black text-white tracking-wide">
              APEX DRAGON TIGER
            </h3>
            <p className="text-xs text-amber-400/90 font-mono mt-0.5">
              Official Mobile App • 100% PWA
            </p>
          </div>

          {/* Action Body */}
          <div className="p-5 pt-0 space-y-4">
            {isIOS ? (
              /* iOS Safari Direct 2-Step Visual Badge */
              <div className="bg-neutral-900/90 border border-amber-500/30 rounded-2xl p-3.5 space-y-2.5 text-xs text-neutral-200">
                <div className="flex items-center gap-2 text-amber-300 font-bold">
                  <Apple className="w-4 h-4" />
                  <span>{lang === "bn" ? "আইফোনে ইনস্টল করার নিয়ম:" : "iPhone Install:"}</span>
                </div>
                <div className="flex items-center gap-2.5 bg-black/40 p-2 rounded-xl">
                  <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center text-xs shrink-0">
                    1
                  </span>
                  <span>
                    {lang === "bn" ? "Safari-র নিচে Share (📤) আইকনে চাপুন" : "Tap Safari Share button (📤)"}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 bg-black/40 p-2 rounded-xl">
                  <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center text-xs shrink-0">
                    2
                  </span>
                  <span>
                    {lang === "bn" ? "Add to Home Screen (➕) চাপুন" : "Select 'Add to Home Screen' (➕)"}
                  </span>
                </div>
              </div>
            ) : (
              /* Direct Install Action Button */
              <button
                onClick={handleDirectInstall}
                disabled={installing || installSuccess}
                className="w-full py-3.5 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-neutral-950 font-black text-sm rounded-2xl shadow-[0_10px_30px_rgba(245,158,11,0.4)] flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
              >
                {installSuccess ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-neutral-950" />
                    <span>{lang === "bn" ? "ইনস্টল সফল হয়েছে!" : "App Installed!"}</span>
                  </>
                ) : installing ? (
                  <span>{lang === "bn" ? "ইনস্টল হচ্ছে..." : "Installing..."}</span>
                ) : (
                  <>
                    <Download className="w-5 h-5 stroke-[2.5]" />
                    <span>{lang === "bn" ? "ইনস্টল করুন (Install App)" : "Install App"}</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={() => {
                sound.playButtonClick();
                onClose();
              }}
              className="w-full py-2.5 text-xs font-bold text-neutral-400 hover:text-white transition-colors cursor-pointer text-center"
            >
              {lang === "bn" ? "বন্ধ করুন" : "Close"}
            </button>
          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
};
