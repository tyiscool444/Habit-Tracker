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

/**
 * Normalizes a date to a YYYY-MM-DD string in LOCAL time (not UTC).
 * Critical: using toISOString() would shift the date for +10:00 timezones.
 */
export function normalizeDateStr(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'yyyy-MM-dd');
}

/**
 * Returns the unit abbreviation for display.
 */
export function unitLabel(unit: HabitUnit): string {
  switch (unit) {
    case 'amount':  return 'x';
    case 'grams':   return 'g';
    case 'kg':      return 'kg';
    case 'mg':      return 'mg';
    case 'mL':      return 'mL';
    case 'liters':  return 'L';
    case 'oz':      return 'oz';
    case 'cups':    return 'cups';
    case 'glasses': return 'gls';
    case 'seconds': return 'sec';
    case 'minutes': return 'min';
    case 'hours':   return 'hr';
    case 'km':      return 'km';
    case 'miles':   return 'mi';
    case 'meters':  return 'm';
    case 'steps':   return 'steps';
    case 'cal':     return 'cal';
    case 'kcal':    return 'kcal';
    case 'pages':   return 'pgs';
    case 'sets':    return 'sets';
    case 'reps':    return 'reps';
    case 'percent': return '%';
    default:        return 'x';
  }
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
 * Checks if a habit period counts as a "streak" (any activity).
 * START: logged anything > 0.
 * STOP: logged within allowance (including 0).
 */
export function checkPeriodStreak(habit: Habit, start: Date, end: Date): boolean {
  const amount = getAmountInInterval(habit.logs, start, end);
  if (habit.type === 'START') {
    return amount > 0;
  } else {
    return amount <= habit.quota;
  }
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
    return { currentStreak: 0, perfectStreak: 0, failedPeriodsSinceStart: 0, totalPeriods: 0 };
  }

  let totalPeriods = 0;
  let failedPeriods = 0;
  let currentStreak = 0;
  let streakActive = true;

  const iterate = (getPeriod: (i: number) => { start: Date; end: Date }, count: number) => {
    for (let i = 0; i < count; i++) {
      const { start, end } = getPeriod(i);
      const isPerfect = checkPeriodPerfect(habit, start, end);

      if (isPerfect) {
        if (streakActive) {
          currentStreak++;
        }
      } else {
        streakActive = false;
        failedPeriods++;
      }
    }
  };

  if (habit.timeframe === 'daily') {
    totalPeriods = differenceInDays(today, startDate) + 1;
    iterate(i => ({
      start: startOfDay(addDays(today, -i)),
      end: endOfDay(addDays(today, -i)),
    }), totalPeriods);
  } else if (habit.timeframe === 'weekly') {
    totalPeriods = differenceInWeeks(today, startDate) + 1;
    iterate(i => ({
      start: startOfWeek(addWeeks(today, -i), { weekStartsOn: 1 }),
      end: endOfWeek(addWeeks(today, -i), { weekStartsOn: 1 }),
    }), totalPeriods);
  } else {
    totalPeriods = differenceInMonths(today, startDate) + 1;
    iterate(i => ({
      start: startOfMonth(addMonths(today, -i)),
      end: endOfMonth(addMonths(today, -i)),
    }), totalPeriods);
  }

  return { currentStreak, perfectStreak: currentStreak, failedPeriodsSinceStart: failedPeriods, totalPeriods };
}
