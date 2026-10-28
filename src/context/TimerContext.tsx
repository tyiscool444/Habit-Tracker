'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Habit, HabitUnit } from '../types';
import { getLogDateStr, isTimeBasedUnit, roundDown } from '../lib/habitUtils';
import { TimerTechnique, getTechniqueById, flowtimeBreakFor } from '../lib/timerTechniques';
import { timerSound } from '../lib/soundUtils';
import { useHabits } from './HabitsContext';

type TimerPhaseMode = 'focus' | 'break' | 'longBreak';

interface TimerState {
  activeHabitId: string | null;
  isRunning: boolean;
  elapsedSeconds: number; // Current interval elapsed seconds
  initialTodayAmount: number; // Logged amount at start of session for activeHabitId
  startedAt: number | null; // Wall-clock time that elapsedSeconds was last measured from
  // Technique Session Attributes
  techniqueId: string | null;
  mode: TimerPhaseMode;
  targetSeconds: number | null; // null for stopwatch or open-ended flowtime
  workSeconds: number;
  breakSeconds: number;
  longBreakSeconds: number;
  cycle: number;
  totalFocusSecondsLogged: number; // Focus seconds from completed intervals in this session
}

interface StartTechniqueParams {
  technique: TimerTechnique;
  habitId?: string | null;
  customWorkMinutes?: number;
  customBreakMinutes?: number;
}

interface TimerContextValue {
  isActive: boolean; // a session exists (running or paused)
  activeHabitId: string | null;
  activeHabit: Habit | null;
  activeTechnique: TimerTechnique | null;
  isRunning: boolean;
  mode: TimerPhaseMode;
  cycle: number;
  elapsedSeconds: number;
  targetSeconds: number | null;
  remainingSeconds: number; // countdown remaining, or elapsed for open-ended sessions
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
  toggleSound: () => void;
  takeFlowtimeBreak: () => void;
}

const TimerContext = createContext<TimerContextValue | null>(null);

const STORAGE_KEY = 'habitthat_active_timer_v2';

const IDLE_STATE: TimerState = {
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

function loadSavedState(): TimerState {
  if (typeof window === 'undefined') return IDLE_STATE;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return IDLE_STATE;
    const parsed: TimerState = JSON.parse(saved);
    if (!parsed.activeHabitId && !parsed.techniqueId) return IDLE_STATE;
    if (parsed.isRunning && parsed.startedAt) {
      const now = Date.now();
      parsed.elapsedSeconds += Math.floor((now - parsed.startedAt) / 1000);
      parsed.startedAt = now;
    }
    return parsed;
  } catch {
    return IDLE_STATE;
  }
}

function secondsToUnitAmount(seconds: number, unit: HabitUnit): number {
  if (unit === 'minutes') return roundDown(seconds / 60);
  if (unit === 'hours') return roundDown(seconds / 3600);
  return 0;
}

function initialAmountFor(habit: Habit | undefined): number {
  return habit ? habit.logs[getLogDateStr(habit)] || 0 : 0;
}

/* ---------- Pure phase transitions ---------- */

/** Banks `focusSeconds` and moves to a break (a long break every N cycles). */
function toBreak(prev: TimerState, focusSeconds: number, breakSeconds: number, now: number | null): TimerState {
  const cyclesBeforeLongBreak = getTechniqueById(prev.techniqueId ?? '')?.cyclesBeforeLongBreak || 4;
  const isLongBreak = prev.cycle % cyclesBeforeLongBreak === 0;
  return {
    ...prev,
    mode: isLongBreak ? 'longBreak' : 'break',
    targetSeconds: isLongBreak ? prev.longBreakSeconds : breakSeconds,
    elapsedSeconds: 0,
    totalFocusSecondsLogged: prev.totalFocusSecondsLogged + focusSeconds,
    startedAt: now,
  };
}

function toFocus(prev: TimerState, now: number | null): TimerState {
  return {
    ...prev,
    mode: 'focus',
    cycle: prev.cycle + 1,
    // Open-ended sessions (Flowtime) have no work length to count down
    targetSeconds: prev.workSeconds > 0 ? prev.workSeconds : null,
    elapsedSeconds: 0,
    startedAt: now,
  };
}

/** Advances the clock by real elapsed wall time so throttled background tabs stay accurate. */
function tick(prev: TimerState, now: number): TimerState {
  if (!prev.isRunning) return prev;

  const startedAt = prev.startedAt ?? now - 1000;
  const deltaSec = Math.min(60, Math.round((now - startedAt) / 1000));
  if (deltaSec <= 0) return prev;
  const elapsed = prev.elapsedSeconds + deltaSec;

  if (prev.targetSeconds === null || elapsed < prev.targetSeconds) {
    return { ...prev, elapsedSeconds: elapsed, startedAt: startedAt + deltaSec * 1000 };
  }
  if (prev.mode !== 'focus') return toFocus(prev, now);
  if (prev.breakSeconds > 0) return toBreak(prev, prev.targetSeconds, prev.breakSeconds, now);
  // Techniques without a break (e.g. 2-minute rule) stop when focus completes
  return { ...prev, isRunning: false, elapsedSeconds: prev.targetSeconds, startedAt: null };
}

/* ---------- Provider ---------- */

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const { habits, setLog } = useHabits();
  const [soundEnabled, setSoundEnabled] = useState(() => timerSound.isEnabled());
  const [timerState, setTimerState] = useState<TimerState>(loadSavedState);

  const habitsRef = useRef(habits);
  const setLogRef = useRef(setLog);
  const prevStateRef = useRef(timerState);

  useEffect(() => {
    habitsRef.current = habits;
    setLogRef.current = setLog;
  }, [habits, setLog]);

  const isActive = Boolean(timerState.activeHabitId || timerState.techniqueId);

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

  // Mirror the session's focus time into the linked habit's log (minute/hour habits only)
  useEffect(() => {
    const { activeHabitId, mode, elapsedSeconds, totalFocusSecondsLogged, initialTodayAmount } = timerState;
    if (!activeHabitId) return;
    const habit = habitsRef.current.find(h => h.id === activeHabitId);
    if (!habit || !isTimeBasedUnit(habit.unit)) return;

    const focusSeconds = totalFocusSecondsLogged + (mode === 'focus' ? elapsedSeconds : 0);
    const amount = roundDown(initialTodayAmount + secondsToUnitAmount(focusSeconds, habit.unit));
    const dateStr = getLogDateStr(habit);
    if ((habit.logs[dateStr] || 0) !== amount) {
      setLogRef.current(activeHabitId, dateStr, amount);
    }
  }, [timerState]);

  // Chime whenever a phase finishes
  useEffect(() => {
    const prev = prevStateRef.current;
    prevStateRef.current = timerState;
    const wasFocus = prev.mode === 'focus';
    const isFocus = timerState.mode === 'focus';
    const focusFinishedWithoutBreak = isFocus && prev.isRunning && !timerState.isRunning
      && timerState.targetSeconds !== null && timerState.elapsedSeconds >= timerState.targetSeconds;

    if ((wasFocus && !isFocus) || focusFinishedWithoutBreak) {
      timerSound.playFocusComplete();
    } else if (!wasFocus && isFocus && timerState.cycle > prev.cycle) {
      timerSound.playBreakComplete();
    }
  }, [timerState]);

  // Main 1-second ticker
  useEffect(() => {
    if (!timerState.isRunning || !isActive) return;
    const interval = setInterval(() => setTimerState(prev => tick(prev, Date.now())), 1000);
    return () => clearInterval(interval);
  }, [timerState.isRunning, isActive]);

  // Start classic habit stopwatch timer
  const startTimer = useCallback((habit: Habit) => {
    setTimerState({
      ...IDLE_STATE,
      activeHabitId: habit.id,
      isRunning: true,
      initialTodayAmount: initialAmountFor(habit),
      startedAt: Date.now(),
      techniqueId: null, // plain stopwatch
      workSeconds: 0,
      breakSeconds: 0,
      longBreakSeconds: 0,
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

    timerSound.playClick();
    setTimerState({
      ...IDLE_STATE,
      activeHabitId: habitId,
      isRunning: true,
      initialTodayAmount: initialAmountFor(habitsRef.current.find(h => h.id === habitId)),
      startedAt: Date.now(),
      techniqueId: technique.id,
      targetSeconds: technique.isFlowtime ? null : workMin * 60,
      workSeconds: workMin * 60,
      breakSeconds: breakMin * 60,
      longBreakSeconds: longBreakMin * 60,
    });
  }, []);

  const pauseTimer = useCallback(() => {
    setTimerState(prev => ({ ...prev, isRunning: false, startedAt: null }));
  }, []);

  const resumeTimer = useCallback(() => {
    setTimerState(prev => ({ ...prev, isRunning: true, startedAt: Date.now() }));
  }, []);

  // Focus time is already in the habit log, so stopping just ends the session
  const stopTimer = useCallback(() => {
    setTimerState(IDLE_STATE);
  }, []);

  // Restart the current interval (the habit log falls back to the banked total)
  const resetTimer = useCallback(() => {
    setTimerState(prev => ({
      ...prev,
      elapsedSeconds: 0,
      startedAt: prev.isRunning ? Date.now() : null,
    }));
  }, []);

  const skipToNextPhase = useCallback(() => {
    setTimerState(prev => {
      const now = prev.isRunning ? Date.now() : null;
      if (prev.mode !== 'focus') return toFocus(prev, now);
      const focusSeconds = prev.targetSeconds ? Math.min(prev.elapsedSeconds, prev.targetSeconds) : prev.elapsedSeconds;
      return toBreak(prev, focusSeconds, prev.breakSeconds || 5 * 60, now);
    });
  }, []);

  const takeFlowtimeBreak = useCallback(() => {
    setTimerState(prev => ({
      ...prev,
      mode: 'break',
      targetSeconds: flowtimeBreakFor(prev.elapsedSeconds) * 60,
      elapsedSeconds: 0,
      totalFocusSecondsLogged: prev.totalFocusSecondsLogged + prev.elapsedSeconds,
      startedAt: prev.isRunning ? Date.now() : null,
    }));
  }, []);

  // Extends the countdown when there is one, otherwise adds stopwatch time
  const addSeconds = useCallback((additionalSec: number) => {
    setTimerState(prev => prev.targetSeconds !== null
      ? { ...prev, targetSeconds: Math.max(prev.elapsedSeconds + 1, prev.targetSeconds + additionalSec) }
      : { ...prev, elapsedSeconds: Math.max(0, prev.elapsedSeconds + additionalSec) });
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled(prev => {
      timerSound.setEnabled(!prev);
      return !prev;
    });
  }, []);

  const { elapsedSeconds, targetSeconds } = timerState;
  const remainingSeconds = targetSeconds !== null ? Math.max(0, targetSeconds - elapsedSeconds) : elapsedSeconds;
  const progressPercent = targetSeconds !== null && targetSeconds > 0
    ? Math.min(100, Math.round((elapsedSeconds / targetSeconds) * 100))
    : (elapsedSeconds % 60) / 60 * 100; // open-ended: sweep once per minute

  return (
    <TimerContext.Provider
      value={{
        isActive,
        activeHabitId: timerState.activeHabitId,
        activeHabit: habits.find(h => h.id === timerState.activeHabitId) || null,
        activeTechnique: timerState.techniqueId ? getTechniqueById(timerState.techniqueId) || null : null,
        isRunning: timerState.isRunning,
        mode: timerState.mode,
        cycle: timerState.cycle,
        elapsedSeconds,
        targetSeconds,
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
