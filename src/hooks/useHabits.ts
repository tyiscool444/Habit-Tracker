'use client';

import { useState, useEffect, useSyncExternalStore } from 'react';
import { Habit } from '../types';

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
        const saved = localStorage.getItem('habits-v2');
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
      localStorage.setItem('habits-v2', JSON.stringify(habits));
    }
  }, [habits, isLoaded]);

  const addHabit = (newHabit: Habit) => {
    setHabits((prev) => [...prev, newHabit]);
  };

  const updateHabit = (updatedHabit: Habit) => {
    setHabits((prev) => prev.map(h => h.id === updatedHabit.id ? updatedHabit : h));
  };

  const deleteHabit = (id: string) => {
    setHabits((prev) => prev.filter(h => h.id !== id));
  };

  const deleteHabits = (ids: string[]) => {
    const idSet = new Set(ids);
    setHabits((prev) => prev.filter(h => !idSet.has(h.id)));
  };

  /**
   * Sets the logged amount for a given date.
   * If amount is 0 (or less), removes the log entry for that date.
   */
  const setLog = (habitId: string, logDate: string, amount: number) => {
    setHabits((prev) => prev.map(habit => {
      if (habit.id !== habitId) return habit;

      const updatedLogs = { ...habit.logs };
      if (amount <= 0) {
        delete updatedLogs[logDate];
      } else {
        updatedLogs[logDate] = amount;
      }

      return { ...habit, logs: updatedLogs };
    }));
  };

  return { habits, addHabit, updateHabit, deleteHabit, deleteHabits, setLog, isLoaded };
}
