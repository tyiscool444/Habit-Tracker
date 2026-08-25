'use client';

import { Habit } from '../types';
import { unitLabel } from '../lib/habitUtils';
import { Check, Calendar, Plus, Minus, CheckCircle2, Circle } from 'lucide-react';
import { format, parseISO, isBefore, startOfDay, isSameDay } from 'date-fns';

interface Props {
  task: Habit;
  onLog: (date: string, amount: number) => void;
  onEdit: () => void;
}

export function OneOffTaskCard({ task, onLog, onEdit }: Props) {
  const targetDateStr = task.targetDate || task.startDate;
  const targetDate = parseISO(targetDateStr);
  const currentAmt = task.logs[targetDateStr] || 0;
  const today = startOfDay(new Date());

  const isCompleted = task.type === 'START' ? currentAmt >= task.quota : currentAmt <= task.quota && currentAmt > 0;
  const isTargetToday = isSameDay(targetDate, today);
  const isPastDue = isBefore(targetDate, today) && !isCompleted;

  const toggleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (task.type === 'START') {
      const nextAmt = isCompleted ? 0 : task.quota;
      onLog(targetDateStr, nextAmt);
    } else {
      const nextAmt = isCompleted ? task.quota + 1 : 0;
      onLog(targetDateStr, nextAmt);
    }
  };

  const handleAdjust = (e: React.MouseEvent, delta: number) => {
    e.stopPropagation();
    const nextAmt = Math.max(0, currentAmt + delta);
    onLog(targetDateStr, nextAmt);
  };

  return (
    <div
      onClick={onEdit}
      className={`group flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
        isCompleted
          ? 'bg-[#0f1412] border-emerald-500/30 hover:border-emerald-500/50'
          : isPastDue
          ? 'bg-[#181113] border-red-500/30 hover:border-red-500/50'
          : 'bg-[#111318] border-gray-800 hover:border-gray-700 hover:bg-[#151821]'
      }`}
    >
      {/* Left: Checkmark checkbox & Habit Title */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <button
          type="button"
          onClick={toggleComplete}
          className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all shrink-0 ${
            isCompleted
              ? 'bg-emerald-500 border-emerald-400 text-white shadow-md shadow-emerald-500/20'
              : 'border-gray-700 bg-gray-900/80 hover:border-gray-500 text-transparent'
          }`}
          title={isCompleted ? 'Mark as incomplete' : 'Mark as completed'}
        >
          <Check size={14} strokeWidth={3} className={isCompleted ? 'opacity-100' : 'opacity-0'} />
        </button>

        {/* Icon */}
        <div
          className="w-8 h-8 min-w-[32px] rounded-lg flex items-center justify-center text-base shrink-0 select-none shadow-inner"
          style={{ backgroundColor: `${task.color}20`, border: `1px solid ${task.color}40` }}
        >
          {task.icon}
        </div>

        {/* Name & Target Date info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4
              className={`text-sm font-semibold truncate transition-colors ${
                isCompleted ? 'text-gray-400 line-through' : 'text-gray-100 group-hover:text-blue-400'
              }`}
            >
              {task.name}
            </h4>
            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-gray-800/80 text-gray-400 border border-gray-700/60 shrink-0">
              {task.type === 'START' ? 'Task' : 'Restraint'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
            <Calendar size={12} className="shrink-0" />
            <span
              className={`font-medium ${
                isPastDue ? 'text-red-400 font-semibold' : isTargetToday ? 'text-blue-400 font-semibold' : ''
              }`}
            >
              {isTargetToday ? 'Due today' : format(targetDate, 'EEE, MMM d, yyyy')}
            </span>
          </div>
        </div>
      </div>

      {/* Right: Progress & Counter Adjusters */}
      <div className="flex items-center gap-3 shrink-0 ml-3" onClick={(e) => e.stopPropagation()}>
        {/* Value badge */}
        <div
          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1 ${
            isCompleted
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
              : isPastDue
              ? 'bg-red-500/15 text-red-400 border-red-500/30'
              : 'bg-gray-900 text-gray-300 border-gray-800'
          }`}
        >
          <span>
            {currentAmt}/{task.quota} {unitLabel(task.unit)}
          </span>
        </div>

        {/* Quick Stepper Buttons */}
        <div className="flex items-center gap-1 bg-gray-900 p-0.5 rounded-lg border border-gray-800 shadow-inner">
          <button
            type="button"
            onClick={(e) => handleAdjust(e, -1)}
            disabled={currentAmt <= 0}
            className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition"
            title="Subtract 1"
          >
            <Minus size={11} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={(e) => handleAdjust(e, 1)}
            className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 transition"
            title="Add 1"
          >
            <Plus size={11} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
