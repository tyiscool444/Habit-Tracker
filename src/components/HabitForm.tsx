'use client';

import { useState, useMemo } from 'react';
import { Habit, HabitType, Timeframe, HabitUnit } from '../types';
import { X, Trash2, Tag, Shuffle } from 'lucide-react';
import { ICONS, COLORS, UNITS, getRandomIcon, getRandomColor } from '../lib/constants';
import { normalizeDateStr } from '../lib/habitUtils';

interface Props {
  initialHabit?: Habit;
  existingGroups?: string[];
  onSave: (habit: Habit) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

export function HabitForm({ initialHabit, existingGroups = [], onSave, onCancel, onDelete }: Props) {
  const [name, setName] = useState(initialHabit?.name || '');
  const [icon, setIcon] = useState(() => initialHabit?.icon || getRandomIcon());
  const [color, setColor] = useState(() => initialHabit?.color || getRandomColor());
  const [group, setGroup] = useState(initialHabit?.group || '');
  const [type, setType] = useState<HabitType>(initialHabit?.type || 'START');
  const [unit, setUnit] = useState<HabitUnit>(initialHabit?.unit || 'amount');
  const [quota, setQuota] = useState(initialHabit?.quota || 1);
  const [timeframe, setTimeframe] = useState<Timeframe>(initialHabit?.timeframe || 'daily');
  const [startDate] = useState(initialHabit?.startDate ? normalizeDateStr(initialHabit.startDate) : normalizeDateStr(new Date()));
  
  // Popover Drawer states
  const [activePicker, setActivePicker] = useState<'icon' | 'color' | null>(null);

  const availableGroups = useMemo(() => {
    return Array.from(new Set((existingGroups || []).filter(g => Boolean(g && g.trim()))));
  }, [existingGroups]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const habitToSave: Habit = {
      id: initialHabit?.id || Math.random().toString(36).substr(2, 9),
      name: name.trim(),
      icon,
      color,
      group: group.trim() ? group.trim() : undefined,
      type,
      unit,
      quota: quota || 1,
      timeframe,
      isRecurring: true,
      startDate,
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
            className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shadow-inner transition-colors"
            style={{ backgroundColor: `${color}25`, border: `1px solid ${color}60` }}
          >
            {icon}
          </div>
          <h2 className="text-base font-bold text-gray-100 tracking-tight">
            {initialHabit ? 'Edit Recurring Habit' : 'New Recurring Habit'}
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
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400">
              Habit Details
            </label>
            <button
              type="button"
              onClick={() => {
                setIcon(getRandomIcon());
                setColor(getRandomColor());
              }}
              className="text-[11px] font-medium text-gray-400 hover:text-blue-400 flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded-md hover:bg-gray-800/80 active:scale-95"
            >
              <Shuffle size={11} />
              <span>Randomize</span>
            </button>
          </div>
          <div className="flex items-center gap-2 bg-[#171922] border border-gray-700/80 rounded-xl p-1.5 focus-within:border-blue-500 transition-colors shadow-inner">
            {/* Quick Icon Button */}
            <button
              type="button"
              onClick={() => setActivePicker(activePicker === 'icon' ? null : 'icon')}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-xl bg-gray-800 hover:bg-gray-700 border border-gray-700/70 transition shrink-0 active:scale-95"
            >
              {icon}
            </button>

            {/* Quick Color Swatch Button */}
            <button
              type="button"
              onClick={() => setActivePicker(activePicker === 'color' ? null : 'color')}
              className="w-9 h-9 rounded-lg flex items-center justify-center bg-gray-800 hover:bg-gray-700 border border-gray-700/70 transition shrink-0 active:scale-95 group/col"
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

        {/* Expandable Mini Pickers */}
        {activePicker === 'icon' && (
          <div className="bg-[#181b24] p-3 rounded-xl border border-gray-700 shadow-xl space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-gray-400">
              <span>Choose an Icon</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIcon(getRandomIcon())}
                  className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-gray-800 transition"
                >
                  <Shuffle size={10} /> Random
                </button>
                <button 
                  type="button" 
                  onClick={() => setActivePicker(null)} 
                  className="hover:text-white"
                >
                  Done
                </button>
              </div>
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
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setColor(getRandomColor())}
                  className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-gray-800 transition"
                >
                  <Shuffle size={10} /> Random
                </button>
                <button 
                  type="button" 
                  onClick={() => setActivePicker(null)} 
                  className="hover:text-white"
                >
                  Done
                </button>
              </div>
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

        {/* Group / Category Section */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400">
              Group / Category <span className="text-gray-500 font-normal normal-case">(Optional)</span>
            </label>
            {group.trim() && (
              <button
                type="button"
                onClick={() => setGroup('')}
                className="text-[10px] font-semibold text-gray-400 hover:text-red-400 transition"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 bg-[#171922] border border-gray-700/80 rounded-xl px-3 py-1.5 focus-within:border-blue-500 transition-colors shadow-inner">
            <Tag size={13} className="text-gray-400 shrink-0" />
            <input
              type="text"
              className="flex-1 bg-transparent text-xs text-white placeholder-gray-500 focus:outline-none font-medium"
              value={group}
              onChange={e => setGroup(e.target.value)}
              placeholder="e.g. Morning Routine, Health & Fitness..."
            />
          </div>

          {/* User-created Group Chips */}
          {availableGroups.length > 0 ? (
            <div className="space-y-1 mt-2">
              <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Existing Groups:</span>
              <div className="flex gap-1.5 flex-wrap max-h-20 overflow-y-auto no-scrollbar pt-0.5">
                {availableGroups.map(g => {
                  const isSelected = group.trim().toLowerCase() === g.toLowerCase();
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGroup(isSelected ? '' : g)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1 ${
                        isSelected
                          ? 'bg-purple-600/30 text-purple-300 border border-purple-500/60 shadow-sm font-semibold'
                          : 'bg-gray-800/70 text-gray-400 hover:text-gray-200 hover:bg-gray-700 border border-gray-700/50'
                      }`}
                    >
                      {isSelected && <span className="text-[9px]">✓</span>}
                      <span>{g}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-gray-500 mt-1.5 italic">
              No groups created yet. Type above to create one (e.g. Morning, Health, Work).
            </p>
          )}
        </div>

        {/* Goal Type & Timeframe Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Build vs Quit Segmented Control */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
              Goal Type
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

          {/* Timeframe Selector */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
              Frequency
            </label>
            <div className="grid grid-cols-3 gap-1 bg-[#171922] p-1 rounded-xl border border-gray-800">
              {(['daily', 'weekly', 'monthly'] as const).map(tf => (
                <button
                  key={tf}
                  type="button"
                  onClick={() => setTimeframe(tf)}
                  className={`py-1.5 text-[11px] font-semibold rounded-lg capitalize transition-all ${
                    timeframe === tf
                      ? 'bg-gray-800 text-blue-400 border border-blue-500/40 shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {tf === 'daily' ? 'Day' : tf === 'weekly' ? 'Wk' : 'Mo'}
                </button>
              ))}
            </div>
          </div>
        </div>

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
