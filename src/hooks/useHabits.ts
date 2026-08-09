'use client';

import { useState, useEffect } from 'react';
import { Habit } from '../types';

export function useHabits() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('habits-v2');
    if (saved) {
      try {
        setHabits(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse habits', e);
      }
    }
    setIsLoaded(true);
  }, []);

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

  return { habits, addHabit, updateHabit, deleteHabit, setLog, isLoaded };
}
