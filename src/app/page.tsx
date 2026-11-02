'use client';

import { useState, useMemo, useRef, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useHabits } from '../context/HabitsContext';
import { Modal } from '../components/Modal';
import { DailyPlanner } from '../components/DailyPlanner';
import { HabitForm } from '../components/HabitForm';
import { TaskForm } from '../components/TaskForm';
import { HabitCard, leftColumnClass } from '../components/HabitCard';
import { HabitInsightsModal } from '../components/HabitInsightsModal';
import { OneOffTasksSection } from '../components/OneOffTasksSection';
import { GroupedList } from '../components/GroupedList';
import {
  SearchToggle, FilterButton, SegmentFilter, GroupFilter, ClearFiltersButton, matchesSearch, matchesGroup,
} from '../components/ListControls';
import {
  PlusCircle, ChevronLeft, ChevronRight, Hash, Layers, Grid, Tag, Database, Sparkles, Plus
} from 'lucide-react';
import { normalizeDateStr, isHabitMetOn, WEEK_OPTIONS, getExistingGroups } from '../lib/habitUtils';
import { getSampleHabits } from '../lib/sampleHabits';
import {
  addDays, addWeeks, addMonths, addYears, isSameDay, format, getDaysInMonth,
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear,
  eachDayOfInterval, isSameMonth, parseISO, isValid,
} from 'date-fns';
import { Habit, HabitType, Timeframe, ViewMode } from '../types';

const STEP_VIEW = { day: addDays, week: addWeeks, month: addMonths, year: addYears };

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

const VIEW_MODES: ViewMode[] = ['day', 'week', 'month', 'year'];

/** Other pages link here as /?date=YYYY-MM-DD&view=day to open the grid on a specific day. */
function readInitialView(params: URLSearchParams): { date: Date; view: ViewMode } {
  const date = parseISO(params.get('date') || '');
  const view = params.get('view') as ViewMode;
  return {
    date: isValid(date) ? date : new Date(),
    view: VIEW_MODES.includes(view) ? view : 'week',
  };
}

/* ---------- Page ---------- */

// useSearchParams needs a Suspense boundary on a statically rendered page
export default function Page() {
  return (
    <Suspense>
      <Home />
    </Suspense>
  );
}

function Home() {
  const searchParams = useSearchParams();
  const { habits, addHabit, updateHabit, deleteHabits, setLog, setAllHabits } = useHabits();
  const [initialView] = useState(() => readInitialView(searchParams));

  // Modals
  const [showHabitForm, setShowHabitForm] = useState(false);
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [insightsHabitId, setInsightsHabitId] = useState<string | null>(null);
  // Links a task row and its marker on the daily planner while either is hovered
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);

  // Grid view
  const [selectedDate, setSelectedDate] = useState(initialView.date);
  const [viewMode, setViewMode] = useState<ViewMode>(initialView.view);
  const [showNumbers, setShowNumbers] = useState(true);
  const [cellGroupingEnabled, setCellGroupingEnabled] = useState(true);
  const [categoryGroupingEnabled, setCategoryGroupingEnabled] = useState(true);
  const [showBorders, setShowBorders] = useState(false);

  // Habit filters (the task list has its own)
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

  const existingGroups = useMemo(() => getExistingGroups(habits), [habits]);
  const habitGroups = useMemo(() => getExistingGroups(recurringHabits), [recurringHabits]);

  const filteredRecurringHabits = useMemo(() => recurringHabits.filter(h =>
    matchesSearch(h, searchQuery)
    && (filterType === 'all' || h.type === filterType)
    && (filterTimeframe === 'all' || h.timeframe === filterTimeframe)
    && matchesGroup(h, filterGroup)
    && (filterStatus === 'all' || isHabitMetOn(h, selectedDate) === (filterStatus === 'completed'))
  ), [recurringHabits, searchQuery, filterType, filterTimeframe, filterGroup, filterStatus, selectedDate]);

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

  // Drop ?date=… once read so a refresh returns to the normal view
  useEffect(() => {
    if (window.location.search) window.history.replaceState(null, '', window.location.pathname);
  }, []);

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

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800/80 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">Today</h1>
          <p className="text-xs font-semibold text-gray-400 mt-0.5">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
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

      <div className="grid grid-cols-1 xl:grid-cols-[340px_minmax(0,1fr)] gap-6 items-start">
        <DailyPlanner
          highlightedTaskId={hoveredTaskId}
          onHoverTask={setHoveredTaskId}
          onEditTask={setEditingTaskId}
        />

        <div className="space-y-6 min-w-0">
          {/* Modals */}
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

                  <SearchToggle value={searchQuery} onChange={setSearchQuery} label="Search habits" />
                  <FilterButton
                    open={showFilterBar}
                    activeCount={activeFiltersCount}
                    onClick={() => setShowFilterBar(!showFilterBar)}
                    label="Habit filters"
                  />
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

              {/* Filter panel */}
              {showFilterBar && (
                <div className="px-3 py-2.5 border-b border-gray-800 bg-[#0b0c10] space-y-2.5 animate-in fade-in duration-150">
                  <div className="flex items-center gap-4 flex-wrap text-xs">
                    <SegmentFilter
                      label="Type"
                      value={filterType}
                      onChange={setFilterType}
                      activeClass="bg-blue-600"
                      options={[
                        { value: 'all', label: 'All' },
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
                        { value: 'all', label: 'All' },
                        { value: 'pending', label: 'Active' },
                        { value: 'completed', label: 'Done' },
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
                    {activeFiltersCount > 0 && <ClearFiltersButton onClick={clearAllFilters} />}
                  </div>

                  <GroupFilter groups={habitGroups} value={filterGroup} onChange={setFilterGroup} />
                </div>
              )}

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
                  className={isWideView ? 'overflow-hidden w-full' : 'overflow-x-auto w-full'}
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
                        items={filteredRecurringHabits}
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
                <Link
                  href="/data"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-300 hover:text-white bg-gray-900 hover:bg-gray-800 border border-gray-700/80 px-4 py-2 rounded-xl transition active:scale-95"
                >
                  <Database size={14} />
                  <span>Import Backup</span>
                </Link>
              </div>
            </div>
          )}

          <OneOffTasksSection
            tasks={oneOffTasks}
            onAdd={() => setShowTaskForm(true)}
            onEdit={setEditingTaskId}
            onUpdateTask={updateHabit}
            onDeleteTasks={deleteHabits}
            hoveredTaskId={hoveredTaskId}
            onHoverTask={setHoveredTaskId}
          />
        </div>
      </div>
    </div>
  );
}
