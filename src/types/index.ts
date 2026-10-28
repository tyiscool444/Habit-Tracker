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

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Habit {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: HabitType;
  unit: HabitUnit;
  quota: number; // For START: target to hit. For STOP: allowance limit.
  timeframe: Timeframe;
  group?: string; // Optional category / group name e.g. "Morning Routine", "Health & Fitness", "Work"
  isRecurring?: boolean; // true by default; if false, this is a one-off goal
  targetDate?: string; // ISO String (YYYY-MM-DD) for one-off habits
  startDate: string; // ISO String (YYYY-MM-DD)
  logs: Record<string, number>; // date string (YYYY-MM-DD) → amount logged
  subtasks?: SubTask[];
}

export type ViewMode = 'day' | 'week' | 'month' | 'year';

/** A time block in the daily planner. */
export interface PlanBlock {
  id: string;
  date: string; // YYYY-MM-DD; for repeating blocks, the first day of the series
  start: number; // minutes from midnight
  end: number; // minutes from midnight (exclusive); above 1440 runs past midnight into the next day
  title: string;
  color: string;
  habitId?: string; // optional linked habit or task
  done?: boolean; // one-off blocks only
  repeat?: number[]; // weekdays it repeats on (0 = Sunday … 6 = Saturday); empty / absent = one-off
  doneDates?: string[]; // repeating blocks: occurrence dates ticked off
  skipDates?: string[]; // repeating blocks: occurrence dates deleted individually
}
