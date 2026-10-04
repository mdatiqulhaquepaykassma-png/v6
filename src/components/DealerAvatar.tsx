import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Heart } from "lucide-react";
import { sound } from "../utils/audio";
import { useDealerCardGaze } from "../utils/useDealerCardGaze";

export type DealerReactionType =
  | "IDLE"
  | "WELCOMING"
  | "FOCUSED"
  | "SURPRISED"
  | "CELEBRATING"
  | "BIG_WIN"
  | "CONSOLING";

export type DealerIdleAction =
  | "BREATHING"
  | "CHECKING_SHOE"
  | "SHUFFLING_DECK"
  | "SURVEYING_TABLE"
  | "CHECKING_EARPIECE"
  | "SHUSHING_TABLE";

type BlinkPattern = "natural" | "double" | "languid";

interface FloatingEmoji {
  id: number;
  emoji: string;
  x: number;
  y: number;
  rotate: number;
  scale: number;
  delay: number;
}

interface DealerAvatarProps {
  gameStatus: "BETTING" | "MATCHING" | "DEALING" | "SETTLING" | "COMPLETED";
  winnerResult?: "DRAGON" | "TIGER" | "TIE" | null;
  dragonCardDisplay?: string;
  tigerCardDisplay?: string;
  timeLeft?: number;
  dealerCommentary?: string;
  isBigWin?: boolean;
  userWon?: boolean;
  userLost?: boolean;
  bettingVolumeSpike?: boolean;
}

export const DealerAvatar = React.memo<DealerAvatarProps>(({
  gameStatus,
  winnerResult,
  dragonCardDisplay,
  tigerCardDisplay,
  timeLeft = 15,
  dealerCommentary,
  isBigWin = false,
  userWon = false,
  userLost = false,
  bettingVolumeSpike = false,
}) => {
  const [likesCount, setLikesCount] = useState<number>(1428);
  const [hasLiked, setHasLiked] = useState<boolean>(false);
  const [showHeartAnim, setShowHeartAnim] = useState<boolean>(false);
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([]);

  // 3D-CSS Randomized Blink Pattern Mode
  const [blinkPattern, setBlinkPattern] = useState<BlinkPattern>("natural");
  const [isBlinkingForced, setIsBlinkingForced] = useState<boolean>(false);

  // 3D-CSS Idle Action State Machine
  const [idleAction, setIdleAction] = useState<DealerIdleAction>("BREATHING");
  const [idleActionLabel, setIdleActionLabel] = useState<string | null>(null);

  // Reference for viewport bounding rect tracking
  const containerRef = useRef<HTMLDivElement>(null);
  const isHoveredRef = useRef<boolean>(false);

  // Dynamic Head 3D Micro-Rotation angles & Micro Eye Gaze offsets calculated by the hook
  const { headRotation, eyeGaze } = useDealerCardGaze({
    containerRef,
    gameStatus,
    winnerResult,
    dragonCardDisplay,
    tigerCardDisplay,
    idleAction,
  });

  // ==========================================================================
  // 1. RANDOMIZED 3D-CSS EYE-BLINKING SYSTEM
  // ==========================================================================
  // Randomly cycles between Natural Single Blink, Double-Blink Flutter, and Languid Slow Blink
  useEffect(() => {
    let timer: NodeJS.Timeout;
    const randomizeBlinkCycle = () => {
      const patterns: BlinkPattern[] = ["natural", "natural", "double", "languid"];
      const chosen = patterns[Math.floor(Math.random() * patterns.length)];
      setBlinkPattern(chosen);

      // Schedule next pattern switch
      const nextInterval = 4200 + Math.random() * 4500;
      timer = setTimeout(randomizeBlinkCycle, nextInterval);
    };

    randomizeBlinkCycle();
    return () => clearTimeout(timer);
  }, []);

  // Quick intentional blink on reaction state change
  const triggerInstantBlink = useCallback(() => {
    setIsBlinkingForced(true);
    setTimeout(() => setIsBlinkingForced(false), 160);
  }, []);

  // Compute current State-Driven Reaction Mode
  const reactionState: DealerReactionType = useMemo(() => {
    if (gameStatus === "SETTLING" || gameStatus === "COMPLETED") {
      if (winnerResult === "TIE") return "SURPRISED";
      if (isBigWin || userWon) return "BIG_WIN";
      if (winnerResult === "DRAGON" || winnerResult === "TIGER") return "CELEBRATING";
      if (userLost) return "CONSOLING";
    }
    if (gameStatus === "DEALING" || timeLeft <= 4) {
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

  // Trigger Calm/Shush gesture on Betting Volume Spikes
  useEffect(() => {
    if (bettingVolumeSpike && gameStatus === "BETTING" && idleAction === "BREATHING") {
      setIdleAction("SHUSHING_TABLE");
      setIdleActionLabel("Steady Bets");
      triggerInstantBlink();
      const timer = setTimeout(() => {
        setIdleAction("BREATHING");
        setIdleActionLabel(null);
      }, 3300);
      return () => clearTimeout(timer);
    }
  }, [bettingVolumeSpike, gameStatus, idleAction, triggerInstantBlink]);

  // ==========================================================================
  // 3. RANDOMIZED IDLE ACTION SCHEDULER
  // ==========================================================================
  useEffect(() => {
    if (
      gameStatus === "DEALING" ||
      gameStatus === "SETTLING" ||
      timeLeft <= 4 ||
      reactionState === "BIG_WIN" ||
      reactionState === "SURPRISED"
    ) {
      setIdleAction("BREATHING");
      setIdleActionLabel(null);
      return;
    }

    let timeoutId: NodeJS.Timeout;

    const scheduleNextIdleAction = () => {
      const nextDelay = 7000 + Math.random() * 7000;
      timeoutId = setTimeout(() => {
        if (gameStatus === "BETTING" && timeLeft > 5) {
          const rand = Math.random();
          let chosenAction: DealerIdleAction = "BREATHING";

          if (rand < 0.30) {
            chosenAction = "CHECKING_SHOE";
          } else if (rand < 0.58) {
            chosenAction = "SHUFFLING_DECK";
          } else if (rand < 0.74) {
            chosenAction = "SURVEYING_TABLE";
          } else if (rand < 0.88) {
            chosenAction = "SHUSHING_TABLE";
          } else {
            chosenAction = "CHECKING_EARPIECE";
          }

          setIdleAction(chosenAction);

          if (chosenAction === "CHECKING_SHOE") {
            setIdleActionLabel("Checking Shoe");
            try {
              sound.playCardSlide();
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("dealer-check-shoe"));
              }
            } catch {}

            setTimeout(() => {
              setIdleAction("BREATHING");
              setIdleActionLabel(null);
              scheduleNextIdleAction();
            }, 3200);
          } else if (chosenAction === "SHUFFLING_DECK") {
            setIdleActionLabel("Shuffling 8-Deck");
            try {
              // High-fidelity procedural card shuffle audio timed to 3D riffle keyframes
              const randomShuffleSpeed = 0.95 + Math.random() * 0.2;
              sound.playProceduralDeckShuffle(randomShuffleSpeed);

              // Secondary soft deck cut/tap sound halfway through action
              setTimeout(() => {
                sound.playCardSnap();
              }, 2100);
            } catch {}

            setTimeout(() => {
              setIdleAction("BREATHING");
              setIdleActionLabel(null);
              scheduleNextIdleAction();
            }, 3600);
          } else if (chosenAction === "SURVEYING_TABLE") {
            setIdleActionLabel("Scanning Table");
            setTimeout(() => {
              setIdleAction("BREATHING");
              setIdleActionLabel(null);
              scheduleNextIdleAction();
            }, 3400);
          } else if (chosenAction === "SHUSHING_TABLE") {
            setIdleActionLabel("Steady Bets");
            setTimeout(() => {
              setIdleAction("BREATHING");
              setIdleActionLabel(null);
              scheduleNextIdleAction();
            }, 3200);
          } else if (chosenAction === "CHECKING_EARPIECE") {
            setIdleActionLabel("Pit Radio");
            setTimeout(() => {
              setIdleAction("BREATHING");
              setIdleActionLabel(null);
              scheduleNextIdleAction();
            }, 2600);
          }
        } else {
          scheduleNextIdleAction();
        }
      }, nextDelay);
    };

    scheduleNextIdleAction();
    return () => clearTimeout(timeoutId);
  }, [gameStatus, timeLeft, reactionState]);

  // Floating Reaction Emojis
  useEffect(() => {
    let emojisToSpawn: string[] = [];
    if (reactionState === "SURPRISED") {
      emojisToSpawn = ["😲", "⚡", "🤯", "💎", "✨", "11:1!"];
    } else if (reactionState === "BIG_WIN") {
      emojisToSpawn = ["👑", "🔥", "💰", "🎉", "🏆", "✨", "🍾"];
    } else if (reactionState === "CELEBRATING") {
      emojisToSpawn = ["🎉", "🔥", "✨", "👏", "🍀"];
    } else if (reactionState === "FOCUSED") {
      emojisToSpawn = ["🎯", "👀", "🃏", "⚡", "⏳"];
    } else if (reactionState === "WELCOMING" && timeLeft === 15) {
      emojisToSpawn = ["👋", "🍀", "✨", "🎲"];
    } else if (reactionState === "CONSOLING") {
      emojisToSpawn = ["🍀", "🤝", "💪", "✨"];
    }

    if (emojisToSpawn.length > 0) {
      const now = Date.now();
      const newItems: FloatingEmoji[] = emojisToSpawn.map((emoji, index) => ({
        id: now + index,
        emoji,
        x: (Math.random() - 0.5) * 80,
        y: -30 - Math.random() * 40,
        rotate: (Math.random() - 0.5) * 45,
        scale: 0.9 + Math.random() * 0.4,
        delay: index * 0.08,
      }));
      setFloatingEmojis(newItems);

      const clearTimer = setTimeout(() => {
        setFloatingEmojis([]);
      }, 2600);
      return () => clearTimeout(clearTimer);
    }
  }, [reactionState, winnerResult, isBigWin, userWon, timeLeft]);

  const handleTipDealer = () => {
    if (!hasLiked) {
      setLikesCount((prev) => prev + 1);
      setHasLiked(true);
      setShowHeartAnim(true);
      setTimeout(() => setShowHeartAnim(false), 1800);
    }
  };

  const getDealerSpeech = () => {
    if (dealerCommentary && dealerCommentary.length > 0) {
      return dealerCommentary;
    }
    switch (reactionState) {
      case "SURPRISED":
        return "Incredible! Suited TIE! 11:1 payout on the table!";
      case "BIG_WIN":
        return "MASSIVE WIN! Congratulations to our big champions!";
      case "CELEBRATING":
        return winnerResult === "DRAGON"
          ? `Dragon takes the round${dragonCardDisplay ? ` with ${dragonCardDisplay}` : ""}!`
          : `Tiger takes the round${tigerCardDisplay ? ` with ${tigerCardDisplay}` : ""}!`;
      case "FOCUSED":
        return timeLeft <= 4
          ? "Final seconds! Bets locking in..."
          : "Cards in flight from the shoe. High card wins!";
      case "CONSOLING":
        return "Close hand! Fortune is on your side for the next round.";
      case "WELCOMING":
      default:
        if (idleAction === "CHECKING_SHOE") return "Inspecting table shoe. Decks verified.";
        if (idleAction === "SHUFFLING_DECK") return "Riffle shuffling fresh decks for the table.";
        return "Welcome players! Place your bets on Dragon, Tiger, or Tie.";
    }
  };

  // Eyelid 3D-CSS Animation Class based on randomized active pattern
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
      className="relative flex flex-col items-center select-none pointer-events-auto"
      style={{ perspective: "900px" }}
    >
      {/* Floating Reaction Emojis Burst */}
      <div className="absolute -top-6 left-1/2 -translate-x-1/2 pointer-events-none z-50 overflow-visible w-0 h-0 flex items-center justify-center">
        <AnimatePresence>
          {floatingEmojis.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.2, x: 0, y: 0, rotate: 0 }}
              animate={{
                opacity: [0, 1, 1, 0],
                scale: [0.2, item.scale, item.scale * 1.1, 0.7],
                x: item.x,
                y: item.y - 45,
                rotate: item.rotate,
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.2, ease: [0.22, 1, 0.36, 1], delay: item.delay }}
              className="absolute text-base sm:text-lg font-black filter drop-shadow-[0_0_8px_rgba(251,191,36,0.9)] whitespace-nowrap"
            >
              {item.emoji}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Dynamic Floating Speech Bubble */}
      <AnimatePresence mode="wait">
        <motion.div
          key={reactionState + (winnerResult || "") + (timeLeft <= 4 ? "urgent" : "") + idleAction}
          initial={{ opacity: 0, y: 10, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 420, damping: 24 }}
          className={`absolute -top-11 sm:-top-13 z-30 max-w-[210px] sm:max-w-[270px] px-2.5 py-1 rounded-full backdrop-blur-md border shadow-2xl flex items-center gap-1.5 whitespace-nowrap text-[8.5px] sm:text-[9.5px] font-bold ${
            reactionState === "SURPRISED"
              ? "bg-teal-950/90 border-teal-400 text-teal-200 shadow-teal-500/50 ring-2 ring-teal-400/40"
              : reactionState === "BIG_WIN"
              ? "bg-amber-950/90 border-amber-300 text-yellow-200 shadow-amber-500/60 ring-2 ring-amber-400/50 animate-pulse"
              : reactionState === "FOCUSED"
              ? "bg-neutral-950/90 border-amber-500/80 text-amber-200 shadow-black/80"
              : idleAction === "SHUFFLING_DECK"
              ? "bg-amber-950/90 border-amber-400 text-amber-200 shadow-amber-900/60 ring-1 ring-amber-400/50"
              : idleAction === "CHECKING_SHOE"
              ? "bg-neutral-950/90 border-cyan-400 text-cyan-200 shadow-cyan-900/60 ring-1 ring-cyan-400/40"
              : "bg-black/85 border-amber-400/60 text-amber-200 shadow-black/80"
          }`}
        >
          <span className="shrink-0 text-xs">
            {reactionState === "SURPRISED"
              ? "😲"
              : reactionState === "BIG_WIN"
              ? "👑"
              : reactionState === "CELEBRATING"
              ? "🎉"
              : reactionState === "FOCUSED"
              ? "🎯"
              : idleAction === "SHUFFLING_DECK"
              ? "🃏"
              : idleAction === "CHECKING_SHOE"
              ? "🎴"
              : "👋"}
          </span>
          <span className="truncate">{getDealerSpeech()}</span>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-inherit border-r border-b border-inherit transform rotate-45" />
        </motion.div>
      </AnimatePresence>

      {/* 3D PERSPECTIVE AVATAR CONTAINER */}
      <motion.div
        animate={{
          scale: reactionState === "BIG_WIN" ? 1.05 : 1,
          y: reactionState === "BIG_WIN" ? -4 : 0,
        }}
        transition={{ type: "spring", stiffness: 280, damping: 22 }}
        style={{ transformStyle: "preserve-3d" }}
        className="relative w-18 h-18 sm:w-22 sm:h-22 rounded-full flex items-center justify-center animate-dealer-breathe"
      >
        {/* Ambient Ring Glow */}
        <motion.div
          animate={{
            scale:
              reactionState === "BIG_WIN" || reactionState === "SURPRISED"
                ? [1, 1.15, 1]
                : [1, 1.05, 1],
            opacity: reactionState === "IDLE" ? 0.4 : 0.85,
          }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          style={{ transform: "translateZ(-4px)" }}
          className={`absolute -inset-1.5 rounded-full filter blur-sm pointer-events-none ${
            reactionState === "SURPRISED"
              ? "bg-gradient-to-tr from-cyan-500 via-teal-400 to-emerald-400"
              : reactionState === "BIG_WIN"
              ? "bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-600"
              : winnerResult === "DRAGON"
              ? "bg-gradient-to-tr from-red-600 to-amber-500"
              : winnerResult === "TIGER"
              ? "bg-gradient-to-tr from-amber-400 to-yellow-500"
              : "bg-gradient-to-tr from-amber-500/40 via-amber-300/30 to-amber-600/40"
          }`}
        />

        {/* Outer Circular Portrait Frame with 3D Depth */}
        <div
          className="relative w-full h-full rounded-full bg-gradient-to-b from-neutral-900 via-neutral-950 to-black border-2 border-amber-400/80 shadow-[0_15px_35px_rgba(0,0,0,0.9),inset_0_0_20px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col items-center justify-center"
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Background Studio Spotlight Aura */}
          <div
            className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(245,158,11,0.28),transparent_75%)]"
            style={{ transform: "translateZ(0px)" }}
          />

          {/* SVG Stylized Casino Dealer Illustration */}
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full transform translate-y-1 overflow-visible"
            style={{ transformStyle: "preserve-3d" }}
          >
            {/* Dealer Hair (Back) */}
            <path
              d="M30,45 C20,25 35,12 50,12 C65,12 80,25 70,45 C75,55 75,70 70,75 C60,65 40,65 30,75 C25,70 25,55 30,45"
              fill="#1e1b18"
            />

            {/* Neck */}
            <rect x="44" y="52" width="12" height="15" rx="3" fill="#f8d7b8" />

            {/* Tuxedo / Vest Shoulders (Breathing layer) */}
            <g className="origin-bottom">
              <path
                d="M20,95 L30,62 L44,65 L50,78 L56,65 L70,62 L80,95 Z"
                fill="#171717"
              />
              <polygon points="44,64 56,64 50,77" fill="#f8fafc" />
              <polygon points="45,64 55,64 50,67" fill="#d97706" />
              <circle cx="50" cy="65.5" r="1.5" fill="#fef08a" />
            </g>

            {/* ============================================================== */}
            {/* 3D-CSS INDEPENDENT HEAD GROUP WITH MICRO-ROTATION & TRACKING GAZE */}
            {/* ============================================================== */}
            <motion.g
              animate={{
                rotateX: headRotation.x,
                rotateY: headRotation.y,
                rotateZ: headRotation.z,
              }}
              transition={{
                type: "spring",
                stiffness: 220,
                damping: 20,
                mass: 0.7,
              }}
              style={{
                transformOrigin: "50px 45px",
                transformStyle: "preserve-3d",
              }}
              className="animate-dealer-head-breathe"
            >
              {/* Head / Face Base */}
              <ellipse cx="50" cy="40" rx="18" ry="20" fill="#fcd9b8" />

              {/* Hair Front Bangs with 3D Depth */}
              <path
                d="M32,32 C38,20 62,20 68,32 C60,26 40,26 32,32"
                fill="#2c241e"
              />
              <path
                d="M32,32 C38,36 44,28 50,33 C56,28 62,36 68,32 C65,22 35,22 32,32"
                fill="#1e1b18"
              />

              {/* ============================================================== */}
              {/* EYE SOCKETS, TRACKING PUPILS & 3D-CSS RANDOMIZED EYELIDS */}
              {/* ============================================================== */}
              <g style={{ transformStyle: "preserve-3d" }}>
                {/* LEFT EYE WHITE */}
                <ellipse cx="43.5" cy="38.5" rx="3.6" ry="2.8" fill="#ffffff" />
                {/* LEFT IRIS & PUPIL WITH TRACKING GAZE */}
                <circle
                  cx={43.5 + eyeGaze.x * 0.45}
                  cy={38.5 + eyeGaze.y * 0.4}
                  r="1.9"
                  fill="#451a03"
                />
                {/* LEFT CORNEA SHIMMER GLINT */}
                <circle
                  cx={44.3 + eyeGaze.x * 0.25}
                  cy={37.7 + eyeGaze.y * 0.25}
                  r="0.75"
                  fill="#ffffff"
                  className="animate-pupil-glint"
                />

                {/* RIGHT EYE WHITE */}
                <ellipse cx="56.5" cy="38.5" rx="3.6" ry="2.8" fill="#ffffff" />
                {/* RIGHT IRIS & PUPIL WITH TRACKING GAZE */}
                <circle
                  cx={56.5 + eyeGaze.x * 0.45}
                  cy={38.5 + eyeGaze.y * 0.4}
                  r="1.9"
                  fill="#451a03"
                />
                {/* RIGHT CORNEA SHIMMER GLINT */}
                <circle
                  cx={57.3 + eyeGaze.x * 0.25}
                  cy={37.7 + eyeGaze.y * 0.25}
                  r="0.75"
                  fill="#ffffff"
                  className="animate-pupil-glint"
                />

                {/* ========================================================== */}
                {/* 3D-CSS RANDOMIZED EYELIDS LAYER (Keyframe Driven) */}
                {/* ========================================================== */}
                {/* Left Eyelid Mesh */}
                <g className={eyelidAnimationClass} style={{ transformOrigin: "43.5px 36px" }}>
                  <path
                    d="M39.5,36 Q43.5,41.5 47.5,36 L47.5,34 L39.5,34 Z"
                    fill="#f5c7a0"
                    stroke="#451a03"
                    strokeWidth="0.8"
                  />
                  {/* Subtle Eyelash Lash Line */}
                  <path
                    d="M39.5,36.5 Q43.5,41.8 47.5,36.5"
                    stroke="#231915"
                    strokeWidth="1.1"
                    fill="none"
                    strokeLinecap="round"
                  />
                </g>

                {/* Right Eyelid Mesh */}
                <g className={eyelidAnimationClass} style={{ transformOrigin: "56.5px 36px" }}>
                  <path
                    d="M52.5,36 Q56.5,41.5 60.5,36 L60.5,34 L52.5,34 Z"
                    fill="#f5c7a0"
                    stroke="#451a03"
                    strokeWidth="0.8"
                  />
                  {/* Subtle Eyelash Lash Line */}
                  <path
                    d="M52.5,36.5 Q56.5,41.8 60.5,36.5"
                    stroke="#231915"
                    strokeWidth="1.1"
                    fill="none"
                    strokeLinecap="round"
                  />
                </g>
              </g>

              {/* EYEBROWS (Dynamic with Reaction State & Eye Gaze) */}
              {reactionState === "SURPRISED" ? (
                <>
                  <path
                    d="M39,30.5 Q43.5,27.5 48,30.5"
                    stroke="#2c241e"
                    strokeWidth="1.5"
                    fill="none"
                    strokeLinecap="round"
                  />
                  <path
                    d="M52,30.5 Q56.5,27.5 61,30.5"
                    stroke="#2c241e"
                    strokeWidth="1.5"
                    fill="none"
                    strokeLinecap="round"
                  />
                </>
              ) : reactionState === "FOCUSED" || idleAction === "SHUFFLING_DECK" ? (
                <>
                  <path
                    d="M40,34.5 L47,35.5"
                    stroke="#2c241e"
                    strokeWidth="1.5"
                    fill="none"
                    strokeLinecap="round"
                  />
                  <path
                    d="M60,34.5 L53,35.5"
                    stroke="#2c241e"
                    strokeWidth="1.5"
                    fill="none"
                    strokeLinecap="round"
                  />
                </>
              ) : (
                <>
                  <path
                    d="M40,34 Q43.5,32.5 47,34"
                    stroke="#2c241e"
                    strokeWidth="1.2"
                    fill="none"
                    strokeLinecap="round"
                  />
                  <path
                    d="M53,34 Q56.5,32.5 60,34"
                    stroke="#2c241e"
                    strokeWidth="1.2"
                    fill="none"
                    strokeLinecap="round"
                  />
                </>
              )}

              {/* Cute Nose */}
              <path
                d="M50,40 Q51,43 49.5,44"
                stroke="#e0a98b"
                strokeWidth="1.2"
                fill="none"
                strokeLinecap="round"
              />

              {/* Dynamic Mouth Expression */}
              {reactionState === "SURPRISED" ? (
                <ellipse
                  cx="50"
                  cy="49"
                  rx="3"
                  ry="4"
                  fill="#881337"
                  stroke="#b91c1c"
                  strokeWidth="1"
                />
              ) : reactionState === "BIG_WIN" || reactionState === "CELEBRATING" ? (
                <path
                  d="M43,47 Q50,56 57,47"
                  stroke="#b91c1c"
                  strokeWidth="2"
                  fill="#b91c1c"
                  strokeLinecap="round"
                />
              ) : (
                <path
                  d="M45,48 Q50,51.5 55,48"
                  stroke="#b91c1c"
                  strokeWidth="1.8"
                  fill="none"
                  strokeLinecap="round"
                />
              )}

              {/* Casino Communication Earpiece with Blinking Green LED */}
              <rect x="66" y="38" width="3" height="6" rx="1.5" fill="#111827" />
              <circle
                cx="67.5"
                cy="41"
                r="1"
                fill="#10b981"
                className={idleAction === "CHECKING_EARPIECE" ? "animate-ping" : "animate-pulse"}
              />
            </motion.g>

            {/* Left/Right Hand Gestures for Result Announcement */}
            {winnerResult === "DRAGON" && (
              <motion.g
                initial={{ x: 10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <ellipse cx="26" cy="66" rx="6" ry="5" fill="#fcd9b8" />
                <path
                  d="M26,63 L14,56"
                  stroke="#fcd9b8"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </motion.g>
            )}

            {winnerResult === "TIGER" && (
              <motion.g
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <ellipse cx="74" cy="66" rx="6" ry="5" fill="#fcd9b8" />
                <path
                  d="M74,63 L86,56"
                  stroke="#fcd9b8"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </motion.g>
            )}

            {/* RANDOMIZED ACTION 1: CHECKING SHOE GESTURE */}
            {idleAction === "CHECKING_SHOE" && (
              <g className="animate-[dealer-shoe-reach_3s_ease-in-out_infinite] origin-[30px_65px]">
                <path
                  d="M28,68 Q18,65 10,60"
                  stroke="#171717"
                  strokeWidth="7"
                  strokeLinecap="round"
                />
                <path
                  d="M11,61 L8,59"
                  stroke="#f8fafc"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <ellipse cx="7" cy="58" rx="4.5" ry="3.5" fill="#fcd9b8" />
                <circle cx="5" cy="56" r="1.5" fill="#fcd9b8" />
                <circle cx="4" cy="55" r="3" fill="#38bdf8" opacity="0.6" className="animate-ping" />
              </g>
            )}

            {/* RANDOMIZED ACTION 2: SHUFFLING DECK GESTURE */}
            {idleAction === "SHUFFLING_DECK" && (
              <g className="origin-[50px_80px]">
                <g className="animate-[deck-riffle-left_2.2s_ease-in-out_infinite] origin-[38px_78px]">
                  <ellipse cx="36" cy="80" rx="5.5" ry="4" fill="#fcd9b8" />
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
                  <line
                    x1="39"
                    y1="75"
                    x2="46"
                    y2="73"
                    stroke="#fef08a"
                    strokeWidth="0.6"
                    className="animate-[card-riffle-flutter_0.3s_infinite]"
                  />
                </g>

                <g className="animate-[deck-riffle-right_2.2s_ease-in-out_infinite] origin-[62px_78px]">
                  <ellipse cx="64" cy="80" rx="5.5" ry="4" fill="#fcd9b8" />
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
                  <line
                    x1="54"
                    y1="73"
                    x2="61"
                    y2="75"
                    stroke="#fef08a"
                    strokeWidth="0.6"
                    className="animate-[card-riffle-flutter_0.3s_infinite]"
                  />
                </g>

                <rect
                  x="46"
                  y="71"
                  width="8"
                  height="12"
                  rx="1"
                  fill="#d97706"
                  stroke="#ffffff"
                  strokeWidth="0.5"
                  opacity="0.85"
                />
              </g>
            )}

            {/* RANDOMIZED ACTION 3: EARPIECE RADIO CHECK */}
            {idleAction === "CHECKING_EARPIECE" && (
              <g className="origin-[65px_50px]">
                <path
                  d="M68,70 Q74,55 69,43"
                  stroke="#171717"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
                <ellipse cx="68" cy="42" rx="3.5" ry="3" fill="#fcd9b8" />
              </g>
            )}

            {/* ACTION 4: SHUSH / CALMING GESTURE (HIGH BETTING SPIKE) */}
            {idleAction === "SHUSHING_TABLE" && (
              <g className="origin-[50px_60px]">
                {/* Left Palm Calming Press */}
                <g className="animate-dealer-calm origin-[35px_65px]">
                  <path
                    d="M32,68 Q24,62 18,58"
                    stroke="#171717"
                    strokeWidth="6"
                    strokeLinecap="round"
                  />
                  <ellipse cx="16" cy="56" rx="5" ry="3.5" fill="#fcd9b8" transform="rotate(-15 16 56)" />
                </g>
                {/* Right Hand Shush / Finger-to-Lips Settle Gesture */}
                <g className="animate-dealer-shush origin-[65px_65px]">
                  <path
                    d="M66,70 Q62,56 54,46"
                    stroke="#171717"
                    strokeWidth="6"
                    strokeLinecap="round"
                  />
                  <path
                    d="M54,46 L53,42"
                    stroke="#f8fafc"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                  <ellipse cx="52" cy="40" rx="3.5" ry="3" fill="#fcd9b8" />
                  <line x1="51" y1="40" x2="49" y2="34" stroke="#fcd9b8" strokeWidth="2.5" strokeLinecap="round" />
                </g>
              </g>
            )}
          </svg>
        </div>

        {/* VIP Dealer Live Status Pill Badge */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 px-2 py-0.5 rounded-full bg-neutral-950 border border-amber-400/80 shadow-lg whitespace-nowrap">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              idleAction === "CHECKING_SHOE"
                ? "bg-cyan-400 animate-ping"
                : idleAction === "SHUFFLING_DECK"
                ? "bg-amber-400 animate-spin"
                : "bg-emerald-400 animate-pulse"
            }`}
          />
          <span className="text-[7.5px] font-black tracking-wider text-amber-300 uppercase font-mono">
            {idleActionLabel || "SOPHIA"}
          </span>
        </div>
      </motion.div>

      {/* Interactive Tip / Like Dealer Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={handleTipDealer}
        className="mt-2.5 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 hover:bg-black/90 border border-white/10 hover:border-amber-400/50 text-neutral-300 hover:text-amber-300 text-[8px] font-bold transition-all shadow cursor-pointer group"
      >
        <Heart
          className={`w-2.5 h-2.5 ${
            hasLiked ? "text-rose-500 fill-rose-500" : "text-neutral-400 group-hover:text-rose-400"
          }`}
        />
        <span>{likesCount}</span>
      </motion.button>

      {/* Floating Animated Hearts on Tip */}
      <AnimatePresence>
        {showHeartAnim && (
          <motion.div
            initial={{ opacity: 1, y: 0, scale: 0.5 }}
            animate={{ opacity: 0, y: -45, scale: 1.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="absolute -top-6 left-1/2 -translate-x-1/2 pointer-events-none text-rose-500 text-sm font-black z-40 flex items-center gap-1"
          >
            <span>❤️</span>
            <span className="text-[10px] text-amber-300 font-bold">+1 LIKE</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
