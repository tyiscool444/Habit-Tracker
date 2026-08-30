import { HabitUnit } from '../types';

export const ICONS = [
  // Fitness & Health
  '💪', '🏃', '🚴', '🏊', '🧘', '🏋️', '🥊', '🧗', '⚽', '🏀', '🎾', '👟',
  // Wellness, Diet & Self-Care
  '🥗', '💧', '🍎', '🥑', '🥦', '💊', '🫖', '☕', '🛌', '😴', '🧠', '❤️',
  // Productivity, Learning & Hobbies
  '📖', '💻', '✍️', '📚', '🎯', '🎨', '🎸', '🎹', '🎧', '⚡', '🔥', '💡',
  // Mindfulness & Nature
  '🌿', '🌱', '☀️', '🌙', '🌊', '🌲', '🌸', '🧹', '🧺', '✨', '⭐', '🏆',
  // Moderation / Quit habits
  '🚬', '🍷', '🍺', '🍸', '🍬', '🍔', '🍕', '🎮', '📱', '📺', '🛑', '🚫'
];

export const COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', 
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#64748b', '#78716c'
];

export const getRandomIcon = (): string => {
  return ICONS[Math.floor(Math.random() * ICONS.length)];
};

export const getRandomColor = (): string => {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
};

export interface UnitOption {
  value: HabitUnit;
  label: string;
  short: string;
}

export const UNITS: UnitOption[] = [
  { value: 'amount', label: 'Times / Count', short: 'x' },
  { value: 'minutes', label: 'Minutes', short: 'min' },
  { value: 'hours', label: 'Hours', short: 'hr' },
  { value: 'seconds', label: 'Seconds', short: 'sec' },
  { value: 'grams', label: 'Grams', short: 'g' },
  { value: 'kg', label: 'Kilograms', short: 'kg' },
  { value: 'mg', label: 'Milligrams', short: 'mg' },
  { value: 'mL', label: 'Millilitres', short: 'mL' },
  { value: 'liters', label: 'Litres', short: 'L' },
  { value: 'oz', label: 'Fluid Ounces', short: 'oz' },
  { value: 'cups', label: 'Cups', short: 'cups' },
  { value: 'glasses', label: 'Glasses', short: 'gls' },
  { value: 'km', label: 'Kilometers', short: 'km' },
  { value: 'miles', label: 'Miles', short: 'mi' },
  { value: 'meters', label: 'Meters', short: 'm' },
  { value: 'steps', label: 'Steps', short: 'steps' },
  { value: 'cal', label: 'Calories', short: 'cal' },
  { value: 'kcal', label: 'Kilocalories', short: 'kcal' },
  { value: 'pages', label: 'Pages', short: 'pgs' },
  { value: 'sets', label: 'Sets', short: 'sets' },
  { value: 'reps', label: 'Reps', short: 'reps' },
  { value: 'percent', label: 'Percentage', short: '%' },
];
