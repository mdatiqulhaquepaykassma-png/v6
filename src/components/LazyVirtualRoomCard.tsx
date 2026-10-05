import React, { useState, useEffect, useRef } from 'react';
import { P2PRoomCard, P2PRoomCardProps } from './P2PRoomCard';

// Singleton IntersectionObserver to avoid multiple observer overhead across hundreds of rooms
type ObserverCallback = (isIntersecting: boolean) => void;
const observerCallbacks = new Map<Element, ObserverCallback>();

let sharedObserver: IntersectionObserver | null = null;

function getSharedObserver(): IntersectionObserver | null {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
    return null;
  }

  if (!sharedObserver) {
    sharedObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const callback = observerCallbacks.get(entry.target);
          if (callback) {
            callback(entry.isIntersecting);
          }
        }
      },
      {
        root: null, // Viewport
        rootMargin: '350px 0px 350px 0px', // Buffer 350px above/below for zero-jank scrolling
        threshold: 0,
      }
    );
  }

  return sharedObserver;
}

export const LazyVirtualRoomCard = React.memo<P2PRoomCardProps>((props) => {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = getSharedObserver();
    if (!observer) {
      // Fallback if IntersectionObserver is unsupported
      setIsVisible(true);
      return;
    }

    const onIntersection: ObserverCallback = (intersecting) => {
      setIsVisible(intersecting);
    };

    observerCallbacks.set(el, onIntersection);
    observer.observe(el);

    return () => {
      observerCallbacks.delete(el);
      observer.unobserve(el);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="min-h-[76px] transition-all"
      style={{
        contentVisibility: 'auto',
        containIntrinsicSize: '0 76px',
      }}
    >
      {isVisible ? (
        <P2PRoomCard {...props} />
      ) : (
        <div className="bg-neutral-950/60 border border-neutral-900/60 p-3.5 sm:p-4 rounded-2xl flex items-center justify-between min-h-[76px] animate-pulse">
          <div className="space-y-2 w-2/3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-neutral-800" />
              <div className="w-28 h-3.5 rounded-md bg-neutral-800/80" />
              <div className="w-16 h-3 rounded-full bg-neutral-800/60" />
            </div>
            <div className="flex items-center gap-2">
              <div className="w-36 h-3 rounded-md bg-neutral-800/50" />
            </div>
          </div>
          <div className="w-20 h-8 rounded-xl bg-neutral-800/70" />
        </div>
      )}
    </div>
  );
});

LazyVirtualRoomCard.displayName = 'LazyVirtualRoomCard';
