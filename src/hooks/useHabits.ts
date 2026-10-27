'use client';

import { useState, useEffect, useSyncExternalStore, useCallback } from 'react';
import { Habit } from '../types';
import { withLog } from '../lib/habitUtils';

const STORAGE_KEY = 'habits-v2';
const emptySubscribe = () => () => {};

export function useHabits() {
  const isLoaded = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const [habits, setHabits] = useState<Habit[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) return JSON.parse(saved);
      } catch {
        // Fallback for corrupted storage
      }
    }
    return [];
  });

  // Save to localStorage whenever habits change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
    }
  }, [habits, isLoaded]);

  const addHabit = useCallback((newHabit: Habit) => {
    setHabits(prev => [...prev, newHabit]);
  }, []);

  const updateHabit = useCallback((updatedHabit: Habit) => {
    setHabits(prev => prev.map(h => h.id === updatedHabit.id ? updatedHabit : h));
  }, []);

  const deleteHabits = useCallback((ids: string[]) => {
    const idSet = new Set(ids);
    setHabits(prev => prev.filter(h => !idSet.has(h.id)));
  }, []);

  /**
   * Sets the logged amount for a given date.
   * If amount is 0 (or less), removes the log entry for that date.
   */
  const setLog = useCallback((habitId: string, logDate: string, amount: number) => {
    setHabits(prev => prev.map(h => h.id === habitId ? withLog(h, logDate, amount) : h));
  }, []);

  return {
    habits,
    addHabit,
    updateHabit,
    deleteHabits,
    setLog,
    setAllHabits: setHabits,
    isLoaded,
  };
}
