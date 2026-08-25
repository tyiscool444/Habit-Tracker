export type HabitType = 'START' | 'STOP';
export type Timeframe = 'daily' | 'weekly' | 'monthly';
export type HabitUnit = 
  | 'amount' 
  | 'grams' 
  | 'kg' 
  | 'mg'
  | 'mL' 
  | 'liters' 
  | 'oz'
  | 'cups'
  | 'glasses'
  | 'seconds' 
  | 'minutes' 
  | 'hours' 
  | 'km' 
  | 'miles' 
  | 'meters' 
  | 'steps' 
  | 'cal' 
  | 'kcal' 
  | 'pages' 
  | 'sets' 
  | 'reps' 
  | 'percent';

export interface Habit {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: HabitType;
  unit: HabitUnit;
  quota: number; // For START: target to hit. For STOP: allowance limit.
  timeframe: Timeframe;
  isRecurring?: boolean; // true by default; if false, this is a one-off goal
  targetDate?: string; // ISO String (YYYY-MM-DD) for one-off habits
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
