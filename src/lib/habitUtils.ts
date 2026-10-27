import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  parseISO,
  isAfter,
  addDays,
  addWeeks,
  addMonths,
  format,
} from 'date-fns';
import { Habit, HabitUnit, Timeframe } from '../types';

import { UNITS } from './constants';

/** Weeks start on Monday throughout the app. */
export const WEEK_OPTIONS = { weekStartsOn: 1 } as const;

/**
 * Normalizes a date to a YYYY-MM-DD string in LOCAL time (not UTC).
 * Critical: using toISOString() would shift the date for +10:00 timezones.
 */
export function normalizeDateStr(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'yyyy-MM-dd');
}

/**
 * Rounds down a number to the specified number of decimal places (default 2),
 * preventing floating-point inaccuracies like 1.0499999999999998.
 */
export function roundDown(num: number, decimals = 2): number {
  if (!num || isNaN(num)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.floor((num + 1e-9) * factor) / factor;
}

/**
 * Formats a number rounded down to max 2 decimal places.
 * - Integer (3) -> "3"
 * - Decimal (1.0499...) -> "1.04"
 */
export function formatAmount(amount: number): string {
  return roundDown(amount, 2).toString();
}

/**
 * Returns the unit abbreviation for display.
 */
export function unitLabel(unit: HabitUnit): string {
  const match = UNITS.find(u => u.value === unit);
  return match ? match.short : 'x';
}

/** Only minute and hour habits can receive time from the timers. */
export function isTimeBasedUnit(unit: HabitUnit): boolean {
  return unit === 'minutes' || unit === 'hours';
}

/**
 * Returns the timeframe abbreviation suffix (d, w, m) for streaks.
 */
export function timeframeSuffix(timeframe: Timeframe): string {
  return timeframe === 'weekly' ? 'w' : timeframe === 'monthly' ? 'm' : 'd';
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}

/**
 * Sums the logged amounts within a specific interval.
 */
export function getAmountInInterval(logs: Record<string, number>, start: Date, end: Date): number {
  let total = 0;
  for (const [dateStr, amount] of Object.entries(logs)) {
    if (isWithinInterval(parseISO(dateStr), { start, end })) {
      total += amount;
    }
  }
  return total;
}

/** The day, week or month that contains `date`. */
export function getPeriodBounds(timeframe: Timeframe, date: Date): { start: Date; end: Date } {
  switch (timeframe) {
    case 'weekly':
      return { start: startOfWeek(date, WEEK_OPTIONS), end: endOfWeek(date, WEEK_OPTIONS) };
    case 'monthly':
      return { start: startOfMonth(date), end: endOfMonth(date) };
    default:
      return { start: startOfDay(date), end: endOfDay(date) };
  }
}

/** Total logged in the habit's period (day / week / month) that contains `date`. */
export function getPeriodAmount(habit: Habit, date: Date): number {
  if (habit.timeframe === 'daily') return habit.logs[normalizeDateStr(date)] || 0;
  const { start, end } = getPeriodBounds(habit.timeframe, date);
  return getAmountInInterval(habit.logs, start, end);
}

/**
 * START: target reached. STOP: stayed within the allowance.
 */
export function meetsQuota(habit: Habit, amount: number): boolean {
  return habit.type === 'START' ? amount >= habit.quota : amount <= habit.quota;
}

/** Whether a recurring habit's period containing `date` meets its goal. */
export function isHabitMetOn(habit: Habit, date: Date): boolean {
  return meetsQuota(habit, getPeriodAmount(habit, date));
}

/** Due date (YYYY-MM-DD) of a one-off task. */
export function taskDateStr(task: Habit): string {
  return normalizeDateStr(task.targetDate || task.startDate || new Date());
}

/**
 * One-off completion. A STOP task only counts once something has been logged,
 * otherwise every new restraint task would start out "complete".
 */
export function isTaskComplete(task: Habit): boolean {
  const amount = task.logs[taskDateStr(task)] || 0;
  return task.type === 'START' ? amount >= task.quota : amount > 0 && amount <= task.quota;
}

/** The date a timer should log to: the due date for tasks, otherwise today. */
export function getLogDateStr(habit: Habit): string {
  return habit.isRecurring === false ? taskDateStr(habit) : normalizeDateStr(new Date());
}

/** Returns a copy of the habit with `amount` logged on `dateStr` (0 or less removes the entry). */
export function withLog(habit: Habit, dateStr: string, amount: number): Habit {
  const logs = { ...habit.logs };
  if (amount <= 0) {
    delete logs[dateStr];
  } else {
    logs[dateStr] = amount;
  }
  return { ...habit, logs };
}

/** Flips a one-off task between complete and incomplete, ticking its subtasks to match. */
export function toggleTaskComplete(task: Habit): Habit {
  const done = isTaskComplete(task);
  const updated = withLog(task, taskDateStr(task), done ? 0 : task.quota);
  if (task.type === 'START' && task.subtasks?.length) {
    updated.subtasks = task.subtasks.map(s => ({ ...s, completed: !done }));
  }
  return updated;
}

/** Earliest of the habit's start date and its first log. */
export function getTrackingStart(habit: Habit): Date {
  const earliest = Object.keys(habit.logs).reduce(
    (min, d) => (d < min ? d : min),
    normalizeDateStr(habit.startDate)
  );
  return parseISO(earliest);
}

/**
 * A "perfect" period for streaks.
 * START: logged >= quota.
 * STOP: logged 0 (completely clean).
 */
function isPeriodPerfect(habit: Habit, date: Date): boolean {
  const amount = getPeriodAmount(habit, date);
  return habit.type === 'START' ? amount >= habit.quota : amount === 0;
}

const STEP_PERIOD = { daily: addDays, weekly: addWeeks, monthly: addMonths };

/**
 * Current and best streak of consecutive perfect periods.
 * The current streak only counts if the current period is already perfect.
 */
export function calculateStreaks(habit: Habit): { current: number; best: number } {
  const today = new Date();
  const step = STEP_PERIOD[habit.timeframe];
  const first = getPeriodBounds(habit.timeframe, getTrackingStart(habit)).start;

  let run = 0;
  let best = 0;
  for (let d = first; !isAfter(d, today); d = step(d, 1)) {
    run = isPeriodPerfect(habit, d) ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return { current: run, best };
}
