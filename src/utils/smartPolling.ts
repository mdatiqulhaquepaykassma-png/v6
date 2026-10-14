import { useEffect, useRef, useCallback } from 'react';

/**
 * Checks if current document/tab is visible to user
 */
export function isPageVisible(): boolean {
  if (typeof document === 'undefined') return true;
  return !document.hidden;
}

/**
 * Smart Polling Hook
 * - Pauses polling automatically when tab is hidden or in background.
 * - Immediately triggers a refresh when tab returns to foreground.
 * - Supports custom active/idle intervals and conditional enabling.
 */
export function useSmartInterval(
  callback: () => any,
  delay: number | null,
  options?: {
    enabled?: boolean;
    immediateOnForeground?: boolean;
    idleMultiplier?: number;
  }
) {
  const {
    enabled = true,
    immediateOnForeground = true,
    idleMultiplier = 1,
  } = options || {};

  const savedCallback = useRef(callback);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isVisibleRef = useRef<boolean>(true);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  const execute = useCallback(() => {
    if (savedCallback.current && isVisibleRef.current) {
      savedCallback.current();
    }
  }, []);

  useEffect(() => {
    if (!enabled || delay === null || delay <= 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const handleVisibilityChange = () => {
      const isVisible = isPageVisible();
      isVisibleRef.current = isVisible;

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      if (isVisible) {
        if (immediateOnForeground) {
          execute();
        }
        timerRef.current = setInterval(execute, delay);
      } else if (idleMultiplier > 1) {
        // Run at much lower frequency in background if allowed, or stay paused
        timerRef.current = setInterval(execute, delay * idleMultiplier);
      }
    };

    isVisibleRef.current = isPageVisible();
    if (isVisibleRef.current) {
      timerRef.current = setInterval(execute, delay);
    } else if (idleMultiplier > 1) {
      timerRef.current = setInterval(execute, delay * idleMultiplier);
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [delay, enabled, immediateOnForeground, idleMultiplier, execute]);
}

/**
 * In-memory client ETag store for smart network request compression
 */
const eTagCache = new Map<string, { etag: string; data: any; timestamp: number }>();

/**
 * Smart fetch that automatically leverages ETags / 304 Not Modified
 * to eliminate bandwidth on unchanged data payloads.
 */
export async function smartFetch<T = any>(
  url: string,
  options?: RequestInit & { maxAgeMs?: number }
): Promise<{ data: T; status: number; fromCache: boolean }> {
  const cached = eTagCache.get(url);
  const maxAge = options?.maxAgeMs ?? 2000;

  // If cached within maxAge and page is backgrounded, return cache directly
  if (cached && !isPageVisible() && Date.now() - cached.timestamp < maxAge * 3) {
    return { data: cached.data as T, status: 200, fromCache: true };
  }

  const headers = new Headers(options?.headers || {});
  if (cached?.etag) {
    headers.set('If-None-Match', cached.etag);
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (res.status === 304 && cached) {
      return { data: cached.data as T, status: 304, fromCache: true };
    }

    if (res.ok) {
      const etag = res.headers.get('ETag') || res.headers.get('etag');
      const data = await res.json();
      if (etag) {
        eTagCache.set(url, { etag, data, timestamp: Date.now() });
      }
      return { data, status: res.status, fromCache: false };
    }

    throw new Error(`Request failed with status ${res.status}`);
  } catch (err) {
    if (cached) {
      return { data: cached.data as T, status: 200, fromCache: true };
    }
    throw err;
  }
}
