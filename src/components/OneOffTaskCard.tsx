'use client';

import { Habit } from '../types';
import { unitLabel, formatAmount } from '../lib/habitUtils';
import { Check, Calendar, Plus, Minus } from 'lucide-react';
import { format, parseISO, isBefore, startOfDay, isSameDay } from 'date-fns';

interface Props {
  task: Habit;
  onLog: (date: string, amount: number) => void;
  onEdit: () => void;
}

export function OneOffTaskCard({
  task,
  onLog,
  onEdit
}: Props) {
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

  const getStatusBadgeStyle = () => {
    if (isCompleted) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
    if (isPastDue) return 'bg-red-500/15 text-red-400 border-red-500/30';
    return 'bg-gray-800/90 text-gray-300 border-gray-700/60';
  };

  return (
    <div
      className="w-full flex items-center justify-between px-3.5 py-2 bg-[#0c0d10] border-b border-gray-800/80 hover:bg-[#101115] transition-colors group min-h-[52px] select-none"
    >
      {/* Left Column: Checkbox + Icon + Name + Group + Due Date */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-3">
        {/* Checkbox Complete Button */}
        <button
          type="button"
          onClick={toggleComplete}
          className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all shrink-0 active:scale-95 ${
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
          onClick={onEdit}
          className="w-8 h-8 min-w-[32px] rounded flex items-center justify-center text-base shrink-0 select-none shadow-inner cursor-pointer hover:scale-105 transition"
          style={{ backgroundColor: `${task.color}20`, border: `1px solid ${task.color}40` }}
          title={`${task.name} - Click to edit`}
        >
          {task.icon}
        </div>

        {/* Task Name & Tags */}
        <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
          <h3
            onClick={onEdit}
            className={`text-xs sm:text-sm font-semibold truncate cursor-pointer transition-colors ${
              isCompleted ? 'text-gray-400 line-through' : 'text-white hover:text-blue-400'
            }`}
            title="Click to edit task"
          >
            {task.name}
          </h3>

          <div className="flex items-center gap-1.5 shrink-0">
            {task.group && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 shrink-0">
                {task.group}
              </span>
            )}

            <div className="flex items-center gap-1 text-[11px] text-gray-500 shrink-0">
              <Calendar size={11} className="shrink-0" />
              <span
                className={`font-medium ${
                  isPastDue ? 'text-red-400 font-semibold' : isTargetToday ? 'text-blue-400 font-semibold' : ''
                }`}
              >
                {isTargetToday ? 'Today' : format(targetDate, 'MMM d, yyyy')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Quota Badge & Steppers */}
      <div className="flex items-center gap-2 shrink-0 ml-auto" onClick={(e) => e.stopPropagation()}>
        {/* Progress Quota Badge */}
        <span
          onClick={onEdit}
          className={`border px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer hover:brightness-125 ${getStatusBadgeStyle()}`}
          title="Click to edit quota"
        >
          {formatAmount(currentAmt)}/{formatAmount(task.quota)} {unitLabel(task.unit)}
        </span>

        {/* Stepper Buttons */}
        <div className="flex items-center gap-0.5 bg-gray-900/90 p-0.5 rounded-lg border border-gray-800 shadow-inner">
          <button
            type="button"
            onClick={(e) => handleAdjust(e, -1)}
            disabled={currentAmt <= 0}
            className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition active:scale-95"
            title="Subtract 1"
          >
            <Minus size={11} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={(e) => handleAdjust(e, 1)}
            className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 transition active:scale-95"
            title="Add 1"
          >
            <Plus size={11} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
