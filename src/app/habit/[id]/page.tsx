'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useHabits } from '../../../hooks/useHabits';
import { getDayCellVisuals, normalizeDateStr, calculateHabitStats, unitLabel, getCurrentGoldStreakDates, getAmountInInterval } from '../../../lib/habitUtils';
import { ArrowLeft, Target, CalendarDays, Award, ChevronLeft, ChevronRight, Star, PieChart } from 'lucide-react';
import {
  startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  eachDayOfInterval, format, isBefore, isAfter, isSameMonth, isToday,
  addMonths, subMonths, addDays
} from 'date-fns';

export default function HabitCalendarPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { habits, isLoaded, setLog } = useHabits();

  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  // activeInput stores "YYYY-MM-DD" of the open cell, or null
  const [activeInput, setActiveInput] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeInput && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [activeInput]);

  if (!isLoaded) return <div className="min-h-screen bg-[#09090b]" />;

  const habit = habits.find(h => h.id === id);

  if (!habit) {
    return (
      <div className="min-h-screen bg-[#09090b] text-white p-8 flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Habit not found</h1>
          <button onClick={() => router.push('/')} className="text-blue-500 hover:text-blue-400 font-medium transition">Return Home</button>
        </div>
      </div>
    );
  }

  const stats = calculateHabitStats(habit);
  const now = new Date();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Calculate % of month completed
  const daysInMonthForStats = eachDayOfInterval({ start: monthStart, end: monthEnd });
  let totalMonthScore = 0;
  daysInMonthForStats.forEach(d => {
    const isFuture = isAfter(startOfDay(d), endOfDay(now));
    const amt = getAmountInInterval(habit.logs, startOfDay(d), endOfDay(d));
    if (habit.type === 'START') {
      totalMonthScore += Math.min(amt / habit.quota, 1);
    } else {
      if (!isFuture) {
        totalMonthScore += Math.max(0, 1 - (amt / habit.quota));
      }
    }
  });
  const monthCompletionPct = daysInMonthForStats.length > 0 
    ? Math.round((totalMonthScore / daysInMonthForStats.length) * 100)
    : 0;

  const ul = unitLabel(habit.unit);
  const currentGoldDates = getCurrentGoldStreakDates(habit);

  const openInput = (dateStr: string, currentAmount: number) => {
    setActiveInput(dateStr);
    setInputValue(currentAmount > 0 ? String(currentAmount) : '');
  };

  const commitInput = (dateStr: string) => {
    const parsed = parseFloat(inputValue);
    setLog(habit.id, dateStr, isNaN(parsed) || parsed < 0 ? 0 : parsed);
    setActiveInput(null);
    setInputValue('');
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-white p-4 md:p-10 font-sans selection:bg-blue-500/30">
      <div className="max-w-5xl mx-auto space-y-10">

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-gray-800/60 pb-8">
          <div className="space-y-4">
            <button
              onClick={() => router.push('/')}
              className="group flex items-center text-sm font-medium text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="mr-2 w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Back to Dashboard
            </button>
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-lg shrink-0"
                style={{ backgroundColor: `${habit.color}20`, border: `1px solid ${habit.color}40` }}
              >
                {habit.icon}
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">{habit.name}</h1>
                <p className="text-gray-400 mt-1 flex items-center gap-2 text-sm md:text-base">
                  <Target className="w-4 h-4" />
                  {habit.type === 'START' ? 'Build Habit' : 'Quit Habit'}
                  {' • '}
                  {habit.type === 'START'
                    ? `${habit.quota}${ul} / ${habit.timeframe}`
                    : `Allowance: ${habit.quota}${ul} / ${habit.timeframe}`}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Stats Row — now 5 cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-gray-900/40 border border-gray-800/50 rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-lg">
            <PieChart className="w-5 h-5 text-purple-500 mb-1.5" />
            <span className="text-2xl md:text-3xl font-bold text-white">{monthCompletionPct}%</span>
            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mt-1">Month %</span>
          </div>
          <div className="bg-gray-900/40 border border-yellow-500/20 rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-lg">
            <Star className="w-5 h-5 text-yellow-400 mb-1.5" />
            <span className="text-2xl md:text-3xl font-bold text-white">{stats.perfectStreak}</span>
            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mt-1">Perfect Streak</span>
          </div>
          <div className="bg-gray-900/40 border border-gray-800/50 rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-lg">
            <Award className="w-5 h-5 text-emerald-500 mb-1.5" />
            <span className="text-2xl md:text-3xl font-bold text-white">{stats.totalPeriods - stats.failedPeriodsSinceStart}</span>
            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mt-1">Successful</span>
          </div>
          <div className="bg-gray-900/40 border border-gray-800/50 rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-lg">
            <CalendarDays className="w-5 h-5 text-blue-500 mb-1.5" />
            <span className="text-2xl md:text-3xl font-bold text-white">{stats.totalPeriods}</span>
            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mt-1">Total</span>
          </div>
          <div className="bg-gray-900/40 border border-gray-800/50 rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-lg col-span-2 md:col-span-1">
            <span className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)] mb-2" />
            <span className="text-2xl md:text-3xl font-bold text-white">{stats.failedPeriodsSinceStart}</span>
            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mt-1">Missed</span>
          </div>
        </div>

        {/* Calendar */}
        <div className="bg-gray-900/30 border border-gray-800/50 rounded-3xl p-5 md:p-8 backdrop-blur-md shadow-xl">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl md:text-2xl font-bold">{format(currentMonth, 'MMMM yyyy')}</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-2 md:gap-3 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-2 md:gap-3">
            {days.map((day, idx) => {
              // FIX: use format() so the date key is in local time, not UTC
              const dateStr = normalizeDateStr(day);
              const isFutureCell = isAfter(startOfDay(day), endOfDay(now));
              const sameMonth = isSameMonth(day, currentMonth);
              // FIX: activeInput is captured in closure; we use the stable dateStr
              const isInputOpen = activeInput === dateStr;

              const visuals = getDayCellVisuals(habit, day);
              let { opacity, isGold, isRed, amount } = visuals;

              if (habit.timeframe === 'weekly') {
                const weekStartDay = startOfWeek(day, { weekStartsOn: 1 });
                let weeklyAmount = 0;
                for (let i = 0; i < 7; i++) {
                   weeklyAmount += habit.logs[normalizeDateStr(addDays(weekStartDay, i))] || 0;
                }
                const isWeeklyMet = habit.type === 'START' ? weeklyAmount >= habit.quota : weeklyAmount <= habit.quota;
                
                if (isWeeklyMet && habit.type === 'START') {
                   isGold = true;
                } else if (isWeeklyMet && habit.type === 'STOP') {
                   if (isBefore(weekStartDay, now)) {
                     isGold = true;
                   } else {
                     isGold = false;
                   }
                } else {
                   isGold = false;
                }
              } else {
                // Only apply gold streak if it's currently going
                if (isGold && !currentGoldDates.has(dateStr)) {
                  isGold = false;
                }
              }

              // Only future cells are non-interactive — past days (even before startDate) are clickable
              const disabled = isFutureCell;

              // Background colour
              let bgColor: string;
              if (isRed) {
                bgColor = '#7f1d1d';
              } else if (amount > 0) {
                bgColor = habit.color;
              } else if (habit.type === 'STOP' && !isFutureCell) {
                // STOP habit clean day: show the habit color at its calculated opacity
                bgColor = habit.color;
              } else {
                bgColor = '#1f2937';
              }

              // Dim days outside the current month
              const finalOpacity = !sameMonth ? Math.max(opacity * 0.25, 0.06) : (disabled ? 0.08 : opacity);

              return (
                <div
                  key={idx}
                  className={`
                    aspect-square rounded-xl relative flex items-center justify-center group overflow-hidden
                    ${disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:brightness-110 transition-all'}
                    ${isGold && !isRed ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-[#09090b] shadow-[0_0_14px_rgba(250,204,21,0.5)]' : ''}
                    ${isRed ? 'ring-2 ring-red-500 ring-offset-2 ring-offset-[#09090b] shadow-[0_0_14px_rgba(239,68,68,0.4)]' : ''}
                  `}
                  style={{ backgroundColor: bgColor, opacity: finalOpacity }}
                  onClick={() => {
                    if (disabled) return;
                    openInput(dateStr, amount);
                  }}
                  title={format(day, 'MMM d, yyyy')}
                >
                  {isInputOpen ? (
                    <input
                      ref={inputRef}
                      type="number"
                      min="0"
                      step="any"
                      value={inputValue}
                      onChange={e => setInputValue(e.target.value)}
                      onBlur={() => commitInput(dateStr)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') commitInput(dateStr);
                        if (e.key === 'Escape') setActiveInput(null);
                      }}
                      onClick={e => e.stopPropagation()}
                      className="w-full h-full bg-transparent text-center text-sm font-bold text-white focus:outline-none px-1"
                      placeholder="0"
                    />
                  ) : (
                    <>
                      {/* Top-left: Unit */}
                      {ul !== 'x' && (
                        <span className="absolute top-1.5 left-1.5 text-[8px] md:text-[9px] font-medium opacity-60 tracking-wider">
                          {ul}
                        </span>
                      )}
                      {/* Center: Amount / Quota */}
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] md:text-xs font-bold opacity-90 leading-none">
                        {amount}/{habit.quota}
                      </span>
                      {/* Top-right: Date */}
                      <span
                        className={`
                          absolute top-1.5 right-1.5 text-[10px] md:text-xs font-bold leading-none
                          ${isToday(day) ? 'text-white underline decoration-2 underline-offset-2' : ''}
                        `}
                      >
                        {format(day, 'd')}
                      </span>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-8 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-gray-500 gap-4">
            <span>Hover to see progress · Click to log an amount · Works on any past date</span>
            <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-full border border-gray-800/50">
              <div className="w-4 h-4 rounded-md bg-gray-800" />
              <div className="w-4 h-4 rounded-md" style={{ backgroundColor: habit.color, opacity: 0.35 }} />
              <div className="w-4 h-4 rounded-md" style={{ backgroundColor: habit.color, opacity: 0.75 }} />
              <div className="w-4 h-4 rounded-md ring-2 ring-yellow-400 ring-offset-1 ring-offset-black" style={{ backgroundColor: habit.color }} />
              {habit.type === 'STOP' && (
                <div className="w-4 h-4 rounded-md bg-red-900 ring-2 ring-red-500 ring-offset-1 ring-offset-black" />
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
