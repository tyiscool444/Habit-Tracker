'use client';

import { useState } from 'react';
import { Habit, HabitType, Timeframe, HabitUnit } from '../types';

interface Props {
  onSave: (habit: Habit) => void;
  onCancel: () => void;
}

const ICONS = ['💪', '🚬', '🍷', '📖', '💻', '❤️', '☕', '🏃', '🧘', '💊', '🥗', '💧'];
const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef'];
const UNITS: { value: HabitUnit; label: string }[] = [
  { value: 'amount', label: 'Amount (x)' },
  { value: 'grams', label: 'Grams (g)' },
  { value: 'mL', label: 'Millilitres (mL)' },
  { value: 'minutes', label: 'Minutes (min)' },
  { value: 'hours', label: 'Hours (hr)' },
];

export function HabitForm({ onSave, onCancel }: Props) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(ICONS[0]);
  const [color, setColor] = useState(COLORS[6]);
  const [type, setType] = useState<HabitType>('START');
  const [unit, setUnit] = useState<HabitUnit>('amount');
  const [quota, setQuota] = useState(1);
  const [timeframe, setTimeframe] = useState<Timeframe>('daily');
  const [startDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newHabit: Habit = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      icon,
      color,
      type,
      unit,
      quota,
      timeframe,
      startDate,
      logs: {},
    };
    onSave(newHabit);
  };

  const isStop = type === 'STOP';

  return (
    <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl w-full max-w-lg mx-auto shadow-2xl">
      <h2 className="text-2xl font-bold text-white mb-6">Create New Habit</h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Habit Name</label>
          <input
            type="text" required
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
            value={name} onChange={e => setName(e.target.value)}
            placeholder="e.g. Go to the gym"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Type</label>
            <select
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              value={type} onChange={e => setType(e.target.value as HabitType)}
            >
              <option value="START">Build (Start doing)</option>
              <option value="STOP">Quit (Stop doing)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Timeframe</label>
            <select
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              value={timeframe} onChange={e => setTimeframe(e.target.value as Timeframe)}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Unit of Measurement</label>
            <select
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              value={unit} onChange={e => setUnit(e.target.value as HabitUnit)}
            >
              {UNITS.map(u => (
                <option key={u.value} value={u.value}>{u.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              {isStop ? 'Allowance' : 'Quota'} per {timeframe}
            </label>
            <input
              type="number" min={isStop ? '0' : '1'} step="any" required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              value={quota} onChange={e => setQuota(parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Icon</label>
          <div className="flex gap-2 flex-wrap">
            {ICONS.map(ic => (
              <button
                key={ic} type="button"
                className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center border-2 transition-all ${icon === ic ? 'border-white scale-110' : 'border-transparent bg-gray-800 hover:border-gray-600'}`}
                onClick={() => setIcon(ic)}
              >
                {ic}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Color</label>
          <div className="flex gap-2 flex-wrap">
            {COLORS.map(c => (
              <button
                key={c} type="button"
                className={`w-8 h-8 rounded-full border-2 transition-all ${color === c ? 'border-white scale-110' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-8">
          <button
            type="button" onClick={onCancel}
            className="px-5 py-2 rounded-lg font-medium text-gray-300 hover:text-white hover:bg-gray-800 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-500 transition"
          >
            Save Habit
          </button>
        </div>
      </form>
    </div>
  );
}
