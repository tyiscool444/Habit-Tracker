'use client';

import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { Habit, HabitType, Timeframe, HabitUnit } from '../types';
import { UNITS, getRandomIcon, getRandomColor } from '../lib/constants';
import { generateId, normalizeDateStr } from '../lib/habitUtils';
import {
  FormShell, IdentityField, GroupField, TypeToggle, FormFooter,
  LABEL_CLASS, INPUT_BOX_CLASS, accentClasses,
} from './FormFields';

interface Props {
  initialHabit?: Habit;
  existingGroups?: string[];
  onSave: (habit: Habit) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

const TIMEFRAME_LABELS: Record<Timeframe, string> = { daily: 'Day', weekly: 'Wk', monthly: 'Mo' };

export function HabitForm({ initialHabit, existingGroups = [], onSave, onCancel, onDelete }: Props) {
  const [name, setName] = useState(initialHabit?.name || '');
  const [icon, setIcon] = useState(() => initialHabit?.icon || getRandomIcon());
  const [color, setColor] = useState(() => initialHabit?.color || getRandomColor());
  const [group, setGroup] = useState(initialHabit?.group || '');
  const [type, setType] = useState<HabitType>(initialHabit?.type || 'START');
  const [unit, setUnit] = useState<HabitUnit>(initialHabit?.unit || 'amount');
  const [quota, setQuota] = useState(initialHabit?.quota || 1);
  const [timeframe, setTimeframe] = useState<Timeframe>(initialHabit?.timeframe || 'daily');
  const [startDate, setStartDate] = useState(() => normalizeDateStr(initialHabit?.startDate || new Date()));

  const focusWithin = accentClasses('blue').focusWithin;
  const isStop = type === 'STOP';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      id: initialHabit?.id || generateId(),
      name: name.trim(),
      icon,
      color,
      group: group.trim() || undefined,
      type,
      unit,
      quota: quota || 1,
      timeframe,
      isRecurring: true,
      startDate: normalizeDateStr(startDate || new Date()),
      logs: initialHabit?.logs || {},
    });
  };

  return (
    <FormShell
      title={initialHabit ? 'Edit Recurring Habit' : 'New Recurring Habit'}
      icon={icon}
      color={color}
      onCancel={onCancel}
      onSubmit={handleSubmit}
    >
      <IdentityField
        label="Habit Details"
        accent="blue"
        name={name}
        onNameChange={setName}
        placeholder="e.g. Read books, Gym, Hydrate..."
        icon={icon}
        onIconChange={setIcon}
        color={color}
        onColorChange={setColor}
      />

      <GroupField
        accent="blue"
        value={group}
        onChange={setGroup}
        existingGroups={existingGroups}
        placeholder="e.g. Morning Routine, Health & Fitness..."
        emptyHint="No groups created yet. Type above to create one (e.g. Morning, Health, Work)."
      />

      {/* Goal Type & Timeframe Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={`${LABEL_CLASS} mb-1.5`}>Goal Type</label>
          <TypeToggle
            value={type}
            onChange={setType}
            options={[
              { value: 'START', label: 'Build', activeClass: 'bg-blue-600' },
              { value: 'STOP', label: 'Quit', activeClass: 'bg-amber-600' },
            ]}
          />
        </div>

        <div>
          <label className={`${LABEL_CLASS} mb-1.5`}>Frequency</label>
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
                {TIMEFRAME_LABELS[tf]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Goal / Allowance & Unit */}
      <div>
        <label className={`${LABEL_CLASS} mb-1.5`}>
          {isStop ? 'Allowance Limit' : 'Target Goal'} & Unit
        </label>
        <div className="grid grid-cols-5 gap-2">
          <div className={`col-span-2 ${INPUT_BOX_CLASS} px-3 py-1.5 ${focusWithin}`}>
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

          <div className={`col-span-3 ${INPUT_BOX_CLASS} px-3 py-1.5 ${focusWithin}`}>
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

      {/* Start Date */}
      <div>
        <label className={`${LABEL_CLASS} mb-1.5`}>Start Date</label>
        <div className={`gap-2 ${INPUT_BOX_CLASS} px-3 py-1.5 ${focusWithin}`}>
          <Calendar size={14} className="text-blue-400 shrink-0" />
          <input
            type="date"
            required
            className="w-full bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
          />
        </div>
        <p className="text-[11px] text-gray-500 mt-1.5">
          Days before this aren&apos;t scored, so a Quit habit isn&apos;t counted as clean before you started it.
        </p>
      </div>

      <FormFooter
        accent="blue"
        submitLabel={initialHabit ? 'Save Changes' : 'Create Habit'}
        onCancel={onCancel}
        onDelete={initialHabit ? onDelete : undefined}
      />
    </FormShell>
  );
}
