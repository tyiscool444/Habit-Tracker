'use client';

import { createContext, useCallback, useContext, useMemo } from 'react';
import { Habit } from '../types';
import { withLog } from '../lib/habitUtils';
import { usePersistentState } from '../hooks/usePersistentState';

interface HabitsContextValue {
  habits: Habit[];
  addHabit: (habit: Habit) => void;
  updateHabit: (habit: Habit) => void;
  deleteHabits: (ids: string[]) => void;
  /** Sets the logged amount for a date; 0 or less removes the entry. */
  setLog: (habitId: string, logDate: string, amount: number) => void;
  setAllHabits: (habits: Habit[]) => void;
}

const HabitsContext = createContext<HabitsContextValue | null>(null);

/** Single source of habit data for every page, persisted to localStorage. */
export function HabitsProvider({ children }: { children: React.ReactNode }) {
  const [habits, setHabits] = usePersistentState<Habit[]>('habits-v2', []);

  const addHabit = useCallback((newHabit: Habit) => {
    setHabits(prev => [...prev, newHabit]);
  }, [setHabits]);

  const updateHabit = useCallback((updatedHabit: Habit) => {
    setHabits(prev => prev.map(h => h.id === updatedHabit.id ? updatedHabit : h));
  }, [setHabits]);

  const deleteHabits = useCallback((ids: string[]) => {
    const idSet = new Set(ids);
    setHabits(prev => prev.filter(h => !idSet.has(h.id)));
  }, [setHabits]);

  const setLog = useCallback((habitId: string, logDate: string, amount: number) => {
    setHabits(prev => prev.map(h => h.id === habitId ? withLog(h, logDate, amount) : h));
  }, [setHabits]);

  const value = useMemo(
    () => ({ habits, addHabit, updateHabit, deleteHabits, setLog, setAllHabits: setHabits }),
    [habits, addHabit, updateHabit, deleteHabits, setLog, setHabits]
  );

  return <HabitsContext.Provider value={value}>{children}</HabitsContext.Provider>;
}

export function useHabits() {
  const context = useContext(HabitsContext);
  if (!context) throw new Error('useHabits must be used within a HabitsProvider');
  return context;
}
