'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Habit, HabitUnit } from '../types';
import { normalizeDateStr } from '../lib/habitUtils';

export interface TimerState {
  activeHabitId: string | null;
  isRunning: boolean;
  elapsedSeconds: number; // Session elapsed seconds
  initialTodayAmount: number; // Logged amount at timer start
  startedAt: number | null; // Timestamp
}

interface TimerContextValue {
  timerState: TimerState;
  activeHabitId: string | null;
  isRunning: boolean;
  elapsedSeconds: number;
  startTimer: (habit: Habit) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => void;
  resetTimer: () => void;
  addSeconds: (seconds: number) => void;
  formatTime: (totalSeconds: number) => string;
  isHabitTimerActive: (habitId: string) => boolean;
}

const TimerContext = createContext<TimerContextValue | null>(null);

const STORAGE_KEY = 'habitthat_active_timer_v1';

export function TimerProvider({
  children,
  habits,
  setLog,
}: {
  children: React.ReactNode;
  habits: Habit[];
  setLog: (habitId: string, dateStr: string, amount: number) => void;
}) {
  const [timerState, setTimerState] = useState<TimerState>({
    activeHabitId: null,
    isRunning: false,
    elapsedSeconds: 0,
    initialTodayAmount: 0,
    startedAt: null,
  });

  const habitsRef = useRef(habits);
  habitsRef.current = habits;

  const setLogRef = useRef(setLog);
  setLogRef.current = setLog;

  // Restore active timer from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: TimerState = JSON.parse(saved);
        if (parsed.activeHabitId) {
          // If it was running when closed, compute elapsed catch-up time
          if (parsed.isRunning && parsed.startedAt) {
            const now = Date.now();
            const additionalSec = Math.floor((now - parsed.startedAt) / 1000);
            parsed.elapsedSeconds += additionalSec;
            parsed.startedAt = now;
          }
          setTimerState(parsed);
        }
      }
    } catch (e) {
      console.error('Failed to load active timer', e);
    }
  }, []);

  // Persist timer state to localStorage
  useEffect(() => {
    try {
      if (timerState.activeHabitId) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(timerState));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      console.error('Failed to persist timer', e);
    }
  }, [timerState]);

  // Convert elapsed seconds into the habit's unit value (round down to 2 decimals)
  const convertSecondsToUnitAmount = useCallback((seconds: number, unit: HabitUnit): number => {
    switch (unit) {
      case 'seconds':
        return seconds;
      case 'minutes':
        // Return fractional minutes rounded down to 2 decimals
        return Math.floor(((seconds / 60) + 1e-9) * 100) / 100;
      case 'hours':
        // Return fractional hours rounded down to 2 decimals
        return Math.floor(((seconds / 3600) + 1e-9) * 100) / 100;
      default:
        return Math.floor(((seconds / 60) + 1e-9) * 100) / 100;
    }
  }, []);

  // Sync with today's habit log
  const syncToHabitLog = useCallback((habitId: string, sessionSec: number, baseAmount: number) => {
    const habit = habitsRef.current.find(h => h.id === habitId);
    if (!habit) return;

    const todayStr = normalizeDateStr(new Date());
    const addedAmount = convertSecondsToUnitAmount(sessionSec, habit.unit);
    const newTotal = Math.floor(((baseAmount + addedAmount) + 1e-9) * 100) / 100;

    setLogRef.current(habitId, todayStr, newTotal);
  }, [convertSecondsToUnitAmount]);

  // Main 1-second ticker loop
  useEffect(() => {
    if (!timerState.isRunning || !timerState.activeHabitId) return;

    const interval = setInterval(() => {
      setTimerState(prev => {
        if (!prev.isRunning || !prev.activeHabitId) return prev;
        const newSec = prev.elapsedSeconds + 1;

        // Sync to habit log
        syncToHabitLog(prev.activeHabitId, newSec, prev.initialTodayAmount);

        return {
          ...prev,
          elapsedSeconds: newSec,
          startedAt: Date.now(),
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerState.isRunning, timerState.activeHabitId, syncToHabitLog]);

  const startTimer = useCallback((habit: Habit) => {
    const todayStr = normalizeDateStr(new Date());
    const currentTodayAmount = habit.logs[todayStr] || 0;

    setTimerState({
      activeHabitId: habit.id,
      isRunning: true,
      elapsedSeconds: 0,
      initialTodayAmount: currentTodayAmount,
      startedAt: Date.now(),
    });
  }, []);

  const pauseTimer = useCallback(() => {
    setTimerState(prev => ({
      ...prev,
      isRunning: false,
      startedAt: null,
    }));
  }, []);

  const resumeTimer = useCallback(() => {
    setTimerState(prev => ({
      ...prev,
      isRunning: true,
      startedAt: Date.now(),
    }));
  }, []);

  const stopTimer = useCallback(() => {
    if (timerState.activeHabitId) {
      syncToHabitLog(timerState.activeHabitId, timerState.elapsedSeconds, timerState.initialTodayAmount);
    }
    setTimerState({
      activeHabitId: null,
      isRunning: false,
      elapsedSeconds: 0,
      initialTodayAmount: 0,
      startedAt: null,
    });
    localStorage.removeItem(STORAGE_KEY);
  }, [timerState, syncToHabitLog]);

  const resetTimer = useCallback(() => {
    if (timerState.activeHabitId) {
      const todayStr = normalizeDateStr(new Date());
      setLogRef.current(timerState.activeHabitId, todayStr, timerState.initialTodayAmount);
    }
    setTimerState(prev => ({
      ...prev,
      elapsedSeconds: 0,
      startedAt: prev.isRunning ? Date.now() : null,
    }));
  }, [timerState]);

  const addSeconds = useCallback((additionalSec: number) => {
    setTimerState(prev => {
      if (!prev.activeHabitId) return prev;
      const newSec = Math.max(0, prev.elapsedSeconds + additionalSec);
      syncToHabitLog(prev.activeHabitId, newSec, prev.initialTodayAmount);
      return {
        ...prev,
        elapsedSeconds: newSec,
      };
    });
  }, [syncToHabitLog]);

  const formatTime = useCallback((totalSeconds: number): string => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    const pad = (n: number) => n.toString().padStart(2, '0');

    if (hrs > 0) {
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  }, []);

  const isHabitTimerActive = useCallback((habitId: string) => {
    return timerState.activeHabitId === habitId && timerState.isRunning;
  }, [timerState.activeHabitId, timerState.isRunning]);

  return (
    <TimerContext.Provider
      value={{
        timerState,
        activeHabitId: timerState.activeHabitId,
        isRunning: timerState.isRunning,
        elapsedSeconds: timerState.elapsedSeconds,
        startTimer,
        pauseTimer,
        resumeTimer,
        stopTimer,
        resetTimer,
        addSeconds,
        formatTime,
        isHabitTimerActive,
      }}
    >
      {children}
    </TimerContext.Provider>
  );
}

export function useHabitTimer() {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('useHabitTimer must be used within a TimerProvider');
  }
  return context;
}
