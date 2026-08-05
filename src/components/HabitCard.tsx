'use client';

import { Habit } from '../types';
import { calculateHabitStats, unitLabel, normalizeDateStr } from '../lib/habitUtils';
import { useMemo, useState, useEffect } from 'react';
import { Plus, Minus, Flame } from 'lucide-react';

interface Props {
  habit: Habit;
  onClick: () => void;
  onLog: (date: string, amount: number) => void;
}

export function HabitCard({ habit, onClick, onLog }: Props) {
  const stats = useMemo(() => calculateHabitStats(habit), [habit]);
  const ul = unitLabel(habit.unit);
  const todayStr = normalizeDateStr(new Date());
  const todayAmount = habit.logs[todayStr] || 0;

  const [inputValue, setInputValue] = useState(todayAmount.toString());

  useEffect(() => {
    setInputValue(todayAmount.toString());
  }, [todayAmount]);

  let opacity = 0;
  let isComplete = false;

  if (habit.type === 'START') {
    if (todayAmount > 0) {
      opacity = Math.min(todayAmount / habit.quota, 1);
      opacity = Math.max(opacity, 0.25);
    }
    if (todayAmount >= habit.quota) {
      isComplete = true;
    }
  } else {
    if (todayAmount > 0) {
      opacity = Math.max(0.2, 1 - (todayAmount / habit.quota));
      opacity = Math.max(opacity, 0.25);
    } else {
      opacity = 1;
    }
    if (todayAmount === 0) {
      isComplete = true;
    }
  }

  const opacityHex = Math.floor(opacity * 255).toString(16).padStart(2, '0');
  const borderStyle = isComplete 
    ? { borderColor: '#facc15' } 
    : (opacity > 0.08 ? { borderColor: `${habit.color}${opacityHex}` } : {});

  const handleCommit = () => {
    const val = parseFloat(inputValue);
    onLog(todayStr, isNaN(val) || val < 0 ? 0 : val);
  };

  return (
    <div
      onClick={onClick}
      className="bg-gray-900 border border-gray-800 rounded-xl p-4 cursor-pointer hover:border-gray-700 transition-all shadow-lg hover:shadow-xl group flex items-center gap-4"
      style={borderStyle}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
        style={{ backgroundColor: `${habit.color}20`, border: `1px solid ${habit.color}30` }}
      >
        {habit.icon}
      </div>
      
      <div className="flex-1 min-w-0">
        <h3 className="text-lg font-semibold text-white group-hover:text-gray-200 transition-colors truncate">
          {habit.name}
        </h3>
        <p className="text-sm text-gray-400 capitalize truncate">
          {habit.type === 'START' ? 'Build' : 'Quit'} • {habit.timeframe}
        </p>
      </div>

      <div className="hidden sm:flex flex-col items-end shrink-0 mr-4">
        <span className="text-xl font-bold text-white flex items-center gap-1.5">
          <Flame className="w-4 h-4 text-orange-500" />
          {stats.currentStreak}
        </span>
        <span className="text-[10px] text-gray-500 uppercase tracking-wider">Streak</span>
      </div>

      <div 
        className="flex flex-col items-center gap-1 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1 bg-gray-800/80 rounded-lg p-1 border border-gray-700/50">
          <button 
            onClick={() => onLog(todayStr, Math.max(0, todayAmount - 1))}
            className="w-8 h-8 flex items-center justify-center rounded-md text-gray-400 hover:text-white hover:bg-gray-700 transition"
          >
            <Minus size={14} />
          </button>
          <input
            type="number"
            min="0"
            step="any"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={handleCommit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
            }}
            className="w-8 font-semibold text-sm text-center bg-transparent focus:outline-none text-white no-spinners"
          />
          <button 
            onClick={() => onLog(todayStr, todayAmount + 1)}
            className="w-8 h-8 flex items-center justify-center rounded-md bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white transition"
          >
            <Plus size={14} />
          </button>
        </div>
        <div className="flex items-center justify-center max-w-[90px] text-[10px] text-gray-500 font-medium capitalize w-full">
          <span className="truncate">/{habit.quota}</span>
          {habit.unit !== 'amount' && (
            <span className="shrink-0 ml-1">{habit.unit}</span>
          )}
        </div>
      </div>
    </div>
  );
}
