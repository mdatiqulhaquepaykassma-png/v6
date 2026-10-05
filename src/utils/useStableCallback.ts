import { useRef, useCallback, useLayoutEffect, useEffect } from 'react';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Custom React hook that returns a referentially stable callback function.
 * It always delegates to the latest version of the provided callback without
 * altering its function identity across renders, preventing unwanted re-renders
 * of React.memo components.
 */
export function useStableCallback<T extends (...args: any[]) => any>(callback: T | undefined | null): T {
  const callbackRef = useRef<T | undefined | null>(callback);

  useIsomorphicLayoutEffect(() => {
    callbackRef.current = callback;
  });

  return useCallback(((...args: any[]) => {
    return callbackRef.current?.(...args);
  }) as T, []);
}

export default useStableCallback;
