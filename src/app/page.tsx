'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useHabits } from '../hooks/useHabits';
import { Modal } from '../components/Modal';
import { HabitForm } from '../components/HabitForm';
import { TaskForm } from '../components/TaskForm';
import { HabitCard, leftColumnClass } from '../components/HabitCard';
import { OneOffTaskCard } from '../components/OneOffTaskCard';
import { HabitInsightsModal } from '../components/HabitInsightsModal';
import { FloatingTimerWidget } from '../components/FloatingTimerWidget';
import { DataSyncModal } from '../components/DataSyncModal';
import { CalendarView } from '../components/CalendarView';
import { TimersModal } from '../components/TimersModal';
import { TimerProvider } from '../context/TimerContext';
import {
  PlusCircle, ChevronLeft, ChevronRight, Hash, Layers, Grid,
  Target, Trash2, Search, Filter, X, Tag, Database, Sparkles, Plus, CalendarDays, Timer
} from 'lucide-react';
import {
  normalizeDateStr, getPeriodAmount, isHabitMetOn, isTaskComplete, taskDateStr, WEEK_OPTIONS,
} from '../lib/habitUtils';
import { getSampleHabits } from '../lib/sampleHabits';
import {
  addDays, addWeeks, addMonths, addYears, isSameDay, format, getDaysInMonth,
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear,
  eachDayOfInterval, isSameMonth,
} from 'date-fns';
import { Habit, HabitType, Timeframe, ViewMode } from '../types';

const UNGROUPED = '__ungrouped__';
const STEP_VIEW = { day: addDays, week: addWeeks, month: addMonths, year: addYears };

interface CategoryGroup<T> {
  name: string;
  isUngrouped: boolean;
  items: T[];
}

/** Buckets items by group name (in first-seen order), with ungrouped items last. */
function groupItemsByCategory<T extends { group?: string }>(items: T[]): CategoryGroup<T>[] {
  const groupMap = new Map<string, T[]>();
  const ungrouped: T[] = [];

  for (const item of items) {
    const g = item.group?.trim();
    if (!g) {
      ungrouped.push(item);
      continue;
    }
    if (!groupMap.has(g)) groupMap.set(g, []);
    groupMap.get(g)!.push(item);
  }

  const result: CategoryGroup<T>[] = [...groupMap].map(([name, list]) => ({ name, isUngrouped: false, items: list }));
  if (ungrouped.length > 0) {
    result.push({ name: 'General / Other', isUngrouped: true, items: ungrouped });
  }
  return result;
}

function sortTasksByUpcoming(tasks: Habit[]) {
  return [...tasks].sort((a, b) => taskDateStr(a).localeCompare(taskDateStr(b)) || a.name.localeCompare(b.name));
}

/** Habit progress (0–1) for the period containing `date`, used for the completion metrics. */
function periodScore(habit: Habit, date: Date): number {
  const amount = getPeriodAmount(habit, date);
  if (habit.type === 'START') return Math.min(amount / habit.quota, 1);
  if (habit.quota <= 0) return amount === 0 ? 1 : 0;
  return amount > habit.quota ? 0 : (habit.quota - amount) / habit.quota;
}

/* ---------- Small presentational pieces ---------- */

function ToggleChip({ active, onClick, icon, label, activeClass }: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  activeClass: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition border flex items-center gap-1.5 ${
        active ? `${activeClass} shadow-sm` : 'bg-gray-900 text-gray-400 border-gray-800 hover:text-white'
      }`}
    >
      {icon}
      <span>{label} {active ? 'ON' : 'OFF'}</span>
    </button>
  );
}

function SegmentFilter<T extends string>({ label, value, onChange, options, activeClass }: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  activeClass: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">{label}:</span>
      <div className="flex bg-[#141620] p-0.5 rounded-lg border border-gray-800">
        {options.map(o => (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition capitalize ${
              value === o.value ? `${activeClass} text-white shadow-sm` : 'text-gray-400 hover:text-white'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function GroupChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-0.5 rounded-lg text-[11px] font-semibold transition border ${
        active
          ? 'bg-purple-600 text-white border-purple-500 shadow-sm'
          : 'bg-[#141620] text-gray-400 hover:text-white border-gray-800'
      }`}
    >
      {children}
    </button>
  );
}

function GroupHeader({ name, count, noun, className = '' }: { name: string; count: number; noun: string; className?: string }) {
  return (
    <div className={`w-full flex items-center justify-between bg-[#0e1117] border-y border-gray-800/90 py-1.5 px-3 select-none ${className}`}>
      <div className="flex items-center gap-2">
        <Layers size={13} className="text-purple-400 shrink-0" />
        <span className="text-xs font-bold text-gray-200 tracking-wide uppercase">{name}</span>
        <span className="text-[10px] font-semibold text-gray-400 bg-gray-900 px-2 py-0.5 rounded-full border border-gray-700/60">
          {count} {count === 1 ? noun : `${noun}s`}
        </span>
      </div>
    </div>
  );
}

/** Renders items under group headers when grouping applies, otherwise as one flat list. */
function GroupedList<T extends Habit>({ groups, flatItems, grouped, noun, headerClassName, renderItem }: {
  groups: CategoryGroup<T>[];
  flatItems: T[];
  grouped: boolean;
  noun: string;
  headerClassName?: string;
  renderItem: (item: T) => React.ReactNode;
}) {
  const list = (items: T[]) => (
    <div className="flex flex-col gap-0 divide-y divide-gray-800/80">{items.map(renderItem)}</div>
  );
  if (!grouped || !groups.some(g => !g.isUngrouped)) return list(flatItems);
  return (
    <>
      {groups.map(grp => (
        <div key={grp.name} className="flex flex-col">
          <GroupHeader name={grp.name} count={grp.items.length} noun={noun} className={headerClassName} />
          {list(grp.items)}
        </div>
      ))}
    </>
  );
}

const HEADER_BUTTON = 'px-3.5 py-2 rounded-xl bg-[#12141c] hover:bg-[#1a1e29] border border-gray-700/70 text-gray-300 hover:text-white text-xs font-bold transition flex items-center gap-2 shadow-sm active:scale-95';

/* ---------- Page ---------- */

export default function Home() {
  const { habits, addHabit, updateHabit, deleteHabits, setLog, setAllHabits, isLoaded } = useHabits();

  // Modals
  const [showDataModal, setShowDataModal] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showTimers, setShowTimers] = useState(false);
  const [showHabitForm, setShowHabitForm] = useState(false);
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [insightsHabitId, setInsightsHabitId] = useState<string | null>(null);

  // Grid view
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [showNumbers, setShowNumbers] = useState(true);
  const [cellGroupingEnabled, setCellGroupingEnabled] = useState(true);
  const [categoryGroupingEnabled, setCategoryGroupingEnabled] = useState(true);
  const [showBorders, setShowBorders] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | HabitType>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('all');
  const [filterTimeframe, setFilterTimeframe] = useState<'all' | Timeframe>('all');
  const [filterGroup, setFilterGroup] = useState<'all' | string>('all');
  const [showFilterBar, setShowFilterBar] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const selectedDateStr = normalizeDateStr(selectedDate);
  const isWideView = viewMode === 'month' || viewMode === 'year';

  const checkScroll = useCallback(() => {
    if (viewMode === 'month' || viewMode === 'year') {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 6);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 6);
    }
  }, [viewMode]);

  const shiftPeriod = (dir: 1 | -1) => setSelectedDate(d => STEP_VIEW[viewMode](d, dir));

  const handleDateSelect = (day: Date) => {
    if (!isSameDay(day, selectedDate)) setSelectedDate(day);
  };

  const scrollDays = (dir: 'left' | 'right') => {
    scrollContainerRef.current?.scrollBy({ left: dir === 'left' ? -220 : 220, behavior: 'smooth' });
  };

  const recurringHabits = useMemo(() => habits.filter(h => h.isRecurring !== false), [habits]);
  const oneOffTasks = useMemo(() => habits.filter(h => h.isRecurring === false), [habits]);
  const completedTaskIds = useMemo(() => oneOffTasks.filter(isTaskComplete).map(t => t.id), [oneOffTasks]);

  // All unique user-created group names across habits & tasks
  const existingGroups = useMemo(() => {
    const set = new Set<string>();
    habits.forEach(h => {
      const g = h.group?.trim();
      if (g) set.add(g);
    });
    return Array.from(set);
  }, [habits]);

  const matchesFilter = useCallback((h: Habit): boolean => {
    const q = searchQuery.trim().toLowerCase();
    if (q && !h.name.toLowerCase().includes(q) && !h.group?.toLowerCase().includes(q)) return false;
    if (filterType !== 'all' && h.type !== filterType) return false;
    if (filterTimeframe !== 'all' && h.isRecurring !== false && h.timeframe !== filterTimeframe) return false;
    if (filterGroup === UNGROUPED) {
      if (h.group?.trim()) return false;
    } else if (filterGroup !== 'all' && h.group?.trim().toLowerCase() !== filterGroup.toLowerCase()) {
      return false;
    }
    if (filterStatus !== 'all') {
      const isDone = h.isRecurring === false ? isTaskComplete(h) : isHabitMetOn(h, selectedDate);
      if (isDone !== (filterStatus === 'completed')) return false;
    }
    return true;
  }, [searchQuery, filterType, filterTimeframe, filterGroup, filterStatus, selectedDate]);

  const filteredRecurringHabits = useMemo(() => recurringHabits.filter(matchesFilter), [recurringHabits, matchesFilter]);
  const sortedOneOffTasks = useMemo(() => sortTasksByUpcoming(oneOffTasks.filter(matchesFilter)), [oneOffTasks, matchesFilter]);

  const groupedRecurringHabits = useMemo(() => groupItemsByCategory(filteredRecurringHabits), [filteredRecurringHabits]);
  const groupedOneOffTasks = useMemo(() => groupItemsByCategory(sortedOneOffTasks), [sortedOneOffTasks]);

  const activeFiltersCount = [
    searchQuery.trim(), filterType !== 'all', filterStatus !== 'all', filterTimeframe !== 'all', filterGroup !== 'all',
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setSearchQuery('');
    setFilterType('all');
    setFilterStatus('all');
    setFilterTimeframe('all');
    setFilterGroup('all');
  };

  // Average completion of recurring habits per timeframe, for the selected date
  const completionStats = useMemo(() => {
    const percentFor = (timeframe: Timeframe) => {
      const list = recurringHabits.filter(h => h.timeframe === timeframe);
      if (list.length === 0) return null;
      const total = list.reduce((sum, h) => sum + periodScore(h, selectedDate), 0);
      return Math.round((total / list.length) * 100);
    };
    return [
      { label: 'Daily', value: percentFor('daily') },
      { label: 'Weekly', value: percentFor('weekly') },
      { label: 'Monthly', value: percentFor('monthly') },
    ];
  }, [recurringHabits, selectedDate]);

  const editingHabit = habits.find(h => h.id === editingHabitId);
  const editingTask = habits.find(h => h.id === editingTaskId);
  const insightsHabit = habits.find(h => h.id === insightsHabitId);

  const weekStart = startOfWeek(selectedDate, WEEK_OPTIONS);

  const displayedDays = useMemo(() => {
    if (viewMode === 'day') return [selectedDate];
    if (viewMode === 'year') return eachDayOfInterval({ start: startOfYear(selectedDate), end: endOfYear(selectedDate) });
    if (viewMode === 'month') return eachDayOfInterval({ start: startOfMonth(selectedDate), end: endOfMonth(selectedDate) });
    return eachDayOfInterval({ start: startOfWeek(selectedDate, WEEK_OPTIONS), end: endOfWeek(selectedDate, WEEK_OPTIONS) });
  }, [selectedDate, viewMode]);

  const periodLabel = {
    day: format(selectedDate, 'EEE, MMM d, yyyy'),
    week: `${format(weekStart, 'MMM d')} – ${format(addDays(weekStart, 6), 'MMM d, yyyy')}`,
    month: format(selectedDate, 'MMMM yyyy'),
    year: format(selectedDate, 'yyyy'),
  }[viewMode];

  const isToday = isSameDay(selectedDate, new Date());

  useEffect(() => {
    if ((viewMode === 'month' || viewMode === 'year') && scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = 0;
    }
    const timer = setTimeout(() => checkScroll(), 50);
    window.addEventListener('resize', checkScroll);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', checkScroll);
    };
  }, [checkScroll, viewMode, displayedDays]);

  if (!isLoaded) return <div className="min-h-screen bg-[#07080a]" />;

  const deleteAndClose = (id: string, close: () => void) => {
    deleteHabits([id]);
    close();
  };

  const renderHabitCard = (habit: Habit) => (
    <HabitCard
      key={habit.id}
      habit={habit}
      selectedDateStr={selectedDateStr}
      weekDays={displayedDays}
      viewMode={viewMode}
      showNumbers={showNumbers}
      cellGroupingEnabled={cellGroupingEnabled}
      showBorders={showBorders}
      onLog={(date, amount) => setLog(habit.id, date, amount)}
      onEdit={() => setEditingHabitId(habit.id)}
      onOpenInsights={() => setInsightsHabitId(habit.id)}
      onSelectDate={(d) => {
        handleDateSelect(d);
        if (viewMode === 'year') setViewMode('day');
      }}
    />
  );

  const renderTaskCard = (task: Habit) => (
    <OneOffTaskCard
      key={task.id}
      task={task}
      onEdit={() => setEditingTaskId(task.id)}
      onUpdateTask={updateHabit}
    />
  );

  return (
    <TimerProvider habits={habits} setLog={setLog}>
      <div className="min-h-screen bg-[#07080a] text-slate-100 p-4 sm:p-8 font-sans selection:bg-blue-600/30">
        <div className="max-w-7xl mx-auto space-y-6">
        {/* App Header */}
        <header className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-gray-800/80 pb-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-1 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              Habit Tracker & Planner
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-sm">
              Habit<span className="text-blue-500">That</span>
            </h1>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              id="open-calendar"
              onClick={() => setShowCalendar(true)}
              className={`${HEADER_BUTTON} hover:border-orange-500/50`}
              title="View streaks and upcoming tasks on a calendar"
            >
              <CalendarDays size={14} className="text-orange-400" />
              <span>Calendar</span>
            </button>

            <button
              type="button"
              id="open-timers"
              onClick={() => setShowTimers(true)}
              className={`${HEADER_BUTTON} hover:border-cyan-500/50`}
              title="Popular study timer techniques & focus sessions"
            >
              <Timer size={14} className="text-cyan-400" />
              <span>Timers</span>
            </button>

            <button
              type="button"
              onClick={() => setShowDataModal(true)}
              className={`${HEADER_BUTTON} hover:border-gray-600`}
              title="Export, Import, Backup or Load Templates"
            >
              <Database size={14} className="text-blue-400" />
              <span>Data & Backup</span>
            </button>

            <button
              type="button"
              onClick={() => setShowHabitForm(true)}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-blue-500/25 active:scale-95"
            >
              <Plus size={14} />
              <span>New Habit</span>
            </button>

            <button
              type="button"
              onClick={() => setShowTaskForm(true)}
              className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-purple-500/25 active:scale-95"
            >
              <Plus size={14} />
              <span>New Task</span>
            </button>
          </div>
        </header>

        {/* Completion Metrics: Daily, Weekly, Monthly */}
        {recurringHabits.length > 0 && (
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-4 bg-[#0e1015]/90 px-5 py-2.5 rounded-2xl border border-gray-800/80 shadow-lg text-xs font-semibold text-gray-400 backdrop-blur-md">
              {completionStats.map(({ label, value }, i) => (
                <div key={label} className="flex items-center gap-4">
                  {i > 0 && <span className="text-gray-800 font-normal">|</span>}
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-500 uppercase tracking-wider text-[10px]">{label}:</span>
                    <span className={`font-bold ${value === null ? 'text-gray-600' : value === 100 ? 'text-emerald-400 font-extrabold' : 'text-white'}`}>
                      {value === null ? '—' : `${value}%`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filter & Search Bar */}
        {habits.length > 0 && (
          <div className="bg-[#0b0c10] border border-gray-800/90 rounded-2xl p-3 shadow-xl space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex-1 min-w-[220px] relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search goals, habits, or groups..."
                  className="w-full bg-[#12141c] border border-gray-700/70 focus:border-blue-500 rounded-xl pl-9 pr-8 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none transition"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowFilterBar(!showFilterBar)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition ${
                    showFilterBar || activeFiltersCount > 0
                      ? 'bg-blue-600/20 text-blue-400 border-blue-500/40 shadow-sm'
                      : 'bg-[#12141c] text-gray-400 border-gray-700/70 hover:text-white'
                  }`}
                >
                  <Filter size={13} />
                  <span>Filters</span>
                  {activeFiltersCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-blue-500 text-white text-[10px] font-bold">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>

                {activeFiltersCount > 0 && (
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30 transition flex items-center gap-1"
                  >
                    <X size={12} />
                    <span>Clear</span>
                  </button>
                )}
              </div>
            </div>

            {showFilterBar && (
              <div className="pt-2 border-t border-gray-800/80 space-y-2.5 animate-in fade-in duration-150">
                <div className="flex items-center gap-4 flex-wrap text-xs">
                  <SegmentFilter
                    label="Type"
                    value={filterType}
                    onChange={setFilterType}
                    activeClass="bg-blue-600"
                    options={[
                      { value: 'all', label: 'All Types' },
                      { value: 'START', label: 'Build' },
                      { value: 'STOP', label: 'Quit' },
                    ]}
                  />
                  <SegmentFilter
                    label="Status"
                    value={filterStatus}
                    onChange={setFilterStatus}
                    activeClass="bg-emerald-600"
                    options={[
                      { value: 'all', label: 'All Status' },
                      { value: 'pending', label: 'Active' },
                      { value: 'completed', label: 'Completed' },
                    ]}
                  />
                  <SegmentFilter
                    label="Timeframe"
                    value={filterTimeframe}
                    onChange={setFilterTimeframe}
                    activeClass="bg-purple-600"
                    options={[
                      { value: 'all', label: 'All' },
                      { value: 'daily', label: 'daily' },
                      { value: 'weekly', label: 'weekly' },
                      { value: 'monthly', label: 'monthly' },
                    ]}
                  />
                </div>

                {existingGroups.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center gap-1">
                      <Tag size={11} className="text-purple-400" />
                      Group:
                    </span>
                    <div className="flex gap-1.5 flex-wrap">
                      <GroupChip active={filterGroup === 'all'} onClick={() => setFilterGroup('all')}>
                        All Groups
                      </GroupChip>
                      {existingGroups.map(g => {
                        const active = filterGroup.toLowerCase() === g.toLowerCase();
                        return (
                          <GroupChip key={g} active={active} onClick={() => setFilterGroup(active ? 'all' : g)}>
                            {g}
                          </GroupChip>
                        );
                      })}
                      <GroupChip
                        active={filterGroup === UNGROUPED}
                        onClick={() => setFilterGroup(filterGroup === UNGROUPED ? 'all' : UNGROUPED)}
                      >
                        Ungrouped
                      </GroupChip>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Modals */}
        <Modal isOpen={showCalendar} onClose={() => setShowCalendar(false)} maxWidth="max-w-6xl">
          <CalendarView
            habits={habits}
            onClose={() => setShowCalendar(false)}
            onUpdateTask={updateHabit}
            onEditTask={(id) => { setShowCalendar(false); setEditingTaskId(id); }}
            onGoToDate={(d) => { setShowCalendar(false); setSelectedDate(d); setViewMode('day'); }}
          />
        </Modal>

        <Modal isOpen={showTimers} onClose={() => setShowTimers(false)} maxWidth="max-w-5xl">
          <TimersModal habits={habits} onClose={() => setShowTimers(false)} />
        </Modal>

        <Modal isOpen={showDataModal} onClose={() => setShowDataModal(false)} maxWidth="max-w-xl">
          <DataSyncModal
            habits={habits}
            onSetAllHabits={setAllHabits}
            onClearAll={() => setAllHabits([])}
            onClose={() => setShowDataModal(false)}
          />
        </Modal>

        <Modal isOpen={showHabitForm} onClose={() => setShowHabitForm(false)}>
          <HabitForm
            existingGroups={existingGroups}
            onSave={(h) => { addHabit(h); setShowHabitForm(false); }}
            onCancel={() => setShowHabitForm(false)}
          />
        </Modal>

        <Modal isOpen={Boolean(editingHabit)} onClose={() => setEditingHabitId(null)}>
          {editingHabit && (
            <HabitForm
              initialHabit={editingHabit}
              existingGroups={existingGroups}
              onSave={(h) => { updateHabit(h); setEditingHabitId(null); }}
              onCancel={() => setEditingHabitId(null)}
              onDelete={() => deleteAndClose(editingHabit.id, () => setEditingHabitId(null))}
            />
          )}
        </Modal>

        <Modal isOpen={showTaskForm} onClose={() => setShowTaskForm(false)}>
          <TaskForm
            existingGroups={existingGroups}
            onSave={(t) => { addHabit(t); setShowTaskForm(false); }}
            onCancel={() => setShowTaskForm(false)}
          />
        </Modal>

        <Modal isOpen={Boolean(editingTask)} onClose={() => setEditingTaskId(null)}>
          {editingTask && (
            <TaskForm
              initialTask={editingTask}
              existingGroups={existingGroups}
              onSave={(t) => { updateHabit(t); setEditingTaskId(null); }}
              onCancel={() => setEditingTaskId(null)}
              onDelete={() => deleteAndClose(editingTask.id, () => setEditingTaskId(null))}
            />
          )}
        </Modal>

        <Modal isOpen={Boolean(insightsHabit)} onClose={() => setInsightsHabitId(null)} maxWidth="max-w-lg">
          {insightsHabit && (
            <HabitInsightsModal
              habit={insightsHabit}
              onClose={() => setInsightsHabitId(null)}
              onEdit={() => setEditingHabitId(insightsHabit.id)}
            />
          )}
        </Modal>

        {/* Section 1: Recurring Habits Table */}
        {recurringHabits.length > 0 ? (
          <div className="bg-[#090a0d] border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
            {/* Top Navigation Bar */}
            <div className="flex items-center justify-between p-3 border-b border-gray-800 bg-[#0e1015] gap-3 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center bg-gray-900 rounded-lg border border-gray-700/60 shadow-sm overflow-hidden">
                  <button
                    onClick={() => shiftPeriod(-1)}
                    className="p-1.5 hover:bg-gray-800 text-gray-400 hover:text-white transition border-r border-gray-800"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-xs font-bold text-white px-3">{periodLabel}</span>
                  <button
                    onClick={() => shiftPeriod(1)}
                    className="p-1.5 hover:bg-gray-800 text-gray-400 hover:text-white transition border-l border-gray-800"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                <button
                  onClick={() => handleDateSelect(new Date())}
                  disabled={isToday}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition shadow-sm border ${isToday
                    ? 'bg-gray-900/40 text-gray-600 border-gray-800 cursor-not-allowed'
                    : 'bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-white border-gray-700'
                    }`}
                >
                  Jump to today
                </button>
              </div>

              {/* View Mode Toggle & Applicable Toggles */}
              <div className="flex items-center gap-2 flex-wrap">
                {viewMode !== 'year' && viewMode !== 'day' && (
                  <ToggleChip
                    active={showNumbers}
                    onClick={() => setShowNumbers(!showNumbers)}
                    icon={<Hash size={13} />}
                    label="Numbers"
                    activeClass="bg-blue-600/20 text-blue-400 border-blue-500/40"
                  />
                )}
                <ToggleChip
                  active={categoryGroupingEnabled}
                  onClick={() => setCategoryGroupingEnabled(!categoryGroupingEnabled)}
                  icon={<Tag size={13} />}
                  label="Groups"
                  activeClass="bg-purple-600/20 text-purple-400 border-purple-500/40"
                />
                {viewMode !== 'day' && (
                  <ToggleChip
                    active={cellGroupingEnabled}
                    onClick={() => setCellGroupingEnabled(!cellGroupingEnabled)}
                    icon={<Layers size={13} />}
                    label="Cell Grouping"
                    activeClass="bg-indigo-600/20 text-indigo-400 border-indigo-500/40"
                  />
                )}
                {viewMode !== 'day' && viewMode !== 'year' && (
                  <ToggleChip
                    active={showBorders}
                    onClick={() => setShowBorders(!showBorders)}
                    icon={<Grid size={13} />}
                    label="Borders"
                    activeClass="bg-emerald-600/20 text-emerald-400 border-emerald-500/40"
                  />
                )}

                <div className="flex items-center bg-gray-900 rounded-lg p-0.5 border border-gray-700/60 shadow-sm">
                  {(['day', 'week', 'month', 'year'] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      className={`px-3 py-1 rounded text-xs font-semibold capitalize transition ${viewMode === mode ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'
                        }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Grid Table Container with Custom Scroll */}
            <div className="relative group/table">
              {!isWideView && canScrollLeft && (
                <button
                  onClick={() => scrollDays('left')}
                  className={`absolute top-1/2 -translate-y-1/2 z-30 w-7 h-7 bg-gray-900/95 hover:bg-blue-600 text-white rounded-full flex items-center justify-center shadow-2xl border border-gray-700 hover:border-blue-500 backdrop-blur-md transition-all hover:scale-110 ${viewMode === 'week' ? 'left-[235px] sm:left-[275px] md:left-[295px]' : 'left-[385px] sm:left-[465px] md:left-[525px]'
                    }`}
                >
                  <ChevronLeft size={16} />
                </button>
              )}

              {!isWideView && canScrollRight && (
                <button
                  onClick={() => scrollDays('right')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-30 w-7 h-7 bg-gray-900/95 hover:bg-blue-600 text-white rounded-full flex items-center justify-center shadow-2xl border border-gray-700 hover:border-blue-500 backdrop-blur-md transition-all hover:scale-110"
                >
                  <ChevronRight size={16} />
                </button>
              )}

              <div
                ref={scrollContainerRef}
                onScroll={checkScroll}
                className={isWideView ? 'overflow-hidden w-full' : 'overflow-x-auto no-scrollbar w-full'}
              >
                <div className="w-full min-w-full">
                  {/* Table Header Row */}
                  <div className="w-full flex items-stretch border-b border-gray-800 bg-[#12141a] h-12">
                    {isWideView ? (
                      <div className={`${leftColumnClass(viewMode)} shrink-0 flex items-center justify-center px-3 border-r border-gray-800 text-[10px] font-bold text-gray-400 uppercase tracking-wider h-full`}>
                        <span>Habit</span>
                      </div>
                    ) : (
                      <div className={`${leftColumnClass(viewMode)} shrink-0 flex items-center justify-between px-3 py-2 border-r border-gray-800 text-[11px] font-bold text-gray-400 uppercase tracking-wider h-full`}>
                        <span>Recurring Habits ({filteredRecurringHabits.length})</span>
                      </div>
                    )}

                    {/* Date Column Header Cells */}
                    {viewMode === 'year' ? (
                      <div className="flex-1 flex items-stretch min-w-0">
                        {Array.from({ length: 12 }, (_, monthIdx) => {
                          const monthDate = new Date(selectedDate.getFullYear(), monthIdx, 1);
                          const isCurrentMonth = isSameMonth(monthDate, new Date());
                          return (
                            <div
                              key={monthIdx}
                              onClick={() => {
                                handleDateSelect(monthDate);
                                setViewMode('month');
                              }}
                              className={`flex items-center justify-center text-[10px] font-bold tracking-wider uppercase transition-colors cursor-pointer ${isCurrentMonth ? 'text-blue-400 bg-blue-600/10' : 'text-gray-400 hover:bg-gray-800/30 hover:text-gray-200'
                                }`}
                              style={{ flex: `${getDaysInMonth(monthDate)} 0 0%` }}
                            >
                              {format(monthDate, 'MMM')}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex-1 flex items-stretch min-w-0">
                        {displayedDays.map((day) => {
                          const isSelected = isSameDay(day, selectedDate);
                          const dayAbbr = format(day, 'EEE');

                          return (
                            <div
                              key={day.toISOString()}
                              onClick={() => handleDateSelect(day)}
                              className={`flex-1 min-w-0 flex flex-col items-center justify-center py-1 px-0.5 text-center cursor-pointer transition-colors h-full ${showBorders ? 'border-r border-gray-800' : ''
                                } ${isSelected
                                  ? 'bg-blue-600/20 border-t-2 border-t-blue-500 shadow-inner'
                                  : 'hover:bg-gray-800/40'
                                }`}
                            >
                              {viewMode !== 'day' && (
                                <span className={`text-[8px] sm:text-[9px] font-semibold uppercase transition-colors ${isSelected ? 'text-blue-400 font-bold' : 'text-gray-500'}`}>
                                  {viewMode === 'month' ? '' : format(day, 'MMM')}
                                </span>
                              )}
                              <span className={`font-extrabold transition-colors leading-tight ${viewMode === 'month' ? 'text-xs' : (viewMode === 'day' ? 'text-base' : 'text-sm')
                                } ${isSelected ? 'text-white' : 'text-gray-200'}`}>
                                {viewMode === 'day' ? format(day, 'MMMM d') : format(day, 'd')}
                              </span>
                              <span className={`text-[8px] sm:text-[9px] font-bold uppercase tracking-wider transition-colors ${isSelected ? 'text-blue-300' : 'text-gray-400'}`}>
                                {viewMode === 'month' ? dayAbbr.slice(0, 1) : dayAbbr}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Recurring Habit Rows */}
                  {filteredRecurringHabits.length === 0 ? (
                    <div className="py-8 text-center text-gray-500 text-xs">
                      No recurring habits match the active filters.
                    </div>
                  ) : (
                    <GroupedList
                      groups={groupedRecurringHabits}
                      flatItems={filteredRecurringHabits}
                      grouped={categoryGroupingEnabled}
                      noun="habit"
                      headerClassName="sticky left-0 z-10"
                      renderItem={renderHabitCard}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Add New Recurring Habit Row at Bottom */}
            <div
              onClick={() => setShowHabitForm(true)}
              className="bg-[#0b0c10] border-t border-gray-800/80 py-2.5 px-4 flex items-center justify-center cursor-pointer hover:bg-[#12141a] transition-all group"
            >
              <div className="flex items-center gap-2 text-gray-500 group-hover:text-blue-400 transition-colors">
                <PlusCircle size={15} />
                <span className="text-xs font-semibold">Add New Recurring Habit</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-[#090a0d] border border-gray-800 rounded-2xl p-8 sm:p-10 text-center shadow-xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-400 mx-auto flex items-center justify-center text-xl">
              ✨
            </div>
            <div>
              <h3 className="text-base font-bold text-white">No recurring habits yet</h3>
              <p className="text-xs text-gray-400 max-w-md mx-auto mt-1">
                Start tracking daily, weekly, or monthly habits, build streaks, or load sample templates to test the app.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 flex-wrap pt-2">
              <button
                type="button"
                onClick={() => setShowHabitForm(true)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-xl shadow-lg shadow-blue-500/20 transition active:scale-95"
              >
                <PlusCircle size={14} />
                <span>Create Habit</span>
              </button>
              <button
                type="button"
                onClick={() => setAllHabits(getSampleHabits())}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300 hover:text-amber-200 bg-amber-500/15 border border-amber-500/30 px-4 py-2 rounded-xl transition active:scale-95"
              >
                <Sparkles size={14} />
                <span>Load Starter Preset</span>
              </button>
              <button
                type="button"
                onClick={() => setShowDataModal(true)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-300 hover:text-white bg-gray-900 hover:bg-gray-800 border border-gray-700/80 px-4 py-2 rounded-xl transition active:scale-95"
              >
                <Database size={14} />
                <span>Import Backup</span>
              </button>
            </div>
          </div>
        )}

        {/* Section 2: One-Off Tasks & Goals Table */}
        {oneOffTasks.length > 0 ? (
          <div className="bg-[#090a0d] border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-3 border-b border-gray-800 bg-[#0e1015] gap-3 flex-wrap">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Target size={15} />
                </div>
                <h3 className="text-xs font-bold text-white tracking-wide uppercase">
                  One-Off Tasks & Goals ({sortedOneOffTasks.length})
                </h3>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold px-3 py-1 rounded-lg bg-gray-900 border border-gray-700/60 text-gray-300">
                  <span className="text-emerald-400 font-bold">{completedTaskIds.length}</span> of {oneOffTasks.length} completed
                </span>

                {completedTaskIds.length > 0 && (
                  <button
                    onClick={() => deleteHabits(completedTaskIds)}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30 transition flex items-center gap-1.5 shadow-sm"
                  >
                    <Trash2 size={12} />
                    <span>Clear Completed ({completedTaskIds.length})</span>
                  </button>
                )}
              </div>
            </div>

            {sortedOneOffTasks.length === 0 ? (
              <div className="py-8 text-center text-gray-500 text-xs">
                No one-off tasks match the active filters.
              </div>
            ) : (
              <GroupedList
                groups={groupedOneOffTasks}
                flatItems={sortedOneOffTasks}
                grouped={categoryGroupingEnabled}
                noun="task"
                renderItem={renderTaskCard}
              />
            )}

            {/* Add New One-Off Task Row at Bottom */}
            <div
              onClick={() => setShowTaskForm(true)}
              className="bg-[#0b0c10] border-t border-gray-800/80 py-2.5 px-4 flex items-center justify-center cursor-pointer hover:bg-[#12141a] transition-all group"
            >
              <div className="flex items-center gap-2 text-gray-500 group-hover:text-purple-400 transition-colors">
                <PlusCircle size={15} />
                <span className="text-xs font-semibold">Add New One-Off Task</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-[#090a0d] border border-gray-800 rounded-xl p-6 text-center text-gray-500 shadow-xl">
            <p className="text-sm">No one-off tasks added yet.</p>
            <button
              onClick={() => setShowTaskForm(true)}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-purple-400 hover:text-purple-300 bg-purple-500/10 px-3 py-1.5 rounded-lg border border-purple-500/20 transition"
            >
              <PlusCircle size={14} />
              <span>Create One-Off Task</span>
            </button>
          </div>
        )}
      </div>
      <FloatingTimerWidget
        onOpenInsights={(id) => setInsightsHabitId(id)}
        onOpenTimers={() => setShowTimers(true)}
      />
    </div>
    </TimerProvider>
  );
}
