'use client';

import { useState } from 'react';
import { Habit, HabitType, HabitUnit, SubTask } from '../types';
import { Trash2, Calendar, Clock, Plus, ListTodo, Check, X } from 'lucide-react';
import { UNITS, getRandomIcon, getRandomColor } from '../lib/constants';
import { addDays, endOfMonth } from 'date-fns';
import { generateId, normalizeDateStr, taskDateStr } from '../lib/habitUtils';
import { minutesToInput } from '../lib/plannerUtils';
import {
  FormShell, IdentityField, GroupField, TypeToggle, FormFooter,
  LABEL_CLASS, INPUT_BOX_CLASS, accentClasses,
} from './FormFields';

interface Props {
  initialTask?: Habit;
  existingGroups?: string[];
  onSave: (task: Habit) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

const DATE_PRESETS: { label: string; getDate: (now: Date) => Date }[] = [
  { label: 'Today', getDate: now => now },
  { label: 'Tomorrow', getDate: now => addDays(now, 1) },
  { label: 'In 3 Days', getDate: now => addDays(now, 3) },
  { label: 'In 1 Week', getDate: now => addDays(now, 7) },
  { label: 'End of Month', getDate: now => endOfMonth(now) },
];

export function TaskForm({ initialTask, existingGroups = [], onSave, onCancel, onDelete }: Props) {
  const [name, setName] = useState(initialTask?.name || '');
  const [icon, setIcon] = useState(() => initialTask?.icon || getRandomIcon());
  const [color, setColor] = useState(() => initialTask?.color || getRandomColor());
  const [group, setGroup] = useState(initialTask?.group || '');
  const [type, setType] = useState<HabitType>(initialTask?.type || 'START');
  const [unit, setUnit] = useState<HabitUnit>(initialTask?.unit || 'amount');
  const [quota, setQuota] = useState(initialTask?.quota || 1);
  // New tasks default to a deadline of today; existing tasks keep whatever they had
  const [hasDeadline, setHasDeadline] = useState(initialTask ? Boolean(initialTask.targetDate) : true);
  const [targetDate, setTargetDate] = useState(() =>
    normalizeDateStr(initialTask?.targetDate || new Date())
  );
  // "HH:mm", or empty for no particular time
  const [dueTime, setDueTime] = useState(initialTask?.dueTime !== undefined ? minutesToInput(initialTask.dueTime) : '');

  const [subtasks, setSubtasks] = useState<SubTask[]>(initialTask?.subtasks || []);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  const focusWithin = accentClasses('purple').focusWithin;

  const addSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    setSubtasks(prev => [...prev, { id: generateId(), title: newSubtaskTitle.trim(), completed: false }]);
    setNewSubtaskTitle('');
  };

  const toggleSubtask = (id: string) => {
    setSubtasks(prev => prev.map(s => s.id === id ? { ...s, completed: !s.completed } : s));
  };

  const removeSubtask = (id: string) => {
    setSubtasks(prev => prev.filter(s => s.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const deadline = hasDeadline ? normalizeDateStr(targetDate || new Date()) : undefined;
    // Without a deadline, progress is logged under the day the task was created
    const startDate = deadline ?? normalizeDateStr(initialTask?.startDate || new Date());

    // Progress is stored under the task's date, so carry it over if that date changes
    let logs = initialTask?.logs || {};
    const oldKey = initialTask ? taskDateStr(initialTask) : null;
    const newKey = deadline ?? startDate;
    if (oldKey && oldKey !== newKey && logs[oldKey] !== undefined) {
      logs = { ...logs, [newKey]: logs[oldKey] };
      delete logs[oldKey];
    }

    onSave({
      id: initialTask?.id || generateId(),
      name: name.trim(),
      icon,
      color,
      group: group.trim() || undefined,
      type,
      unit,
      quota: quota || 1,
      timeframe: 'daily',
      isRecurring: false,
      targetDate: deadline,
      dueTime: deadline && dueTime ? Number(dueTime.slice(0, 2)) * 60 + Number(dueTime.slice(3, 5)) : undefined,
      startDate,
      logs,
      subtasks: subtasks.length > 0 ? subtasks : undefined,
    });
  };

  return (
    <FormShell
      title={initialTask ? 'Edit One-Off Task' : 'New One-Off Task'}
      icon={icon}
      color={color}
      onCancel={onCancel}
      onSubmit={handleSubmit}
    >
      <IdentityField
        label="Task Details"
        accent="purple"
        name={name}
        onNameChange={setName}
        placeholder="e.g. Finish tax return, Buy birthday gift..."
        icon={icon}
        onIconChange={setIcon}
        color={color}
        onColorChange={setColor}
      />

      <GroupField
        accent="purple"
        value={group}
        onChange={setGroup}
        existingGroups={existingGroups}
        placeholder="e.g. Work Projects, Home, Personal..."
        emptyHint="No groups created yet. Type above to assign a group."
      />

      {/* Optional deadline & quick presets */}
      <div>
        <label className={`${LABEL_CLASS} mb-1.5`}>
          Deadline <span className="text-gray-500 font-normal normal-case">(optional)</span>
        </label>
        {hasDeadline ? (
          <div className="flex items-center gap-2">
            <div className={`flex-1 gap-2 ${INPUT_BOX_CLASS} px-3 py-1.5 ${focusWithin}`}>
              <Calendar size={14} className="text-purple-400 shrink-0" />
              <input
                type="date"
                required
                aria-label="Due date"
                className="w-full bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
                value={targetDate}
                onChange={e => setTargetDate(e.target.value)}
              />
              <button
                type="button"
                aria-label="Remove deadline"
                title="Remove deadline"
                onClick={() => setHasDeadline(false)}
                className="text-gray-500 hover:text-white shrink-0"
              >
                <X size={12} />
              </button>
            </div>
            <div className={`w-36 gap-2 ${INPUT_BOX_CLASS} px-3 py-1.5 ${focusWithin}`}>
              <Clock size={14} className="text-purple-400 shrink-0" />
              <input
                type="time"
                step={900}
                aria-label="Due time"
                className="w-full bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
                value={dueTime}
                onChange={e => setDueTime(e.target.value)}
              />
              {dueTime && (
                <button
                  type="button"
                  aria-label="Clear time"
                  onClick={() => setDueTime('')}
                  className="text-gray-500 hover:text-white shrink-0"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setHasDeadline(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-gray-700 text-xs font-semibold text-gray-400 hover:text-white hover:border-gray-500 transition"
          >
            <Calendar size={14} className="text-purple-400 shrink-0" />
            No deadline · add one
          </button>
        )}

        <div className="flex gap-1.5 flex-wrap mt-2">
          {DATE_PRESETS.map(p => (
            <button
              key={p.label}
              type="button"
              onClick={() => {
                setHasDeadline(true);
                setTargetDate(normalizeDateStr(p.getDate(new Date())));
              }}
              className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-gray-800/60 hover:bg-gray-700 text-gray-400 hover:text-white border border-gray-700/40 transition"
            >
              {p.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setHasDeadline(false)}
            className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border transition ${
              hasDeadline
                ? 'bg-gray-800/60 hover:bg-gray-700 text-gray-400 hover:text-white border-gray-700/40'
                : 'bg-purple-500/20 text-purple-300 border-purple-500/40'
            }`}
          >
            No deadline
          </button>
        </div>
      </div>

      {/* Task Type & Target Goal Row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={`${LABEL_CLASS} mb-1.5`}>Task Nature</label>
          <TypeToggle
            value={type}
            onChange={setType}
            options={[
              { value: 'START', label: 'Task', activeClass: 'bg-purple-600' },
              { value: 'STOP', label: 'Restraint', activeClass: 'bg-amber-600' },
            ]}
          />
        </div>

        <div>
          <label className={`${LABEL_CLASS} mb-1.5`}>Target & Unit</label>
          <div className="grid grid-cols-5 gap-1.5">
            <div className={`col-span-2 ${INPUT_BOX_CLASS} px-2 py-1.5 ${focusWithin}`}>
              <input
                type="number"
                min="1"
                step="any"
                required
                className="w-full bg-transparent text-xs font-bold text-white focus:outline-none"
                value={quota}
                onChange={e => setQuota(parseFloat(e.target.value) || 1)}
              />
            </div>
            <div className={`col-span-3 ${INPUT_BOX_CLASS} px-2 py-1.5 ${focusWithin}`}>
              <select
                className="w-full bg-transparent text-xs font-semibold text-gray-200 focus:outline-none cursor-pointer"
                value={unit}
                onChange={e => setUnit(e.target.value as HabitUnit)}
              >
                {UNITS.map(u => (
                  <option key={u.value} value={u.value} className="bg-gray-900 text-white">
                    {u.short}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Subtasks */}
      <div className="space-y-2 pt-1 border-t border-gray-800/60">
        <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">
          <ListTodo size={13} className="text-purple-400" />
          <span>Subtasks</span>
          {subtasks.length > 0 && (
            <span className="text-[10px] text-purple-300 font-semibold bg-purple-500/10 px-1.5 py-0.2 rounded border border-purple-500/20">
              {subtasks.filter(s => s.completed).length}/{subtasks.length}
            </span>
          )}
        </label>

        <div className="flex gap-2">
          <input
            type="text"
            value={newSubtaskTitle}
            onChange={(e) => setNewSubtaskTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addSubtask();
              }
            }}
            placeholder="Add a subtask step..."
            className="flex-1 bg-[#171922] border border-gray-700/80 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition"
          />
          <button
            type="button"
            onClick={addSubtask}
            disabled={!newSubtaskTitle.trim()}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1"
          >
            <Plus size={13} />
            <span>Add</span>
          </button>
        </div>

        {subtasks.length > 0 && (
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {subtasks.map((st) => (
              <div
                key={st.id}
                className="flex items-center justify-between gap-2 p-2 rounded-xl bg-[#141620] border border-gray-800/80 group/sub"
              >
                <div
                  onClick={() => toggleSubtask(st.id)}
                  className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer select-none"
                >
                  <div
                    className={`w-4 h-4 rounded flex items-center justify-center border transition shrink-0 ${
                      st.completed
                        ? 'bg-purple-600 border-purple-500 text-white'
                        : 'border-gray-600 bg-gray-900/60 text-transparent'
                    }`}
                  >
                    <Check size={10} strokeWidth={3} className={st.completed ? 'opacity-100' : 'opacity-0'} />
                  </div>
                  <span className={`text-xs truncate transition ${st.completed ? 'text-gray-500 line-through' : 'text-gray-200'}`}>
                    {st.title}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeSubtask(st.id)}
                  className="p-1 text-gray-500 hover:text-red-400 rounded transition opacity-60 group-hover/sub:opacity-100"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <FormFooter
        accent="purple"
        submitLabel={initialTask ? 'Save Task' : 'Create Task'}
        onCancel={onCancel}
        onDelete={initialTask ? onDelete : undefined}
      />
    </FormShell>
  );
}
