'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useHabits } from '../hooks/useHabits';
import { HabitForm } from '../components/HabitForm';
import { TaskForm } from '../components/TaskForm';
import { HabitCard } from '../components/HabitCard';
import { OneOffTaskCard } from '../components/OneOffTaskCard';
import { HabitInsightsModal } from '../components/HabitInsightsModal';
import { FloatingTimerWidget } from '../components/FloatingTimerWidget';
import { TimerProvider } from '../context/TimerContext';
import {
  PlusCircle, ChevronLeft, ChevronRight, Hash, Layers, Grid,
  Target, Trash2, Search, Filter, X, Tag
} from 'lucide-react';
import { normalizeDateStr, getAmountInInterval } from '../lib/habitUtils';
import {
  addDays, isSameDay, format, getDaysInMonth, startOfMonth, endOfMonth,
  addMonths, startOfWeek, endOfWeek, startOfYear, endOfYear, addYears,
  eachDayOfInterval, isSameMonth, parseISO
} from 'date-fns';
import { Habit, HabitType, Timeframe } from '../types';

function Modal({
  isOpen,
  onClose,
  maxWidth = 'max-w-md',
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  maxWidth?: string;
  children: React.ReactNode;
}) {
  if (!isOpen) return null;
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer animate-in fade-in duration-200"
    >
      <div onClick={(e) => e.stopPropagation()} className={`cursor-default w-full ${maxWidth}`}>
        {children}
      </div>
    </div>
  );
}

function groupItemsByCategory<T extends { group?: string }>(items: T[]) {
  const hasAnyGroup = items.some(item => Boolean(item.group && item.group.trim()));
  if (!hasAnyGroup) {
    return [{ name: '', isUngrouped: true, items }];
  }

  const groupMap = new Map<string, T[]>();
  const ungrouped: T[] = [];

  items.forEach(item => {
    const g = item.group?.trim();
    if (g) {
      if (!groupMap.has(g)) groupMap.set(g, []);
      groupMap.get(g)!.push(item);
    } else {
      ungrouped.push(item);
    }
  });

  const result: { name: string; isUngrouped: boolean; items: T[] }[] = [];
  groupMap.forEach((list, name) => {
    result.push({ name, isUngrouped: false, items: list });
  });
  if (ungrouped.length > 0) {
    result.push({ name: 'General / Other', isUngrouped: true, items: ungrouped });
  }
  return result;
}

function sortTasksByUpcoming(tasks: Habit[]) {
  return [...tasks].sort((a, b) => {
    const aDateStr = normalizeDateStr(a.targetDate || a.startDate || new Date());
    const bDateStr = normalizeDateStr(b.targetDate || b.startDate || new Date());

    const aTime = parseISO(aDateStr).getTime();
    const bTime = parseISO(bDateStr).getTime();

    if (aTime !== bTime) {
      return aTime - bTime;
    }

    return a.name.localeCompare(b.name);
  });
}

export default function Home() {
  const { habits, addHabit, updateHabit, deleteHabit, deleteHabits, setLog, isLoaded } = useHabits();
  
  // Recurring Habit Modal States
  const [showHabitForm, setShowHabitForm] = useState(false);
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);

  // One-Off Task Modal States
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  const [insightsHabitId, setInsightsHabitId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month' | 'year'>('week');
  const [showNumbers, setShowNumbers] = useState(true);
  const [cellGroupingEnabled, setCellGroupingEnabled] = useState(true);
  const [categoryGroupingEnabled, setCategoryGroupingEnabled] = useState(true);
  const [showBorders, setShowBorders] = useState(false);

  // In-depth filter state
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

  const changeDate = (amount: number) => {
    if (viewMode === 'year') {
      setSelectedDate(addYears(selectedDate, amount > 0 ? 1 : -1));
    } else if (viewMode === 'month') {
      setSelectedDate(addMonths(selectedDate, amount > 0 ? 1 : -1));
    } else {
      setSelectedDate(addDays(selectedDate, amount));
    }
  };

  const handleDateSelect = (day: Date) => {
    if (isSameDay(day, selectedDate)) return;
    setSelectedDate(day);
  };

  const scrollDays = (dir: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = dir === 'left' ? -220 : 220;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Separate recurring habits from one-off tasks
  const recurringHabits = useMemo(() => habits.filter(h => h.isRecurring !== false), [habits]);
  const oneOffTasks = useMemo(() => habits.filter(h => h.isRecurring === false), [habits]);

  // Collect all unique user-created group names across habits & tasks
  const existingGroups = useMemo(() => {
    const set = new Set<string>();
    habits.forEach(h => {
      if (h.group && h.group.trim()) {
        set.add(h.group.trim());
      }
    });
    return Array.from(set);
  }, [habits]);

  // Check whether a habit is completed for the current active period
  const isHabitCompletedForPeriod = useCallback((habit: Habit): boolean => {
    if (habit.isRecurring === false) {
      const targetStr = habit.targetDate || habit.startDate;
      const amt = habit.logs[targetStr] || 0;
      return habit.type === 'START' ? amt >= habit.quota : amt <= habit.quota && amt > 0;
    }
    if (habit.timeframe === 'daily') {
      const amt = habit.logs[selectedDateStr] || 0;
      return habit.type === 'START' ? amt >= habit.quota : amt <= habit.quota;
    }
    if (habit.timeframe === 'weekly') {
      const wStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const wEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
      const amt = getAmountInInterval(habit.logs, wStart, wEnd);
      return habit.type === 'START' ? amt >= habit.quota : amt <= habit.quota;
    }
    const mStart = startOfMonth(selectedDate);
    const mEnd = endOfMonth(selectedDate);
    const amt = getAmountInInterval(habit.logs, mStart, mEnd);
    return habit.type === 'START' ? amt >= habit.quota : amt <= habit.quota;
  }, [selectedDate, selectedDateStr]);

  // Filter evaluation predicate
  const matchesFilter = useCallback((h: Habit): boolean => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = h.name.toLowerCase().includes(q);
      const matchGroup = h.group?.toLowerCase().includes(q);
      if (!matchName && !matchGroup) return false;
    }
    if (filterType !== 'all' && h.type !== filterType) return false;
    if (filterTimeframe !== 'all' && h.isRecurring !== false && h.timeframe !== filterTimeframe) return false;
    if (filterGroup !== 'all') {
      if (filterGroup === '__ungrouped__') {
        if (h.group && h.group.trim()) return false;
      } else {
        if (h.group?.trim().toLowerCase() !== filterGroup.toLowerCase()) return false;
      }
    }
    if (filterStatus !== 'all') {
      const isDone = isHabitCompletedForPeriod(h);
      if (filterStatus === 'completed' && !isDone) return false;
      if (filterStatus === 'pending' && isDone) return false;
    }
    return true;
  }, [searchQuery, filterType, filterTimeframe, filterGroup, filterStatus, isHabitCompletedForPeriod]);

  // Filtered lists
  const filteredRecurringHabits = useMemo(() => recurringHabits.filter(matchesFilter), [recurringHabits, matchesFilter]);
  const filteredOneOffTasks = useMemo(() => oneOffTasks.filter(matchesFilter), [oneOffTasks, matchesFilter]);

  // Sort filtered one-off tasks by upcoming due date
  const sortedOneOffTasks = useMemo(() => sortTasksByUpcoming(filteredOneOffTasks), [filteredOneOffTasks]);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (filterType !== 'all') count++;
    if (filterStatus !== 'all') count++;
    if (filterTimeframe !== 'all') count++;
    if (filterGroup !== 'all') count++;
    return count;
  }, [searchQuery, filterType, filterStatus, filterTimeframe, filterGroup]);

  const clearAllFilters = () => {
    setSearchQuery('');
    setFilterType('all');
    setFilterStatus('all');
    setFilterTimeframe('all');
    setFilterGroup('all');
  };

  // Group filtered items by category using the shared helper
  const groupedRecurringHabits = useMemo(() => groupItemsByCategory(filteredRecurringHabits), [filteredRecurringHabits]);
  const groupedOneOffTasks = useMemo(() => {
    const groups = groupItemsByCategory(sortedOneOffTasks);
    return groups.map(g => ({
      ...g,
      items: sortTasksByUpcoming(g.items),
    }));
  }, [sortedOneOffTasks]);

  // Completion metrics for Daily, Weekly, and Monthly goals (recurring habits)
  const completionStats = useMemo(() => {
    const computePercent = (timeframe: 'daily' | 'weekly' | 'monthly') => {
      const list = recurringHabits.filter(h => h.timeframe === timeframe);
      if (list.length === 0) return null;

      let totalPercent = 0;
      list.forEach(habit => {
        let amount = 0;
        if (timeframe === 'daily') {
          amount = habit.logs[selectedDateStr] || 0;
        } else if (timeframe === 'weekly') {
          const wStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
          const wEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
          amount = getAmountInInterval(habit.logs, wStart, wEnd);
        } else {
          const mStart = startOfMonth(selectedDate);
          const mEnd = endOfMonth(selectedDate);
          amount = getAmountInInterval(habit.logs, mStart, mEnd);
        }

        let percent = 0;
        if (habit.type === 'START') {
          percent = Math.min(amount / habit.quota, 1);
        } else {
          percent = habit.quota > 0 
            ? (amount > habit.quota ? 0 : Math.max(0, (habit.quota - amount) / habit.quota)) 
            : (amount === 0 ? 1 : 0);
        }
        totalPercent += percent;
      });

      return Math.round((totalPercent / list.length) * 100);
    };

    return {
      daily: computePercent('daily'),
      weekly: computePercent('weekly'),
      monthly: computePercent('monthly'),
    };
  }, [recurringHabits, selectedDate, selectedDateStr]);

  const editingHabit = useMemo(() => habits.find(h => h.id === editingHabitId), [habits, editingHabitId]);
  const editingTask = useMemo(() => habits.find(h => h.id === editingTaskId), [habits, editingTaskId]);
  const insightsHabit = useMemo(() => habits.find(h => h.id === insightsHabitId), [habits, insightsHabitId]);

  // Compute displayed days based on viewMode
  const displayedDays = useMemo(() => {
    if (viewMode === 'day') {
      return [selectedDate];
    }
    if (viewMode === 'year') {
      const yearStart = startOfYear(selectedDate);
      const yearEnd = endOfYear(selectedDate);
      return eachDayOfInterval({ start: yearStart, end: yearEnd });
    }
    if (viewMode === 'month') {
      const start = startOfMonth(selectedDate);
      const daysCount = getDaysInMonth(selectedDate);
      return Array.from({ length: daysCount }, (_, i) => addDays(start, i));
    }
    // Monday to Sunday for weekly view
    const monday = startOfWeek(selectedDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  }, [selectedDate, viewMode]);

  const isToday = isSameDay(selectedDate, new Date());

  useEffect(() => {
    if ((viewMode === 'month' || viewMode === 'year') && scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = 0;
    }
    const timer = setTimeout(() => checkScroll(), 50);
    const el = scrollContainerRef.current;
    if (!el) return;
    const handleResize = () => checkScroll();
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [checkScroll, viewMode, displayedDays]);

  if (!isLoaded) return <div className="min-h-screen bg-[#07080a]" />;

  const completedOneOffCount = oneOffTasks.filter(t => {
    const dStr = t.targetDate || t.startDate;
    const amt = t.logs[dStr] || 0;
    return t.type === 'START' ? amt >= t.quota : amt <= t.quota && amt > 0;
  }).length;

  const clearCompletedOneOffTasks = () => {
    const completedIds = oneOffTasks
      .filter(t => {
        const dStr = t.targetDate || t.startDate;
        const amt = t.logs[dStr] || 0;
        return t.type === 'START' ? amt >= t.quota : amt <= t.quota && amt > 0;
      })
      .map(t => t.id);

    if (completedIds.length > 0) {
      deleteHabits(completedIds);
    }
  };

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
        </header>

        {/* Completion Metrics: Daily, Weekly, Monthly */}
        {recurringHabits.length > 0 && (
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-4 bg-[#0e1015]/90 px-5 py-2.5 rounded-2xl border border-gray-800/80 shadow-lg text-xs font-semibold text-gray-400 backdrop-blur-md">
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500 uppercase tracking-wider text-[10px]">Daily:</span>
                <span className={`font-bold ${completionStats.daily !== null ? (completionStats.daily === 100 ? 'text-emerald-400 font-extrabold' : 'text-white') : 'text-gray-600'}`}>
                  {completionStats.daily !== null ? `${completionStats.daily}%` : '—'}
                </span>
              </div>
              <span className="text-gray-800 font-normal">|</span>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500 uppercase tracking-wider text-[10px]">Weekly:</span>
                <span className={`font-bold ${completionStats.weekly !== null ? (completionStats.weekly === 100 ? 'text-emerald-400 font-extrabold' : 'text-white') : 'text-gray-600'}`}>
                  {completionStats.weekly !== null ? `${completionStats.weekly}%` : '—'}
                </span>
              </div>
              <span className="text-gray-800 font-normal">|</span>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500 uppercase tracking-wider text-[10px]">Monthly:</span>
                <span className={`font-bold ${completionStats.monthly !== null ? (completionStats.monthly === 100 ? 'text-emerald-400 font-extrabold' : 'text-white') : 'text-gray-600'}`}>
                  {completionStats.monthly !== null ? `${completionStats.monthly}%` : '—'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Comprehensive Filter & Search Bar */}
        {habits.length > 0 && (
          <div className="bg-[#0b0c10] border border-gray-800/90 rounded-2xl p-3 shadow-xl space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              {/* Search Box */}
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

              {/* Filter Controls Toggle & Reset */}
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

            {/* Expandable Filter Chips Panel */}
            {showFilterBar && (
              <div className="pt-2 border-t border-gray-800/80 space-y-2.5 animate-in fade-in duration-150">
                {/* Filter Row 1: Type & Status & Timeframe */}
                <div className="flex items-center gap-4 flex-wrap text-xs">
                  {/* Goal Type Filter */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">Type:</span>
                    <div className="flex bg-[#141620] p-0.5 rounded-lg border border-gray-800">
                      {(['all', 'START', 'STOP'] as const).map(t => (
                        <button
                          key={t}
                          onClick={() => setFilterType(t)}
                          className={`px-2.5 py-1 rounded text-[11px] font-semibold transition capitalize ${
                            filterType === t ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          {t === 'all' ? 'All Types' : t === 'START' ? 'Build' : 'Quit'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Status Filter */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">Status:</span>
                    <div className="flex bg-[#141620] p-0.5 rounded-lg border border-gray-800">
                      {(['all', 'pending', 'completed'] as const).map(s => (
                        <button
                          key={s}
                          onClick={() => setFilterStatus(s)}
                          className={`px-2.5 py-1 rounded text-[11px] font-semibold transition capitalize ${
                            filterStatus === s ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          {s === 'all' ? 'All Status' : s === 'pending' ? 'Active' : 'Completed'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Timeframe Filter */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">Timeframe:</span>
                    <div className="flex bg-[#141620] p-0.5 rounded-lg border border-gray-800">
                      {(['all', 'daily', 'weekly', 'monthly'] as const).map(tf => (
                        <button
                          key={tf}
                          onClick={() => setFilterTimeframe(tf)}
                          className={`px-2.5 py-1 rounded text-[11px] font-semibold transition capitalize ${
                            filterTimeframe === tf ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          {tf === 'all' ? 'All' : tf}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Filter Row 2: User Groups Filter */}
                {existingGroups.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center gap-1">
                      <Tag size={11} className="text-purple-400" />
                      Group:
                    </span>
                    <div className="flex gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setFilterGroup('all')}
                        className={`px-2.5 py-0.5 rounded-lg text-[11px] font-semibold transition border ${
                          filterGroup === 'all'
                            ? 'bg-purple-600 text-white border-purple-500 shadow-sm'
                            : 'bg-[#141620] text-gray-400 hover:text-white border-gray-800'
                        }`}
                      >
                        All Groups
                      </button>
                      {existingGroups.map(g => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setFilterGroup(filterGroup.toLowerCase() === g.toLowerCase() ? 'all' : g)}
                          className={`px-2.5 py-0.5 rounded-lg text-[11px] font-semibold transition border ${
                            filterGroup.toLowerCase() === g.toLowerCase()
                              ? 'bg-purple-600 text-white border-purple-500 shadow-sm'
                              : 'bg-[#141620] text-gray-400 hover:text-white border-gray-800'
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setFilterGroup(filterGroup === '__ungrouped__' ? 'all' : '__ungrouped__')}
                        className={`px-2.5 py-0.5 rounded-lg text-[11px] font-semibold transition border ${
                          filterGroup === '__ungrouped__'
                            ? 'bg-purple-600 text-white border-purple-500 shadow-sm'
                            : 'bg-[#141620] text-gray-400 hover:text-white border-gray-800'
                        }`}
                      >
                        Ungrouped
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Modal: Add Recurring Habit */}
        <Modal isOpen={showHabitForm} onClose={() => setShowHabitForm(false)}>
          <HabitForm
            existingGroups={existingGroups}
            onSave={(h) => { addHabit(h); setShowHabitForm(false); }}
            onCancel={() => setShowHabitForm(false)}
          />
        </Modal>

        {/* Modal: Edit Recurring Habit */}
        <Modal isOpen={Boolean(editingHabitId && editingHabit)} onClose={() => setEditingHabitId(null)}>
          {editingHabit && (
            <HabitForm
              initialHabit={editingHabit}
              existingGroups={existingGroups}
              onSave={(h) => { updateHabit(h); setEditingHabitId(null); }}
              onCancel={() => setEditingHabitId(null)}
              onDelete={() => { deleteHabit(editingHabit.id); setEditingHabitId(null); }}
            />
          )}
        </Modal>

        {/* Modal: Add One-Off Task */}
        <Modal isOpen={showTaskForm} onClose={() => setShowTaskForm(false)}>
          <TaskForm
            existingGroups={existingGroups}
            onSave={(t) => { addHabit(t); setShowTaskForm(false); }}
            onCancel={() => setShowTaskForm(false)}
          />
        </Modal>

        {/* Modal: Edit One-Off Task */}
        <Modal isOpen={Boolean(editingTaskId && editingTask)} onClose={() => setEditingTaskId(null)}>
          {editingTask && (
            <TaskForm
              initialTask={editingTask}
              existingGroups={existingGroups}
              onSave={(t) => { updateHabit(t); setEditingTaskId(null); }}
              onCancel={() => setEditingTaskId(null)}
              onDelete={() => { deleteHabit(editingTask.id); setEditingTaskId(null); }}
            />
          )}
        </Modal>

        {/* Modal: Habit Insights */}
        {insightsHabitId && insightsHabit && (
          <HabitInsightsModal
            habit={insightsHabit}
            onClose={() => setInsightsHabitId(null)}
            onEdit={() => {
              const id = insightsHabit.id;
              setInsightsHabitId(null);
              setEditingHabitId(id);
            }}
          />
        )}

        {/* Section 1: Recurring Habits Table Container */}
        {recurringHabits.length > 0 ? (
          <div className="bg-[#090a0d] border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
            {/* Top Navigation Bar */}
            <div className="flex items-center justify-between p-3 border-b border-gray-800 bg-[#0e1015] gap-3 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center bg-gray-900 rounded-lg border border-gray-700/60 shadow-sm overflow-hidden">
                  <button
                    onClick={() => changeDate(viewMode === 'year' ? -1 : (viewMode === 'week' ? -7 : -1))}
                    className="p-1.5 hover:bg-gray-800 text-gray-400 hover:text-white transition border-r border-gray-800"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-xs font-bold text-white px-3">
                    {viewMode === 'day'
                      ? format(selectedDate, 'EEE, MMM d, yyyy')
                      : (viewMode === 'week'
                        ? `${format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'MMM d')} – ${format(addDays(startOfWeek(selectedDate, { weekStartsOn: 1 }), 6), 'MMM d, yyyy')}`
                        : (viewMode === 'month'
                          ? format(selectedDate, 'MMMM yyyy')
                          : format(selectedDate, 'yyyy')))}
                  </span>
                  <button
                    onClick={() => changeDate(viewMode === 'year' ? 1 : (viewMode === 'week' ? 7 : 1))}
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

              {/* View Mode Toggle & Applicable Toggleables */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Numbers Toggle */}
                {viewMode !== 'year' && viewMode !== 'day' && (
                  <button
                    onClick={() => setShowNumbers(!showNumbers)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition border flex items-center gap-1.5 ${showNumbers
                      ? 'bg-blue-600/20 text-blue-400 border-blue-500/40 shadow-sm'
                      : 'bg-gray-900 text-gray-400 border-gray-800 hover:text-white'
                      }`}
                  >
                    <Hash size={13} />
                    <span>Numbers {showNumbers ? 'ON' : 'OFF'}</span>
                  </button>
                )}

                {/* Groups / Categories Toggle */}
                <button
                  onClick={() => setCategoryGroupingEnabled(!categoryGroupingEnabled)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition border flex items-center gap-1.5 ${categoryGroupingEnabled
                    ? 'bg-purple-600/20 text-purple-400 border-purple-500/40 shadow-sm'
                    : 'bg-gray-900 text-gray-400 border-gray-800 hover:text-white'
                    }`}
                >
                  <Tag size={13} />
                  <span>Groups {categoryGroupingEnabled ? 'ON' : 'OFF'}</span>
                </button>

                {/* Cell Grouping Toggle */}
                {viewMode !== 'day' && (
                  <button
                    onClick={() => setCellGroupingEnabled(!cellGroupingEnabled)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition border flex items-center gap-1.5 ${cellGroupingEnabled
                      ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/40 shadow-sm'
                      : 'bg-gray-900 text-gray-400 border-gray-800 hover:text-white'
                      }`}
                  >
                    <Layers size={13} />
                    <span>Cell Grouping {cellGroupingEnabled ? 'ON' : 'OFF'}</span>
                  </button>
                )}

                {/* Borders Toggle */}
                {viewMode !== 'day' && viewMode !== 'year' && (
                  <button
                    onClick={() => setShowBorders(!showBorders)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition border flex items-center gap-1.5 ${showBorders
                      ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/40 shadow-sm'
                      : 'bg-gray-900 text-gray-400 border-gray-800 hover:text-white'
                      }`}
                  >
                    <Grid size={13} />
                    <span>Borders {showBorders ? 'ON' : 'OFF'}</span>
                  </button>
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
              {viewMode !== 'month' && viewMode !== 'year' && canScrollLeft && (
                <button
                  onClick={() => scrollDays('left')}
                  className={`absolute top-1/2 -translate-y-1/2 z-30 w-7 h-7 bg-gray-900/95 hover:bg-blue-600 text-white rounded-full flex items-center justify-center shadow-2xl border border-gray-700 hover:border-blue-500 backdrop-blur-md transition-all hover:scale-110 ${viewMode === 'week' ? 'left-[235px] sm:left-[275px] md:left-[295px]' : 'left-[385px] sm:left-[465px] md:left-[525px]'
                    }`}
                >
                  <ChevronLeft size={16} />
                </button>
              )}

              {viewMode !== 'month' && viewMode !== 'year' && canScrollRight && (
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
                className={(viewMode === 'month' || viewMode === 'year') ? "overflow-hidden w-full" : "overflow-x-auto no-scrollbar w-full"}
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                <div className="w-full min-w-full">
                  {/* Table Header Row */}
                  <div className="w-full flex items-stretch border-b border-gray-800 bg-[#12141a] h-12">
                    {viewMode === 'month' || viewMode === 'year' ? (
                      <div className="w-14 min-w-[56px] max-w-[56px] shrink-0 flex items-center justify-center px-3 border-r border-gray-800 text-[10px] font-bold text-gray-400 uppercase tracking-wider h-full">
                        <span>Habit</span>
                      </div>
                    ) : viewMode === 'week' ? (
                      <div className="w-[230px] sm:w-[270px] md:w-[290px] min-w-[220px] shrink-0 flex items-center justify-between px-3 py-2 border-r border-gray-800 text-[11px] font-bold text-gray-400 uppercase tracking-wider h-full">
                        <span>Recurring Habits ({filteredRecurringHabits.length})</span>
                      </div>
                    ) : (
                      <div className="w-[380px] sm:w-[460px] md:w-[520px] min-w-[340px] shrink-0 flex items-center justify-between px-3 py-2 border-r border-gray-800 text-[11px] font-bold text-gray-400 uppercase tracking-wider h-full">
                        <span>Recurring Habits ({filteredRecurringHabits.length})</span>
                      </div>
                    )}

                    {/* Date Column Header Cells */}
                    {viewMode === 'year' ? (
                      <div className="flex-1 flex items-stretch min-w-0">
                        {Array.from({ length: 12 }, (_, monthIdx) => {
                          const monthDate = new Date(selectedDate.getFullYear(), monthIdx, 1);
                          const daysCount = getDaysInMonth(monthDate);
                          const isCurrentMonth = isSameMonth(monthDate, new Date()) && selectedDate.getFullYear() === new Date().getFullYear();
                          return (
                            <div
                              key={monthIdx}
                              onClick={() => {
                                handleDateSelect(monthDate);
                                setViewMode('month');
                              }}
                              className={`flex items-center justify-center text-[10px] font-bold tracking-wider uppercase transition-colors cursor-pointer ${isCurrentMonth ? 'text-blue-400 bg-blue-600/10' : 'text-gray-400 hover:bg-gray-800/30 hover:text-gray-200'
                                }`}
                              style={{ flex: `${daysCount} 0 0%` }}
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
                          const dateNum = format(day, 'd');
                          const monthAbbr = format(day, 'MMM');

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
                                  {viewMode === 'month' ? '' : monthAbbr}
                                </span>
                              )}
                              <span className={`font-extrabold transition-colors leading-tight ${viewMode === 'month' ? 'text-xs' : (viewMode === 'day' ? 'text-base' : 'text-sm')
                                } ${isSelected ? 'text-white' : 'text-gray-200'}`}>
                                {viewMode === 'day' ? format(day, 'MMMM d') : dateNum}
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
                  ) : categoryGroupingEnabled && (groupedRecurringHabits.length > 1 || !groupedRecurringHabits[0].isUngrouped) ? (
                    groupedRecurringHabits.map((grp) => (
                      <div key={grp.name || 'ungrouped'} className="flex flex-col">
                        {/* Group Header Row */}
                        <div className="w-full flex items-center justify-between bg-[#0e1117] border-y border-gray-800/90 py-1.5 px-3 select-none sticky left-0 z-10">
                          <div className="flex items-center gap-2">
                            <Layers size={13} className="text-purple-400 shrink-0" />
                            <span className="text-xs font-bold text-gray-200 tracking-wide uppercase">
                              {grp.name || 'General / Other'}
                            </span>
                            <span className="text-[10px] font-semibold text-gray-400 bg-gray-900 px-2 py-0.5 rounded-full border border-gray-700/60">
                              {grp.items.length} {grp.items.length === 1 ? 'habit' : 'habits'}
                            </span>
                          </div>
                        </div>

                        {/* Habit Cards in this Group */}
                        <div className="flex flex-col gap-0 divide-y divide-gray-800/80">
                          {grp.items.map((habit) => (
                            <HabitCard
                              key={habit.id}
                              habit={habit}
                              selectedDateStr={selectedDateStr}
                              weekDays={displayedDays}
                              viewMode={viewMode}
                              showNumbers={showNumbers}
                              cellGroupingEnabled={cellGroupingEnabled}
                              showBorders={showBorders}
                              onLog={setLog.bind(null, habit.id)}
                              onEdit={() => setEditingHabitId(habit.id)}
                              onOpenInsights={() => setInsightsHabitId(habit.id)}
                              onSelectDate={(d) => {
                                handleDateSelect(d);
                                if (viewMode === 'year') {
                                  setViewMode('day');
                                }
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col gap-0 divide-y divide-gray-800/80">
                      {filteredRecurringHabits.map((habit) => (
                        <HabitCard
                          key={habit.id}
                          habit={habit}
                          selectedDateStr={selectedDateStr}
                          weekDays={displayedDays}
                          viewMode={viewMode}
                          showNumbers={showNumbers}
                          cellGroupingEnabled={cellGroupingEnabled}
                          showBorders={showBorders}
                          onLog={setLog.bind(null, habit.id)}
                          onEdit={() => setEditingHabitId(habit.id)}
                          onOpenInsights={() => setInsightsHabitId(habit.id)}
                          onSelectDate={(d) => {
                            handleDateSelect(d);
                            if (viewMode === 'year') {
                              setViewMode('day');
                            }
                          }}
                        />
                      ))}
                    </div>
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
          <div className="bg-[#090a0d] border border-gray-800 rounded-xl p-8 text-center text-gray-500 shadow-xl">
            <p className="text-sm">No recurring habits added yet.</p>
            <button
              onClick={() => setShowHabitForm(true)}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-blue-400 hover:text-blue-300 bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20 transition"
            >
              <PlusCircle size={14} />
              <span>Create Recurring Habit</span>
            </button>
          </div>
        )}

        {/* Section 2: Dedicated One-Off Tasks & Goals Table */}
        {oneOffTasks.length > 0 ? (
          <div className="bg-[#090a0d] border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
            {/* Top Header Bar */}
            <div className="flex items-center justify-between p-3 border-b border-gray-800 bg-[#0e1015] gap-3 flex-wrap">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Target size={15} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white tracking-wide uppercase">
                    One-Off Tasks & Goals ({filteredOneOffTasks.length})
                  </h3>
                </div>
              </div>

              {/* One-Off Completion Summary & Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold px-3 py-1 rounded-lg bg-gray-900 border border-gray-700/60 text-gray-300">
                  <span className="text-emerald-400 font-bold">{completedOneOffCount}</span> of {oneOffTasks.length} completed
                </span>

                {completedOneOffCount > 0 && (
                  <button
                    onClick={clearCompletedOneOffTasks}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30 transition flex items-center gap-1.5 shadow-sm"
                  >
                    <Trash2 size={12} />
                    <span>Clear Completed ({completedOneOffCount})</span>
                  </button>
                )}
              </div>
            </div>

            {/* Tasks Table Rows */}
            {filteredOneOffTasks.length === 0 ? (
              <div className="py-8 text-center text-gray-500 text-xs">
                No one-off tasks match the active filters.
              </div>
            ) : categoryGroupingEnabled && (groupedOneOffTasks.length > 1 || !groupedOneOffTasks[0].isUngrouped) ? (
              groupedOneOffTasks.map((grp) => (
                <div key={grp.name || 'ungrouped'} className="flex flex-col">
                  {/* Group Header Row */}
                  <div className="w-full flex items-center justify-between bg-[#0e1117] border-y border-gray-800/90 py-1.5 px-3 select-none">
                    <div className="flex items-center gap-2">
                      <Layers size={13} className="text-purple-400 shrink-0" />
                      <span className="text-xs font-bold text-gray-200 tracking-wide uppercase">
                        {grp.name || 'General / Other'}
                      </span>
                      <span className="text-[10px] font-semibold text-gray-400 bg-gray-900 px-2 py-0.5 rounded-full border border-gray-700/60">
                        {grp.items.length} {grp.items.length === 1 ? 'task' : 'tasks'}
                      </span>
                    </div>
                  </div>

                  {/* Task Rows in this Group */}
                  <div className="flex flex-col gap-0 divide-y divide-gray-800/80">
                    {grp.items.map((task) => (
                      <OneOffTaskCard
                        key={task.id}
                        task={task}
                        onLog={setLog.bind(null, task.id)}
                        onEdit={() => setEditingTaskId(task.id)}
                        onUpdateTask={updateHabit}
                      />
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col gap-0 divide-y divide-gray-800/80">
                {sortedOneOffTasks.map((task) => (
                  <OneOffTaskCard
                    key={task.id}
                    task={task}
                    onLog={setLog.bind(null, task.id)}
                    onEdit={() => setEditingTaskId(task.id)}
                    onUpdateTask={updateHabit}
                  />
                ))}
              </div>
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
      <FloatingTimerWidget habits={habits} onOpenInsights={(id) => setInsightsHabitId(id)} />
    </div>
    </TimerProvider>
  );
}
