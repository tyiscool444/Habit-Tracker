'use client';

import { useMemo, useState } from 'react';
import { addDays } from 'date-fns';
import { CalendarCheck, CalendarClock, Dices, ListTodo, Plus, Trash2, X } from 'lucide-react';
import { Habit } from '../types';
import { generateId, isTaskComplete, normalizeDateStr, taskDueDate } from '../lib/habitUtils';
import { getRandomColor, getRandomIcon } from '../lib/constants';
import { OneOffTaskCard } from './OneOffTaskCard';

type ColumnId = 'now' | 'upcoming' | 'none';

const COLUMNS: { id: ColumnId; title: string; icon: typeof ListTodo; iconClass: string; empty: string; placeholder: string }[] = [
  { id: 'now', title: 'Today & overdue', icon: CalendarCheck, iconClass: 'text-blue-400', empty: 'Nothing due today.', placeholder: 'Add a task for today…' },
  { id: 'upcoming', title: 'Upcoming', icon: CalendarClock, iconClass: 'text-purple-400', empty: 'Nothing coming up.', placeholder: 'Add a task for tomorrow…' },
  { id: 'none', title: 'No deadline', icon: ListTodo, iconClass: 'text-gray-400', empty: 'No open-ended to-dos.', placeholder: 'Add a to-do…' },
];

function columnFor(task: Habit, todayStr: string): ColumnId {
  const due = taskDueDate(task);
  if (due === null) return 'none';
  return due <= todayStr ? 'now' : 'upcoming';
}

/** Unfinished first, then by deadline, time of day (untimed last) and name. */
function byStatusThenDeadline(a: Habit, b: Habit): number {
  const doneDiff = Number(isTaskComplete(a)) - Number(isTaskComplete(b));
  if (doneDiff) return doneDiff;
  const dueA = taskDueDate(a);
  const dueB = taskDueDate(b);
  if (dueA !== dueB) {
    if (dueA === null) return 1;
    if (dueB === null) return -1;
    return dueA < dueB ? -1 : 1;
  }
  return (a.dueTime ?? Infinity) - (b.dueTime ?? Infinity) || a.name.localeCompare(b.name);
}

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/** A plain check-off task, due according to the column it was typed into. */
function quickTask(name: string, column: ColumnId): Habit {
  const today = new Date();
  const due = column === 'now' ? normalizeDateStr(today)
    : column === 'upcoming' ? normalizeDateStr(addDays(today, 1))
    : undefined;
  return {
    id: generateId(),
    name,
    icon: getRandomIcon(),
    color: getRandomColor(),
    type: 'START',
    unit: 'amount',
    quota: 1,
    timeframe: 'daily',
    isRecurring: false,
    checkOnly: true,
    targetDate: due,
    startDate: due ?? normalizeDateStr(today),
    logs: {},
  };
}

interface Props {
  tasks: Habit[];
  onCreateTask: (task: Habit) => void;
  onEdit: (taskId: string) => void;
  onUpdateTask: (task: Habit) => void;
  onDeleteTasks: (taskIds: string[]) => void;
  hoveredTaskId: string | null;
  onHoverTask: (taskId: string | null) => void;
}

/** One-off tasks as three cards: Today & overdue, Upcoming and No deadline. */
export function OneOffTasksSection({ tasks, onCreateTask, onEdit, onUpdateTask, onDeleteTasks, hoveredTaskId, onHoverTask }: Props) {
  // Random pick: one task at a time, shown in the card it was rolled from
  const [pick, setPick] = useState<{ id: string; column: ColumnId } | null>(null);

  const todayStr = normalizeDateStr(new Date());
  const completedIds = useMemo(() => tasks.filter(isTaskComplete).map(t => t.id), [tasks]);

  const columns = useMemo(() => {
    const byColumn: Record<ColumnId, Habit[]> = { now: [], upcoming: [], none: [] };
    [...tasks].sort(byStatusThenDeadline).forEach(t => byColumn[columnFor(t, todayStr)].push(t));
    return byColumn;
  }, [tasks, todayStr]);
  const overdueCount = columns.now.filter(t => taskDueDate(t)! < todayStr && !isTaskComplete(t)).length;

  const pickRandom = (column: ColumnId) => {
    const unfinished = columns[column].filter(t => !isTaskComplete(t));
    const pool = unfinished.length > 1 ? unfinished.filter(t => t.id !== pick?.id) : unfinished;
    if (pool.length === 0) return;
    const choice = randomItem(pool);
    setPick({ id: choice.id, column });
    requestAnimationFrame(() => {
      document.getElementById(`task-${choice.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <h2 className="text-xs font-bold text-white tracking-wide uppercase mr-1">One-Off Tasks & Goals</h2>
        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-gray-900 border border-gray-700/60 text-gray-300">
          <span className="text-emerald-400 font-bold">{completedIds.length}</span> of {tasks.length} done
        </span>
        {completedIds.length > 0 && (
          <button
            type="button"
            onClick={() => onDeleteTasks(completedIds)}
            className="ml-auto px-2.5 py-0.5 text-xs font-semibold rounded-lg text-red-400 hover:bg-red-500/10 border border-red-500/30 transition flex items-center gap-1.5"
          >
            <Trash2 size={12} />
            Clear completed ({completedIds.length})
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {COLUMNS.map(col => {
          const items = columns[col.id];
          const Icon = col.icon;
          const canRoll = items.some(t => !isTaskComplete(t));
          const picked = pick?.column === col.id ? items.find(t => t.id === pick.id) : undefined;
          return (
            <div key={col.id} className="min-w-0 bg-[#090a0d] border border-gray-800 rounded-xl overflow-hidden shadow-2xl flex flex-col">
              <div className="flex items-center gap-2 px-3 py-2.5 bg-[#0e1015] border-b border-gray-800">
                <Icon size={14} className={col.iconClass} />
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-200">{col.title}</span>
                <span className="text-[10px] font-semibold text-gray-500">{items.length}</span>
                <div className="ml-auto flex items-center gap-2">
                  {col.id === 'now' && overdueCount > 0 && (
                    <span className="text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/30 px-1.5 py-px rounded-full">
                      {overdueCount} overdue
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => pickRandom(col.id)}
                    disabled={!canRoll}
                    aria-label={`Pick a random task from ${col.title}`}
                    title="Pick a random task"
                    className="p-1 rounded-md text-gray-400 hover:text-purple-300 hover:bg-purple-500/10 transition disabled:opacity-30 disabled:cursor-not-allowed active:scale-90"
                  >
                    <Dices size={15} />
                  </button>
                </div>
              </div>

              {picked && (
                <div className="flex items-center gap-2 px-3 py-1.5 border-b border-purple-500/30 bg-purple-500/10">
                  <span className="flex-1 min-w-0 truncate text-[11px] text-gray-300">
                    {isTaskComplete(picked) ? 'Done, nice! ' : 'Do this: '}
                    <span className="font-bold text-white">{picked.icon} {picked.name}</span>
                  </span>
                  {items.some(t => t.id !== picked.id && !isTaskComplete(t)) && (
                    <button
                      type="button"
                      onClick={() => pickRandom(col.id)}
                      className="shrink-0 px-1.5 py-0.5 rounded-md text-[11px] font-semibold text-purple-200 hover:text-white hover:bg-purple-500/20 transition"
                    >
                      Again
                    </button>
                  )}
                  <button type="button" onClick={() => setPick(null)} aria-label="Dismiss pick" className="shrink-0 text-gray-400 hover:text-white">
                    <X size={12} />
                  </button>
                </div>
              )}

              {items.length === 0 ? (
                <p className="py-5 text-center text-xs text-gray-600">{col.empty}</p>
              ) : (
                <div className="flex flex-col divide-y divide-gray-800/80">
                  {items.map(task => (
                    <OneOffTaskCard
                      key={task.id}
                      task={task}
                      onEdit={() => onEdit(task.id)}
                      onUpdateTask={onUpdateTask}
                      highlighted={hoveredTaskId === task.id || pick?.id === task.id}
                      onHoverChange={(hovering) => onHoverTask(hovering ? task.id : null)}
                    />
                  ))}
                </div>
              )}

              <QuickAdd placeholder={col.placeholder} onAdd={(name) => onCreateTask(quickTask(name, col.id))} />
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** Type a name and press Enter to add a check-off task. */
function QuickAdd({ placeholder, onAdd }: { placeholder: string; onAdd: (name: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const name = value.trim();
        if (!name) return;
        onAdd(name);
        setValue('');
      }}
      className="flex items-center gap-2 px-3 py-2 border-t border-gray-800/80 bg-[#0b0c10] focus-within:bg-[#0f1117] transition-colors"
    >
      <Plus size={14} className="text-gray-500 shrink-0" />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="flex-1 min-w-0 bg-transparent text-xs text-white placeholder-gray-600 focus:outline-none py-1"
      />
    </form>
  );
}
