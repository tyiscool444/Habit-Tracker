'use client';

import { useMemo, useState } from 'react';
import { ArrowUpDown, Dices, Layers, PlusCircle, Target, Trash2, X } from 'lucide-react';
import { Habit } from '../types';
import { getExistingGroups, isTaskComplete, normalizeDateStr, taskDueDate } from '../lib/habitUtils';
import { OneOffTaskCard } from './OneOffTaskCard';
import { GroupedList } from './GroupedList';
import {
  SearchToggle, FilterButton, SegmentFilter, GroupFilter, ClearFiltersButton, matchesSearch, matchesGroup,
} from './ListControls';

type StatusFilter = 'all' | 'active' | 'done';
type DeadlineFilter = 'all' | 'overdue' | 'today' | 'upcoming' | 'none';
type SortKey = 'deadline' | 'name' | 'status';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'deadline', label: 'Deadline' },
  { value: 'name', label: 'Name' },
  { value: 'status', label: 'Unfinished first' },
];

/** By deadline (to-dos without one last), then time of day (untimed last), then name. */
function byDeadline(a: Habit, b: Habit): number {
  const dueA = taskDueDate(a);
  const dueB = taskDueDate(b);
  if (dueA !== dueB) {
    if (dueA === null) return 1;
    if (dueB === null) return -1;
    return dueA < dueB ? -1 : 1;
  }
  return (a.dueTime ?? Infinity) - (b.dueTime ?? Infinity) || a.name.localeCompare(b.name);
}

const SORTERS: Record<SortKey, (a: Habit, b: Habit) => number> = {
  deadline: byDeadline,
  name: (a, b) => a.name.localeCompare(b.name),
  status: (a, b) => Number(isTaskComplete(a)) - Number(isTaskComplete(b)) || byDeadline(a, b),
};

function matchesDeadline(task: Habit, filter: DeadlineFilter, todayStr: string): boolean {
  if (filter === 'all') return true;
  const due = taskDueDate(task);
  if (filter === 'none') return due === null;
  if (due === null) return false;
  if (filter === 'today') return due === todayStr;
  if (filter === 'upcoming') return due > todayStr;
  return due < todayStr && !isTaskComplete(task); // overdue
}

interface Props {
  tasks: Habit[];
  onAdd: () => void;
  onEdit: (taskId: string) => void;
  onUpdateTask: (task: Habit) => void;
  onDeleteTasks: (taskIds: string[]) => void;
  hoveredTaskId: string | null;
  onHoverTask: (taskId: string | null) => void;
}

/** The one-off task list with its own search, filters and sort. */
export function OneOffTasksSection({ tasks, onAdd, onEdit, onUpdateTask, onDeleteTasks, hoveredTaskId, onHoverTask }: Props) {
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [status, setStatus] = useState<StatusFilter>('all');
  const [deadline, setDeadline] = useState<DeadlineFilter>('all');
  const [group, setGroup] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('deadline');
  const [grouped, setGrouped] = useState(true);
  const [pickedId, setPickedId] = useState<string | null>(null);

  const todayStr = normalizeDateStr(new Date());
  const groups = useMemo(() => getExistingGroups(tasks), [tasks]);
  const completedIds = useMemo(() => tasks.filter(isTaskComplete).map(t => t.id), [tasks]);

  const visibleTasks = useMemo(() => tasks
    .filter(t => matchesSearch(t, query) || Boolean(t.subtasks?.some(s => matchesSearch({ name: s.title }, query))))
    .filter(t => status === 'all' || isTaskComplete(t) === (status === 'done'))
    .filter(t => matchesDeadline(t, deadline, todayStr))
    .filter(t => matchesGroup(t, group))
    .sort(SORTERS[sortKey]),
  [tasks, query, status, deadline, group, sortKey, todayStr]);

  // Random pick: an unfinished task from what's currently listed (so filters narrow the choice)
  const candidates = visibleTasks.filter(t => !isTaskComplete(t));
  const picked = tasks.find(t => t.id === pickedId);
  const pickRandom = () => {
    const pool = candidates.length > 1 ? candidates.filter(t => t.id !== pickedId) : candidates;
    if (pool.length === 0) return;
    const choice = pool[Math.floor(Math.random() * pool.length)];
    setPickedId(choice.id);
    requestAnimationFrame(() => {
      document.getElementById(`task-${choice.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  const activeFilters = [query.trim(), status !== 'all', deadline !== 'all', group !== 'all'].filter(Boolean).length;
  const clearFilters = () => {
    setQuery('');
    setStatus('all');
    setDeadline('all');
    setGroup('all');
  };

  if (tasks.length === 0) {
    return (
      <div className="bg-[#090a0d] border border-gray-800 rounded-xl p-6 text-center text-gray-500 shadow-xl">
        <p className="text-sm">No one-off tasks added yet.</p>
        <button
          onClick={onAdd}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-purple-400 hover:text-purple-300 bg-purple-500/10 px-3 py-1.5 rounded-lg border border-purple-500/20 transition"
        >
          <PlusCircle size={14} />
          <span>Create One-Off Task</span>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#090a0d] border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
      <div className="flex items-center justify-between p-3 border-b border-gray-800 bg-[#0e1015] gap-3 flex-wrap">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
            <Target size={15} />
          </div>
          <h3 className="text-xs font-bold text-white tracking-wide uppercase">
            One-Off Tasks & Goals ({visibleTasks.length})
          </h3>

          <SearchToggle value={query} onChange={setQuery} label="Search tasks" accent="purple" />
          <FilterButton
            open={showFilters}
            activeCount={activeFilters}
            onClick={() => setShowFilters(!showFilters)}
            label="Task filters"
            accent="purple"
          />
          <label className="flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-lg bg-gray-900 border border-gray-700 text-gray-400 focus-within:border-purple-500" title="Sort">
            <ArrowUpDown size={13} className="shrink-0" />
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              aria-label="Sort tasks"
              className="bg-transparent text-xs font-semibold text-gray-200 focus:outline-none cursor-pointer"
            >
              {SORT_OPTIONS.map(o => (
                <option key={o.value} value={o.value} className="bg-gray-900">{o.label}</option>
              ))}
            </select>
          </label>
          {groups.length > 0 && (
            <button
              type="button"
              onClick={() => setGrouped(!grouped)}
              aria-pressed={grouped}
              aria-label="Group by category"
              title={grouped ? 'Grouped by category' : 'Not grouped'}
              className={`p-1.5 rounded-lg border transition ${
                grouped ? 'bg-purple-600/20 text-purple-300 border-purple-500/40' : 'bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white border-gray-700'
              }`}
            >
              <Layers size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={pickRandom}
            disabled={candidates.length === 0}
            aria-label="Pick a random to-do"
            title="Pick a random to-do"
            className="px-2 py-1 rounded-lg border bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-white border-gray-700 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
          >
            <Dices size={14} className="text-purple-300" />
            <span>Random</span>
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold px-3 py-1 rounded-lg bg-gray-900 border border-gray-700/60 text-gray-300">
            <span className="text-emerald-400 font-bold">{completedIds.length}</span> of {tasks.length} completed
          </span>

          {completedIds.length > 0 && (
            <button
              onClick={() => onDeleteTasks(completedIds)}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30 transition flex items-center gap-1.5 shadow-sm"
            >
              <Trash2 size={12} />
              <span>Clear Completed ({completedIds.length})</span>
            </button>
          )}
        </div>
      </div>

      {picked && (
        <div className="flex items-center gap-3 px-3 py-2 border-b border-gray-800 bg-purple-500/10">
          <Dices size={14} className="text-purple-300 shrink-0" />
          <span className="flex-1 min-w-0 truncate text-xs text-gray-300">
            {isTaskComplete(picked) ? 'Done, nice! ' : 'Do this: '}
            <span className="font-bold text-white">{picked.icon} {picked.name}</span>
          </span>
          {candidates.some(t => t.id !== picked.id) && (
            <button
              type="button"
              onClick={pickRandom}
              className="shrink-0 px-2 py-0.5 rounded-lg text-[11px] font-semibold text-purple-200 hover:text-white hover:bg-purple-500/20 transition"
            >
              Pick again
            </button>
          )}
          <button
            type="button"
            onClick={() => setPickedId(null)}
            aria-label="Dismiss pick"
            className="shrink-0 text-gray-400 hover:text-white"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {showFilters && (
        <div className="px-3 py-2.5 border-b border-gray-800 bg-[#0b0c10] space-y-2.5 animate-in fade-in duration-150">
          <div className="flex items-center gap-4 flex-wrap text-xs">
            <SegmentFilter
              label="Status"
              value={status}
              onChange={setStatus}
              activeClass="bg-emerald-600"
              options={[
                { value: 'all', label: 'All' },
                { value: 'active', label: 'Active' },
                { value: 'done', label: 'Done' },
              ]}
            />
            <SegmentFilter
              label="Deadline"
              value={deadline}
              onChange={setDeadline}
              activeClass="bg-purple-600"
              options={[
                { value: 'all', label: 'All' },
                { value: 'overdue', label: 'Overdue' },
                { value: 'today', label: 'Today' },
                { value: 'upcoming', label: 'Upcoming' },
                { value: 'none', label: 'None' },
              ]}
            />
            {activeFilters > 0 && <ClearFiltersButton onClick={clearFilters} />}
          </div>
          <GroupFilter groups={groups} value={group} onChange={setGroup} />
        </div>
      )}

      {visibleTasks.length === 0 ? (
        <div className="py-8 text-center text-gray-500 text-xs">No tasks match the active filters.</div>
      ) : (
        <GroupedList
          items={visibleTasks}
          grouped={grouped}
          noun="task"
          renderItem={(task) => (
            <OneOffTaskCard
              key={task.id}
              task={task}
              onEdit={() => onEdit(task.id)}
              onUpdateTask={onUpdateTask}
              highlighted={hoveredTaskId === task.id || pickedId === task.id}
              onHoverChange={(hovering) => onHoverTask(hovering ? task.id : null)}
            />
          )}
        />
      )}

      <div
        onClick={onAdd}
        className="bg-[#0b0c10] border-t border-gray-800/80 py-2.5 px-4 flex items-center justify-center cursor-pointer hover:bg-[#12141a] transition-all group"
      >
        <div className="flex items-center gap-2 text-gray-500 group-hover:text-purple-400 transition-colors">
          <PlusCircle size={15} />
          <span className="text-xs font-semibold">Add New One-Off Task</span>
        </div>
      </div>
    </div>
  );
}
