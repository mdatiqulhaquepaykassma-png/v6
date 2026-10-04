import { useState, useEffect, useCallback } from "react";
import { sound } from "./audio";

export interface SoundManagerState {
  sfxEnabled: boolean;
  voiceEnabled: boolean;
  ambientCrowdEnabled: boolean;
  ambientVolume: number;
  isAmbientPlaying: boolean;
}

export function useSoundManager() {
  const [sfxEnabled, setSfxEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("dgt_sfx_enabled");
      return saved !== null ? saved === "true" : true;
    } catch {
      return true;
    }
  });

  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("dgt_voice_enabled");
      return saved !== null ? saved === "true" : true;
    } catch {
      return true;
    }
  });

  const [ambientCrowdEnabled, setAmbientCrowdEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("dgt_ambient_enabled");
      return saved !== null ? saved === "true" : false;
    } catch {
      return false;
    }
  });

  const [ambientVolume, setAmbientVolumeState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("dgt_ambient_volume");
      return saved !== null ? parseFloat(saved) : 0.25;
    } catch {
      return 0.25;
    }
  });

  const [isAmbientPlaying, setIsAmbientPlaying] = useState<boolean>(false);

  // Synchronize with audio engine instance
  useEffect(() => {
    sound.sfxEnabled = sfxEnabled;
    try {
      localStorage.setItem("dgt_sfx_enabled", String(sfxEnabled));
    } catch {}
  }, [sfxEnabled]);

  useEffect(() => {
    sound.voiceEnabled = voiceEnabled;
    try {
      localStorage.setItem("dgt_voice_enabled", String(voiceEnabled));
    } catch {}
  }, [voiceEnabled]);

  useEffect(() => {
    sound.setAmbientVolume(ambientVolume);
    try {
      localStorage.setItem("dgt_ambient_volume", String(ambientVolume));
    } catch {}
  }, [ambientVolume]);

  useEffect(() => {
    try {
      localStorage.setItem("dgt_ambient_enabled", String(ambientCrowdEnabled));
    } catch {}
    if (ambientCrowdEnabled && sfxEnabled) {
      sound.startAmbientCrowdNoise();
      setIsAmbientPlaying(true);
    } else {
      sound.stopAmbientCrowdNoise();
      setIsAmbientPlaying(false);
    }
  }, [ambientCrowdEnabled, sfxEnabled]);

  const toggleSfx = useCallback(() => {
    setSfxEnabled((prev) => !prev);
  }, []);

  const toggleVoice = useCallback(() => {
    setVoiceEnabled((prev) => !prev);
  }, []);

  const toggleAmbientCrowd = useCallback(() => {
    setAmbientCrowdEnabled((prev) => {
      const next = !prev;
      if (next && sfxEnabled) {
        sound.startAmbientCrowdNoise();
        setIsAmbientPlaying(true);
      } else {
        sound.stopAmbientCrowdNoise();
        setIsAmbientPlaying(false);
      }
      return next;
    });
  }, [sfxEnabled]);

  const setAmbientVolume = useCallback((val: number) => {
    setAmbientVolumeState(val);
    sound.setAmbientVolume(val);
  }, []);

  // Casino sound triggers
  const triggerCoinsClinking = useCallback(() => {
    sound.playCoinsClinking();
  }, []);

  const triggerCardFlip = useCallback(() => {
    sound.playCardFlip();
  }, []);

  const triggerCardSnap = useCallback((cardRank?: string | number, position: "DRAGON" | "TIGER" | "CENTER" = "CENTER") => {
    sound.playGranularCardSnap(cardRank, position);
  }, []);

  const triggerRoundInitiation = useCallback(() => {
    sound.playRoundStartGong();
    sound.announcePlaceBets();
  }, []);

  const triggerWinningState = useCallback((payout: number) => {
    if (payout >= 5000) {
      sound.playBigWin();
    } else {
      sound.playWinFanfare();
    }
    sound.announcePlayerWin(payout);
  }, []);

  const triggerLosingState = useCallback((lostAmount?: number) => {
    sound.playLossSound();
    sound.announcePlayerLoss(lostAmount);
  }, []);

  const announceBetAmount = useCallback((amount: number, side: string) => {
    sound.announcePlayerBet(amount, side);
  }, []);

  const announceMatchingPools = useCallback((dragonPool: number, tigerPool: number, matchedAmount: number, returnedAmount: number) => {
    sound.announceMatchingPhase(dragonPool, tigerPool, matchedAmount, returnedAmount);
  }, []);

  const announceUserRefund = useCallback((refundAmount: number) => {
    sound.announceUserRefund(refundAmount);
  }, []);

  const announceTieRefund = useCallback((refundAmount: number) => {
    sound.announceTieRefund(refundAmount);
  }, []);

  const announceDetailedCardsAndResult = useCallback((winner: "DRAGON" | "TIGER" | "TIE", dragonRank: string, tigerRank: string, userPayout?: number, tieRefund?: number) => {
    sound.announceDetailedCardsAndResult(winner, dragonRank, tigerRank, userPayout, tieRefund);
  }, []);

  const announceWinOrLoss = useCallback((status: "WIN" | "LOSS", amount: number) => {
    if (status === "WIN") {
      triggerWinningState(amount);
    } else {
      triggerLosingState(amount);
    }
  }, [triggerWinningState, triggerLosingState]);

  return {
    sfxEnabled,
    voiceEnabled,
    ambientCrowdEnabled,
    ambientVolume,
    isAmbientPlaying,
    toggleSfx,
    toggleVoice,
    toggleAmbientCrowd,
    setAmbientVolume,
    // Trigger methods
    triggerCoinsClinking,
    triggerCardFlip,
    triggerCardSnap,
    triggerRoundInitiation,
    triggerWinningState,
    triggerLosingState,
    announceBetAmount,
    announceMatchingPools,
    announceUserRefund,
    announceTieRefund,
    announceDetailedCardsAndResult,
    announceWinOrLoss,
    // Core helpers
    playChip: (multiplier?: number) => sound.playChip(multiplier),
    playChipStack: () => sound.playChipStack(),
    playButtonClick: () => sound.playButtonClick(),
    playTick: (sec?: number) => sound.playCountdownTick(sec ?? 5),
    playLastBets: () => sound.announceLastBets(),
    playBetsClosed: () => sound.announceBetsClosed(),
    announceWinner: (winner: "DRAGON" | "TIGER" | "TIE") => sound.announceWinner(winner),
    sound,
  };
}
