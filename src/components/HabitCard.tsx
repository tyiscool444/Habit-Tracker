'use client';

import { Habit } from '../types';
import { calculateHabitStats, unitLabel, normalizeDateStr } from '../lib/habitUtils';
import { useMemo, useState, useEffect } from 'react';
import { Plus, Minus, Flame, Check, Edit3 } from 'lucide-react';
import { startOfWeek, addDays } from 'date-fns';

interface Props {
  habit: Habit;
  selectedDateStr?: string;
  onClick: () => void;
  onLog: (date: string, amount: number) => void;
  onEdit?: () => void;
}

export function HabitCard({ habit, selectedDateStr, onClick, onLog, onEdit }: Props) {
  const stats = useMemo(() => calculateHabitStats(habit), [habit]);
  const ul = unitLabel(habit.unit);
  const activeDateStr = selectedDateStr || normalizeDateStr(new Date());
  const activeAmount = habit.logs[activeDateStr] || 0;

  const [inputValue, setInputValue] = useState(activeAmount.toString());

  useEffect(() => {
    setInputValue(activeAmount.toString());
  }, [activeAmount, activeDateStr]);

  let opacity = 0;
  let isComplete = false;

  if (habit.type === 'START') {
    if (activeAmount > 0) {
      opacity = Math.min(activeAmount / habit.quota, 1);
      opacity = Math.max(opacity, 0.25);
    }
    if (activeAmount >= habit.quota) {
      isComplete = true;
    }
  } else {
    if (activeAmount > 0) {
      opacity = Math.max(0.2, 1 - (activeAmount / habit.quota));
      opacity = Math.max(opacity, 0.25);
    } else {
      opacity = 1;
    }
    if (activeAmount === 0) {
      isComplete = true;
    }
  }

  const opacityHex = Math.floor(opacity * 255).toString(16).padStart(2, '0');
  const dynamicStyle = {
    ...(isComplete
      ? { borderColor: '#facc15' }
      : (opacity > 0.08 ? { borderColor: `${habit.color}${opacityHex}` } : {})),
    background: `linear-gradient(0deg, ${habit.color}15, ${habit.color}15), #111827`,
  };

  const handleCommit = () => {
    const val = parseFloat(inputValue);
    onLog(activeDateStr, isNaN(val) || val < 0 ? 0 : val);
  };

  const getStep = (quota: number) => {
    if (quota < 20) return 1;
    if (quota < 100) return 5;
    if (quota < 200) return 10;
    if (quota <= 500) return 20;
    return 100;
  };
  const stepAmount = getStep(habit.quota);

  const weekStart = startOfWeek(new Date(activeDateStr + 'T12:00:00'), { weekStartsOn: 1 });

  let weeklyIsMet = false;
  if (habit.timeframe === 'weekly') {
    let weeklyAmount = 0;
    for (let i = 0; i < 7; i++) {
      const dStr = normalizeDateStr(addDays(weekStart, i));
      weeklyAmount += habit.logs[dStr] || 0;
    }
    weeklyIsMet = habit.type === 'START' ? weeklyAmount >= habit.quota : weeklyAmount <= habit.quota;
  }

  const pastDays = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i);
    const dStr = normalizeDateStr(d);
    
    let isMet = false;
    if (habit.timeframe === 'weekly') {
      isMet = weeklyIsMet;
    } else {
      const amount = habit.logs[dStr] || 0;
      isMet = habit.type === 'START' ? amount >= habit.quota : amount === 0;
    }
    return { dateStr: dStr, isMet };
  });

  return (
    <div
      onClick={onClick}
      className="bg-gray-900 border border-gray-800 rounded-xl py-6 px-4 cursor-pointer hover:border-gray-700 transition-all shadow-lg hover:shadow-xl group flex items-center gap-4"
      style={dynamicStyle}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
        style={{ backgroundColor: `${habit.color}20`, border: `1px solid ${habit.color}30` }}
      >
        {habit.icon}
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onLog(activeDateStr, habit.quota);
        }}
        className={`hidden sm:flex shrink-0 w-12 h-12 rounded-xl border items-center justify-center transition-all ${activeAmount >= habit.quota
            ? 'bg-green-500/20 text-green-400 border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.2)]'
            : 'bg-gray-800/50 text-gray-400 border-gray-700/50 hover:bg-green-500/10 hover:text-green-400 hover:border-green-500/30'
          }`}
        title="Complete for selected date"
      >
        <Check size={20} />
      </button>

      <div className="flex-1 min-w-0 ml-1">
        <h3 className="text-lg font-semibold text-white group-hover:text-gray-200 transition-colors truncate">
          {habit.name}
        </h3>
        <div className="flex items-center gap-3">
          <p className="text-sm text-gray-400 capitalize truncate">
            {habit.type === 'START' ? 'Build' : 'Quit'} • {habit.timeframe}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            {pastDays.map((day, i) => {
              const dayLetters = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
              const isToday = day.dateStr === normalizeDateStr(new Date());
              return (
                <div key={day.dateStr} title={day.dateStr} className="flex flex-col items-center gap-1">
                  <span className={`text-[9px] leading-none font-medium ${isToday ? 'text-white' : 'text-gray-500'}`}>
                    {dayLetters[i]}
                  </span>
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${day.isMet ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]' : 'bg-gray-700'}`}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="hidden sm:flex flex-col items-end shrink-0 mr-4">
        <span className="text-xl font-bold text-white flex items-center gap-1.5">
          <Flame className="w-4 h-4 text-orange-500" />
          {stats.currentStreak}
        </span>
        <span className="text-[10px] text-gray-500 uppercase tracking-wider">Streak</span>
      </div>

      <div
        className="flex flex-col items-center shrink-0 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1 bg-gray-800/80 rounded-lg p-1 border border-gray-700/50">
          <button
            onClick={() => onLog(activeDateStr, Math.max(0, activeAmount - stepAmount))}
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
            onClick={() => onLog(activeDateStr, activeAmount + stepAmount)}
            className="w-8 h-8 flex items-center justify-center rounded-md bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white transition"
          >
            <Plus size={14} />
          </button>
        </div>
        <div className="absolute top-full mt-1.5 flex items-center justify-center max-w-[90px] text-[10px] text-gray-500 font-medium capitalize w-full">
          <span className="truncate">/{habit.quota}</span>
          {habit.unit !== 'amount' && (
            <span className="shrink-0 ml-1">{habit.unit}</span>
          )}
        </div>
      </div>

      {onEdit && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="shrink-0 p-2 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition ml-2"
          title="Edit Habit"
        >
          <Edit3 size={20} />
        </button>
      )}
    </div>
  );
}
