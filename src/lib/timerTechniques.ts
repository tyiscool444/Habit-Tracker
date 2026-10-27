export interface TimerTechnique {
  id: string;
  name: string;
  shortName: string;
  emoji: string;
  workMinutes: number; // 0 for open-ended Flowtime
  breakMinutes: number;
  longBreakMinutes?: number;
  cyclesBeforeLongBreak?: number;
  isFlowtime?: boolean;
  isCustom?: boolean;
  focusLabel: string;
  breakLabel: string;
  summary: string;
  color: string; // Primary hex color
}

export const STUDY_TIMER_TECHNIQUES: TimerTechnique[] = [
  {
    id: 'pomodoro',
    name: 'Pomodoro Technique (25 / 5 Rule)',
    shortName: 'Pomodoro (25/5)',
    emoji: '🍅',
    workMinutes: 25,
    breakMinutes: 5,
    longBreakMinutes: 20,
    cyclesBeforeLongBreak: 4,
    focusLabel: '25 min',
    breakLabel: '5 min',
    summary: 'Study with deep focus for 25 minutes, then take a 5-minute break (longer break of 15 to 30 minutes after four cycles). Best for repetitive tasks, low motivation, or fighting procrastination.',
    color: '#ef4444',
  },
  {
    id: '50-10',
    name: '50/10 Rule (Extended Pomodoro)',
    shortName: '50/10 Rule',
    emoji: '🎯',
    workMinutes: 50,
    breakMinutes: 10,
    longBreakMinutes: 25,
    cyclesBeforeLongBreak: 3,
    focusLabel: '50 min',
    breakLabel: '10 min',
    summary: 'Study for 50 minutes, then rest for 10 minutes. Best for staying in a productive flow state without getting interrupted too frequently.',
    color: '#8b5cf6',
  },
  {
    id: '90-min',
    name: '90-Minute Focus Block',
    shortName: '90-Min Block',
    emoji: '🌊',
    workMinutes: 90,
    breakMinutes: 25,
    focusLabel: '90 min',
    breakLabel: '20–30 min',
    summary: "Match your body's natural ultradian rhythm by studying for 90 minutes, followed by a 20 to 30 minute break. Best for deep work, complex problem-solving, or large study chapters.",
    color: '#06b6d4',
  },
  {
    id: 'flowtime',
    name: 'Flowtime Technique',
    shortName: 'Flowtime',
    emoji: '⏳',
    workMinutes: 0,
    breakMinutes: 5,
    isFlowtime: true,
    focusLabel: 'Open-ended',
    breakLabel: 'Proportional',
    summary: 'Ditch rigid timer lengths and work for as long as your focus holds, then take a break proportional to how long you worked. Best for creative tasks, programming, or open-ended projects.',
    color: '#10b981',
  },
  {
    id: '2-minute',
    name: '2-Minute Rule',
    shortName: '2-Minute Rule',
    emoji: '🚀',
    workMinutes: 2,
    breakMinutes: 0,
    focusLabel: '2 min',
    breakLabel: 'None',
    summary: 'Set a timer for just 2 minutes to start a task you are dreading. Once the two minutes are up, you usually keep going. Best for overcoming severe procrastination or getting past friction.',
    color: '#f97316',
  },
  {
    id: 'custom',
    name: 'Custom Timer',
    shortName: 'Custom Timer',
    emoji: '⏱️',
    workMinutes: 30,
    breakMinutes: 5,
    isCustom: true,
    focusLabel: 'Custom',
    breakLabel: 'Custom',
    summary: 'Set your own custom focus duration, breaks, and intervals tailored to your routine. Best for specific study blocks, exams, meditation, or personalized sprint lengths.',
    color: '#ec4899',
  },
];

export function getTechniqueById(id: string): TimerTechnique | undefined {
  return STUDY_TIMER_TECHNIQUES.find(t => t.id === id);
}

// Calculate proportional break for Flowtime
export function calculateFlowtimeBreak(focusMinutes: number): number {
  if (focusMinutes <= 25) return 5;
  if (focusMinutes <= 50) return 8;
  if (focusMinutes <= 90) return 15;
  return Math.min(30, Math.round(focusMinutes / 5));
}

/** Recommended Flowtime break (minutes) after `elapsedSeconds` of focus. */
export function flowtimeBreakFor(elapsedSeconds: number): number {
  return calculateFlowtimeBreak(Math.max(1, Math.round(elapsedSeconds / 60)));
}

/** mm:ss, or hh:mm:ss once an hour is reached. */
export function formatTime(totalSeconds: number): string {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return hrs > 0 ? `${pad(hrs)}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;
}
