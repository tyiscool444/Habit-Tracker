'use client';

import { Habit } from '../types';
import { unitLabel, timeframeSuffix, getAmountInInterval, normalizeDateStr } from '../lib/habitUtils';
import { X, Flame, Target, Trophy, Calendar, CheckCircle2, TrendingUp, BarChart3, Clock } from 'lucide-react';
import {
  format,
  parseISO,
  differenceInDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfDay,
  addDays,
  subDays,
  isBefore,
} from 'date-fns';

interface Props {
  habit: Habit;
  onClose: () => void;
  onEdit: () => void;
}

export function HabitInsightsModal({ habit, onClose, onEdit }: Props) {
  const today = startOfDay(new Date());
  const startDate = parseISO(habit.startDate);
  const totalDaysTracked = Math.max(1, differenceInDays(today, startDate) + 1);

  // Calculate lifetime total logged
  let totalAmountLogged = 0;
  let loggedDaysCount = 0;
  Object.entries(habit.logs).forEach(([_, val]) => {
    if (val > 0) {
      totalAmountLogged += val;
      loggedDaysCount++;
    }
  });

  // Calculate consistency in the last 30 days
  let last30DaysMet = 0;
  const last30DaysTrend: { date: Date; amount: number; isMet: boolean }[] = [];

  for (let i = 29; i >= 0; i--) {
    const d = subDays(today, i);
    const dStr = normalizeDateStr(d);
    const amt = habit.logs[dStr] || 0;
    const isMet = habit.type === 'START' ? amt >= habit.quota : amt <= habit.quota && amt > 0;
    if (isMet) last30DaysMet++;
    last30DaysTrend.push({ date: d, amount: amt, isMet });
  }

  const last30Rate = Math.round((last30DaysMet / 30) * 100);

  // Calculate longest streak
  // Simple scan across all days from startDate to today
  let longestStreak = 0;
  let tempStreak = 0;
  for (let i = 0; i < totalDaysTracked; i++) {
    const d = addDays(startDate, i);
    const dStr = normalizeDateStr(d);
    const amt = habit.logs[dStr] || 0;
    const isMet = habit.type === 'START' ? amt >= habit.quota : amt <= habit.quota;
    if (isMet) {
      tempStreak++;
      if (tempStreak > longestStreak) longestStreak = tempStreak;
    } else {
      tempStreak = 0;
    }
  }

  // Current Week Progress
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const thisWeekAmount = getAmountInInterval(habit.logs, weekStart, weekEnd);

  // Current Month Progress
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const thisMonthAmount = getAmountInInterval(habit.logs, monthStart, monthEnd);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="cursor-default w-full max-w-lg bg-[#0e1015] border border-gray-800 rounded-2xl p-6 shadow-2xl space-y-6 text-white overflow-hidden"
      >
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

        {/* Core Metric Cards (4 Grid) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Consistency */}
          <div className="bg-[#12141c] border border-gray-800/80 rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1">
              <TrendingUp size={11} className="text-emerald-400" />
              30d Rate
            </span>
            <span className="text-xl font-black text-emerald-400 mt-1">{last30Rate}%</span>
            <span className="text-[10px] text-gray-500">{last30DaysMet} / 30 days</span>
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
              {totalAmountLogged}
              <span className="text-xs font-semibold text-gray-500 ml-0.5">{unitLabel(habit.unit)}</span>
            </span>
            <span className="text-[10px] text-gray-500">{loggedDaysCount} active days</span>
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
                title={`${format(item.date, 'EEE, MMM d')}: ${item.amount} ${unitLabel(habit.unit)}`}
              />
            ))}
          </div>
        </div>

        {/* Current Period Snapshot */}
        <div className="flex items-center justify-between bg-[#12141c] border border-gray-800/80 rounded-xl px-4 py-3 text-xs">
          <div className="flex items-center gap-2">
            <Clock size={13} className="text-gray-400" />
            <span className="text-gray-400">This Week:</span>
            <span className="font-bold text-white">{thisWeekAmount} {unitLabel(habit.unit)}</span>
          </div>
          <div className="text-gray-700">|</div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">This Month:</span>
            <span className="font-bold text-white">{thisMonthAmount} {unitLabel(habit.unit)}</span>
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
    </div>
  );
}
