'use client';

import { useEffect, useState } from 'react';

/**
 * useState backed by localStorage. Only call this from components that render
 * on the client (AppShell gates the app until hydration), so the initial read is safe.
 * `override`, when given, wins over the stored value for the first render (and is then saved).
 */
export function usePersistentState<T>(key: string, fallback: T, override?: T) {
  const [value, setValue] = useState<T>(() => {
    if (override !== undefined) return override;
    try {
      const saved = localStorage.getItem(key);
      if (saved !== null) return JSON.parse(saved) as T;
    } catch {
      // Missing or corrupted storage
    }
    return fallback;
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage full or unavailable
    }
  }, [key, value]);

  return [value, setValue] as const;
}
