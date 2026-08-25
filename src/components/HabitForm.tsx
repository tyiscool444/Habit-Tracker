'use client';

import { useState } from 'react';
import { Habit, HabitType, Timeframe, HabitUnit } from '../types';
import { X, Trash2, Calendar, Target, Repeat, Sparkles } from 'lucide-react';
import { ICONS, COLORS, UNITS } from '../lib/constants';

interface Props {
  initialHabit?: Habit;
  onSave: (habit: Habit) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

export function HabitForm({ initialHabit, onSave, onCancel, onDelete }: Props) {
  const [name, setName] = useState(initialHabit?.name || '');
  const [icon, setIcon] = useState(initialHabit?.icon || ICONS[0]);
  const [color, setColor] = useState(initialHabit?.color || COLORS[6]);
  const [type, setType] = useState<HabitType>(initialHabit?.type || 'START');
  const [isRecurring, setIsRecurring] = useState<boolean>(initialHabit?.isRecurring !== undefined ? initialHabit.isRecurring : true);
  const [unit, setUnit] = useState<HabitUnit>(initialHabit?.unit || 'amount');
  const [quota, setQuota] = useState(initialHabit?.quota || 1);
  const [timeframe, setTimeframe] = useState<Timeframe>(initialHabit?.timeframe || 'daily');
  const [targetDate, setTargetDate] = useState<string>(initialHabit?.targetDate || new Date().toISOString().split('T')[0]);
  const [startDate] = useState(initialHabit?.startDate || new Date().toISOString().split('T')[0]);
  
  // Popover Drawer states
  const [activePicker, setActivePicker] = useState<'icon' | 'color' | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const habitToSave: Habit = {
      id: initialHabit?.id || Math.random().toString(36).substr(2, 9),
      name: name.trim(),
      icon,
      color,
      type,
      unit,
      quota: quota || 1,
      timeframe: isRecurring ? timeframe : 'daily',
      isRecurring,
      targetDate: !isRecurring ? targetDate : undefined,
      startDate: !isRecurring ? (targetDate || startDate) : startDate,
      logs: initialHabit?.logs || {},
    };
    onSave(habitToSave);
  };

  const isStop = type === 'STOP';

  return (
    <div className="bg-[#111318] border border-gray-800 rounded-2xl w-full max-w-md mx-auto shadow-2xl overflow-hidden text-white font-sans animate-in fade-in zoom-in-95 duration-150">
      {/* Modal Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800/80 bg-[#151820]">
        <div className="flex items-center gap-2">
          <div 
            className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shadow-inner"
            style={{ backgroundColor: `${color}25`, border: `1px solid ${color}60` }}
          >
            {icon}
          </div>
          <h2 className="text-base font-bold text-gray-100 tracking-tight">
            {initialHabit ? 'Edit Habit' : 'New Habit'}
          </h2>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
        >
          <X size={18} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {/* Habit Name with Embedded Icon & Color Quick-Selectors */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
            Habit Details
          </label>
          <div className="flex items-center gap-2 bg-[#171922] border border-gray-700/80 rounded-xl p-1.5 focus-within:border-blue-500 transition-colors shadow-inner">
            {/* Quick Icon Button */}
            <button
              type="button"
              onClick={() => setActivePicker(activePicker === 'icon' ? null : 'icon')}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-xl bg-gray-800 hover:bg-gray-700 border border-gray-700/70 transition shrink-0 active:scale-95"
              title="Click to choose icon"
            >
              {icon}
            </button>

            {/* Quick Color Swatch Button */}
            <button
              type="button"
              onClick={() => setActivePicker(activePicker === 'color' ? null : 'color')}
              className="w-9 h-9 rounded-lg flex items-center justify-center bg-gray-800 hover:bg-gray-700 border border-gray-700/70 transition shrink-0 active:scale-95 group/col"
              title="Click to choose accent color"
            >
              <div 
                className="w-4 h-4 rounded-full border-2 border-white/40 shadow-sm group-hover/col:scale-110 transition"
                style={{ backgroundColor: color }}
              />
            </button>

            {/* Name Input */}
            <input
              type="text"
              required
              autoFocus
              className="flex-1 bg-transparent px-2 text-sm text-white placeholder-gray-500 focus:outline-none font-medium"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Read books, Gym, Hydrate..."
            />
          </div>
        </div>

        {/* Expandable Mini Pickers with Smooth Animation */}
        {activePicker === 'icon' && (
          <div className="bg-[#181b24] p-3 rounded-xl border border-gray-700 shadow-xl space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-gray-400">
              <span>Choose an Icon</span>
              <button 
                type="button" 
                onClick={() => setActivePicker(null)} 
                className="hover:text-white"
              >
                Done
              </button>
            </div>
            <div className="flex gap-1.5 flex-wrap max-h-36 overflow-y-auto p-0.5 no-scrollbar">
              {ICONS.map(ic => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => {
                    setIcon(ic);
                    setActivePicker(null);
                  }}
                  className={`w-8 h-8 rounded-lg text-base flex items-center justify-center transition-all ${
                    icon === ic 
                      ? 'bg-blue-600 border border-blue-400 scale-105 shadow-md' 
                      : 'hover:bg-gray-700 bg-gray-800/60'
                  }`}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>
        )}

        {activePicker === 'color' && (
          <div className="bg-[#181b24] p-3 rounded-xl border border-gray-700 shadow-xl space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-gray-400">
              <span>Choose Accent Color</span>
              <button 
                type="button" 
                onClick={() => setActivePicker(null)} 
                className="hover:text-white"
              >
                Done
              </button>
            </div>
            <div className="flex gap-2 flex-wrap p-0.5">
              {COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setColor(c);
                    setActivePicker(null);
                  }}
                  className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 ${
                    color === c ? 'border-white scale-110 shadow-lg ring-2 ring-blue-500/50' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Goal Type & Frequency Segmented Controls */}
        <div className="grid grid-cols-2 gap-3">
          {/* Build vs Quit Segmented Control */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
              Type
            </label>
            <div className="flex bg-[#171922] p-1 rounded-xl border border-gray-800">
              <button
                type="button"
                onClick={() => setType('START')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  type === 'START'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Build
              </button>
              <button
                type="button"
                onClick={() => setType('STOP')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  type === 'STOP'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Quit
              </button>
            </div>
          </div>

          {/* Recurring vs One-Off Segmented Control */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
              Schedule
            </label>
            <div className="flex bg-[#171922] p-1 rounded-xl border border-gray-800">
              <button
                type="button"
                onClick={() => setIsRecurring(true)}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 ${
                  isRecurring
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Repeat size={12} />
                <span>Repeat</span>
              </button>
              <button
                type="button"
                onClick={() => setIsRecurring(false)}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 ${
                  !isRecurring
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Target size={12} />
                <span>One-off</span>
              </button>
            </div>
          </div>
        </div>

        {/* Timeframe or Target Date */}
        {isRecurring ? (
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
              Timeframe
            </label>
            <div className="grid grid-cols-3 gap-1.5 bg-[#171922] p-1 rounded-xl border border-gray-800">
              {(['daily', 'weekly', 'monthly'] as const).map(tf => (
                <button
                  key={tf}
                  type="button"
                  onClick={() => setTimeframe(tf)}
                  className={`py-1.5 text-xs font-semibold rounded-lg capitalize transition-all ${
                    timeframe === tf
                      ? 'bg-gray-800 text-blue-400 border border-blue-500/40 shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
              Target Date
            </label>
            <div className="flex items-center gap-2 bg-[#171922] border border-gray-700/80 rounded-xl px-3 py-1.5 shadow-inner">
              <Calendar size={14} className="text-gray-400 shrink-0" />
              <input
                type="date"
                required
                className="w-full bg-transparent text-xs font-semibold text-white focus:outline-none"
                value={targetDate}
                onChange={e => setTargetDate(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Goal / Allowance & Unit in a Compact Single Row */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
            {isStop ? 'Allowance Limit' : 'Target Goal'} & Unit
          </label>
          <div className="grid grid-cols-5 gap-2">
            {/* Numeric Quota Input (2 cols) */}
            <div className="col-span-2 bg-[#171922] border border-gray-700/80 rounded-xl px-3 py-1.5 flex items-center shadow-inner focus-within:border-blue-500">
              <input
                type="number"
                min={isStop ? '0' : '1'}
                step="any"
                required
                className="w-full bg-transparent text-sm font-bold text-white focus:outline-none"
                value={quota}
                onChange={e => setQuota(parseFloat(e.target.value) || 0)}
              />
            </div>

            {/* Unit Dropdown Selector (3 cols) */}
            <div className="col-span-3 bg-[#171922] border border-gray-700/80 rounded-xl px-3 py-1.5 flex items-center shadow-inner focus-within:border-blue-500">
              <select
                className="w-full bg-transparent text-xs font-semibold text-gray-200 focus:outline-none cursor-pointer"
                value={unit}
                onChange={e => setUnit(e.target.value as HabitUnit)}
              >
                {UNITS.map(u => (
                  <option key={u.value} value={u.value} className="bg-gray-900 text-white">
                    {u.label} ({u.short})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-800/80 mt-2">
          {initialHabit && onDelete ? (
            <button
              type="button"
              onClick={onDelete}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-500/10 transition flex items-center gap-1.5"
            >
              <Trash2 size={13} />
              <span>Delete</span>
            </button>
          ) : <div />}

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-gray-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition-all active:scale-95"
            >
              {initialHabit ? 'Save Changes' : 'Create Habit'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
