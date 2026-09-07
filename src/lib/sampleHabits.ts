import { Habit } from '../types';
import { normalizeDateStr } from './habitUtils';
import { subDays } from 'date-fns';

export function getSampleHabits(): Habit[] {
  const today = new Date();
  const todayStr = normalizeDateStr(today);
  const yesterdayStr = normalizeDateStr(subDays(today, 1));
  const twoDaysAgoStr = normalizeDateStr(subDays(today, 2));
  const threeDaysAgoStr = normalizeDateStr(subDays(today, 3));
  const startDateStr = normalizeDateStr(subDays(today, 14));

  return [
    {
      id: 'sample-hydration',
      name: 'Drink Water (Hydration)',
      icon: '💧',
      color: '#06b6d4',
      type: 'START',
      unit: 'mL',
      quota: 2000,
      timeframe: 'daily',
      group: 'Health & Wellness',
      isRecurring: true,
      startDate: startDateStr,
      logs: {
        [threeDaysAgoStr]: 2000,
        [twoDaysAgoStr]: 2500,
        [yesterdayStr]: 2000,
        [todayStr]: 1500,
      },
    },
    {
      id: 'sample-reading',
      name: 'Read Non-Fiction',
      icon: '📖',
      color: '#8b5cf6',
      type: 'START',
      unit: 'pages',
      quota: 20,
      timeframe: 'daily',
      group: 'Mindset & Growth',
      isRecurring: true,
      startDate: startDateStr,
      logs: {
        [threeDaysAgoStr]: 25,
        [twoDaysAgoStr]: 20,
        [yesterdayStr]: 30,
        [todayStr]: 20,
      },
    },
    {
      id: 'sample-workout',
      name: 'Daily Workout / Gym',
      icon: '💪',
      color: '#f97316',
      type: 'START',
      unit: 'minutes',
      quota: 30,
      timeframe: 'daily',
      group: 'Fitness',
      isRecurring: true,
      startDate: startDateStr,
      logs: {
        [threeDaysAgoStr]: 45,
        [twoDaysAgoStr]: 30,
        [yesterdayStr]: 40,
        [todayStr]: 35,
      },
    },
    {
      id: 'sample-screen-time',
      name: 'Limit Social Media',
      icon: '📱',
      color: '#ef4444',
      type: 'STOP',
      unit: 'minutes',
      quota: 45,
      timeframe: 'daily',
      group: 'Mindset & Growth',
      isRecurring: true,
      startDate: startDateStr,
      logs: {
        [threeDaysAgoStr]: 30,
        [twoDaysAgoStr]: 20,
        [yesterdayStr]: 15,
        [todayStr]: 10,
      },
    },
    {
      id: 'sample-deep-clean',
      name: 'Deep Apartment Clean',
      icon: '🧹',
      color: '#10b981',
      type: 'START',
      unit: 'amount',
      quota: 1,
      timeframe: 'weekly',
      group: 'Home & Life',
      isRecurring: true,
      startDate: startDateStr,
      logs: {
        [yesterdayStr]: 1,
      },
    },
    {
      id: 'sample-launch-task',
      name: 'Deploy HabitThat to Vercel',
      icon: '🚀',
      color: '#3b82f6',
      type: 'START',
      unit: 'amount',
      quota: 1,
      timeframe: 'daily',
      group: 'Projects',
      isRecurring: false,
      startDate: todayStr,
      targetDate: todayStr,
      logs: {
        [todayStr]: 1,
      },
      subtasks: [
        { id: 'sub-1', title: 'Push codebase to GitHub repository', completed: true },
        { id: 'sub-2', title: 'Connect repository on Vercel Dashboard', completed: true },
        { id: 'sub-3', title: 'Test live URL on mobile and desktop', completed: false },
      ],
    },
  ];
}
