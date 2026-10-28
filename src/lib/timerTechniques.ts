export interface TimerTechnique {
  id: string;
  shortName: string;
  emoji: string;
  workMinutes: number; // 0 for open-ended Flowtime
  breakMinutes: number;
  longBreakMinutes?: number;
  cyclesBeforeLongBreak?: number;
  isFlowtime?: boolean;
  isCustom?: boolean;
  color: string;
}

export const STUDY_TIMER_TECHNIQUES: TimerTechnique[] = [
  { id: 'pomodoro', shortName: 'Pomodoro', emoji: '🍅', workMinutes: 25, breakMinutes: 5, longBreakMinutes: 20, cyclesBeforeLongBreak: 4, color: '#ef4444' },
  { id: '50-10', shortName: '50 / 10', emoji: '🎯', workMinutes: 50, breakMinutes: 10, longBreakMinutes: 25, cyclesBeforeLongBreak: 3, color: '#8b5cf6' },
  { id: '90-min', shortName: '90 min', emoji: '🌊', workMinutes: 90, breakMinutes: 25, color: '#06b6d4' },
  { id: 'flowtime', shortName: 'Flowtime', emoji: '⏳', workMinutes: 0, breakMinutes: 5, isFlowtime: true, color: '#10b981' },
  { id: '2-minute', shortName: '2 min', emoji: '🚀', workMinutes: 2, breakMinutes: 0, color: '#f97316' },
  { id: 'custom', shortName: 'Custom', emoji: '⏱️', workMinutes: 30, breakMinutes: 5, isCustom: true, color: '#ec4899' },
];

export function getTechniqueById(id: string): TimerTechnique | undefined {
  return STUDY_TIMER_TECHNIQUES.find(t => t.id === id);
}

/** Recommended Flowtime break (minutes) after `elapsedSeconds` of focus. */
export function flowtimeBreakFor(elapsedSeconds: number): number {
  const focusMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
  if (focusMinutes <= 25) return 5;
  if (focusMinutes <= 50) return 8;
  if (focusMinutes <= 90) return 15;
  return Math.min(30, Math.round(focusMinutes / 5));
}

/** mm:ss, or hh:mm:ss once an hour is reached. */
export function formatTime(totalSeconds: number): string {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return hrs > 0 ? `${pad(hrs)}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;
}
