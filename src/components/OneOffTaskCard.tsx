'use client';

import { useState } from 'react';
import { Habit, SubTask } from '../types';
import { unitLabel, formatAmount, normalizeDateStr } from '../lib/habitUtils';
import { Check, Calendar, Plus, Minus, ChevronDown, ListChecks, Trash2 } from 'lucide-react';
import { format, parseISO, isBefore, startOfDay, isSameDay } from 'date-fns';

interface Props {
  task: Habit;
  onLog: (date: string, amount: number) => void;
  onEdit: () => void;
  onUpdateTask?: (updatedTask: Habit) => void;
}

export function OneOffTaskCard({
  task,
  onLog,
  onEdit,
  onUpdateTask,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  const targetDateStr = normalizeDateStr(task.targetDate || task.startDate || new Date());
  const targetDate = parseISO(targetDateStr);
  const currentAmt = task.logs[targetDateStr] || 0;
  const today = startOfDay(new Date());

  const subtasks = task.subtasks || [];
  const completedSubtasksCount = subtasks.filter(s => s.completed).length;
  const totalSubtasksCount = subtasks.length;

  const isCompleted = task.type === 'START' ? currentAmt >= task.quota : currentAmt <= task.quota && currentAmt > 0;
  const isTargetToday = isSameDay(targetDate, today);
  const isPastDue = isBefore(targetDate, today) && !isCompleted;

  const toggleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (task.type === 'START') {
      const nextAmt = isCompleted ? 0 : task.quota;
      onLog(targetDateStr, nextAmt);
      if (subtasks.length > 0 && onUpdateTask) {
        const nextSubtasks = subtasks.map(s => ({ ...s, completed: !isCompleted }));
        onUpdateTask({ ...task, subtasks: nextSubtasks });
      }
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

  const handleToggleSubtask = (subtaskId: string) => {
    if (!onUpdateTask) return;
    const nextSubtasks = subtasks.map(s =>
      s.id === subtaskId ? { ...s, completed: !s.completed } : s
    );
    const allDone = nextSubtasks.length > 0 && nextSubtasks.every(s => s.completed);

    if (task.type === 'START') {
      if (allDone) {
        onLog(targetDateStr, task.quota);
      } else if (isCompleted) {
        onLog(targetDateStr, 0);
      }
    }

    onUpdateTask({
      ...task,
      subtasks: nextSubtasks,
    });
  };

  const handleDeleteSubtask = (subtaskId: string) => {
    if (!onUpdateTask) return;
    const nextSubtasks = subtasks.filter(s => s.id !== subtaskId);
    onUpdateTask({
      ...task,
      subtasks: nextSubtasks.length > 0 ? nextSubtasks : undefined,
    });
  };

  const handleAddSubtaskInline = () => {
    if (!newSubtaskTitle.trim() || !onUpdateTask) return;
    const newSub: SubTask = {
      id: Math.random().toString(36).substring(2, 9),
      title: newSubtaskTitle.trim(),
      completed: false,
    };
    const nextSubtasks = [...subtasks, newSub];
    onUpdateTask({
      ...task,
      subtasks: nextSubtasks,
    });
    setNewSubtaskTitle('');
  };

  const getStatusBadgeStyle = () => {
    if (isCompleted) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
    if (isPastDue) return 'bg-red-500/15 text-red-400 border-red-500/30';
    return 'bg-gray-800/90 text-gray-300 border-gray-700/60';
  };

  return (
    <div className="w-full flex flex-col border-b border-gray-800/80 select-none">
      {/* Main Task Row */}
      <div className="w-full flex items-center justify-between px-3.5 py-2 bg-[#0c0d10] hover:bg-[#101115] transition-colors group min-h-[52px]">
        {/* Left Column: Checkbox + Icon + Name + Group + Due Date + Subtasks Toggle Badge */}
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
          >
            <Check size={14} strokeWidth={3} className={isCompleted ? 'opacity-100' : 'opacity-0'} />
          </button>

          {/* Icon */}
          <div
            onClick={onEdit}
            className="w-8 h-8 min-w-[32px] rounded flex items-center justify-center text-base shrink-0 select-none shadow-inner cursor-pointer hover:scale-105 transition"
            style={{ backgroundColor: `${task.color}20`, border: `1px solid ${task.color}40` }}
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
            >
              {task.name}
            </h3>

            <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
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

              {/* Subtasks Dropdown Toggle Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(!isOpen);
                }}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border flex items-center gap-1 transition-all ${
                  isOpen
                    ? 'bg-purple-600 text-white border-purple-500 shadow-sm'
                    : totalSubtasksCount > 0
                    ? 'bg-purple-500/10 text-purple-300 border-purple-500/30 hover:bg-purple-500/20'
                    : 'bg-gray-900/60 text-gray-400 border-gray-800 hover:text-purple-300 hover:border-gray-700'
                }`}
              >
                <ListChecks size={11} className={isOpen ? 'text-white' : 'text-purple-400'} />
                <span>
                  {totalSubtasksCount > 0 ? `${completedSubtasksCount}/${totalSubtasksCount}` : 'Subtasks'}
                </span>
                <ChevronDown
                  size={11}
                  className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Quota Badge & Steppers */}
        <div className="flex items-center gap-2 shrink-0 ml-auto" onClick={(e) => e.stopPropagation()}>
          {/* Progress Quota Badge */}
          <span
            onClick={onEdit}
            className={`border px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer hover:brightness-125 ${getStatusBadgeStyle()}`}
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
            >
              <Minus size={11} strokeWidth={2.5} />
            </button>
            <button
              type="button"
              onClick={(e) => handleAdjust(e, 1)}
              className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 transition active:scale-95"
            >
              <Plus size={11} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>

      {/* Dropdown Menu for Subtasks */}
      {isOpen && (
        <div className="w-full bg-[#08090d] border-t border-gray-800/90 px-4 py-3 space-y-3 animate-in fade-in slide-in-from-top-1 duration-150 shadow-inner">
          {/* Header with Progress Bar */}
          <div className="flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <ListChecks size={13} className="text-purple-400 shrink-0" />
              <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wider">
                Subtasks Checklist
              </span>
              {totalSubtasksCount > 0 && (
                <span className="text-[10px] font-semibold text-purple-300 bg-purple-500/15 border border-purple-500/30 px-2 py-0.2 rounded-full">
                  {completedSubtasksCount} of {totalSubtasksCount} completed
                </span>
              )}
            </div>

            {totalSubtasksCount > 0 && (
              <div className="w-24 bg-gray-800/90 rounded-full h-1.5 overflow-hidden border border-gray-700/50">
                <div
                  className="bg-gradient-to-r from-purple-500 to-emerald-400 h-full rounded-full transition-all duration-300"
                  style={{ width: `${(completedSubtasksCount / totalSubtasksCount) * 100}%` }}
                />
              </div>
            )}
          </div>

          {/* Subtasks List */}
          {subtasks.length > 0 ? (
            <div className="space-y-1.5">
              {subtasks.map((st) => (
                <div
                  key={st.id}
                  className="flex items-center justify-between gap-2.5 px-3 py-1.5 rounded-xl bg-[#12141d] border border-gray-800 hover:border-gray-700/80 transition-colors group/item"
                >
                  <button
                    type="button"
                    onClick={() => handleToggleSubtask(st.id)}
                    className="flex items-center gap-2.5 flex-1 min-w-0 text-left cursor-pointer"
                  >
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center border transition-all shrink-0 ${
                        st.completed
                          ? 'bg-purple-600 border-purple-500 text-white shadow-sm'
                          : 'border-gray-600 bg-gray-900/80 text-transparent hover:border-purple-400'
                      }`}
                    >
                      <Check size={10} strokeWidth={3} className={st.completed ? 'opacity-100' : 'opacity-0'} />
                    </div>
                    <span
                      className={`text-xs transition-all ${
                        st.completed ? 'text-gray-500 line-through' : 'text-gray-200'
                      }`}
                    >
                      {st.title}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteSubtask(st.id)}
                    className="text-gray-500 hover:text-red-400 p-1 rounded transition opacity-50 group-hover/item:opacity-100"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500 italic py-1">No subtasks yet. Add steps below.</p>
          )}

          {/* Quick Inline Add Subtask Input */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="text"
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddSubtaskInline();
                }
              }}
              placeholder="Add a new subtask step..."
              className="flex-1 bg-[#141622] border border-gray-700/70 focus:border-purple-500 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none transition"
            />
            <button
              type="button"
              onClick={handleAddSubtaskInline}
              disabled={!newSubtaskTitle.trim()}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition flex items-center gap-1 shrink-0"
            >
              <Plus size={12} />
              <span>Add</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
