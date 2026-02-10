import { useEffect, useRef } from 'react';

/**
 * Auto-refresh hook that calls a callback every `intervalMs` milliseconds.
 * Defaults to 5 minutes (300000ms).
 */
export function useAutoRefresh(callback: () => void, intervalMs: number = 5 * 60 * 1000, enabled: boolean = true) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => savedCallback.current(), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, enabled]);
}
