'use client';

import { Habit } from '../types';
import { calculateHabitStats, unitLabel } from '../lib/habitUtils';
import { useMemo } from 'react';

interface Props {
  habit: Habit;
  onClick: () => void;
}

export function HabitCard({ habit, onClick }: Props) {
  const stats = useMemo(() => calculateHabitStats(habit), [habit]);
  const ul = unitLabel(habit.unit);

  return (
    <div
      onClick={onClick}
      className="bg-gray-900 border border-gray-800 rounded-xl p-5 cursor-pointer hover:border-gray-700 transition-all shadow-lg hover:shadow-xl group"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
            style={{ backgroundColor: `${habit.color}20`, border: `1px solid ${habit.color}30` }}
          >
            {habit.icon}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white group-hover:text-gray-200 transition-colors">
              {habit.name}
            </h3>
            <p className="text-sm text-gray-400 capitalize">
              {habit.type === 'START' ? 'Build' : 'Quit'} • {habit.quota}{ul} / {habit.timeframe}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-6 border-t border-gray-800 pt-4">
        <div>
          <p className="text-sm text-gray-500 mb-1">Current Streak</p>
          <p className="text-2xl font-bold text-white flex items-baseline gap-1">
            {stats.currentStreak} <span className="text-sm font-normal text-gray-500">
              {habit.timeframe}{stats.currentStreak !== 1 ? 's' : ''}
            </span>
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500 mb-1">Total Failed</p>
          <p className="text-2xl font-bold text-white flex items-baseline gap-1">
            {stats.failedPeriodsSinceStart} <span className="text-sm font-normal text-gray-500">
              of {stats.totalPeriods}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
