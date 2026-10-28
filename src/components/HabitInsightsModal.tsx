'use client';

import { Habit } from '../types';
import {
  unitLabel, timeframeSuffix, getAmountInInterval, getPeriodBounds, normalizeDateStr, formatAmount, isHabitMetOn,
  calculateStreaks, getTrackingStart, isTimeBasedUnit,
} from '../lib/habitUtils';
import { formatTime } from '../lib/timerTechniques';
import { useHabitTimer } from '../context/TimerContext';
import { X, Target, Trophy, Calendar, TrendingUp, BarChart3, Clock, Play, Pause, Square } from 'lucide-react';
import { format, parseISO, differenceInDays, startOfDay, subDays, isBefore } from 'date-fns';

interface Props {
  habit: Habit;
  onClose: () => void;
  onEdit: () => void;
}

export function HabitInsightsModal({ habit, onClose, onEdit }: Props) {
  const today = startOfDay(new Date());
  const startDate = parseISO(habit.startDate);
  const totalDaysTracked = Math.max(1, differenceInDays(today, startDate) + 1);

  const {
    activeHabitId,
    isRunning,
    elapsedSeconds,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
  } = useHabitTimer();

  const isThisHabitActive = activeHabitId === habit.id;
  const isThisHabitRunning = isThisHabitActive && isRunning;
  const currentSessionSec = isThisHabitActive ? elapsedSeconds : 0;
  const todayAmount = habit.logs[normalizeDateStr(today)] || 0;

  const loggedValues = Object.values(habit.logs).filter(v => v > 0);
  const totalAmountLogged = loggedValues.reduce((sum, v) => sum + v, 0);

  const trackingStart = getTrackingStart(habit);

  // Each of the last 30 days, judged by the period (day / week / month) it belongs to
  const last30DaysTrend = Array.from({ length: 30 }, (_, i) => {
    const date = subDays(today, 29 - i);
    const tracked = !isBefore(date, trackingStart);
    return { date, amount: habit.logs[normalizeDateStr(date)] || 0, tracked, isMet: tracked && isHabitMetOn(habit, date) };
  });
  const last30DaysMet = last30DaysTrend.filter(d => d.isMet).length;
  const last30Tracked = last30DaysTrend.filter(d => d.tracked).length;
  const last30Rate = last30Tracked > 0 ? Math.round((last30DaysMet / last30Tracked) * 100) : 0;

  const longestStreak = calculateStreaks(habit).best;
  const amountThis = (timeframe: 'weekly' | 'monthly') => {
    const { start, end } = getPeriodBounds(timeframe, today);
    return getAmountInInterval(habit.logs, start, end);
  };
  const thisWeekAmount = amountThis('weekly');
  const thisMonthAmount = amountThis('monthly');

  return (
    <div className="w-full bg-[#0e1015] border border-gray-800 rounded-2xl p-6 shadow-2xl space-y-6 text-white max-h-[90vh] overflow-y-auto">
      {/* Header with Icon, Name, and Close Button */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-800/80">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shadow-inner select-none"
            style={{ backgroundColor: `${habit.color}20`, border: `1px solid ${habit.color}50` }}
          >
            {habit.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white tracking-tight">{habit.name}</h3>
              <span
                className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full"
                style={{ backgroundColor: `${habit.color}25`, color: habit.color }}
              >
                {habit.type === 'START' ? 'Building' : 'Quitting'}
              </span>
              {habit.group && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
                  {habit.group}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400">
              Target: <span className="font-semibold text-gray-300">{habit.quota} {unitLabel(habit.unit)}</span> / {habit.timeframe}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
        >
          <X size={18} />
        </button>
      </div>

      {/* Stopwatch that logs straight into minute / hour habits */}
      {isTimeBasedUnit(habit.unit) && (
        <div
          className="flex items-center gap-3 bg-[#12151f] border rounded-xl px-4 py-3 transition"
          style={{ borderColor: isThisHabitRunning ? `${habit.color}80` : '#1f2430' }}
        >
          <span className="font-mono text-2xl font-black tabular-nums text-white">{formatTime(currentSessionSec)}</span>
          <span className="flex-1 text-xs text-gray-400">
            Today <span className="font-bold text-white">{formatAmount(todayAmount)}</span> / {formatAmount(habit.quota)} {unitLabel(habit.unit)}
          </span>
          <button
            type="button"
            onClick={() => isThisHabitRunning ? pauseTimer() : isThisHabitActive ? resumeTimer() : startTimer(habit)}
            aria-label={isThisHabitRunning ? 'Pause timer' : 'Start timer'}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white transition active:scale-95 hover:brightness-110"
            style={{ backgroundColor: habit.color }}
          >
            {isThisHabitRunning ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
          </button>
          {isThisHabitActive && (
            <button
              type="button"
              onClick={stopTimer}
              aria-label="Stop timer"
              className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-900 hover:bg-red-500/20 text-gray-400 hover:text-red-400 border border-gray-800 transition"
            >
              <Square size={13} fill="currentColor" />
            </button>
          )}
        </div>
      )}

      {/* Core Metric Cards (4 Grid) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Consistency */}
        <div className="bg-[#12141c] border border-gray-800/80 rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1">
            <TrendingUp size={11} className="text-emerald-400" />
            30d Rate
          </span>
          <span className="text-xl font-black text-emerald-400 mt-1">{last30Rate}%</span>
          <span className="text-[10px] text-gray-500">{last30DaysMet} / {last30Tracked} days</span>
        </div>

        {/* Longest Streak */}
        <div className="bg-[#12141c] border border-gray-800/80 rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1">
            <Trophy size={11} className="text-amber-400" />
            Best Streak
          </span>
          <span className="text-xl font-black text-amber-400 mt-1">
            {longestStreak}
            <span className="text-xs font-semibold text-gray-500 ml-0.5">{timeframeSuffix(habit.timeframe)}</span>
          </span>
          <span className="text-[10px] text-gray-500">All-time record</span>
        </div>

        {/* Total Volume */}
        <div className="bg-[#12141c] border border-gray-800/80 rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1">
            <Target size={11} className="text-blue-400" />
            Total Logged
          </span>
          <span className="text-xl font-black text-blue-400 mt-1">
            {formatAmount(totalAmountLogged)}
            <span className="text-xs font-semibold text-gray-500 ml-0.5">{unitLabel(habit.unit)}</span>
          </span>
          <span className="text-[10px] text-gray-500">{loggedValues.length} active days</span>
        </div>

        {/* Days Tracked */}
        <div className="bg-[#12141c] border border-gray-800/80 rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1">
            <Calendar size={11} className="text-purple-400" />
            Age
          </span>
          <span className="text-xl font-black text-purple-400 mt-1">
            {totalDaysTracked}
            <span className="text-xs font-semibold text-gray-500 ml-0.5">d</span>
          </span>
          <span className="text-[10px] text-gray-500">Since {format(startDate, 'MMM d, yy')}</span>
        </div>
      </div>

      {/* 30-Day Mini Heatmap Strip */}
      <div className="space-y-2 bg-[#12141c] border border-gray-800/80 rounded-xl p-3.5">
        <div className="flex items-center justify-between text-xs font-semibold text-gray-300">
          <span className="flex items-center gap-1.5">
            <BarChart3 size={13} className="text-blue-400" />
            30-Day Activity Strip
          </span>
          <span className="text-gray-500 text-[11px]">30 days ago → Today</span>
        </div>

        <div className="grid grid-cols-15 sm:grid-cols-30 gap-1 pt-1">
          {last30DaysTrend.map((item, idx) => (
            <div
              key={idx}
              className="h-7 rounded flex items-center justify-center transition-all hover:scale-110 cursor-pointer"
              style={{
                backgroundColor: item.amount > 0 ? (item.isMet ? habit.color : `${habit.color}40`) : '#1c1f26',
                opacity: item.amount > 0 ? 1 : 0.4,
              }}
              title={`${format(item.date, 'EEE, MMM d')}: ${formatAmount(item.amount)} ${unitLabel(habit.unit)}`}
            />
          ))}
        </div>
      </div>

      {/* Current Period Snapshot */}
      <div className="flex items-center justify-between bg-[#12141c] border border-gray-800/80 rounded-xl px-4 py-3 text-xs">
        <div className="flex items-center gap-2">
          <Clock size={13} className="text-gray-400" />
          <span className="text-gray-400">This Week:</span>
          <span className="font-bold text-white">{formatAmount(thisWeekAmount)} {unitLabel(habit.unit)}</span>
        </div>
        <div className="text-gray-700">|</div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400">This Month:</span>
          <span className="font-bold text-white">{formatAmount(thisMonthAmount)} {unitLabel(habit.unit)}</span>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={() => {
            onClose();
            onEdit();
          }}
          className="px-4 py-2 text-xs font-semibold rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-white border border-gray-700 transition"
        >
          Edit Habit Details
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition shadow-lg shadow-blue-500/20"
        >
          Done
        </button>
      </div>
    </div>
  );
}
