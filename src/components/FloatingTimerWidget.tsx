'use client';

import React from 'react';
import { useHabitTimer } from '../context/TimerContext';
import { Habit } from '../types';
import { unitLabel } from '../lib/habitUtils';
import { Play, Pause, Square, ExternalLink } from 'lucide-react';

interface Props {
  habits: Habit[];
  onOpenInsights: (habitId: string) => void;
}

export function FloatingTimerWidget({ habits, onOpenInsights }: Props) {
  const {
    activeHabitId,
    isRunning,
    elapsedSeconds,
    pauseTimer,
    resumeTimer,
    stopTimer,
    formatTime,
  } = useHabitTimer();

  if (!activeHabitId) return null;

  const activeHabit = habits.find(h => h.id === activeHabitId);
  if (!activeHabit) return null;

  return (
    <div className="fixed bottom-5 right-5 z-40 animate-in slide-in-from-bottom-5 duration-300">
      <div 
        className="flex items-center gap-3 bg-[#0d1017]/95 border rounded-2xl p-3 shadow-2xl backdrop-blur-xl transition-all"
        style={{
          borderColor: isRunning ? `${activeHabit.color}60` : '#374151',
          boxShadow: isRunning ? `0 8px 32px -4px ${activeHabit.color}30, 0 0 15px ${activeHabit.color}20` : undefined,
        }}
      >
        {/* Habit Icon & Status */}
        <div 
          onClick={() => onOpenInsights(activeHabit.id)}
          className="relative w-10 h-10 rounded-xl flex items-center justify-center text-lg select-none cursor-pointer hover:scale-105 transition shadow-inner"
          style={{ backgroundColor: `${activeHabit.color}25`, border: `1px solid ${activeHabit.color}50` }}
        >
          {activeHabit.icon}
          {isRunning && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: activeHabit.color }} />
              <span className="relative inline-flex rounded-full h-3 w-3" style={{ backgroundColor: activeHabit.color }} />
            </span>
          )}
        </div>

        {/* Habit Info & Live Counter */}
        <div 
          onClick={() => onOpenInsights(activeHabit.id)}
          className="flex flex-col cursor-pointer pr-2"
        >
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-white tracking-tight max-w-[140px] truncate">
              {activeHabit.name}
            </span>
            <span className="text-[10px] font-semibold text-gray-400">
              ({unitLabel(activeHabit.unit)})
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="font-mono text-sm font-black text-emerald-400 tracking-wider">
              {formatTime(elapsedSeconds)}
            </span>
            <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${isRunning ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
              {isRunning ? 'RUNNING' : 'PAUSED'}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 border-l border-gray-800/80 pl-2">
          {isRunning ? (
            <button
              onClick={pauseTimer}
              className="w-8 h-8 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 flex items-center justify-center transition active:scale-95 shadow-sm"
            >
              <Pause size={14} fill="currentColor" />
            </button>
          ) : (
            <button
              onClick={resumeTimer}
              className="w-8 h-8 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 flex items-center justify-center transition active:scale-95 shadow-sm"
            >
              <Play size={14} fill="currentColor" />
            </button>
          )}

          <button
            onClick={stopTimer}
            className="w-8 h-8 rounded-lg bg-gray-900 hover:bg-red-500/20 text-gray-400 hover:text-red-400 border border-gray-700/80 hover:border-red-500/40 flex items-center justify-center transition active:scale-95 shadow-sm"
          >
            <Square size={12} fill="currentColor" />
          </button>

          <button
            onClick={() => onOpenInsights(activeHabit.id)}
            className="w-8 h-8 rounded-lg bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white border border-gray-700/80 flex items-center justify-center transition active:scale-95 shadow-sm"
          >
            <ExternalLink size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
