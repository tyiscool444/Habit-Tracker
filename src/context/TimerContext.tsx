'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Habit, HabitUnit } from '../types';
import { normalizeDateStr } from '../lib/habitUtils';
import { TimerTechnique, getTechniqueById, calculateFlowtimeBreak } from '../lib/timerTechniques';
import { timerSound } from '../lib/soundUtils';

export type TimerPhaseMode = 'focus' | 'break' | 'longBreak';

export interface TimerState {
  activeHabitId: string | null;
  isRunning: boolean;
  elapsedSeconds: number; // Current interval elapsed seconds
  initialTodayAmount: number; // Logged amount at start of session for activeHabitId
  startedAt: number | null; // Timestamp
  // Technique Session Attributes
  techniqueId: string | null;
  mode: TimerPhaseMode;
  targetSeconds: number | null; // null for stopwatch or open-ended flowtime
  workSeconds: number;
  breakSeconds: number;
  longBreakSeconds: number;
  cycle: number;
  totalFocusSecondsLogged: number; // Accumulated focus seconds logged during this entire session
}

export interface StartTechniqueParams {
  technique: TimerTechnique;
  habitId?: string | null;
  customWorkMinutes?: number;
  customBreakMinutes?: number;
}

interface TimerContextValue {
  timerState: TimerState;
  activeHabitId: string | null;
  activeHabit: Habit | null;
  activeTechnique: TimerTechnique | null;
  isRunning: boolean;
  mode: TimerPhaseMode;
  cycle: number;
  elapsedSeconds: number;
  targetSeconds: number | null;
  remainingSeconds: number;
  progressPercent: number; // 0 to 100
  soundEnabled: boolean;
  // Actions
  startTimer: (habit: Habit) => void;
  startTechniqueTimer: (params: StartTechniqueParams) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => void;
  resetTimer: () => void;
  skipToNextPhase: () => void;
  addSeconds: (seconds: number) => void;
  formatTime: (totalSeconds: number) => string;
  isHabitTimerActive: (habitId: string) => boolean;
  toggleSound: () => void;
  takeFlowtimeBreak: () => void;
}

const TimerContext = createContext<TimerContextValue | null>(null);

const STORAGE_KEY = 'habitthat_active_timer_v2';

export function TimerProvider({
  children,
  habits,
  setLog,
}: {
  children: React.ReactNode;
  habits: Habit[];
  setLog: (habitId: string, dateStr: string, amount: number) => void;
}) {
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(() => {
    return timerSound.isEnabled();
  });

  const [timerState, setTimerState] = useState<TimerState>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed: TimerState = JSON.parse(saved);
          if (parsed.activeHabitId || parsed.techniqueId) {
            if (parsed.isRunning && parsed.startedAt) {
              const now = Date.now();
              const additionalSec = Math.floor((now - parsed.startedAt) / 1000);
              parsed.elapsedSeconds += additionalSec;
              parsed.startedAt = now;
            }
            return parsed;
          }
        }
      } catch {
        // Fallback for corrupted timer state
      }
    }
    return {
      activeHabitId: null,
      isRunning: false,
      elapsedSeconds: 0,
      initialTodayAmount: 0,
      startedAt: null,
      techniqueId: null,
      mode: 'focus',
      targetSeconds: null,
      workSeconds: 25 * 60,
      breakSeconds: 5 * 60,
      longBreakSeconds: 20 * 60,
      cycle: 1,
      totalFocusSecondsLogged: 0,
    };
  });

  const habitsRef = useRef(habits);
  const setLogRef = useRef(setLog);

  useEffect(() => {
    habitsRef.current = habits;
    setLogRef.current = setLog;
  }, [habits, setLog]);

  // Persist timer state to localStorage
  useEffect(() => {
    try {
      if (timerState.activeHabitId || timerState.techniqueId) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(timerState));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Ignore storage write issues
    }
  }, [timerState]);

  // Convert elapsed seconds into the habit's unit value (only applies to minute and hourly habits)
  const convertSecondsToUnitAmount = useCallback((seconds: number, unit: HabitUnit): number => {
    switch (unit) {
      case 'minutes':
        return Math.floor(((seconds / 60) + 1e-9) * 100) / 100;
      case 'hours':
        return Math.floor(((seconds / 3600) + 1e-9) * 100) / 100;
      default:
        return 0;
    }
  }, []);

  // Sync with habit log (only applies to minute/hourly habits)
  const syncToHabitLog = useCallback((habitId: string, focusSec: number, baseAmount: number) => {
    const habit = habitsRef.current.find(h => h.id === habitId);
    if (!habit) return;
    if (habit.unit !== 'hours' && habit.unit !== 'minutes') return;

    const logDateStr = habit.isRecurring === false
      ? (habit.targetDate || habit.startDate || normalizeDateStr(new Date()))
      : normalizeDateStr(new Date());

    const addedAmount = convertSecondsToUnitAmount(focusSec, habit.unit);
    const newTotal = Math.floor(((baseAmount + addedAmount) + 1e-9) * 100) / 100;

    setLogRef.current(habitId, logDateStr, newTotal);
  }, [convertSecondsToUnitAmount]);

  // Main 1-second ticker loop with wall-clock drift compensation
  useEffect(() => {
    if (!timerState.isRunning || (!timerState.activeHabitId && !timerState.techniqueId)) return;

    const interval = setInterval(() => {
      setTimerState(prev => {
        if (!prev.isRunning) return prev;

        const now = Date.now();
        // Calculate real elapsed delta to prevent tab-throttle lag
        const deltaSec = prev.startedAt ? Math.max(1, Math.min(60, Math.floor((now - prev.startedAt) / 1000))) : 1;
        const nextElapsed = prev.elapsedSeconds + deltaSec;
        const activeTechnique = prev.techniqueId ? getTechniqueById(prev.techniqueId) : null;

        // If in focus mode, sync focus time to habit
        if (prev.mode === 'focus' && prev.activeHabitId) {
          const totalFocusSec = prev.totalFocusSecondsLogged + nextElapsed;
          syncToHabitLog(prev.activeHabitId, totalFocusSec, prev.initialTodayAmount);
        }

        // Check if countdown target has completed (for non-flowtime / bounded intervals)
        if (prev.targetSeconds !== null && nextElapsed >= prev.targetSeconds) {
          if (prev.mode === 'focus') {
            // Focus period completed!
            timerSound.playFocusComplete();

            const accumulatedFocus = prev.totalFocusSecondsLogged + prev.targetSeconds;
            if (prev.activeHabitId) {
              syncToHabitLog(prev.activeHabitId, accumulatedFocus, prev.initialTodayAmount);
            }

            const cyclesBeforeLongBreak = activeTechnique?.cyclesBeforeLongBreak || 4;
            const isLongBreak = prev.cycle % cyclesBeforeLongBreak === 0;
            const hasBreak = (prev.breakSeconds > 0);

            if (hasBreak) {
              return {
                ...prev,
                mode: isLongBreak ? 'longBreak' : 'break',
                targetSeconds: isLongBreak ? prev.longBreakSeconds : prev.breakSeconds,
                elapsedSeconds: 0,
                totalFocusSecondsLogged: accumulatedFocus,
                startedAt: now,
              };
            } else {
              // Techniques without break (e.g. 2-minute kickstart) complete and pause
              return {
                ...prev,
                isRunning: false,
                elapsedSeconds: prev.targetSeconds,
                totalFocusSecondsLogged: accumulatedFocus,
                startedAt: null,
              };
            }
          } else {
            // Break period completed!
            timerSound.playBreakComplete();

            return {
              ...prev,
              mode: 'focus',
              cycle: prev.cycle + 1,
              targetSeconds: prev.workSeconds,
              elapsedSeconds: 0,
              startedAt: now,
            };
          }
        }

        return {
          ...prev,
          elapsedSeconds: nextElapsed,
          startedAt: now,
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerState.isRunning, timerState.activeHabitId, timerState.techniqueId, syncToHabitLog]);

  // Start classic habit stopwatch timer
  const startTimer = useCallback((habit: Habit) => {
    const logDateStr = habit.isRecurring === false
      ? (habit.targetDate || habit.startDate || normalizeDateStr(new Date()))
      : normalizeDateStr(new Date());
    const currentTodayAmount = habit.logs[logDateStr] || 0;

    setTimerState({
      activeHabitId: habit.id,
      isRunning: true,
      elapsedSeconds: 0,
      initialTodayAmount: currentTodayAmount,
      startedAt: Date.now(),
      techniqueId: 'custom',
      mode: 'focus',
      targetSeconds: null,
      workSeconds: 0,
      breakSeconds: 0,
      longBreakSeconds: 0,
      cycle: 1,
      totalFocusSecondsLogged: 0,
    });
  }, []);

  // Start study timer technique session
  const startTechniqueTimer = useCallback(({
    technique,
    habitId = null,
    customWorkMinutes,
    customBreakMinutes,
  }: StartTechniqueParams) => {
    const workMin = customWorkMinutes ?? technique.workMinutes;
    const breakMin = customBreakMinutes ?? technique.breakMinutes;
    const longBreakMin = technique.longBreakMinutes ?? Math.max(15, breakMin * 3);

    let initialToday = 0;
    if (habitId) {
      const h = habitsRef.current.find(item => item.id === habitId);
      if (h) {
        const logDateStr = h.isRecurring === false
          ? (h.targetDate || h.startDate || normalizeDateStr(new Date()))
          : normalizeDateStr(new Date());
        initialToday = h.logs[logDateStr] || 0;
      }
    }

    timerSound.playClick();

    setTimerState({
      activeHabitId: habitId,
      isRunning: true,
      elapsedSeconds: 0,
      initialTodayAmount: initialToday,
      startedAt: Date.now(),
      techniqueId: technique.id,
      mode: 'focus',
      targetSeconds: technique.isFlowtime ? null : workMin * 60,
      workSeconds: workMin * 60,
      breakSeconds: breakMin * 60,
      longBreakSeconds: longBreakMin * 60,
      cycle: 1,
      totalFocusSecondsLogged: 0,
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
      const additionalFocus = timerState.mode === 'focus' ? timerState.elapsedSeconds : 0;
      const totalFocus = timerState.totalFocusSecondsLogged + additionalFocus;
      syncToHabitLog(timerState.activeHabitId, totalFocus, timerState.initialTodayAmount);
    }
    setTimerState({
      activeHabitId: null,
      isRunning: false,
      elapsedSeconds: 0,
      initialTodayAmount: 0,
      startedAt: null,
      techniqueId: null,
      mode: 'focus',
      targetSeconds: null,
      workSeconds: 25 * 60,
      breakSeconds: 5 * 60,
      longBreakSeconds: 20 * 60,
      cycle: 1,
      totalFocusSecondsLogged: 0,
    });
    localStorage.removeItem(STORAGE_KEY);
  }, [timerState, syncToHabitLog]);

  const resetTimer = useCallback(() => {
    setTimerState(prev => {
      // Revert habit sync back to previously logged cycle total
      if (prev.mode === 'focus' && prev.activeHabitId) {
        syncToHabitLog(prev.activeHabitId, prev.totalFocusSecondsLogged, prev.initialTodayAmount);
      }
      return {
        ...prev,
        elapsedSeconds: 0,
        startedAt: prev.isRunning ? Date.now() : null,
      };
    });
  }, [syncToHabitLog]);

  const skipToNextPhase = useCallback(() => {
    setTimerState(prev => {
      const activeTechnique = prev.techniqueId ? getTechniqueById(prev.techniqueId) : null;
      if (prev.mode === 'focus') {
        timerSound.playFocusComplete();
        const focusDuration = prev.targetSeconds ? Math.min(prev.elapsedSeconds, prev.targetSeconds) : prev.elapsedSeconds;
        const accumulatedFocus = prev.totalFocusSecondsLogged + focusDuration;
        if (prev.activeHabitId) {
          syncToHabitLog(prev.activeHabitId, accumulatedFocus, prev.initialTodayAmount);
        }

        const cyclesBeforeLongBreak = activeTechnique?.cyclesBeforeLongBreak || 4;
        const isLongBreak = prev.cycle % cyclesBeforeLongBreak === 0;

        return {
          ...prev,
          mode: isLongBreak ? 'longBreak' : 'break',
          targetSeconds: isLongBreak ? prev.longBreakSeconds : (prev.breakSeconds || 5 * 60),
          elapsedSeconds: 0,
          totalFocusSecondsLogged: accumulatedFocus,
          startedAt: prev.isRunning ? Date.now() : null,
        };
      } else {
        timerSound.playBreakComplete();
        return {
          ...prev,
          mode: 'focus',
          cycle: prev.cycle + 1,
          targetSeconds: prev.workSeconds,
          elapsedSeconds: 0,
          startedAt: prev.isRunning ? Date.now() : null,
        };
      }
    });
  }, [syncToHabitLog]);

  const takeFlowtimeBreak = useCallback(() => {
    setTimerState(prev => {
      const focusMins = Math.max(1, Math.round(prev.elapsedSeconds / 60));
      const breakMins = calculateFlowtimeBreak(focusMins);
      timerSound.playFocusComplete();

      const accumulated = prev.totalFocusSecondsLogged + prev.elapsedSeconds;
      if (prev.activeHabitId) {
        syncToHabitLog(prev.activeHabitId, accumulated, prev.initialTodayAmount);
      }

      return {
        ...prev,
        mode: 'break',
        targetSeconds: breakMins * 60,
        elapsedSeconds: 0,
        totalFocusSecondsLogged: accumulated,
        startedAt: prev.isRunning ? Date.now() : null,
      };
    });
  }, [syncToHabitLog]);

  // Add seconds: extends countdown target when targetSeconds exists, or adds elapsed time in stopwatch
  const addSeconds = useCallback((additionalSec: number) => {
    setTimerState(prev => {
      if (prev.targetSeconds !== null) {
        const newTarget = Math.max(prev.elapsedSeconds + 1, prev.targetSeconds + additionalSec);
        return {
          ...prev,
          targetSeconds: newTarget,
        };
      } else {
        const newSec = Math.max(0, prev.elapsedSeconds + additionalSec);
        if (prev.mode === 'focus' && prev.activeHabitId) {
          syncToHabitLog(prev.activeHabitId, prev.totalFocusSecondsLogged + newSec, prev.initialTodayAmount);
        }
        return {
          ...prev,
          elapsedSeconds: newSec,
        };
      }
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

  const toggleSound = useCallback(() => {
    const nextVal = !soundEnabled;
    setSoundEnabledState(nextVal);
    timerSound.setEnabled(nextVal);
  }, [soundEnabled]);

  const activeHabit = habits.find(h => h.id === timerState.activeHabitId) || null;
  const activeTechnique = timerState.techniqueId ? getTechniqueById(timerState.techniqueId) || null : null;

  // Calculate remaining seconds and progress percentage
  const remainingSeconds = timerState.targetSeconds !== null
    ? Math.max(0, timerState.targetSeconds - timerState.elapsedSeconds)
    : timerState.elapsedSeconds;

  let progressPercent = 0;
  if (timerState.targetSeconds !== null && timerState.targetSeconds > 0) {
    progressPercent = Math.min(100, Math.round((timerState.elapsedSeconds / timerState.targetSeconds) * 100));
  } else {
    // For flowtime / stopwatch, pulse or show minute progress
    progressPercent = (timerState.elapsedSeconds % 60) / 60 * 100;
  }

  return (
    <TimerContext.Provider
      value={{
        timerState,
        activeHabitId: timerState.activeHabitId,
        activeHabit,
        activeTechnique,
        isRunning: timerState.isRunning,
        mode: timerState.mode,
        cycle: timerState.cycle,
        elapsedSeconds: timerState.elapsedSeconds,
        targetSeconds: timerState.targetSeconds,
        remainingSeconds,
        progressPercent,
        soundEnabled,
        startTimer,
        startTechniqueTimer,
        pauseTimer,
        resumeTimer,
        stopTimer,
        resetTimer,
        skipToNextPhase,
        addSeconds,
        formatTime,
        isHabitTimerActive,
        toggleSound,
        takeFlowtimeBreak,
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
