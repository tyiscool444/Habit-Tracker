'use client';

import { useMemo, useState } from 'react';
import { Habit, ViewMode } from '../types';
import {
  calculateStreaks, unitLabel, normalizeDateStr, timeframeSuffix, formatAmount,
  getPeriodAmount, getPeriodBounds, meetsQuota, isTimeBasedUnit, getTrackingStart,
} from '../lib/habitUtils';
import { formatTime } from '../lib/timerTechniques';
import { useHabitTimer } from '../context/TimerContext';
import { Plus, Minus, Flame, Check, Play, Pause } from 'lucide-react';
import { isBefore, parseISO, startOfDay } from 'date-fns';

interface Props {
  habit: Habit;
  selectedDateStr: string;
  weekDays: Date[];
  viewMode?: ViewMode;
  showNumbers?: boolean;
  cellGroupingEnabled?: boolean;
  showBorders?: boolean;
  onLog: (date: string, amount: number) => void;
  onEdit?: () => void;
  onOpenInsights?: () => void;
  onSelectDate: (date: Date) => void;
}

/** Width of the habit name column; shared with the table header in page.tsx. */
export function leftColumnClass(viewMode: ViewMode): string {
  if (viewMode === 'month' || viewMode === 'year') return 'w-14 min-w-[56px] max-w-[56px]';
  if (viewMode === 'week') return 'w-[230px] sm:w-[270px] md:w-[290px] min-w-[220px]';
  return 'w-[380px] sm:w-[460px] md:w-[520px] min-w-[340px]';
}

const PERIOD_WORD = { daily: 'today', weekly: 'this week', monthly: 'this month' } as const;

/** Quit habits stay coloured while under the allowance and fade as it is used up. */
function stopCellStyle(amount: number, quota: number): { fill: number; textColor: string } {
  if (amount === 0) return { fill: 1, textColor: 'text-white font-bold' };
  if (amount < quota) return { fill: (quota - amount) / quota, textColor: 'text-white font-bold' };
  if (amount === quota) return { fill: 0, textColor: 'text-amber-300 font-extrabold' };
  return { fill: 0, textColor: 'text-red-400 font-extrabold' };
}

/** Background opacity + label colour for a merged week / month block. */
function chunkStyle(habit: Habit, amount: number): { opacity: number; labelColor: string } {
  if (habit.type === 'START') {
    if (amount >= habit.quota) return { opacity: 1, labelColor: 'text-white font-extrabold' };
    if (amount > 0) return { opacity: Math.max(0.35, amount / habit.quota), labelColor: 'text-white font-bold' };
    return { opacity: 0, labelColor: 'text-gray-400 font-semibold' };
  }
  if (amount === 0) return { opacity: 1, labelColor: 'text-white font-extrabold' };
  if (amount <= habit.quota) return { opacity: Math.max(0.35, (habit.quota - amount) / habit.quota), labelColor: 'text-white font-bold' };
  return { opacity: 0, labelColor: 'text-red-400 font-bold' };
}

function stepFor(quota: number): number {
  if (quota < 20) return 1;
  if (quota < 100) return 5;
  if (quota < 200) return 10;
  if (quota <= 500) return 20;
  return 100;
}

export function HabitCard({
  habit,
  selectedDateStr,
  weekDays,
  viewMode = 'week',
  showNumbers = true,
  cellGroupingEnabled = true,
  showBorders = false,
  onLog,
  onEdit,
  onOpenInsights,
  onSelectDate
}: Props) {
  const currentStreak = useMemo(() => calculateStreaks(habit).current, [habit]);

  const {
    activeHabitId,
    isRunning: isTimerRunning,
    elapsedSeconds,
    startTimer,
    pauseTimer,
    resumeTimer,
  } = useHabitTimer();

  const isHabitActiveHere = activeHabitId === habit.id;
  const isHabitRunningHere = isHabitActiveHere && isTimerRunning;
  const isTimeBased = isTimeBasedUnit(habit.unit);
  const isDaily = habit.timeframe === 'daily';
  const isYearView = viewMode === 'year';
  const isCompactLeft = viewMode === 'month' || isYearView;

  // Inline cell editing
  const [editingDayStr, setEditingDayStr] = useState<string | null>(null);
  const [cellInputValue, setCellInputValue] = useState('');

  const todayStart = startOfDay(new Date());
  const isFutureDay = (day: Date) => isBefore(todayStart, startOfDay(day));
  // Tracking begins at the start date, or at an earlier log if one exists
  const trackingStart = useMemo(() => getTrackingStart(habit), [habit]);
  const isBeforeStart = (day: Date) => isBefore(startOfDay(day), trackingStart);

  const timeframeAmount = getPeriodAmount(habit, parseISO(selectedDateStr));
  const isComplete = meetsQuota(habit, timeframeAmount);

  // Consecutive days that fall in the same habit period (each day for daily habits).
  // A period is inactive if it ends before tracking starts or begins in the future.
  const timeframeChunks = useMemo(() => {
    const today = new Date();
    const chunks: { days: Date[]; amount: number; inactive: boolean }[] = [];
    let lastKey = '';
    for (const day of weekDays) {
      const { start, end } = getPeriodBounds(habit.timeframe, day);
      const key = normalizeDateStr(start);
      if (key !== lastKey) {
        const inactive = isBefore(end, trackingStart) || isBefore(today, start);
        chunks.push({ days: [], amount: getPeriodAmount(habit, day), inactive });
        lastKey = key;
      }
      chunks[chunks.length - 1].days.push(day);
    }
    return chunks;
  }, [weekDays, habit, trackingStart]);

  const handleCellClick = (day: Date, dayStr: string, currentAmount: number) => {
    if (isFutureDay(day)) return;
    onSelectDate(day);
    if (isYearView) return;
    setEditingDayStr(dayStr);
    setCellInputValue(currentAmount > 0 ? currentAmount.toString() : '');
  };

  const handleCellCommit = (dayStr: string) => {
    if (editingDayStr !== dayStr) return;
    const val = parseFloat(cellInputValue);
    onLog(dayStr, isNaN(val) || val < 0 ? 0 : val);
    setEditingDayStr(null);
  };

  const toggleTimer = () => {
    if (isHabitRunningHere) pauseTimer();
    else if (isHabitActiveHere) resumeTimer();
    else startTimer(habit);
  };

  const renderCellInput = (dayStr: string, className: string) => (
    <input
      type="number"
      min="0"
      step="any"
      autoFocus
      value={cellInputValue}
      onChange={(e) => setCellInputValue(e.target.value)}
      onBlur={() => handleCellCommit(dayStr)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        else if (e.key === 'Escape') setEditingDayStr(null);
      }}
      onFocus={(e) => e.target.select()}
      placeholder="0"
      className={`text-center text-white bg-gray-900 border-2 border-blue-500 shadow-xl focus:outline-none ${className}`}
    />
  );

  const stepAmount = stepFor(habit.quota);

  const quotaBadgeStyle = (() => {
    const good = 'bg-green-500/20 text-green-400 border-green-500/40';
    const neutral = 'bg-gray-800/90 text-gray-300 border-gray-700/60';
    const bad = 'bg-red-500/15 text-red-400 border-red-500/30';
    if (habit.type === 'START') {
      if (timeframeAmount === 0) return bad;
      return timeframeAmount < habit.quota ? neutral : good;
    }
    if (timeframeAmount === 0) return good;
    return timeframeAmount <= habit.quota ? neutral : bad;
  })();

  const quotaBadgeLabel = `${formatAmount(timeframeAmount)}/${formatAmount(habit.quota)}${unitLabel(habit.unit)}${
    viewMode === 'day' ? ` ${PERIOD_WORD[habit.timeframe]}` : ''
  }`;

  const habitIcon = (
    <div
      onClick={onOpenInsights || onEdit}
      className="w-8 h-8 min-w-[32px] min-h-[32px] rounded flex items-center justify-center text-base shrink-0 select-none shadow-inner cursor-pointer hover:scale-105 transition"
      style={{ backgroundColor: `${habit.color}20`, border: `1px solid ${habit.color}40` }}
    >
      {habit.icon}
    </div>
  );

  /* ----- Day view: one wide progress bar with steppers ----- */
  const renderDayView = () => {
    const day = weekDays[0];
    const dayStr = normalizeDateStr(day);
    const amount = habit.logs[dayStr] || 0;
    const isFuture = isFutureDay(day);
    const isEditing = editingDayStr === dayStr;
    const cellText = `${formatAmount(amount)}/${formatAmount(habit.quota)}`;

    let textColor: string;
    let progressPercent = 0;
    if (habit.type === 'START') {
      progressPercent = amount > 0 ? Math.min(100, Math.round((amount / habit.quota) * 100)) : 0;
      textColor = amount > 0 ? 'text-white font-bold' : 'text-gray-400 font-bold';
    } else if (isFuture || isBeforeStart(day)) {
      textColor = 'text-gray-500 font-bold';
    } else {
      const style = stopCellStyle(amount, habit.quota);
      progressPercent = Math.round(style.fill * 100);
      textColor = style.textColor;
    }

    const stepButton = (delta: number, side: string) => (
      <div className={`absolute ${side} flex items-center z-10`} onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => onLog(dayStr, Math.max(0, amount + delta))}
          className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-950/80 hover:bg-gray-900 text-gray-200 hover:text-white border border-gray-700/80 shadow-md backdrop-blur-sm transition-all active:scale-95 hover:border-gray-500"
        >
          {delta < 0 ? <Minus size={13} strokeWidth={2.5} /> : <Plus size={13} strokeWidth={2.5} />}
        </button>
      </div>
    );

    return (
      <div
        onClick={() => handleCellClick(day, dayStr, amount)}
        className={`flex-1 flex items-center justify-center relative px-4 h-full transition-all overflow-hidden ${
          isFuture ? 'cursor-default' : 'cursor-pointer'
        }`}
        style={{ opacity: !isEditing && isFuture ? 0.15 : 1 }}
      >
        {/* Horizontal Left-to-Right Animated Progress Bar Fill */}
        {!isEditing && !isFuture && progressPercent > 0 && (
          <div
            className="absolute left-0 top-0 bottom-0 pointer-events-none transition-all duration-300 ease-out"
            style={{
              width: `${progressPercent}%`,
              background: habit.type === 'START'
                ? `linear-gradient(90deg, ${habit.color}80 0%, ${habit.color} 100%)`
                : `linear-gradient(90deg, ${habit.color} 0%, ${habit.color}cc 100%)`,
              boxShadow: progressPercent >= 100 ? `0 0 20px ${habit.color}40` : undefined,
            }}
          />
        )}

        {!isFuture && stepButton(-stepAmount, 'left-3 sm:left-4')}

        {isEditing ? (
          <div className="flex items-center justify-center z-10" onClick={(e) => e.stopPropagation()}>
            {renderCellInput(dayStr, 'w-20 h-8 font-extrabold text-sm rounded px-1')}
          </div>
        ) : (
          <div className="flex items-center gap-2 z-10">
            <span className={`text-sm sm:text-base font-extrabold select-none transition-all drop-shadow-sm ${textColor}`}>
              {cellText}
            </span>
            {isTimeBased && !isFuture && (
              <button
                onClick={(e) => { e.stopPropagation(); toggleTimer(); }}
                className={`p-1 rounded-full transition shadow-sm ${
                  isHabitRunningHere
                    ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                    : 'bg-gray-900/80 text-gray-400 hover:text-white border border-gray-700/70'
                }`}
              >
                {isHabitRunningHere ? <Pause size={10} fill="currentColor" /> : <Play size={10} fill="currentColor" />}
              </button>
            )}
          </div>
        )}

        {!isFuture && stepButton(stepAmount, 'right-3 sm:right-4')}
      </div>
    );
  };

  /* ----- Week / month / year views: one cell per day ----- */
  const renderDayCell = (day: Date) => {
    const dayStr = normalizeDateStr(day);
    const amount = habit.logs[dayStr] || 0;
    const isFuture = isFutureDay(day);
    const isEditing = editingDayStr === dayStr;
    const hiddenZero = 'text-transparent group-hover/cell:text-gray-500 font-medium';

    let fillOpacity = 0;
    let textColor = hiddenZero;
    if (habit.type === 'START') {
      if (amount > 0) {
        fillOpacity = amount >= habit.quota ? 1 : Math.max(0.35, amount / habit.quota);
        textColor = 'text-white font-bold';
      }
    } else if (!isFuture && !isBeforeStart(day)) {
      const style = stopCellStyle(amount, habit.quota);
      fillOpacity = style.fill;
      textColor = style.textColor;
    }

    // With cell grouping, non-daily habits show colour and numbers on the merged block instead
    const showOwnContent = !cellGroupingEnabled || isDaily;
    const showDayCellNumber = !isYearView && showNumbers && showOwnContent;
    const showDayCellBg = !isEditing && !isFuture && fillOpacity > 0 && showOwnContent;

    return (
      <div
        key={dayStr}
        onClick={() => handleCellClick(day, dayStr, amount)}
        className={`flex-1 ${isYearView ? 'min-w-[1px]' : 'min-w-0'} ${
          showBorders && !isYearView ? 'border-r border-gray-800/80' : ''
        } group/cell relative flex flex-col items-center justify-center h-full transition-all ${
          isFuture ? 'cursor-default' : 'cursor-pointer hover:brightness-110 hover:bg-gray-800/30'
        }`}
        style={{ opacity: !isEditing && isFuture ? 0.15 : 1 }}
      >
        {showDayCellBg && (
          <div
            className="absolute inset-0 pointer-events-none transition-all"
            style={{ backgroundColor: habit.color, opacity: fillOpacity }}
          />
        )}

        {isEditing ? (
          <div className="w-full h-full p-1 flex items-center justify-center z-10" onClick={(e) => e.stopPropagation()}>
            {renderCellInput(dayStr, `font-bold rounded ${isCompactLeft ? 'w-full h-full text-[11px] px-0' : 'w-14 h-7 text-xs px-1'}`)}
          </div>
        ) : (
          showDayCellNumber && (
            <span className={`text-[10px] sm:text-xs z-10 select-none transition-all ${textColor}`}>
              {formatAmount(amount)}
            </span>
          )
        )}
      </div>
    );
  };

  const renderChunk = (chunk: { days: Date[]; amount: number; inactive: boolean }, chunkIdx: number) => {
    const flex = { flex: `${chunk.days.length} 0 0%` };

    if (!cellGroupingEnabled || isDaily || chunk.days.length === 1) {
      return (
        <div key={`chunk-${chunkIdx}`} className="flex items-stretch h-full min-w-0" style={flex}>
          {chunk.days.map(renderDayCell)}
        </div>
      );
    }

    const hasEditingCell = chunk.days.some(d => normalizeDateStr(d) === editingDayStr);
    const { opacity, labelColor } = chunk.inactive && chunk.amount === 0
      ? { opacity: 0, labelColor: 'text-gray-500 font-semibold' }
      : chunkStyle(habit, chunk.amount);
    const progress = `${formatAmount(chunk.amount)}/${formatAmount(habit.quota)}`;

    return (
      <div key={`chunk-${chunkIdx}`} className="relative group/chunk flex items-stretch h-full min-w-0" style={flex}>
        {!hasEditingCell && opacity > 0 && (
          <div
            className="absolute inset-0 pointer-events-none transition-all shadow-inner"
            style={{ backgroundColor: habit.color, opacity }}
          />
        )}

        {!hasEditingCell && !isYearView && showNumbers && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 transition-all px-1.5">
            <div className={`flex items-center justify-center text-xs tracking-wide drop-shadow truncate ${labelColor}`}>
              <span className="truncate">
                {viewMode === 'month' && habit.timeframe === 'weekly' ? progress : `${progress} ${unitLabel(habit.unit)}`}
              </span>
            </div>
          </div>
        )}

        {/* Underlying day cells stay clickable */}
        <div className="flex-1 flex items-stretch min-w-0 h-full relative z-0">
          {chunk.days.map(renderDayCell)}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full flex items-stretch bg-[#0c0d10] border-b border-gray-800/80 hover:bg-[#101115] transition-colors group h-[52px]">
      {/* Left Column (Y-Axis Meta & Controls) */}
      <div
        className={`${leftColumnClass(viewMode)} shrink-0 flex items-center justify-between px-2.5 sm:px-3 border-r border-gray-800 bg-[#0e0f13]/80 group-hover:bg-[#121418] transition-colors h-full`}
      >
        {isCompactLeft ? (
          <div className="flex items-center justify-center w-full">{habitIcon}</div>
        ) : (
          <>
            <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
              {habitIcon}

              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <h3
                  onClick={onOpenInsights || onEdit}
                  className="text-xs sm:text-sm font-semibold text-white hover:text-blue-400 cursor-pointer transition-colors truncate"
                >
                  {habit.name}
                </h3>
                {isComplete && (
                  <div className="shrink-0 w-3.5 h-3.5 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center border border-green-500/40">
                    <Check size={9} strokeWidth={3} />
                  </div>
                )}

                {/* Active timer badge, or a quick-start button on hover */}
                {isHabitActiveHere ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleTimer(); }}
                    className={`flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full border transition shrink-0 shadow-sm ${
                      isHabitRunningHere
                        ? 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40 animate-pulse hover:bg-emerald-500/30'
                        : 'text-amber-300 bg-amber-500/20 border-amber-500/40 hover:bg-amber-500/30'
                    }`}
                  >
                    {isHabitRunningHere ? <Pause size={8} fill="currentColor" /> : <Play size={8} fill="currentColor" />}
                    <span>{formatTime(elapsedSeconds)}</span>
                  </button>
                ) : isTimeBased && (
                  <button
                    onClick={(e) => { e.stopPropagation(); startTimer(habit); }}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-emerald-400 p-0.5 rounded hover:bg-gray-800 transition shrink-0"
                  >
                    <Play size={10} fill="currentColor" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 ml-auto">
              <span
                onClick={onEdit}
                className={`border px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer hover:brightness-125 ${quotaBadgeStyle}`}
              >
                {quotaBadgeLabel}
              </span>

              {currentStreak > 0 ? (
                <span
                  onClick={onOpenInsights}
                  className="text-[11px] sm:text-xs font-bold text-orange-400 flex items-center gap-0.5 shrink-0 min-w-[32px] justify-end cursor-pointer hover:scale-105 transition"
                >
                  <Flame size={11} className="text-orange-500" />
                  {currentStreak}{timeframeSuffix(habit.timeframe)}
                </span>
              ) : (
                <div className="w-[32px] shrink-0" />
              )}
            </div>
          </>
        )}
      </div>

      {/* Right Heatmap / Interactive Input Cells */}
      <div className="flex-1 flex items-stretch min-w-0">
        {viewMode === 'day' ? renderDayView() : timeframeChunks.map(renderChunk)}
      </div>
    </div>
  );
}
