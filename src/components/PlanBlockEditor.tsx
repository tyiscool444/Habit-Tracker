'use client';

import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Clock, Link2, Moon, Repeat } from 'lucide-react';
import { Habit, PlanBlock } from '../types';
import { COLORS } from '../lib/constants';
import {
  MINUTES_PER_DAY, WEEKDAYS, EVERY_DAY, WEEKDAYS_ONLY, WEEKENDS_ONLY,
  formatDuration, inputToMinutes, minutesToInput, describeRepeat, isRepeating, isDoneOn, withDoneOn,
} from '../lib/plannerUtils';
import { FormShell, FormFooter, LABEL_CLASS, INPUT_BOX_CLASS, accentClasses } from './FormFields';

export type DeleteScope = 'occurrence' | 'series';

interface Props {
  block: PlanBlock;
  occurrenceDate: string; // the day being edited (a repeating block's done state is per day)
  isNew: boolean;
  habits: Habit[];
  onSave: (block: PlanBlock) => void;
  onCancel: () => void;
  onDelete?: (scope: DeleteScope) => void;
}

const REPEAT_PRESETS = [
  { label: 'Never', days: [] as number[] },
  { label: 'Every day', days: EVERY_DAY },
  { label: 'Weekdays', days: WEEKDAYS_ONLY },
  { label: 'Weekends', days: WEEKENDS_ONLY },
];

const TEMPLATES = [
  { label: 'Sleep', icon: '😴', start: 22 * 60, end: 30 * 60, repeat: EVERY_DAY, color: '#6366f1' },
  { label: 'Work', icon: '💼', start: 9 * 60, end: 17 * 60, repeat: WEEKDAYS_ONLY, color: '#0ea5e9' },
];

const sameDays = (a: number[], b: number[]) => a.length === b.length && b.every(d => a.includes(d));

export function PlanBlockEditor({ block, occurrenceDate, isNew, habits, onSave, onCancel, onDelete }: Props) {
  const [title, setTitle] = useState(block.title);
  const [color, setColor] = useState(block.color);
  const [startInput, setStartInput] = useState(minutesToInput(block.start));
  const [endInput, setEndInput] = useState(minutesToInput(block.end));
  const [repeat, setRepeat] = useState<number[]>(block.repeat || []);
  const [habitId, setHabitId] = useState(block.habitId || '');
  const [done, setDone] = useState(isDoneOn(block, occurrenceDate));
  const [confirmDelete, setConfirmDelete] = useState(false);

  const start = inputToMinutes(startInput);
  const rawEnd = inputToMinutes(endInput);
  // An end time at or before the start means the block runs past midnight
  const end = start !== null && rawEnd !== null && rawEnd <= start ? rawEnd + MINUTES_PER_DAY : rawEnd;
  const isValidRange = start !== null && end !== null && startInput !== endInput;
  const isOvernight = isValidRange && end! > MINUTES_PER_DAY;

  const linkedHabit = habits.find(h => h.id === habitId);
  const focusWithin = accentClasses('blue').focusWithin;
  const seriesStart = isRepeating(block) ? block.date : occurrenceDate;

  const linkHabit = (id: string) => {
    setHabitId(id);
    const habit = habits.find(h => h.id === id);
    if (!habit) return;
    // Fill in the name and colour unless the user already typed a title
    if (!title.trim() || habits.some(h => h.name === title)) setTitle(habit.name);
    setColor(habit.color);
  };

  const applyTemplate = (t: typeof TEMPLATES[number]) => {
    setTitle(t.label);
    setStartInput(minutesToInput(t.start));
    setEndInput(minutesToInput(t.end));
    setRepeat(t.repeat);
    setColor(t.color);
  };

  const toggleDay = (day: number) => {
    setRepeat(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !isValidRange) return;

    let next: PlanBlock = {
      ...block,
      title: title.trim(),
      color,
      start: start!,
      end: end!,
      habitId: habitId || undefined,
      repeat: repeat.length ? repeat : undefined,
    };
    if (next.repeat) {
      next.done = undefined;
    } else {
      // Turning a series back into a one-off keeps it on the day being edited
      next = { ...next, date: occurrenceDate, doneDates: undefined, skipDates: undefined };
    }
    onSave(withDoneOn(next, occurrenceDate, done));
  };

  return (
    <FormShell
      title={isNew ? 'Plan a Time Block' : 'Edit Time Block'}
      icon={linkedHabit?.icon || '🗓️'}
      color={color}
      onCancel={onCancel}
      onSubmit={handleSubmit}
    >
      {isNew && (
        <div className="flex items-center gap-2">
          <span className={LABEL_CLASS}>Quick add:</span>
          {TEMPLATES.map(t => (
            <button
              key={t.label}
              type="button"
              onClick={() => applyTemplate(t)}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-gray-800/70 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700/60 transition"
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      )}

      <div>
        <label className={`${LABEL_CLASS} mb-1.5`}>What are you doing?</label>
        <div className={`${INPUT_BOX_CLASS} p-1.5 ${focusWithin}`}>
          <input
            type="text"
            required
            autoFocus
            className="flex-1 bg-transparent px-2 py-1 text-sm text-white placeholder-gray-500 focus:outline-none font-medium"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Deep work, Gym, Lunch..."
          />
        </div>
      </div>

      <div>
        <label className={`${LABEL_CLASS} mb-1.5`}>Time</label>
        <div className="flex items-center gap-2">
          <div className={`flex-1 gap-2 ${INPUT_BOX_CLASS} px-3 py-1.5 ${focusWithin}`}>
            <Clock size={13} className="text-blue-400 shrink-0" />
            <input
              type="time"
              step={900}
              required
              aria-label="Start time"
              className="w-full bg-transparent text-xs font-semibold text-white focus:outline-none"
              value={startInput}
              onChange={e => setStartInput(e.target.value)}
            />
          </div>
          <span className="text-gray-500 text-xs">to</span>
          <div className={`flex-1 ${INPUT_BOX_CLASS} px-3 py-1.5 ${focusWithin}`}>
            <input
              type="time"
              step={900}
              required
              aria-label="End time"
              className="w-full bg-transparent text-xs font-semibold text-white focus:outline-none"
              value={endInput}
              onChange={e => setEndInput(e.target.value)}
            />
          </div>
        </div>
        <p className={`text-[11px] mt-1.5 flex items-center gap-1 ${isValidRange ? 'text-gray-500' : 'text-red-400'}`}>
          {!isValidRange ? 'Start and end times must be different.' : (
            <>
              {isOvernight && <Moon size={11} className="text-indigo-300" />}
              {formatDuration(end! - start!)} block{isOvernight ? ' · ends the next morning' : ''}
            </>
          )}
        </p>
      </div>

      <div>
        <label className={`${LABEL_CLASS} mb-1.5 flex items-center gap-1.5`}>
          <Repeat size={12} className="text-blue-400" /> Repeat
        </label>
        <div className="flex gap-1.5">
          {WEEKDAYS.map(w => {
            const active = repeat.includes(w.day);
            return (
              <button
                key={w.day}
                type="button"
                title={w.name}
                aria-label={w.name}
                aria-pressed={active}
                onClick={() => toggleDay(w.day)}
                className={`flex-1 h-8 rounded-lg text-xs font-bold transition border ${
                  active
                    ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                    : 'bg-[#171922] text-gray-400 border-gray-700/80 hover:text-white'
                }`}
              >
                {w.short}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap mt-2">
          {REPEAT_PRESETS.map(p => (
            <button
              key={p.label}
              type="button"
              onClick={() => setRepeat(p.days)}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border transition ${
                sameDays(repeat, p.days)
                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                  : 'bg-gray-800/60 text-gray-400 border-gray-700/40 hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-gray-500 mt-1.5">
          {repeat.length
            ? `${describeRepeat(repeat)}, starting ${format(parseISO(seriesStart), 'EEE, MMM d')}. Edits apply to every day.`
            : 'Only on this day.'}
        </p>
      </div>

      <div>
        <label className={`${LABEL_CLASS} mb-1.5`}>
          Link a Habit or Task <span className="text-gray-500 font-normal normal-case">(Optional)</span>
        </label>
        <div className={`gap-2 ${INPUT_BOX_CLASS} px-3 py-1.5 ${focusWithin}`}>
          <Link2 size={13} className="text-gray-400 shrink-0" />
          <select
            className="w-full bg-transparent text-xs font-semibold text-gray-200 focus:outline-none cursor-pointer"
            value={habitId}
            onChange={e => linkHabit(e.target.value)}
          >
            <option value="" className="bg-gray-900">None</option>
            {habits.map(h => (
              <option key={h.id} value={h.id} className="bg-gray-900">
                {h.icon} {h.name}{h.isRecurring === false ? ' (task)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={`${LABEL_CLASS} mb-1.5`}>Colour</label>
        <div className="flex gap-2 flex-wrap">
          {COLORS.map(c => (
            <button
              key={c}
              type="button"
              aria-label={`Colour ${c}`}
              onClick={() => setColor(c)}
              className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 ${
                color === c ? 'border-white scale-110 ring-2 ring-blue-500/50' : 'border-transparent'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      {!isNew && (
        <label className="flex items-center gap-2 text-xs font-semibold text-gray-300 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={done}
            onChange={e => setDone(e.target.checked)}
            className="w-4 h-4 accent-emerald-500"
          />
          Mark as done{isRepeating(block) ? ` on ${format(parseISO(occurrenceDate), 'EEE, MMM d')}` : ''}
        </label>
      )}

      {confirmDelete && onDelete && (
        <div className="p-3 rounded-xl border border-red-500/30 bg-red-500/10 space-y-2">
          <p className="text-xs font-semibold text-red-200">This block repeats. What do you want to delete?</p>
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => onDelete('occurrence')}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600/80 hover:bg-red-500 text-white transition"
            >
              Only {format(parseISO(occurrenceDate), 'EEE, MMM d')}
            </button>
            <button
              type="button"
              onClick={() => onDelete('series')}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-950 hover:bg-red-900 text-red-200 border border-red-500/40 transition"
            >
              Every day
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-300 hover:bg-gray-800 transition"
            >
              Keep it
            </button>
          </div>
        </div>
      )}

      <FormFooter
        accent="blue"
        submitLabel={isNew ? 'Add to Plan' : 'Save Block'}
        onCancel={onCancel}
        onDelete={onDelete && (isRepeating(block) ? () => setConfirmDelete(true) : () => onDelete('series'))}
      />
    </FormShell>
  );
}
