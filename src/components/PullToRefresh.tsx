import React, { useState, useRef, useEffect, useCallback } from 'react';
import { RefreshCw, Check, Sparkles } from 'lucide-react';
import { sound } from '../utils/audio';

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
  className?: string;
  pullThreshold?: number;
  disabled?: boolean;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
  className = '',
  pullThreshold = 65,
  disabled = false,
}) => {
  const [pullDistance, setPullDistance] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [showSuccess, setShowSuccess] = useState<boolean>(false);
  const [hasReachedThreshold, setHasReachedThreshold] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const startYRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);
  const thresholdCrossedSoundPlayed = useRef<boolean>(false);

  const getScrollParent = (node: HTMLElement | null): HTMLElement | null => {
    let current = node?.parentElement;
    while (current) {
      const overflowY = window.getComputedStyle(current).overflowY;
      if (overflowY === 'auto' || overflowY === 'scroll') {
        return current;
      }
      current = current.parentElement;
    }
    return document.documentElement;
  };

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (disabled || isRefreshing) return;

    const scrollParent = getScrollParent(containerRef.current);
    const scrollTop = scrollParent ? scrollParent.scrollTop : window.scrollY;

    // Only allow pulling down if we are at the very top of the scroll container
    if (scrollTop <= 1) {
      isDraggingRef.current = true;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      startYRef.current = clientY;
      thresholdCrossedSoundPlayed.current = false;
    }
  };

  const handleTouchMove = useCallback(
    (e: TouchEvent | MouseEvent) => {
      if (!isDraggingRef.current || isRefreshing || disabled) return;

      const scrollParent = getScrollParent(containerRef.current);
      const scrollTop = scrollParent ? scrollParent.scrollTop : window.scrollY;

      if (scrollTop > 1) {
        // If user scrolled down inside the element, cancel pull-to-refresh
        isDraggingRef.current = false;
        setPullDistance(0);
        return;
      }

      const clientY = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;
      const rawDiff = clientY - startYRef.current;

      if (rawDiff > 0) {
        // Apply damping log curve for pleasant elastic feel
        const damped = Math.min(rawDiff * 0.45, pullThreshold * 1.5);
        setPullDistance(damped);

        if (damped >= pullThreshold) {
          if (!hasReachedThreshold) {
            setHasReachedThreshold(true);
            if (!thresholdCrossedSoundPlayed.current) {
              sound.playButtonClick();
              thresholdCrossedSoundPlayed.current = true;
            }
          }
        } else {
          if (hasReachedThreshold) {
            setHasReachedThreshold(false);
            thresholdCrossedSoundPlayed.current = false;
          }
        }
      } else {
        setPullDistance(0);
      }
    },
    [disabled, isRefreshing, pullThreshold, hasReachedThreshold]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    if (pullDistance >= pullThreshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(pullThreshold * 0.85); // Snap to refreshing position

      try {
        await Promise.resolve(onRefresh());
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          setPullDistance(0);
          setIsRefreshing(false);
          setHasReachedThreshold(false);
        }, 600);
      } catch {
        setPullDistance(0);
        setIsRefreshing(false);
        setHasReachedThreshold(false);
      }
    } else {
      setPullDistance(0);
      setHasReachedThreshold(false);
    }
  }, [pullDistance, pullThreshold, isRefreshing, onRefresh]);

  useEffect(() => {
    const handleWindowTouchMove = (e: TouchEvent) => handleTouchMove(e);
    const handleWindowTouchEnd = () => handleTouchEnd();
    const handleWindowMouseMove = (e: MouseEvent) => handleTouchMove(e);
    const handleWindowMouseUp = () => handleTouchEnd();

    window.addEventListener('touchmove', handleWindowTouchMove, { passive: true });
    window.addEventListener('touchend', handleWindowTouchEnd);
    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);

    return () => {
      window.removeEventListener('touchmove', handleWindowTouchMove);
      window.removeEventListener('touchend', handleWindowTouchEnd);
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [handleTouchMove, handleTouchEnd]);

  // Calculate rotation & scale
  const rotationDeg = Math.min((pullDistance / pullThreshold) * 360, 360);
  const opacity = Math.min(pullDistance / (pullThreshold * 0.6), 1);
  const scale = Math.min(0.6 + (pullDistance / pullThreshold) * 0.4, 1.05);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onMouseDown={handleTouchStart}
      className={`relative w-full ${className}`}
    >
      {/* Pull-to-Refresh Indicator Banner */}
      <div
        style={{
          height: `${pullDistance}px`,
          opacity: pullDistance > 4 ? opacity : 0,
          transition: isDraggingRef.current ? 'none' : 'height 0.25s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.2s ease',
        }}
        className="w-full flex items-center justify-center overflow-hidden pointer-events-none select-none"
      >
        <div
          style={{ transform: `scale(${scale})` }}
          className={`px-4 py-1.5 rounded-full border shadow-xl flex items-center gap-2 transition-colors duration-200 ${
            showSuccess
              ? 'bg-emerald-950/90 border-emerald-500/60 text-emerald-400 shadow-emerald-950/50'
              : hasReachedThreshold || isRefreshing
              ? 'bg-neutral-900/95 border-amber-500/70 text-amber-300 shadow-amber-950/60'
              : 'bg-neutral-900/80 border-white/15 text-neutral-400'
          }`}
        >
          {showSuccess ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
              <span className="text-[11px] font-bold text-emerald-300">ডেটা সিঙ্ক হয়েছে! (Updated)</span>
            </>
          ) : isRefreshing ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
              <span className="text-[11px] font-bold text-amber-300">সিঙ্কিং হচ্ছে... (Syncing)</span>
            </>
          ) : hasReachedThreshold ? (
            <>
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span className="text-[11px] font-bold text-amber-300">ছেড়ে দিন রিফ্রেশ হবে (Release)</span>
            </>
          ) : (
            <>
              <RefreshCw
                style={{ transform: `rotate(${rotationDeg}deg)` }}
                className="w-3.5 h-3.5 text-neutral-400 transition-transform"
              />
              <span className="text-[11px] font-medium text-neutral-300">টেনে রিফ্রেশ করুন (Pull to refresh)</span>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div
        style={{
          transform: pullDistance > 0 ? `translateY(${Math.min(pullDistance * 0.2, 16)}px)` : 'none',
          transition: isDraggingRef.current ? 'none' : 'transform 0.25s cubic-bezier(0.2, 0.9, 0.3, 1)',
        }}
      >
        {children}
      </div>
    </div>
  );
};
