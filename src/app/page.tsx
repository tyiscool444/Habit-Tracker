'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useHabits } from '../hooks/useHabits';
import { HabitForm } from '../components/HabitForm';
import { HabitCard } from '../components/HabitCard';
import { OneOffTaskCard } from '../components/OneOffTaskCard';
import { HabitInsightsModal } from '../components/HabitInsightsModal';
import { PlusCircle, ChevronLeft, ChevronRight, Hash, Layers, Grid, CheckCircle2, Target, Calendar, Trash2, Palette, Sparkles } from 'lucide-react';
import { normalizeDateStr, getAmountInInterval } from '../lib/habitUtils';
import { THEMES, ThemeId } from '../lib/themes';
import {
  addDays, isSameDay, format, getDaysInMonth, startOfMonth, endOfMonth,
  addMonths, startOfWeek, endOfWeek, startOfYear, endOfYear, addYears,
  eachDayOfInterval, isSameMonth
} from 'date-fns';

export default function Home() {
  const { habits, addHabit, updateHabit, deleteHabit, deleteHabits, setLog, reorderHabits, isLoaded } = useHabits();
  const [showForm, setShowForm] = useState(false);
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [insightsHabitId, setInsightsHabitId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month' | 'year'>('week');
  const [showNumbers, setShowNumbers] = useState(true);
  const [groupingEnabled, setGroupingEnabled] = useState(true);
  const [showBorders, setShowBorders] = useState(false);
  const [currentThemeId, setCurrentThemeId] = useState<ThemeId>('midnight');
  const [showThemePicker, setShowThemePicker] = useState(false);

  // Load and save theme to localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('habit-theme') as ThemeId;
    if (savedTheme && THEMES.some(t => t.id === savedTheme)) {
      setCurrentThemeId(savedTheme);
    }
  }, []);

  const handleSelectTheme = (themeId: ThemeId) => {
    setCurrentThemeId(themeId);
    localStorage.setItem('habit-theme', themeId);
    setShowThemePicker(false);
  };

  const activeTheme = useMemo(() => THEMES.find(t => t.id === currentThemeId) || THEMES[0], [currentThemeId]);

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

  // Reorder habit up or down
  const moveHabit = (habitId: string, direction: 'up' | 'down') => {
    const idx = habits.findIndex(h => h.id === habitId);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= habits.length) return;

    const nextHabits = [...habits];
    const [moved] = nextHabits.splice(idx, 1);
    nextHabits.splice(targetIdx, 0, moved);
    reorderHabits(nextHabits);
  };

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
          percent = amount <= habit.quota ? 1 : Math.max(0, 1 - ((amount - habit.quota) / habit.quota));
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
  const insightsHabit = useMemo(() => habits.find(h => h.id === insightsHabitId), [habits, insightsHabitId]);

  // Compute displayed days based on viewMode (Day: 1 day, Week: Mon-Sun, Month: full month, Year: 365 days)
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

  if (!isLoaded) return <div className="min-h-screen bg-black" />;

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
    <div 
      className="min-h-screen text-slate-100 p-4 sm:p-8 font-sans selection:bg-blue-600/30 transition-colors duration-300"
      style={{ backgroundColor: activeTheme.bg }}
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Modern Centered App Header with Theme Switcher button */}
        <header className="relative text-center pt-2 pb-1">
          {/* Theme Selector Toggle (Top Right) */}
          <div className="absolute right-0 top-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowThemePicker(!showThemePicker)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-900/90 hover:bg-gray-800 text-gray-300 hover:text-white border border-gray-700/60 shadow-lg text-xs font-semibold backdrop-blur-md transition"
                title="Customize App Theme"
              >
                <Palette size={13} className="text-blue-400" />
                <span className="hidden sm:inline">{activeTheme.name}</span>
                <span
                  className="w-2.5 h-2.5 rounded-full border border-white/20 shadow-sm"
                  style={{ backgroundColor: activeTheme.dotColor }}
                />
              </button>

              {/* Theme Popover Menu */}
              {showThemePicker && (
                <div
                  className="absolute right-0 mt-2 w-48 bg-[#0e1015] border border-gray-800 rounded-2xl p-2 shadow-2xl z-40 space-y-1 animate-in fade-in zoom-in-95 duration-150"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-2.5 py-1">
                    Select Theme
                  </div>
                  {THEMES.map((theme) => {
                    const isSelected = theme.id === currentThemeId;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => handleSelectTheme(theme.id)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                          isSelected
                            ? 'bg-blue-600/20 text-white border border-blue-500/40'
                            : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full border border-white/20 shrink-0"
                            style={{ backgroundColor: theme.dotColor }}
                          />
                          <span>{theme.name}</span>
                        </div>
                        {isSelected && <span className="text-[10px] text-blue-400 font-bold">✓</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-3 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            Habit Tracker & Planner
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white drop-shadow-sm">
            Habit<span style={{ color: activeTheme.dotColor }}>That</span>
          </h1>
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

        {/* Modal: Add Habit */}
        {showForm && (
          <div
            onClick={() => setShowForm(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer animate-in fade-in duration-200"
          >
            <div onClick={(e) => e.stopPropagation()} className="cursor-default w-full max-w-md">
              <HabitForm
                onSave={(h) => { addHabit(h); setShowForm(false); }}
                onCancel={() => setShowForm(false)}
              />
            </div>
          </div>
        )}

        {/* Modal: Edit Habit */}
        {editingHabitId && editingHabit && (
          <div
            onClick={() => setEditingHabitId(null)}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer animate-in fade-in duration-200"
          >
            <div onClick={(e) => e.stopPropagation()} className="cursor-default w-full max-w-md">
              <HabitForm
                initialHabit={editingHabit}
                onSave={(h) => { updateHabit(h); setEditingHabitId(null); }}
                onCancel={() => setEditingHabitId(null)}
                onDelete={() => { deleteHabit(editingHabit.id); setEditingHabitId(null); }}
              />
            </div>
          </div>
        )}

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

        {/* Section 1: Recurring Habits Grid (Excel-Style Touching Grid) */}
        {recurringHabits.length > 0 ? (
          <div className="bg-[#090a0d] border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
            {/* Navigation Top Bar */}
            <div className="flex items-center justify-between p-3 border-b border-gray-800 bg-[#0e1015] gap-3 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center bg-gray-900 rounded-lg border border-gray-700/60 shadow-sm overflow-hidden">
                  <button
                    onClick={() => changeDate(viewMode === 'year' ? -1 : (viewMode === 'week' ? -7 : -1))}
                    className="p-1.5 hover:bg-gray-800 text-gray-400 hover:text-white transition border-r border-gray-800"
                    title={viewMode === 'year' ? 'Previous Year' : (viewMode === 'month' ? 'Previous Month' : (viewMode === 'week' ? 'Previous Week' : 'Previous Day'))}
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
                    title={viewMode === 'year' ? 'Next Year' : (viewMode === 'month' ? 'Next Month' : (viewMode === 'week' ? 'Next Week' : 'Next Day'))}
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
                {/* Numbers Toggle: Applicable to Week, Month (Hidden in Day and Year) */}
                {viewMode !== 'year' && viewMode !== 'day' && (
                  <button
                    onClick={() => setShowNumbers(!showNumbers)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition border flex items-center gap-1.5 ${showNumbers
                      ? 'bg-blue-600/20 text-blue-400 border-blue-500/40 shadow-sm'
                      : 'bg-gray-900 text-gray-400 border-gray-800 hover:text-white'
                      }`}
                    title={showNumbers ? 'Numbers: Visible (Click to hide)' : 'Numbers: Hidden (Click to show)'}
                  >
                    <Hash size={13} />
                    <span>Numbers {showNumbers ? 'ON' : 'OFF'}</span>
                  </button>
                )}

                {/* Grouping Toggle: Applicable to Week, Month, Year (Hidden in Day) */}
                {viewMode !== 'day' && (
                  <button
                    onClick={() => setGroupingEnabled(!groupingEnabled)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition border flex items-center gap-1.5 ${groupingEnabled
                      ? 'bg-purple-600/20 text-purple-400 border-purple-500/40 shadow-sm'
                      : 'bg-gray-900 text-gray-400 border-gray-800 hover:text-white'
                      }`}
                    title={groupingEnabled ? 'Goal Grouping: ON (Click to disable combining completed cells)' : 'Goal Grouping: OFF (Click to combine completed cells)'}
                  >
                    <Layers size={13} />
                    <span>Grouping {groupingEnabled ? 'ON' : 'OFF'}</span>
                  </button>
                )}

                {/* Borders Toggle: Applicable to Week, Month (Hidden in Day and Year) */}
                {viewMode !== 'day' && viewMode !== 'year' && (
                  <button
                    onClick={() => setShowBorders(!showBorders)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition border flex items-center gap-1.5 ${showBorders
                      ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/40 shadow-sm'
                      : 'bg-gray-900 text-gray-400 border-gray-800 hover:text-white'
                      }`}
                    title={showBorders ? 'Borders: Visible (Click to hide cell borders)' : 'Borders: Hidden (Click to show cell borders)'}
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

            {/* Grid Table Container with Custom Scroll Arrows (Scrollbar Hidden) */}
            <div className="relative group/table">
              {/* Floating Left Scroll Arrow (Only in scrollable views) */}
              {viewMode !== 'month' && viewMode !== 'year' && canScrollLeft && (
                <button
                  onClick={() => scrollDays('left')}
                  className={`absolute top-1/2 -translate-y-1/2 z-30 w-7 h-7 bg-gray-900/95 hover:bg-blue-600 text-white rounded-full flex items-center justify-center shadow-2xl border border-gray-700 hover:border-blue-500 backdrop-blur-md transition-all hover:scale-110 ${viewMode === 'week' ? 'left-[235px] sm:left-[275px] md:left-[295px]' : 'left-[385px] sm:left-[465px] md:left-[525px]'
                    }`}
                  title="Scroll Left"
                >
                  <ChevronLeft size={16} />
                </button>
              )}

              {/* Floating Right Scroll Arrow (Only in scrollable views) */}
              {viewMode !== 'month' && viewMode !== 'year' && canScrollRight && (
                <button
                  onClick={() => scrollDays('right')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-30 w-7 h-7 bg-gray-900/95 hover:bg-blue-600 text-white rounded-full flex items-center justify-center shadow-2xl border border-gray-700 hover:border-blue-500 backdrop-blur-md transition-all hover:scale-110"
                  title="Scroll Right"
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
                  {/* Table Header Row (Touching Excel-style header cells) */}
                  <div className="w-full flex items-stretch border-b border-gray-800 bg-[#12141a] h-12">
                    {/* Left Header Title */}
                    {viewMode === 'month' || viewMode === 'year' ? (
                      <div className="w-14 min-w-[56px] max-w-[56px] shrink-0 flex items-center justify-center px-3 border-r border-gray-800 text-[10px] font-bold text-gray-400 uppercase tracking-wider h-full">
                        <span>Habit</span>
                      </div>
                    ) : viewMode === 'week' ? (
                      <div className="w-[230px] sm:w-[270px] md:w-[290px] min-w-[220px] shrink-0 flex items-center justify-between px-3 py-2 border-r border-gray-800 text-[11px] font-bold text-gray-400 uppercase tracking-wider h-full">
                        <span>Habits ({recurringHabits.length})</span>
                      </div>
                    ) : (
                      <div className="w-[380px] sm:w-[460px] md:w-[520px] min-w-[340px] shrink-0 flex items-center justify-between px-3 py-2 border-r border-gray-800 text-[11px] font-bold text-gray-400 uppercase tracking-wider h-full">
                        <span>Habits ({recurringHabits.length})</span>
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
                              title={`Click to view ${format(monthDate, 'MMMM yyyy')} in monthly view`}
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
                              title={format(day, 'EEEE, MMMM d, yyyy')}
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

                  {/* Habit Rows */}
                  <div className="flex flex-col gap-0 divide-y divide-gray-800/80">
                    {recurringHabits.map((habit, idx) => (
                      <HabitCard
                        key={habit.id}
                        habit={habit}
                        selectedDate={selectedDate}
                        selectedDateStr={selectedDateStr}
                        weekDays={displayedDays}
                        viewMode={viewMode}
                        showNumbers={showNumbers}
                        groupingEnabled={groupingEnabled}
                        showBorders={showBorders}
                        canMoveUp={idx > 0}
                        canMoveDown={idx < recurringHabits.length - 1}
                        onMoveUp={() => moveHabit(habit.id, 'up')}
                        onMoveDown={() => moveHabit(habit.id, 'down')}
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
              </div>
            </div>

            {/* Add New Habit Row at Bottom */}
            <div
              onClick={() => setShowForm(true)}
              className="bg-[#0b0c10] border-t border-gray-800/80 py-2.5 px-4 flex items-center justify-center cursor-pointer hover:bg-[#12141a] transition-all group"
            >
              <div className="flex items-center gap-2 text-gray-500 group-hover:text-blue-400 transition-colors">
                <PlusCircle size={15} />
                <span className="text-xs font-semibold">Add New Habit</span>
              </div>
            </div>
          </div>
        ) : habits.length === 0 ? (
          /* Empty state when no habits exist */
          <div className="text-center py-20 bg-gray-900/40 rounded-3xl border border-gray-800 border-dashed">
            <div className="text-gray-500 mb-4">
              <PlusCircle size={48} className="mx-auto" />
            </div>
            <h2 className="text-xl font-medium text-gray-300">No habits yet</h2>
            <p className="text-gray-500 mt-2 max-w-md mx-auto text-sm">
              Add a habit to start tracking your daily progress.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-6 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-full font-semibold transition shadow-lg shadow-blue-500/20 text-sm"
            >
              <PlusCircle size={18} />
              <span>Create Your First Habit</span>
            </button>
          </div>
        ) : (
          <div className="bg-[#090a0d] border border-gray-800 rounded-xl p-8 text-center text-gray-500">
            <p className="text-sm">No recurring habits added yet.</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-3 text-xs font-semibold text-blue-400 hover:underline"
            >
              + Create Recurring Habit
            </button>
          </div>
        )}

        {/* Section 2: Dedicated One-Off Habits & Tasks Section */}
        {oneOffTasks.length > 0 && (
          <div className="bg-[#090a0d] border border-gray-800 rounded-xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-gray-800/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Target size={16} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">One-Off Tasks & Goals</h3>
                  <p className="text-xs text-gray-400">Single target milestones and non-recurring habits</p>
                </div>
              </div>

              {/* One-Off Completion Summary & Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-gray-900 border border-gray-700/60 text-gray-300">
                  <span className="text-emerald-400 font-bold">{completedOneOffCount}</span> of {oneOffTasks.length} completed
                </span>

                {completedOneOffCount > 0 && (
                  <button
                    onClick={clearCompletedOneOffTasks}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30 transition flex items-center gap-1.5 shadow-sm"
                    title="Delete all completed one-off tasks"
                  >
                    <Trash2 size={12} />
                    <span>Clear Completed ({completedOneOffCount})</span>
                  </button>
                )}

                <button
                  onClick={() => setShowForm(true)}
                  className="px-3 py-1 text-xs font-semibold rounded-lg bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 border border-purple-500/40 transition flex items-center gap-1.5"
                >
                  <PlusCircle size={13} />
                  <span>Add Task</span>
                </button>
              </div>
            </div>

            {/* Grid of One-Off Task Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {oneOffTasks.map(task => (
                <OneOffTaskCard
                  key={task.id}
                  task={task}
                  onLog={setLog.bind(null, task.id)}
                  onEdit={() => setEditingHabitId(task.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
