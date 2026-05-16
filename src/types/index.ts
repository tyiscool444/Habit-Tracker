export type HabitType = 'START' | 'STOP';
export type Timeframe = 'daily' | 'weekly' | 'monthly';
export type HabitUnit = 'amount' | 'grams' | 'mL' | 'minutes' | 'hours';

export interface Habit {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: HabitType;
  unit: HabitUnit;
  quota: number; // For START: target to hit. For STOP: allowance limit.
  timeframe: Timeframe;
  startDate: string; // ISO String (YYYY-MM-DD)
  logs: Record<string, number>; // date string (YYYY-MM-DD) → amount logged
}

// A simple utility type to represent the streak and stats
export interface HabitStats {
  currentStreak: number;   // consecutive periods with any activity
  perfectStreak: number;   // consecutive periods fully meeting quota
  failedPeriodsSinceStart: number;
  totalPeriods: number;
}
