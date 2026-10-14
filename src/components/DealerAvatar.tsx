import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Heart, Crown, Volume2, Maximize2, Minimize2, Eye } from "lucide-react";
import { sound } from "../utils/audio";
import { useDealerCardGaze } from "../utils/useDealerCardGaze";

export type DealerReactionType =
  | "IDLE"
  | "WELCOMING"
  | "FOCUSED"
  | "DEALING"
  | "SURPRISED"
  | "CELEBRATING"
  | "BIG_WIN"
  | "CONSOLING";

export type DealerIdleAction =
  | "BREATHING"
  | "CHIP_ROLL"
  | "CHECKING_SHOE"
  | "SHUFFLING_DECK"
  | "SURVEYING_TABLE"
  | "CHECKING_EARPIECE"
  | "SHUSHING_TABLE"
  | "BOW_GREETING";

type BlinkPattern = "natural" | "double" | "languid";

interface FloatingParticle {
  id: number;
  text: string;
  x: number;
  y: number;
  rotate: number;
  scale: number;
  delay: number;
}

export interface DealerAvatarProps {
  gameStatus: "BETTING" | "MATCHING" | "DEALING" | "SETTLING" | "COMPLETED";
  dealingStep?: "IDLE" | "DEALING_CARDS" | "REVEAL_DRAGON" | "REVEAL_TIGER" | "WINNER_REVEALED";
  winnerResult?: "DRAGON" | "TIGER" | "TIE" | null;
  dragonCardDisplay?: string;
  tigerCardDisplay?: string;
  timeLeft?: number;
  dealerCommentary?: string;
  isBigWin?: boolean;
  userWon?: boolean;
  userLost?: boolean;
  bettingVolumeSpike?: boolean;
  stageMode?: boolean;
  onToggleStageMode?: () => void;
}

export const DealerAvatar = React.memo<DealerAvatarProps>(({
  gameStatus,
  dealingStep = "IDLE",
  winnerResult,
  dragonCardDisplay,
  tigerCardDisplay,
  timeLeft = 15,
  dealerCommentary,
  isBigWin = false,
  userWon = false,
  userLost = false,
  bettingVolumeSpike = false,
  stageMode = false,
  onToggleStageMode,
}) => {
  const [likesCount, setLikesCount] = useState<number>(1428);
  const [hasLiked, setHasLiked] = useState<boolean>(false);
  const [showHeartBurst, setShowHeartBurst] = useState<boolean>(false);
  const [floatingParticles, setFloatingParticles] = useState<FloatingParticle[]>([]);

  // 3D-CSS Eye Blinking system
  const [blinkPattern, setBlinkPattern] = useState<BlinkPattern>("natural");
  const [isBlinkingForced, setIsBlinkingForced] = useState<boolean>(false);

  // Idle action state machine
  const [idleAction, setIdleAction] = useState<DealerIdleAction>("BREATHING");
  const [idleActionLabel, setIdleActionLabel] = useState<string | null>(null);

  // Sound cue guard
  const lastSpokenRef = useRef<string>("");

  const containerRef = useRef<HTMLDivElement>(null);
  const isHoveredRef = useRef<boolean>(false);

  // Dynamic Head 3D Micro-Rotation and Eye Tracking Gaze
  const { headRotation, eyeGaze } = useDealerCardGaze({
    containerRef,
    gameStatus,
    dealingStep,
    winnerResult,
    dragonCardDisplay,
    tigerCardDisplay,
    idleAction,
  });

  // Randomized Blink Pattern Scheduler
  useEffect(() => {
    let timer: NodeJS.Timeout;
    const randomizeBlinkCycle = () => {
      const patterns: BlinkPattern[] = ["natural", "natural", "double", "languid"];
      const chosen = patterns[Math.floor(Math.random() * patterns.length)];
      setBlinkPattern(chosen);

      const nextInterval = 3800 + Math.random() * 4200;
      timer = setTimeout(randomizeBlinkCycle, nextInterval);
    };

    randomizeBlinkCycle();
    return () => clearTimeout(timer);
  }, []);

  const triggerInstantBlink = useCallback(() => {
    setIsBlinkingForced(true);
    setTimeout(() => setIsBlinkingForced(false), 170);
  }, []);

  // Compute Reaction State
  const reactionState: DealerReactionType = useMemo(() => {
    if (gameStatus === "SETTLING" || gameStatus === "COMPLETED") {
      if (winnerResult === "TIE") return "SURPRISED";
      if (isBigWin || userWon) return "BIG_WIN";
      if (winnerResult === "DRAGON" || winnerResult === "TIGER") return "CELEBRATING";
      if (userLost) return "CONSOLING";
    }
    if (gameStatus === "DEALING") {
      return "DEALING";
    }
    if (timeLeft <= 4) {
      return "FOCUSED";
    }
    if (gameStatus === "BETTING") {
      return "WELCOMING";
    }
    return "IDLE";
  }, [gameStatus, winnerResult, isBigWin, userWon, userLost, timeLeft]);

  useEffect(() => {
    triggerInstantBlink();
  }, [reactionState, triggerInstantBlink]);

  // Volume surge gesture
  useEffect(() => {
    if (bettingVolumeSpike && gameStatus === "BETTING" && idleAction === "BREATHING") {
      setIdleAction("SHUSHING_TABLE");
      setIdleActionLabel("Steady Bets");
      triggerInstantBlink();
      const timer = setTimeout(() => {
        setIdleAction("BREATHING");
        setIdleActionLabel(null);
      }, 3400);
      return () => clearTimeout(timer);
    }
  }, [bettingVolumeSpike, gameStatus, idleAction, triggerInstantBlink]);

  // Idle Action Scheduler when in BETTING phase
  useEffect(() => {
    if (gameStatus !== "BETTING" || timeLeft < 5) {
      if (idleAction !== "BREATHING") {
        setIdleAction("BREATHING");
        setIdleActionLabel(null);
      }
      return;
    }

    let actionTimer: NodeJS.Timeout;
    const scheduleNextIdleAction = () => {
      const delay = 4000 + Math.random() * 5000;
      actionTimer = setTimeout(() => {
        if (gameStatus !== "BETTING" || timeLeft < 5) return;

        const availableActions: { action: DealerIdleAction; label: string; duration: number }[] = [
          { action: "CHIP_ROLL", label: "Knuckle Roll", duration: 3200 },
          { action: "CHECKING_SHOE", label: "Shoe Check", duration: 3000 },
          { action: "SHUFFLING_DECK", label: "Riffle Deck", duration: 3400 },
          { action: "SURVEYING_TABLE", label: "Table Glance", duration: 3000 },
          { action: "CHECKING_EARPIECE", label: "Pit Radio", duration: 2500 },
          { action: "BOW_GREETING", label: "VIP Greeting", duration: 2800 },
        ];

        const pick = availableActions[Math.floor(Math.random() * availableActions.length)];
        setIdleAction(pick.action);
        setIdleActionLabel(pick.label);
        triggerInstantBlink();

        setTimeout(() => {
          setIdleAction("BREATHING");
          setIdleActionLabel(null);
          scheduleNextIdleAction();
        }, pick.duration);
      }, delay);
    };

    scheduleNextIdleAction();
    return () => clearTimeout(actionTimer);
  }, [gameStatus, timeLeft, triggerInstantBlink]);

  // Floating Reaction Particle Emitter
  useEffect(() => {
    let particles: string[] = [];
    if (reactionState === "SURPRISED") {
      particles = ["⚡", "💎", "✨", "11:1", "👑"];
    } else if (reactionState === "BIG_WIN") {
      particles = ["👑", "🔥", "💰", "🎉", "✨", "🏆", "🍾"];
    } else if (reactionState === "CELEBRATING") {
      particles = ["🎉", "✨", "👏", "🍀", "🔥"];
    } else if (reactionState === "DEALING") {
      particles = ["🃏", "🎴", "✨", "⚡"];
    } else if (reactionState === "FOCUSED") {
      particles = ["🎯", "👀", "⏳"];
    } else if (reactionState === "WELCOMING" && timeLeft === 15) {
      particles = ["👋", "✨", "🍀"];
    }

    if (particles.length > 0) {
      const now = Date.now();
      const newItems: FloatingParticle[] = particles.map((text, idx) => ({
        id: now + idx,
        text,
        x: (Math.random() - 0.5) * 85,
        y: -35 - Math.random() * 45,
        rotate: (Math.random() - 0.5) * 40,
        scale: 0.9 + Math.random() * 0.35,
        delay: idx * 0.08,
      }));
      setFloatingParticles(newItems);

      const clearTimer = setTimeout(() => {
        setFloatingParticles([]);
      }, 2500);
      return () => clearTimeout(clearTimer);
    }
  }, [reactionState, winnerResult, isBigWin, userWon, timeLeft]);

  // Handle Tip Dealer Interaction
  const handleTipDealer = () => {
    setLikesCount((prev) => prev + 1);
    setHasLiked(true);
    setShowHeartBurst(true);
    sound.playChipStack();
    sound.speak("Thank you so much! May good fortune smile on your cards.");

    const now = Date.now();
    const burst = ["❤️", "💖", "✨", "🪙", "💎"].map((text, idx) => ({
      id: now + idx + 999,
      text,
      x: (Math.random() - 0.5) * 70,
      y: -30 - Math.random() * 35,
      rotate: (Math.random() - 0.5) * 30,
      scale: 1 + Math.random() * 0.4,
      delay: idx * 0.06,
    }));
    setFloatingParticles(burst);

    setTimeout(() => setShowHeartBurst(false), 2000);
  };

  // Synchronized Dealer Commentary
  const getDealerSpeech = () => {
    if (dealerCommentary && dealerCommentary.length > 0) {
      return dealerCommentary;
    }
    if (dealingStep === "DEALING_CARDS") {
      return "Cards sliding from the shoe. One for Dragon, one for Tiger.";
    }
    if (dealingStep === "REVEAL_DRAGON") {
      return `Dragon reveals: ${dragonCardDisplay || "Card 1"}.`;
    }
    if (dealingStep === "REVEAL_TIGER") {
      return `Tiger reveals: ${tigerCardDisplay || "Card 2"}.`;
    }
    switch (reactionState) {
      case "SURPRISED":
        return "Incredible! Suited TIE! 11:1 payout on the table!";
      case "BIG_WIN":
        return "GRAND VICTORY! Magnificent win at the high table!";
      case "CELEBRATING":
        return winnerResult === "DRAGON"
          ? `Dragon dominates the round${dragonCardDisplay ? ` with ${dragonCardDisplay}` : ""}!`
          : `Tiger captures the win${tigerCardDisplay ? ` with ${tigerCardDisplay}` : ""}!`;
      case "FOCUSED":
        return timeLeft <= 3
          ? "No more bets! Locking in all wagers..."
          : "Final seconds to confirm your bets.";
      case "CONSOLING":
        return "A very close round! The tides of luck turn quickly.";
      case "WELCOMING":
      default:
        if (idleAction === "CHIP_ROLL") return "Smooth hands, fair cards. Ready for the next round.";
        if (idleAction === "CHECKING_SHOE") return "Optical sensor active. Decks verified 100% fair.";
        if (idleAction === "SHUFFLING_DECK") return "Freshly riffled shoe. High stakes welcome.";
        return "Welcome to Sanctum VIP. Place your wagers on Dragon or Tiger.";
    }
  };

  const currentSpeech = getDealerSpeech();

  // Voice speech trigger on major milestones
  useEffect(() => {
    if (gameStatus === "SETTLING" && winnerResult && currentSpeech !== lastSpokenRef.current) {
      lastSpokenRef.current = currentSpeech;
      sound.speak(currentSpeech);
    }
  }, [gameStatus, winnerResult, currentSpeech]);

  // Eyelid keyframe class
  const eyelidAnimationClass = isBlinkingForced
    ? "opacity-100 scale-y-100"
    : blinkPattern === "double"
    ? "animate-eyelid-double"
    : blinkPattern === "languid"
    ? "animate-eyelid-languid"
    : "animate-eyelid-natural";

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => {
        isHoveredRef.current = true;
      }}
      onMouseLeave={() => {
        isHoveredRef.current = false;
      }}
      className={`relative flex flex-col items-center select-none pointer-events-auto transition-all duration-300 ${
        stageMode ? "scale-110 sm:scale-125 z-40 my-2" : ""
      }`}
      style={{ perspective: "1000px" }}
    >
      {/* Floating Emojis / Particle Burst */}
      <div className="absolute -top-7 left-1/2 -translate-x-1/2 pointer-events-none z-50 overflow-visible w-0 h-0 flex items-center justify-center">
        <AnimatePresence>
          {floatingParticles.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.2, x: 0, y: 0, rotate: 0 }}
              animate={{
                opacity: [0, 1, 1, 0],
                scale: [0.2, item.scale, item.scale * 1.15, 0.7],
                x: item.x,
                y: item.y - 45,
                rotate: item.rotate,
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.2, ease: [0.22, 1, 0.36, 1], delay: item.delay }}
              className="absolute text-base sm:text-lg font-black filter drop-shadow-[0_0_10px_rgba(251,191,36,0.9)] whitespace-nowrap"
            >
              {item.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Dynamic Luxury Speech Bubble */}
      <AnimatePresence mode="wait">
        <motion.div
          key={reactionState + (winnerResult || "") + (timeLeft <= 4 ? "urgent" : "") + idleAction + dealingStep}
          initial={{ opacity: 0, y: 8, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.92 }}
          transition={{ type: "spring", stiffness: 440, damping: 26 }}
          className={`absolute -top-12 sm:-top-14 z-30 max-w-[220px] sm:max-w-[280px] px-3 py-1.5 rounded-full backdrop-blur-md border shadow-2xl flex items-center gap-1.5 whitespace-nowrap text-[8.5px] sm:text-[9.5px] font-bold ${
            reactionState === "SURPRISED"
              ? "bg-teal-950/95 border-teal-400 text-teal-200 shadow-teal-500/50 ring-2 ring-teal-400/40"
              : reactionState === "BIG_WIN"
              ? "bg-amber-950/95 border-amber-300 text-yellow-200 shadow-amber-500/60 ring-2 ring-amber-400/50 animate-pulse"
              : reactionState === "DEALING"
              ? "bg-neutral-950/95 border-amber-400/90 text-amber-200 shadow-amber-950/80 ring-1 ring-amber-400/50"
              : reactionState === "FOCUSED"
              ? "bg-neutral-950/95 border-amber-500/80 text-amber-200 shadow-black/90"
              : idleAction === "CHIP_ROLL"
              ? "bg-amber-950/90 border-amber-400 text-amber-200 shadow-amber-900/60 ring-1 ring-amber-400/40"
              : idleAction === "SHUFFLING_DECK"
              ? "bg-amber-950/90 border-amber-400 text-amber-200 shadow-amber-900/60 ring-1 ring-amber-400/50"
              : idleAction === "CHECKING_SHOE"
              ? "bg-neutral-950/90 border-cyan-400 text-cyan-200 shadow-cyan-900/60 ring-1 ring-cyan-400/40"
              : "bg-black/90 border-amber-400/70 text-amber-200 shadow-black/90"
          }`}
        >
          <span className="text-xs shrink-0">
            {reactionState === "SURPRISED"
              ? "😲"
              : reactionState === "BIG_WIN"
              ? "👑"
              : reactionState === "CELEBRATING"
              ? winnerResult === "DRAGON" ? "🐉" : "🐅"
              : reactionState === "DEALING"
              ? "🎴"
              : reactionState === "FOCUSED"
              ? "🎯"
              : idleAction === "CHIP_ROLL"
              ? "🪙"
              : idleAction === "SHUFFLING_DECK"
              ? "🃏"
              : idleAction === "CHECKING_SHOE"
              ? "👁️"
              : "👋"}
          </span>
          <span className="truncate">{currentSpeech}</span>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-inherit border-r border-b border-inherit transform rotate-45" />
        </motion.div>
      </AnimatePresence>

      {/* 3D PERSPECTIVE AVATAR CONTAINER */}
      <motion.div
        animate={{
          scale: reactionState === "BIG_WIN" ? 1.06 : reactionState === "SURPRISED" ? 1.04 : 1,
          y: reactionState === "BIG_WIN" ? -4 : 0,
        }}
        transition={{ type: "spring", stiffness: 290, damping: 22 }}
        style={{ transformStyle: "preserve-3d" }}
        className={`relative rounded-full flex items-center justify-center animate-dealer-breathe ${
          stageMode ? "w-24 h-24 sm:w-28 sm:h-28" : "w-19 h-19 sm:w-23 sm:h-23"
        }`}
      >
        {/* Dynamic Studio Aura Halo */}
        <motion.div
          animate={{
            scale:
              reactionState === "BIG_WIN" || reactionState === "SURPRISED"
                ? [1, 1.16, 1]
                : reactionState === "DEALING"
                ? [1, 1.08, 1]
                : [1, 1.04, 1],
            opacity: reactionState === "IDLE" ? 0.45 : 0.85,
          }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          style={{ transform: "translateZ(-6px)" }}
          className={`absolute -inset-2 rounded-full filter blur-md pointer-events-none transition-colors duration-500 ${
            reactionState === "SURPRISED"
              ? "bg-gradient-to-tr from-cyan-400 via-teal-300 to-emerald-400 shadow-[0_0_25px_rgba(20,184,166,0.6)]"
              : reactionState === "BIG_WIN"
              ? "bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-600 shadow-[0_0_30px_rgba(245,158,11,0.8)]"
              : reactionState === "DEALING"
              ? "bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 shadow-[0_0_20px_rgba(245,158,11,0.5)]"
              : winnerResult === "DRAGON"
              ? "bg-gradient-to-tr from-red-600 to-amber-500 shadow-[0_0_25px_rgba(239,68,68,0.6)]"
              : winnerResult === "TIGER"
              ? "bg-gradient-to-tr from-amber-400 to-yellow-500 shadow-[0_0_25px_rgba(245,158,11,0.6)]"
              : "bg-gradient-to-tr from-amber-500/50 via-amber-300/30 to-amber-600/50 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
          }`}
        />

        {/* Outer Circular Portrait Frame with High-Gloss Bezel */}
        <div
          className="relative w-full h-full rounded-full bg-gradient-to-b from-neutral-900 via-neutral-950 to-black border-2 border-amber-400/90 shadow-[0_16px_36px_rgba(0,0,0,0.95),inset_0_0_25px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col items-center justify-center ring-1 ring-amber-300/30"
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Subtle Studio Spotlight Glow */}
          <div
            className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(245,158,11,0.32),rgba(0,0,0,0.85)_75%)] pointer-events-none"
            style={{ transform: "translateZ(0px)" }}
          />

          {/* HIGH-FIDELITY CROUPIER SVG ILLUSTRATION */}
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full transform translate-y-0.5 overflow-visible"
            style={{ transformStyle: "preserve-3d" }}
          >
            <defs>
              {/* Porcelain Skin Gradient */}
              <linearGradient id="croupier-skin" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffeedd" />
                <stop offset="45%" stopColor="#fcd7ba" />
                <stop offset="100%" stopColor="#f3be9b" />
              </linearGradient>

              {/* Silk Espresso Hair Gradient */}
              <linearGradient id="croupier-hair" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3d2a1d" />
                <stop offset="35%" stopColor="#251a13" />
                <stop offset="100%" stopColor="#140e0a" />
              </linearGradient>

              {/* Hair Highlight Sheen */}
              <linearGradient id="hair-sheen" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#251a13" stopOpacity="0" />
                <stop offset="50%" stopColor="#b45309" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#251a13" stopOpacity="0" />
              </linearGradient>

              {/* Velvet Tuxedo Vest Gradient */}
              <linearGradient id="croupier-vest" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2a2a2a" />
                <stop offset="50%" stopColor="#171717" />
                <stop offset="100%" stopColor="#0a0a0a" />
              </linearGradient>

              {/* Gold Filigree & Jewelry Gradient */}
              <linearGradient id="croupier-gold" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="40%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#b45309" />
              </linearGradient>

              {/* Almond Iris Multi-Tone Gradient */}
              <radialGradient id="croupier-iris" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="35%" stopColor="#d97706" />
                <stop offset="75%" stopColor="#78350f" />
                <stop offset="100%" stopColor="#2e1005" />
              </radialGradient>

              {/* Glossy Lip Gradient */}
              <linearGradient id="croupier-lips" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" />
                <stop offset="60%" stopColor="#be123c" />
                <stop offset="100%" stopColor="#881337" />
              </linearGradient>
            </defs>

            {/* BACK HAIR VOLUME WITH LUSTROUS DEPTH */}
            <path
              d="M26,45 C16,22 32,8 50,8 C68,8 84,22 74,45 C80,58 78,74 72,78 C60,67 40,67 28,78 C22,74 20,58 26,45"
              fill="url(#croupier-hair)"
            />
            {/* Hair highlight ring */}
            <path
              d="M32,24 C40,16 60,16 68,24"
              stroke="url(#hair-sheen)"
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
            />

            {/* NECK & SHADOW */}
            <path d="M43,50 L57,50 L56,66 L44,66 Z" fill="url(#croupier-skin)" />
            {/* Soft jaw shadow on neck */}
            <path d="M43,50 Q50,55 57,50 L56,54 Q50,58 44,54 Z" fill="#d99b77" opacity="0.6" />

            {/* ELEGANT CROUPIER WAISTCOAT & SHOULDERS */}
            <g className="origin-bottom">
              {/* White Pleated Tuxedo Shirt */}
              <polygon points="43,62 57,62 50,78" fill="#f8fafc" />
              <line x1="50" y1="64" x2="50" y2="76" stroke="#e2e8f0" strokeWidth="0.8" />
              {/* Gold Shirt Studs */}
              <circle cx="50" cy="69" r="0.9" fill="url(#croupier-gold)" />
              <circle cx="50" cy="73" r="0.9" fill="url(#croupier-gold)" />

              {/* Tailored Black Velvet Vest */}
              <path
                d="M18,98 L28,60 L43,63 L50,79 L57,63 L72,60 L82,98 Z"
                fill="url(#croupier-vest)"
              />
              {/* Gold Lapel Filigree Piping */}
              <path
                d="M28,60 L43,63 L50,79 L57,63 L72,60"
                stroke="url(#croupier-gold)"
                strokeWidth="1.1"
                fill="none"
              />

              {/* Satin Emerald / Gold Bowtie */}
              <polygon points="44,63 56,63 50,67" fill="#047857" />
              <polygon points="44,63 47,65 44,67" fill="#065f46" />
              <polygon points="56,63 53,65 56,67" fill="#065f46" />
              {/* Jeweled Bowtie Knot */}
              <circle cx="50" cy="64.5" r="1.6" fill="url(#croupier-gold)" />
              <circle cx="50" cy="64.5" r="0.9" fill="#dc2626" />
            </g>

            {/* ============================================================== */}
            {/* 3D ARTICULATED HEAD WITH MICRO-ROTATION & INTERACTIVE GAZE */}
            {/* ============================================================== */}
            <motion.g
              animate={{
                rotateX: headRotation.x,
                rotateY: headRotation.y,
                rotateZ: headRotation.z,
              }}
              transition={{
                type: "spring",
                stiffness: 240,
                damping: 22,
                mass: 0.65,
              }}
              style={{
                transformOrigin: "50px 42px",
                transformStyle: "preserve-3d",
              }}
              className="animate-dealer-head-breathe"
            >
              {/* FACE BASE WITH CONTOURED SHADING */}
              <path
                d="M32,36 C32,22 68,22 68,36 C68,48 61,58 50,60 C39,58 32,48 32,36 Z"
                fill="url(#croupier-skin)"
              />

              {/* Rosy Cheekbone Blush */}
              <ellipse cx="38" cy="45" rx="5" ry="3" fill="#fb7185" opacity="0.35" />
              <ellipse cx="62" cy="45" rx="5" ry="3" fill="#fb7185" opacity="0.35" />

              {/* FRONT STYLED BANGS & GOLD ACCESSORY */}
              <path
                d="M30,34 C36,18 64,18 70,34 C64,27 48,25 36,31"
                fill="url(#croupier-hair)"
              />
              <path
                d="M31,34 C37,39 44,30 50,36 C56,30 63,39 69,34 C66,22 34,22 31,34"
                fill="url(#croupier-hair)"
              />
              {/* Gold Hairpin Comb */}
              <line x1="31" y1="28" x2="36" y2="24" stroke="url(#croupier-gold)" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="36" cy="24" r="1.3" fill="url(#croupier-gold)" />

              {/* ============================================================== */}
              {/* LUXURIOUS ALMOND EYES WITH REALISTIC IRIS DEPTH */}
              {/* ============================================================== */}
              <g style={{ transformStyle: "preserve-3d" }}>
                {/* LEFT EYE */}
                {/* Sclera White */}
                <ellipse cx="43.5" cy="39" rx="4" ry="3" fill="#ffffff" />
                {/* Limbal ring and Iris */}
                <circle
                  cx={43.5 + eyeGaze.x * 0.45}
                  cy={39 + eyeGaze.y * 0.4}
                  r="2.2"
                  fill="url(#croupier-iris)"
                />
                {/* Pupil (dilates slightly on Big Win) */}
                <circle
                  cx={43.5 + eyeGaze.x * 0.45}
                  cy={39 + eyeGaze.y * 0.4}
                  r={reactionState === "BIG_WIN" || reactionState === "SURPRISED" ? 1.3 : 1.0}
                  fill="#000000"
                />
                {/* Dual Cornea Sparkle Catchlights */}
                <circle
                  cx={44.3 + eyeGaze.x * 0.3}
                  cy={38.1 + eyeGaze.y * 0.3}
                  r="0.75"
                  fill="#ffffff"
                  className="animate-pupil-glint"
                />
                <circle
                  cx={42.8 + eyeGaze.x * 0.3}
                  cy={39.6 + eyeGaze.y * 0.3}
                  r="0.4"
                  fill="#ffffff"
                />
                {/* Eyeliner Wing & Lash Fan */}
                <path
                  d="M38.8,39 Q43.5,35.5 48.2,38.8 L49,38"
                  stroke="#1c1917"
                  strokeWidth="1.2"
                  fill="none"
                  strokeLinecap="round"
                />

                {/* RIGHT EYE */}
                {/* Sclera White */}
                <ellipse cx="56.5" cy="39" rx="4" ry="3" fill="#ffffff" />
                {/* Limbal ring and Iris */}
                <circle
                  cx={56.5 + eyeGaze.x * 0.45}
                  cy={39 + eyeGaze.y * 0.4}
                  r="2.2"
                  fill="url(#croupier-iris)"
                />
                {/* Pupil */}
                <circle
                  cx={56.5 + eyeGaze.x * 0.45}
                  cy={39 + eyeGaze.y * 0.4}
                  r={reactionState === "BIG_WIN" || reactionState === "SURPRISED" ? 1.3 : 1.0}
                  fill="#000000"
                />
                {/* Dual Cornea Sparkle Catchlights */}
                <circle
                  cx={57.3 + eyeGaze.x * 0.3}
                  cy={38.1 + eyeGaze.y * 0.3}
                  r="0.75"
                  fill="#ffffff"
                  className="animate-pupil-glint"
                />
                <circle
                  cx={55.8 + eyeGaze.x * 0.3}
                  cy={39.6 + eyeGaze.y * 0.3}
                  r="0.4"
                  fill="#ffffff"
                />
                {/* Eyeliner Wing & Lash Fan */}
                <path
                  d="M51.8,38.8 Q56.5,35.5 61.2,38.8 L62,38"
                  stroke="#1c1917"
                  strokeWidth="1.2"
                  fill="none"
                  strokeLinecap="round"
                />

                {/* ANIMATED 3D EYELIDS (Keyframe Blinking) */}
                <g className={eyelidAnimationClass} style={{ transformOrigin: "43.5px 36.5px" }}>
                  <path
                    d="M39,36.5 Q43.5,42.5 48,36.5 L48,34 L39,34 Z"
                    fill="#fcd7ba"
                    stroke="#78350f"
                    strokeWidth="0.7"
                  />
                  <path
                    d="M39,37 Q43.5,42.8 48,37"
                    stroke="#1c1917"
                    strokeWidth="1.1"
                    fill="none"
                    strokeLinecap="round"
                  />
                </g>

                <g className={eyelidAnimationClass} style={{ transformOrigin: "56.5px 36.5px" }}>
                  <path
                    d="M52,36.5 Q56.5,42.5 61,36.5 L61,34 L52,34 Z"
                    fill="#fcd7ba"
                    stroke="#78350f"
                    strokeWidth="0.7"
                  />
                  <path
                    d="M52,37 Q56.5,42.8 61,37"
                    stroke="#1c1917"
                    strokeWidth="1.1"
                    fill="none"
                    strokeLinecap="round"
                  />
                </g>
              </g>

              {/* DYNAMIC EYEBROWS */}
              {reactionState === "SURPRISED" ? (
                <>
                  <path d="M38.5,31 Q43.5,27.5 48,30.5" stroke="#261c16" strokeWidth="1.6" fill="none" strokeLinecap="round" />
                  <path d="M52,30.5 Q56.5,27.5 61.5,31" stroke="#261c16" strokeWidth="1.6" fill="none" strokeLinecap="round" />
                </>
              ) : reactionState === "FOCUSED" || reactionState === "DEALING" ? (
                <>
                  <path d="M39,34.5 L47.5,35.5" stroke="#261c16" strokeWidth="1.6" fill="none" strokeLinecap="round" />
                  <path d="M61,34.5 L52.5,35.5" stroke="#261c16" strokeWidth="1.6" fill="none" strokeLinecap="round" />
                </>
              ) : (
                <>
                  <path d="M39,33.5 Q43.5,31.8 47.5,33.5" stroke="#261c16" strokeWidth="1.3" fill="none" strokeLinecap="round" />
                  <path d="M52.5,33.5 Q56.5,31.8 61,33.5" stroke="#261c16" strokeWidth="1.3" fill="none" strokeLinecap="round" />
                </>
              )}

              {/* REFINED NOSE */}
              <path d="M50,38 Q51,43.5 49,45" stroke="#d99b77" strokeWidth="1.3" fill="none" strokeLinecap="round" />
              <ellipse cx="49" cy="44.8" rx="1.6" ry="0.8" fill="#e2a784" />
              <circle cx="49" cy="44.5" r="0.6" fill="#ffffff" opacity="0.6" />

              {/* GLOSSY EXPRESSIVE LIPS */}
              {reactionState === "SURPRISED" ? (
                <ellipse cx="50" cy="50.5" rx="3.5" ry="4.2" fill="url(#croupier-lips)" stroke="#9f1239" strokeWidth="0.8" />
              ) : reactionState === "BIG_WIN" || reactionState === "CELEBRATING" ? (
                <path d="M42,48.5 Q50,57.5 58,48.5 Q50,51 42,48.5" fill="url(#croupier-lips)" stroke="#9f1239" strokeWidth="1" strokeLinejoin="round" />
              ) : (
                <path d="M44,49.5 Q50,53.2 56,49.5 Q50,51.5 44,49.5" fill="url(#croupier-lips)" stroke="#9f1239" strokeWidth="0.8" strokeLinejoin="round" />
              )}

              {/* CASINO COMMUNICATIONS EARPIECE WITH PULSING EMERALD LED */}
              <rect x="67" y="38" width="3.2" height="6.5" rx="1.6" fill="#0f172a" />
              <circle
                cx="68.6"
                cy="41.2"
                r="1.2"
                fill="#10b981"
                className={idleAction === "CHECKING_EARPIECE" ? "animate-ping" : "animate-pulse"}
              />
            </motion.g>

            {/* ============================================================== */}
            {/* ACTIVE CROUPIER KINETIC HANDS & DEALING GESTURES */}
            {/* ============================================================== */}

            {/* 1. DEALING CARDS ACTIVE FLOURISH (SYNCED WITH DEALING STEP) */}
            {gameStatus === "DEALING" && (
              <g className="origin-[30px_65px]">
                {/* Dealing Left to Dragon */}
                {(dealingStep === "DEALING_CARDS" || dealingStep === "REVEAL_DRAGON") && (
                  <g className="animate-[dealer-deal-dragon_1.8s_cubic-bezier(0.25,1,0.5,1)_infinite]">
                    {/* Tuxedo Sleeve */}
                    <path d="M28,68 Q16,62 8,56" stroke="#171717" strokeWidth="7" strokeLinecap="round" />
                    {/* White French Cuff & Gold Cufflink */}
                    <path d="M9,57 L6,55" stroke="#f8fafc" strokeWidth="4.2" strokeLinecap="round" />
                    <circle cx="7.5" cy="56" r="1.1" fill="url(#croupier-gold)" />
                    {/* Hand */}
                    <ellipse cx="5" cy="54" rx="4.5" ry="3.5" fill="url(#croupier-skin)" />
                    {/* Gold Back Foil Playing Card being dealt */}
                    <rect
                      x="-3"
                      y="46"
                      width="12"
                      height="16"
                      rx="1.5"
                      fill="#b45309"
                      stroke="#fef08a"
                      strokeWidth="0.9"
                      transform="rotate(-25 3 54)"
                    />
                    <circle cx="3" cy="54" r="3" fill="#f59e0b" className="animate-ping" opacity="0.7" />
                  </g>
                )}

                {/* Dealing Right to Tiger */}
                {dealingStep === "REVEAL_TIGER" && (
                  <g className="animate-[dealer-deal-tiger_1.8s_cubic-bezier(0.25,1,0.5,1)_infinite]">
                    {/* Tuxedo Sleeve */}
                    <path d="M72,68 Q84,62 92,56" stroke="#171717" strokeWidth="7" strokeLinecap="round" />
                    {/* White French Cuff & Gold Cufflink */}
                    <path d="M91,57 L94,55" stroke="#f8fafc" strokeWidth="4.2" strokeLinecap="round" />
                    <circle cx="92.5" cy="56" r="1.1" fill="url(#croupier-gold)" />
                    {/* Hand */}
                    <ellipse cx="95" cy="54" rx="4.5" ry="3.5" fill="url(#croupier-skin)" />
                    {/* Gold Back Foil Playing Card being dealt */}
                    <rect
                      x="89"
                      y="46"
                      width="12"
                      height="16"
                      rx="1.5"
                      fill="#1e3a8a"
                      stroke="#fef08a"
                      strokeWidth="0.9"
                      transform="rotate(25 95 54)"
                    />
                    <circle cx="95" cy="54" r="3" fill="#38bdf8" className="animate-ping" opacity="0.7" />
                  </g>
                )}
              </g>
            )}

            {/* 2. WINNER ANNOUNCEMENT PRESENTATION SWEEP */}
            {winnerResult === "DRAGON" && (gameStatus === "SETTLING" || gameStatus === "COMPLETED") && (
              <g className="animate-[dealer-present-dragon_1.4s_ease-out_forwards] origin-[25px_65px]">
                <path d="M26,67 Q14,60 6,52" stroke="#171717" strokeWidth="7" strokeLinecap="round" />
                <path d="M7,53 L4,51" stroke="#f8fafc" strokeWidth="4" strokeLinecap="round" />
                <ellipse cx="3" cy="50" rx="5" ry="3.5" fill="url(#croupier-skin)" transform="rotate(-20 3 50)" />
                {/* Golden presentation aura */}
                <circle cx="2" cy="49" r="6" fill="#ef4444" opacity="0.4" className="animate-pulse" />
              </g>
            )}

            {winnerResult === "TIGER" && (gameStatus === "SETTLING" || gameStatus === "COMPLETED") && (
              <g className="animate-[dealer-present-tiger_1.4s_ease-out_forwards] origin-[75px_65px]">
                <path d="M74,67 Q86,60 94,52" stroke="#171717" strokeWidth="7" strokeLinecap="round" />
                <path d="M93,53 L96,51" stroke="#f8fafc" strokeWidth="4" strokeLinecap="round" />
                <ellipse cx="97" cy="50" rx="5" ry="3.5" fill="url(#croupier-skin)" transform="rotate(20 97 50)" />
                {/* Amber presentation aura */}
                <circle cx="98" cy="49" r="6" fill="#f59e0b" opacity="0.4" className="animate-pulse" />
              </g>
            )}

            {/* 3. SUITED TIE TWO-HAND DELIGHTED CELEBRATION */}
            {winnerResult === "TIE" && (gameStatus === "SETTLING" || gameStatus === "COMPLETED") && (
              <g className="animate-[dealer-tie-celebrate_1.6s_ease-in-out_infinite] origin-[50px_60px]">
                <path d="M30,68 Q20,54 18,46" stroke="#171717" strokeWidth="6" strokeLinecap="round" />
                <ellipse cx="17" cy="44" rx="4.5" ry="3" fill="url(#croupier-skin)" transform="rotate(-30 17 44)" />

                <path d="M70,68 Q80,54 82,46" stroke="#171717" strokeWidth="6" strokeLinecap="round" />
                <ellipse cx="83" cy="44" rx="4.5" ry="3" fill="url(#croupier-skin)" transform="rotate(30 83 44)" />

                <circle cx="50" cy="42" r="14" fill="#14b8a6" opacity="0.3" className="animate-ping" />
              </g>
            )}

            {/* 4. IDLE ACTION: KNUCKLE-ROLLING GOLDEN CASINO CHIP */}
            {idleAction === "CHIP_ROLL" && (
              <g className="origin-[32px_74px]">
                <path d="M30,68 Q22,72 16,76" stroke="#171717" strokeWidth="6" strokeLinecap="round" />
                <ellipse cx="15" cy="77" rx="4" ry="3" fill="url(#croupier-skin)" />
                {/* Rolling Ceramic Gold Chip */}
                <g className="animate-[dealer-chip-knuckle-roll_1.2s_linear_infinite] origin-[15px_73px]">
                  <circle cx="15" cy="73" r="4.2" fill="url(#croupier-gold)" stroke="#ffffff" strokeWidth="0.8" />
                  <circle cx="15" cy="73" r="2.8" fill="#171717" />
                  <circle cx="15" cy="73" r="1.4" fill="url(#croupier-gold)" />
                </g>
              </g>
            )}

            {/* 5. IDLE ACTION: CHECKING SHOE */}
            {idleAction === "CHECKING_SHOE" && (
              <g className="animate-[dealer-shoe-reach_3s_ease-in-out_infinite] origin-[30px_65px]">
                <path d="M28,68 Q18,65 10,60" stroke="#171717" strokeWidth="7" strokeLinecap="round" />
                <path d="M11,61 L8,59" stroke="#f8fafc" strokeWidth="4" strokeLinecap="round" />
                <ellipse cx="7" cy="58" rx="4.5" ry="3.5" fill="url(#croupier-skin)" />
                <circle cx="4" cy="55" r="3" fill="#38bdf8" opacity="0.6" className="animate-ping" />
              </g>
            )}

            {/* 6. IDLE ACTION: SHUFFLING DECK */}
            {idleAction === "SHUFFLING_DECK" && (
              <g className="origin-[50px_80px]">
                <g className="animate-[deck-riffle-left_2.2s_ease-in-out_infinite] origin-[38px_78px]">
                  <ellipse cx="36" cy="80" rx="5.5" ry="4" fill="url(#croupier-skin)" />
                  <rect
                    x="37"
                    y="72"
                    width="11"
                    height="15"
                    rx="1.5"
                    fill="#b91c1c"
                    stroke="#fcd34d"
                    strokeWidth="0.8"
                    transform="rotate(-15 37 72)"
                  />
                </g>

                <g className="animate-[deck-riffle-right_2.2s_ease-in-out_infinite] origin-[62px_78px]">
                  <ellipse cx="64" cy="80" rx="5.5" ry="4" fill="url(#croupier-skin)" />
                  <rect
                    x="52"
                    y="72"
                    width="11"
                    height="15"
                    rx="1.5"
                    fill="#1e3a8a"
                    stroke="#fcd34d"
                    strokeWidth="0.8"
                    transform="rotate(15 52 72)"
                  />
                </g>
              </g>
            )}

            {/* 7. IDLE ACTION: EARPIECE RADIO CHECK */}
            {idleAction === "CHECKING_EARPIECE" && (
              <g className="origin-[65px_50px]">
                <path d="M68,70 Q75,54 69,43" stroke="#171717" strokeWidth="6.5" strokeLinecap="round" />
                <ellipse cx="68" cy="42" rx="3.8" ry="3.2" fill="url(#croupier-skin)" />
              </g>
            )}

            {/* 8. IDLE ACTION: SHUSH / CALMING GESTURE */}
            {idleAction === "SHUSHING_TABLE" && (
              <g className="origin-[50px_60px]">
                <g className="animate-dealer-calm origin-[35px_65px]">
                  <path d="M32,68 Q24,62 18,58" stroke="#171717" strokeWidth="6" strokeLinecap="round" />
                  <ellipse cx="16" cy="56" rx="5" ry="3.5" fill="url(#croupier-skin)" transform="rotate(-15 16 56)" />
                </g>
                <g className="animate-dealer-shush origin-[65px_65px]">
                  <path d="M66,70 Q62,56 54,46" stroke="#171717" strokeWidth="6" strokeLinecap="round" />
                  <ellipse cx="52" cy="40" rx="3.5" ry="3" fill="url(#croupier-skin)" />
                  <line x1="51" y1="40" x2="49" y2="34" stroke="url(#croupier-skin)" strokeWidth="2.5" strokeLinecap="round" />
                </g>
              </g>
            )}

            {/* 9. BIG WIN APPLAUDING HANDS */}
            {isBigWin && (
              <g className="origin-[50px_70px]">
                <g className="animate-[dealer-clap-left_0.4s_ease-in-out_infinite] origin-[35px_70px]">
                  <ellipse cx="40" cy="68" rx="5" ry="4" fill="url(#croupier-skin)" />
                </g>
                <g className="animate-[dealer-clap-right_0.4s_ease-in-out_infinite] origin-[65px_70px]">
                  <ellipse cx="60" cy="68" rx="5" ry="4" fill="url(#croupier-skin)" />
                </g>
              </g>
            )}
          </svg>
        </div>

        {/* POLISHED GOLD ENGRAVED DEALER NAME BADGE */}
        <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-neutral-950/95 border border-amber-400/90 shadow-[0_4px_12px_rgba(0,0,0,0.8)] whitespace-nowrap ring-1 ring-amber-300/30">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              gameStatus === "DEALING"
                ? "bg-amber-400 animate-ping"
                : idleAction === "CHECKING_SHOE"
                ? "bg-cyan-400 animate-ping"
                : idleAction === "SHUFFLING_DECK"
                ? "bg-amber-400 animate-spin"
                : "bg-emerald-400 animate-pulse"
            }`}
          />
          <span className="text-[7.5px] sm:text-[8px] font-black tracking-wider text-amber-300 uppercase font-mono flex items-center gap-1">
            <span>{idleActionLabel || "SOPHIA"}</span>
            <Crown className="w-2.5 h-2.5 text-amber-400 shrink-0 inline" />
          </span>
        </div>
      </motion.div>

      {/* BOTTOM CONTROLS: INTERACTIVE TIP & STAGE EXPAND TOGGLE */}
      <div className="mt-3 flex items-center gap-1.5 z-30">
        {/* Tip / Heart Dealer Button */}
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={handleTipDealer}
          type="button"
          className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-black/70 hover:bg-black/90 border border-white/10 hover:border-amber-400/60 text-neutral-300 hover:text-amber-300 text-[8px] font-bold transition-all shadow-md cursor-pointer group"
          title="Tip Dealer / Send Love"
        >
          <Heart
            className={`w-2.5 h-2.5 transition-colors ${
              hasLiked ? "text-rose-500 fill-rose-500" : "text-neutral-400 group-hover:text-rose-400"
            }`}
          />
          <span className="font-mono">{likesCount}</span>
        </motion.button>

        {/* View Mode Toggle (Stage / Compact) */}
        {onToggleStageMode && (
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={onToggleStageMode}
            type="button"
            className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-black/70 hover:bg-black/90 border border-white/10 hover:border-amber-400/60 text-neutral-300 hover:text-amber-300 text-[8px] font-bold transition-all shadow-md cursor-pointer"
            title={stageMode ? "Minimize Dealer" : "Spotlight Dealer Stage"}
          >
            {stageMode ? (
              <>
                <Minimize2 className="w-2.5 h-2.5 text-amber-400" />
                <span className="hidden sm:inline">Mini</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-2.5 h-2.5 text-amber-400" />
                <span className="hidden sm:inline">VIP Stage</span>
              </>
            )}
          </motion.button>
        )}
      </div>

      {/* Floating Animated Hearts on Tip */}
      <AnimatePresence>
        {showHeartBurst && (
          <motion.div
            initial={{ opacity: 1, y: 0, scale: 0.5 }}
            animate={{ opacity: 0, y: -45, scale: 1.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="absolute -top-7 left-1/2 -translate-x-1/2 pointer-events-none text-rose-500 text-sm font-black z-40 flex items-center gap-1"
          >
            <span>❤️</span>
            <span className="text-[10px] text-amber-300 font-bold">+1 VIP TIP</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
