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
    case 'mL':      return 'mL';
    case 'minutes': return 'min';
    case 'hours':   return 'hr';
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
  let perfectStreak = 0;
  let streakActive = true;
  let perfectStreakActive = true;

  const iterate = (getPeriod: (i: number) => { start: Date; end: Date }, count: number) => {
    for (let i = 0; i < count; i++) {
      const { start, end } = getPeriod(i);
      const isStreak = checkPeriodStreak(habit, start, end);
      const isPerfect = checkPeriodPerfect(habit, start, end);

      if (isStreak) {
        if (streakActive) currentStreak++;
      } else {
        streakActive = false;
        failedPeriods++;
      }

      if (isPerfect) {
        if (perfectStreakActive) perfectStreak++;
      } else {
        perfectStreakActive = false;
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

  return { currentStreak, perfectStreak, failedPeriodsSinceStart: failedPeriods, totalPeriods };
}

/**
 * Calculates the visual state for a specific day cell in the calendar.
 */
export function getDayCellVisuals(habit: Habit, day: Date) {
  const dayStart = startOfDay(day);
  const dayEnd = endOfDay(day);
  const now = new Date();
  const amount = getAmountInInterval(habit.logs, dayStart, dayEnd);

  // Future days — not interactive
  if (isBefore(now, dayStart)) {
    return { opacity: 0.08, isGold: false, isRed: false, amount, isFuture: true };
  }

  if (habit.type === 'START') {
    if (amount === 0) return { opacity: 0.12, isGold: false, isRed: false, amount, isFuture: false };
    const ratio = Math.min(amount / habit.quota, 1);
    const isGold = amount >= habit.quota;
    return { opacity: 0.2 + ratio * 0.8, isGold, isRed: false, amount, isFuture: false };
  } else {
    // STOP habit
    if (amount === 0) {
      const isGold = isBefore(dayEnd, now);
      return { opacity: 1.0, isGold, isRed: false, amount, isFuture: false };
    }
    if (amount > habit.quota) {
      return { opacity: 0.85, isGold: false, isRed: true, amount, isFuture: false };
    }
    const ratio = amount / Math.max(habit.quota, 1);
    return { opacity: 0.3 + ratio * 0.5, isGold: false, isRed: false, amount, isFuture: false };
  }
}

/**
 * Calculates the set of dates that are part of the currently active gold streak.
 * A gold streak goes backwards from today. Today can be pending (not gold) without breaking it.
 */
export function getCurrentGoldStreakDates(habit: Habit): Set<string> {
  const goldDates = new Set<string>();
  const today = new Date();
  
  let i = 0;
  while (true) {
    const d = addDays(today, -i);
    const { isGold } = getDayCellVisuals(habit, d);
    
    if (isGold) {
      goldDates.add(normalizeDateStr(d));
    } else {
      if (i > 0) {
        break; // Streak is broken by a past day that wasn't gold
      }
    }
    i++;
    if (i > 5000) break; // Safety limit
  }
  
  return goldDates;
}
