import { useState, useEffect, RefObject } from "react";

export interface HeadRotationAngle {
  x: number; // Pitch: tilt up/down
  y: number; // Yaw: turn left/right
  z: number; // Roll: subtle lateral tilt
}

export interface EyeGazeOffset {
  x: number; // Horizontal pupil offset
  y: number; // Vertical pupil offset
}

interface UseDealerCardGazeParams {
  containerRef: RefObject<HTMLDivElement | null>;
  gameStatus: "BETTING" | "MATCHING" | "DEALING" | "SETTLING" | "COMPLETED";
  winnerResult?: "DRAGON" | "TIGER" | "TIE" | null;
  dragonCardDisplay?: string;
  tigerCardDisplay?: string;
  idleAction: string;
}

/**
 * Custom hook that calculates card coordinates relative to the dealer avatar in real-time,
 * dynamically updating the dealer's 3D head rotation and eye gaze variables to track cards as they are dealt.
 */
export function useDealerCardGaze({
  containerRef,
  gameStatus,
  winnerResult,
  dragonCardDisplay,
  tigerCardDisplay,
  idleAction,
}: UseDealerCardGazeParams): {
  headRotation: HeadRotationAngle;
  eyeGaze: EyeGazeOffset;
} {
  const [headRotation, setHeadRotation] = useState<HeadRotationAngle>({ x: 0, y: 0, z: 0 });
  const [eyeGaze, setEyeGaze] = useState<EyeGazeOffset>({ x: 0, y: 0 });

  useEffect(() => {
    // Helper to calculate 3D rotation angles towards a target DOM element
    const computeAnglesToElement = (targetSelector: string, customPitchOffset = 0) => {
      if (!containerRef.current || typeof document === "undefined") return null;
      const targetEl = document.querySelector(targetSelector);
      if (!targetEl) return null;

      const dealerRect = containerRef.current.getBoundingClientRect();
      const targetRect = targetEl.getBoundingClientRect();

      const dealerCenterX = dealerRect.left + dealerRect.width / 2;
      const dealerCenterY = dealerRect.top + dealerRect.height / 2;

      const targetCenterX = targetRect.left + targetRect.width / 2;
      const targetCenterY = targetRect.top + targetRect.height / 2;

      const dx = targetCenterX - dealerCenterX;
      const dy = targetCenterY - dealerCenterY;

      const screenW = window.innerWidth || 1200;
      const screenH = window.innerHeight || 800;

      const normX = Math.max(-1, Math.min(1, dx / (screenW * 0.4)));
      const normY = Math.max(-1, Math.min(1, dy / (screenH * 0.4)));

      const yaw = normX * 16;
      const pitch = Math.max(-6, Math.min(12, normY * 8 + customPitchOffset));
      const roll = yaw * 0.12;

      const gazeX = Math.max(-3.5, Math.min(3.5, normX * 3.4));
      const gazeY = Math.max(-2.2, Math.min(2.2, normY * 2.0));

      return {
        head: { x: pitch, y: yaw, z: roll },
        gaze: { x: gazeX, y: gazeY },
      };
    };

    // 1. ACTIVE CARDS DEALING TRACKING (Priority 1)
    if (gameStatus === "DEALING") {
      // Dealing card 1 to Dragon
      if (dragonCardDisplay && !tigerCardDisplay) {
        const computed = computeAnglesToElement('[data-card-slot="dragon"]', 2);
        if (computed) {
          setHeadRotation(computed.head);
          setEyeGaze(computed.gaze);
          return;
        }
        setHeadRotation({ x: 5, y: -15, z: -2 });
        setEyeGaze({ x: -3.2, y: 1.8 });
        return;
      }

      // Dealing card 2 to Tiger
      if (tigerCardDisplay) {
        const computed = computeAnglesToElement('[data-card-slot="tiger"]', 2);
        if (computed) {
          setHeadRotation(computed.head);
          setEyeGaze(computed.gaze);
          return;
        }
        setHeadRotation({ x: 5, y: 15, z: 2 });
        setEyeGaze({ x: 3.2, y: 1.8 });
        return;
      }

      // Initial card slide out from shoe
      const computedShoe = computeAnglesToElement('[data-card-slot="shoe"]', 4);
      if (computedShoe) {
        setHeadRotation(computedShoe.head);
        setEyeGaze(computedShoe.gaze);
        return;
      }
      setHeadRotation({ x: 6, y: -8, z: -1 });
      setEyeGaze({ x: -2, y: 2 });
      return;
    }

    // 2. SETTLING & WINNER CARD TRACKING (Priority 2)
    if (gameStatus === "SETTLING" || gameStatus === "COMPLETED") {
      if (winnerResult === "DRAGON") {
        const computed = computeAnglesToElement('[data-card-slot="dragon"]');
        if (computed) {
          setHeadRotation(computed.head);
          setEyeGaze(computed.gaze);
          return;
        }
        setHeadRotation({ x: 3, y: -13, z: -1.5 });
        setEyeGaze({ x: -3, y: 1.2 });
        return;
      }

      if (winnerResult === "TIGER") {
        const computed = computeAnglesToElement('[data-card-slot="tiger"]');
        if (computed) {
          setHeadRotation(computed.head);
          setEyeGaze(computed.gaze);
          return;
        }
        setHeadRotation({ x: 3, y: 13, z: 1.5 });
        setEyeGaze({ x: 3, y: 1.2 });
        return;
      }

      if (winnerResult === "TIE") {
        setHeadRotation({ x: -4, y: 0, z: 0 });
        setEyeGaze({ x: 0, y: 0 });
        return;
      }
    }

    // 3. IDLE ACTIONS ORIENTATION (Priority 3)
    if (idleAction === "CHECKING_SHOE") {
      const computed = computeAnglesToElement('[data-card-slot="shoe"]', 3);
      if (computed) {
        setHeadRotation(computed.head);
        setEyeGaze(computed.gaze);
        return;
      }
      setHeadRotation({ x: 7, y: -20, z: -3 });
      setEyeGaze({ x: -3.5, y: 1.5 });
      return;
    }

    if (idleAction === "SHUFFLING_DECK") {
      setHeadRotation({ x: 13, y: 0, z: 0 });
      setEyeGaze({ x: 0, y: 3.2 });
      return;
    }

    if (idleAction === "SURVEYING_TABLE") {
      setHeadRotation({ x: 4, y: -14, z: -1.5 });
      setEyeGaze({ x: -3.2, y: 1.2 });

      const t1 = setTimeout(() => {
        setHeadRotation({ x: 4, y: 14, z: 1.5 });
        setEyeGaze({ x: 3.2, y: 1.2 });
      }, 1400);

      const t2 = setTimeout(() => {
        setHeadRotation({ x: 0, y: 0, z: 0 });
        setEyeGaze({ x: 0, y: 0 });
      }, 2800);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }

    if (idleAction === "CHECKING_EARPIECE") {
      setHeadRotation({ x: -2, y: 9, z: 2.5 });
      setEyeGaze({ x: 2.5, y: -1 });
      return;
    }

    if (idleAction === "SHUSHING_TABLE") {
      setHeadRotation({ x: -4, y: 0, z: 0 });
      setEyeGaze({ x: 0, y: -0.6 });
      return;
    }

    // 4. GLOBAL CURSOR TRACKING GAZE (Priority 4)
    const handleGlobalMouseMove = (e: MouseEvent | TouchEvent) => {
      if (idleAction !== "BREATHING") return;

      let clientX = 0;
      let clientY = 0;
      if ("clientX" in e) {
        clientX = e.clientX;
        clientY = e.clientY;
      } else if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        return;
      }

      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const avatarCenterX = rect.left + rect.width / 2;
      const avatarCenterY = rect.top + rect.height / 2;

      const screenW = window.innerWidth || 1200;
      const screenH = window.innerHeight || 800;

      const deltaX = (clientX - avatarCenterX) / (screenW * 0.45);
      const deltaY = (clientY - avatarCenterY) / (screenH * 0.45);

      const clampedX = Math.max(-1, Math.min(1, deltaX));
      const clampedY = Math.max(-1, Math.min(1, deltaY));

      const pitch = Math.max(-8, Math.min(8, clampedY * 7));
      const yaw = Math.max(-14, Math.min(14, clampedX * 12));
      const roll = Math.max(-3, Math.min(3, clampedX * 2));

      setHeadRotation({ x: pitch, y: yaw, z: roll });
      setEyeGaze({
        x: Math.max(-3.2, Math.min(3.2, clampedX * 3)),
        y: Math.max(-2.2, Math.min(2.2, clampedY * 2.2)),
      });
    };

    window.addEventListener("mousemove", handleGlobalMouseMove, { passive: true });
    window.addEventListener("touchmove", handleGlobalMouseMove, { passive: true });

    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("touchmove", handleGlobalMouseMove);
    };
  }, [containerRef, gameStatus, dragonCardDisplay, tigerCardDisplay, winnerResult, idleAction]);

  return { headRotation, eyeGaze };
}
