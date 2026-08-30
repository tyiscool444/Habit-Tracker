import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  parseISO,
  isBefore,
  differenceInDays,
  differenceInWeeks,
  differenceInMonths,
  addDays,
  addWeeks,
  addMonths,
  format,
} from 'date-fns';
import { Habit, HabitStats, HabitUnit } from '../types';

import { UNITS } from './constants';

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
  if (amount === undefined || amount === null || isNaN(amount)) return '0';
  const val = roundDown(amount, 2);
  return val.toString();
}

/**
 * Returns the unit abbreviation for display.
 */
export function unitLabel(unit: HabitUnit): string {
  const match = UNITS.find(u => u.value === unit);
  return match ? match.short : 'x';
}

/**
 * Returns the timeframe abbreviation suffix (d, w, m, y) for streaks.
 */
export function timeframeSuffix(timeframe: string): string {
  switch (timeframe) {
    case 'daily':   return 'd';
    case 'weekly':  return 'w';
    case 'monthly': return 'm';
    case 'yearly':  return 'y';
    default:        return 'd';
  }
}

/**
 * Sums the logged amounts within a specific interval.
 */
export function getAmountInInterval(logs: Record<string, number>, start: Date, end: Date): number {
  let total = 0;
  for (const [dateStr, amount] of Object.entries(logs)) {
    const d = parseISO(dateStr);
    if (isWithinInterval(d, { start, end })) {
      total += amount;
    }
  }
  return total;
}


/**
 * Checks if a habit period counts as a "perfect" period (fully met quota).
 * START: logged >= quota.
 * STOP: logged 0 (completely clean).
 */
export function checkPeriodPerfect(habit: Habit, start: Date, end: Date): boolean {
  const amount = getAmountInInterval(habit.logs, start, end);
  if (habit.type === 'START') {
    return amount >= habit.quota;
  } else {
    return amount === 0;
  }
}

/**
 * Calculates stats for a given habit including streak and perfectStreak.
 * Only counts as an active streak if periods are perfect up to the current day/period.
 */
export function calculateHabitStats(habit: Habit): HabitStats {
  const today = new Date();
  let startDate = parseISO(habit.startDate);

  // If one-off habit
  if (habit.isRecurring === false) {
    const targetStr = habit.targetDate || habit.startDate;
    const targetAmt = habit.logs[targetStr] || 0;
    const isMet = habit.type === 'START' ? targetAmt >= habit.quota : targetAmt <= habit.quota;
    return { currentStreak: isMet ? 1 : 0 };
  }

  const logDates = Object.keys(habit.logs);
  if (logDates.length > 0) {
    const earliestLogDate = logDates.reduce((earliest, current) => 
      isBefore(parseISO(current), parseISO(earliest)) ? current : earliest
    );
    const earliest = parseISO(earliestLogDate);
    if (isBefore(earliest, startDate)) {
      startDate = earliest;
    }
  }

  if (isBefore(today, startDate)) {
    return { currentStreak: 0 };
  }

  let currentStreak = 0;

  const countStreak = (getPeriod: (i: number) => { start: Date; end: Date }, maxCount: number) => {
    for (let i = 0; i < maxCount; i++) {
      const { start, end } = getPeriod(i);
      if (checkPeriodPerfect(habit, start, end)) {
        currentStreak++;
      } else {
        break; // Streak broken, stop immediately
      }
    }
  };

  if (habit.timeframe === 'daily') {
    const totalDays = differenceInDays(today, startDate) + 1;
    countStreak(i => ({
      start: startOfDay(addDays(today, -i)),
      end: endOfDay(addDays(today, -i)),
    }), totalDays);
  } else if (habit.timeframe === 'weekly') {
    const totalWeeks = differenceInWeeks(today, startDate) + 1;
    countStreak(i => ({
      start: startOfWeek(addWeeks(today, -i), { weekStartsOn: 1 }),
      end: endOfWeek(addWeeks(today, -i), { weekStartsOn: 1 }),
    }), totalWeeks);
  } else {
    const totalMonths = differenceInMonths(today, startDate) + 1;
    countStreak(i => ({
      start: startOfMonth(addMonths(today, -i)),
      end: endOfMonth(addMonths(today, -i)),
    }), totalMonths);
  }

  return { currentStreak };
}

