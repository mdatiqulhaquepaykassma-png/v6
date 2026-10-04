import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  SlidersHorizontal,
  X,
  Volume2,
  VolumeX,
  Mic,
  Coins,
  Music,
  RotateCcw,
  Sparkles,
  Check,
} from "lucide-react";
import { sound } from "../utils/audio";

interface SoundMixerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SoundMixerModal: React.FC<SoundMixerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [dealerVoiceVol, setDealerVoiceVol] = useState<number>(100);
  const [sfxVol, setSfxVol] = useState<number>(80);
  const [bgmVol, setBgmVol] = useState<number>(50);
  const [masterMute, setMasterMute] = useState<boolean>(false);
  const [bgmActive, setBgmActive] = useState<boolean>(false);
  const [testNotice, setTestNotice] = useState<string | null>(null);

  // Load stored audio settings on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("apex_audio_mixer");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.dealerVoice !== undefined) setDealerVoiceVol(parsed.dealerVoice);
        if (parsed.sfx !== undefined) setSfxVol(parsed.sfx);
        if (parsed.bgm !== undefined) setBgmVol(parsed.bgm);
        if (parsed.masterMute !== undefined) setMasterMute(parsed.masterMute);
      }
    } catch {
      // quiet fallback
    }
  }, []);

  // Sync state changes with audio engine & localStorage
  const updateAudioMixer = (
    newVoice = dealerVoiceVol,
    newSfx = sfxVol,
    newBgm = bgmVol,
    newMute = masterMute
  ) => {
    sound.setMixerVolumes({
      dealerVoice: newMute ? 0 : newVoice / 100,
      sfx: newMute ? 0 : newSfx / 100,
      bgm: newMute ? 0 : newBgm / 100,
      masterMute: newMute,
    });

    try {
      localStorage.setItem(
        "apex_audio_mixer",
        JSON.stringify({
          dealerVoice: newVoice,
          sfx: newSfx,
          bgm: newBgm,
          masterMute: newMute,
        })
      );
    } catch {
      // quiet
    }
  };

  if (!isOpen) return null;

  const handleTestVoice = () => {
    sound.playButtonClick();
    sound.speak("Place your bets please! High stakes Dragon Tiger round.", true);
    setTestNotice("🎙️ Played Dealer Voice Sample");
    setTimeout(() => setTestNotice(null), 2000);
  };

  const handleTestSfx = () => {
    sound.playButtonClick();
    sound.playCoinsClinking();
    setTestNotice("🪙 Played Betting Chips SFX Sample");
    setTimeout(() => setTestNotice(null), 2000);
  };

  const handleToggleBgm = () => {
    sound.playButtonClick();
    const nextBgmState = !bgmActive;
    setBgmActive(nextBgmState);
    sound.toggleBgm(nextBgmState);
    setTestNotice(nextBgmState ? "🎵 Background Music Started" : "⏹️ Background Music Muted");
    setTimeout(() => setTestNotice(null), 2000);
  };

  const handleResetDefaults = () => {
    sound.playButtonClick();
    setDealerVoiceVol(100);
    setSfxVol(80);
    setBgmVol(50);
    setMasterMute(false);
    updateAudioMixer(100, 80, 50, false);
    setTestNotice("↺ Restored Default Audio Levels");
    setTimeout(() => setTestNotice(null), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 overflow-hidden select-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/85 backdrop-blur-md -z-10"
          />

          {/* Modal Window */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-md bg-[#0c101a] border-2 border-violet-500/50 rounded-3xl p-5 sm:p-6 shadow-[0_25px_60px_rgba(0,0,0,0.9)] text-white space-y-5 relative overflow-hidden"
          >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/40 flex items-center justify-center text-violet-400">
                <SlidersHorizontal className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-violet-400 uppercase tracking-wider">
                  <Sparkles className="w-3 h-3" />
                  <span>Casino Sound Console</span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-white">
                  Sound Mixer &amp; Audio Levels
                </h3>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Master Mute Bar */}
          <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {masterMute ? (
                <VolumeX className="w-5 h-5 text-rose-400 shrink-0" />
              ) : (
                <Volume2 className="w-5 h-5 text-emerald-400 shrink-0" />
              )}
              <div>
                <div className="text-xs font-bold text-white">Master Sound Output</div>
                <div className="text-[10px] text-neutral-400">
                  {masterMute ? "Muted all audio channels" : "Audio channels active"}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const nextMute = !masterMute;
                setMasterMute(nextMute);
                updateAudioMixer(dealerVoiceVol, sfxVol, bgmVol, nextMute);
              }}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer border ${
                masterMute
                  ? "bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-600/30"
                  : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
              }`}
            >
              {masterMute ? "UNMUTE ALL" : "MUTE ALL"}
            </button>
          </div>

          {/* Audio Channels Mixer Controls */}
          <div className="space-y-4">
            {/* CHANNEL 1: DEALER VOICE */}
            <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                  <Mic className="w-4 h-4 text-amber-400" />
                  <span>Dealer Voice Volume</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-neutral-300">
                    {dealerVoiceVol}%
                  </span>
                  <button
                    type="button"
                    onClick={handleTestVoice}
                    disabled={masterMute}
                    className="px-2 py-1 rounded-lg bg-neutral-900 border border-neutral-700 hover:border-amber-400 text-[10px] font-bold text-amber-400 transition-colors cursor-pointer"
                  >
                    Test 🗣️
                  </button>
                </div>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                value={dealerVoiceVol}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setDealerVoiceVol(val);
                  updateAudioMixer(val, sfxVol, bgmVol, masterMute);
                }}
                disabled={masterMute}
                className="w-full accent-amber-400 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
              />
            </div>

            {/* CHANNEL 2: BETTING SFX */}
            <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                  <Coins className="w-4 h-4 text-emerald-400" />
                  <span>Betting &amp; Game SFX</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-neutral-300">
                    {sfxVol}%
                  </span>
                  <button
                    type="button"
                    onClick={handleTestSfx}
                    disabled={masterMute}
                    className="px-2 py-1 rounded-lg bg-neutral-900 border border-neutral-700 hover:border-emerald-400 text-[10px] font-bold text-emerald-400 transition-colors cursor-pointer"
                  >
                    Test 🪙
                  </button>
                </div>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                value={sfxVol}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setSfxVol(val);
                  updateAudioMixer(dealerVoiceVol, val, bgmVol, masterMute);
                }}
                disabled={masterMute}
                className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
              />
            </div>

            {/* CHANNEL 3: BACKGROUND MUSIC */}
            <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
                  <Music className="w-4 h-4 text-cyan-400" />
                  <span>Ambient Background Music</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-neutral-300">
                    {bgmVol}%
                  </span>
                  <button
                    type="button"
                    onClick={handleToggleBgm}
                    disabled={masterMute}
                    className={`px-2 py-1 rounded-lg border text-[10px] font-bold transition-colors cursor-pointer ${
                      bgmActive
                        ? "bg-cyan-500/20 text-cyan-300 border-cyan-400"
                        : "bg-neutral-900 border-neutral-700 text-neutral-400 hover:text-white"
                    }`}
                  >
                    {bgmActive ? "Stop 🎵" : "Play 🎵"}
                  </button>
                </div>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                value={bgmVol}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setBgmVol(val);
                  updateAudioMixer(dealerVoiceVol, sfxVol, val, masterMute);
                }}
                disabled={masterMute}
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
              />
            </div>
          </div>

          {/* Test Sample Notice */}
          {testNotice && (
            <div className="p-2.5 bg-violet-500/15 border border-violet-500/40 rounded-xl text-center text-xs font-bold text-violet-300 animate-pulse">
              {testNotice}
            </div>
          )}

          {/* Bottom Actions */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="flex-1 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-black text-xs transition-all shadow-lg cursor-pointer"
            >
              Save Preferences
            </button>
          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
};
