'use client';

import { useMemo, useState } from 'react';
import { Habit } from '../types';
import { calculateHabitStats, unitLabel, normalizeDateStr, getAmountInInterval, timeframeSuffix, formatAmount } from '../lib/habitUtils';
import { useHabitTimer } from '../context/TimerContext';
import { Plus, Minus, Flame, Check, Play, Pause } from 'lucide-react';
import { startOfWeek, endOfWeek, addDays, startOfMonth, endOfMonth, isBefore, startOfDay } from 'date-fns';

interface Props {
  habit: Habit;
  selectedDateStr: string;
  weekDays: Date[];
  viewMode?: 'day' | 'week' | 'month' | 'year';
  showNumbers?: boolean;
  cellGroupingEnabled?: boolean;
  showBorders?: boolean;
  onLog: (date: string, amount: number) => void;
  onEdit?: () => void;
  onOpenInsights?: () => void;
  onSelectDate: (date: Date) => void;
}

interface TimeframeChunk {
  days: Date[];
  isComplete: boolean;
  amount: number;
  label?: string;
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
  const isCellGrouping = cellGroupingEnabled;
  const stats = useMemo(() => calculateHabitStats(habit), [habit]);
  const activeDateStr = selectedDateStr || normalizeDateStr(new Date());
  const activeAmount = habit.logs[activeDateStr] || 0;

  const {
    activeHabitId,
    isRunning: isTimerRunning,
    elapsedSeconds,
    startTimer,
    pauseTimer,
    resumeTimer,
    formatTime,
  } = useHabitTimer();

  const isHabitActiveHere = activeHabitId === habit.id;
  const isHabitRunningHere = isHabitActiveHere && isTimerRunning;
  const isTimeBased = ['seconds', 'minutes', 'hours'].includes(habit.unit);

  // State for inline cell editing on all timeframes (Day, Week, Month, Year)
  const [editingDayStr, setEditingDayStr] = useState<string | null>(null);
  const [cellInputValue, setCellInputValue] = useState<string>('');

  const weekStart = startOfWeek(new Date(activeDateStr + 'T12:00:00'), { weekStartsOn: 1 });
  const todayStart = startOfDay(new Date());

  let timeframeAmount = activeAmount;
  if (habit.isRecurring === false) {
    const targetStr = habit.targetDate || habit.startDate;
    timeframeAmount = habit.logs[targetStr] || 0;
  } else if (habit.timeframe === 'weekly') {
    let weeklyAmount = 0;
    for (let i = 0; i < 7; i++) {
      weeklyAmount += habit.logs[normalizeDateStr(addDays(weekStart, i))] || 0;
    }
    timeframeAmount = weeklyAmount;
  } else if (habit.timeframe === 'monthly') {
    const monthStart = startOfMonth(weekStart);
    const monthEnd = endOfMonth(weekStart);
    timeframeAmount = getAmountInInterval(habit.logs, monthStart, monthEnd);
  }

  const isComplete = habit.type === 'START' 
    ? timeframeAmount >= habit.quota 
    : timeframeAmount <= habit.quota;

  // Compute timeframe chunks to combine cells when goal is complete
  const timeframeChunks = useMemo((): TimeframeChunk[] => {
    if (weekDays.length === 0) return [];

    if (viewMode === 'day') {
      const day = weekDays[0];
      const dayStr = normalizeDateStr(day);
      const amt = habit.logs[dayStr] || 0;
      const isComp = habit.type === 'START' ? amt >= habit.quota : amt <= habit.quota;
      return [{ days: [day], isComplete: isComp, amount: amt }];
    }

    if (habit.timeframe === 'monthly' || habit.timeframe === 'weekly') {
      const isMonthly = habit.timeframe === 'monthly';
      const isPartitioned = (isMonthly && viewMode === 'year') || (!isMonthly && viewMode !== 'week');

      if (!isPartitioned) {
        // Single chunk across the entire week/month view
        const start = isMonthly ? startOfMonth(weekDays[0]) : startOfWeek(weekDays[0], { weekStartsOn: 1 });
        const end = isMonthly ? endOfMonth(weekDays[0]) : endOfWeek(weekDays[0], { weekStartsOn: 1 });
        const amt = getAmountInInterval(habit.logs, start, end);
        const isComp = habit.type === 'START' ? amt >= habit.quota : (amt <= habit.quota && !isBefore(todayStart, start));
        return [{ days: weekDays, isComplete: isComp, amount: amt, label: `${amt}/${habit.quota} ${unitLabel(habit.unit)}` }];
      }

      // Partitioned chunks across days
      const chunks: TimeframeChunk[] = [];
      let currentKey = '';
      let currentChunk: Date[] = [];

      const pushChunk = (chunkDays: Date[]) => {
        if (chunkDays.length === 0) return;
        const start = isMonthly ? startOfMonth(chunkDays[0]) : startOfWeek(chunkDays[0], { weekStartsOn: 1 });
        const end = isMonthly ? endOfMonth(chunkDays[0]) : endOfWeek(chunkDays[0], { weekStartsOn: 1 });
        const amt = getAmountInInterval(habit.logs, start, end);
        const isComp = habit.type === 'START' ? amt >= habit.quota : (amt <= habit.quota && !isBefore(todayStart, start));
        chunks.push({ days: chunkDays, isComplete: isComp, amount: amt, label: `${amt}/${habit.quota}` });
      };

      weekDays.forEach(day => {
        const start = isMonthly ? startOfMonth(day) : startOfWeek(day, { weekStartsOn: 1 });
        const key = normalizeDateStr(start);
        if (key !== currentKey) {
          pushChunk(currentChunk);
          currentKey = key;
          currentChunk = [day];
        } else {
          currentChunk.push(day);
        }
      });

      pushChunk(currentChunk);
      return chunks;
    }

    // Daily habit: each day is its own individual chunk
    return weekDays.map(day => {
      const dayStr = normalizeDateStr(day);
      const amt = habit.logs[dayStr] || 0;
      const isComp = habit.type === 'START' ? amt >= habit.quota : (amt <= habit.quota && !isBefore(todayStart, day));
      return { days: [day], isComplete: isComp, amount: amt };
    });
  }, [weekDays, habit, viewMode, todayStart]);

  const handleCellClick = (day: Date, dayStr: string, currentAmount: number) => {
    if (isBefore(todayStart, startOfDay(day))) return;
    onSelectDate(day);
    if (viewMode === 'year') return;
    setEditingDayStr(dayStr);
    setCellInputValue(currentAmount > 0 ? currentAmount.toString() : '');
  };

  const handleCellCommit = (dayStr: string) => {
    if (editingDayStr === dayStr) {
      const val = parseFloat(cellInputValue);
      const finalAmount = isNaN(val) || val < 0 ? 0 : val;
      onLog(dayStr, finalAmount);
      setEditingDayStr(null);
    }
  };

  const handleCellKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      setEditingDayStr(null);
    }
  };

  const stepAmount = habit.quota < 20 ? 1 : (habit.quota < 100 ? 5 : (habit.quota < 200 ? 10 : (habit.quota <= 500 ? 20 : 100)));

  const getQuotaBadgeStyle = () => {
    if (habit.type === 'START') {
      if (timeframeAmount === 0) return 'bg-red-500/15 text-red-400 border-red-500/30';
      if (timeframeAmount < habit.quota) return 'bg-gray-800/90 text-gray-300 border-gray-700/60';
      return 'bg-green-500/20 text-green-400 border-green-500/40';
    } else {
      if (timeframeAmount === 0) return 'bg-green-500/20 text-green-400 border-green-500/40';
      if (timeframeAmount <= habit.quota) return 'bg-gray-800/90 text-gray-300 border-gray-700/60';
      return 'bg-red-500/15 text-red-400 border-red-500/30';
    }
  };

  const isCompactLeft = viewMode === 'month' || viewMode === 'year';
  const leftColWidthClass = isCompactLeft 
    ? 'w-14 min-w-[56px] max-w-[56px]' 
    : (viewMode === 'week' ? 'w-[230px] sm:w-[270px] md:w-[290px] min-w-[220px]' : 'w-[380px] sm:w-[460px] md:w-[520px] min-w-[340px]');

  const quotaBadgeLabel = `${timeframeAmount}/${habit.quota}${unitLabel(habit.unit)}${
    viewMode === 'day' 
      ? ` ${habit.isRecurring === false ? 'target' : (habit.timeframe === 'daily' ? 'today' : habit.timeframe === 'weekly' ? 'this week' : 'this month')}` 
      : ''
  }`;

  return (
    <div className="w-full flex items-stretch bg-[#0c0d10] border-b border-gray-800/80 hover:bg-[#101115] transition-colors group h-[52px]">
      {/* Left Column (Y-Axis Meta & Controls) */}
      <div 
        className={`${leftColWidthClass} shrink-0 flex items-center justify-between px-2.5 sm:px-3 border-r border-gray-800 bg-[#0e0f13]/80 group-hover:bg-[#121418] transition-colors h-full`}
      >
        {isCompactLeft ? (
          <div className="flex items-center justify-center w-full">
            <div
              onClick={onOpenInsights || onEdit}
              className="w-8 h-8 min-w-[32px] min-h-[32px] rounded flex items-center justify-center text-base shrink-0 select-none shadow-inner cursor-pointer hover:scale-105 transition"
              style={{ backgroundColor: `${habit.color}20`, border: `1px solid ${habit.color}40` }}
            >
              {habit.icon}
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
              {/* Icon */}
              <div
                onClick={onOpenInsights || onEdit}
                className="w-8 h-8 min-w-[32px] min-h-[32px] rounded flex items-center justify-center text-base shrink-0 select-none shadow-inner cursor-pointer hover:scale-105 transition"
                style={{ backgroundColor: `${habit.color}20`, border: `1px solid ${habit.color}40` }}
              >
                {habit.icon}
              </div>

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
                {/* Active Timer Pulse Badge */}
                {isHabitActiveHere && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isHabitRunningHere) pauseTimer();
                      else resumeTimer();
                    }}
                    className={`flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full border transition shrink-0 shadow-sm ${
                      isHabitRunningHere 
                        ? 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40 animate-pulse hover:bg-emerald-500/30' 
                        : 'text-amber-300 bg-amber-500/20 border-amber-500/40 hover:bg-amber-500/30'
                    }`}
                  >
                    {isHabitRunningHere ? <Pause size={8} fill="currentColor" /> : <Play size={8} fill="currentColor" />}
                    <span>{formatTime(elapsedSeconds)}</span>
                  </button>
                )}

                {/* Quick Start Timer Icon for Time-Based Habits */}
                {!isHabitActiveHere && isTimeBased && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startTimer(habit);
                    }}
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
                className={`border px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer hover:brightness-125 ${getQuotaBadgeStyle()}`}
              >
                {quotaBadgeLabel}
              </span>

              {stats.currentStreak > 0 ? (
                <span 
                  onClick={onOpenInsights}
                  className="text-[11px] sm:text-xs font-bold text-orange-400 flex items-center gap-0.5 shrink-0 min-w-[32px] justify-end cursor-pointer hover:scale-105 transition" 
                >
                  <Flame size={11} className="text-orange-500" />
                  {stats.currentStreak}{timeframeSuffix(habit.timeframe)}
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
        {viewMode === 'day' ? (
          /* Daily View: Horizontal Filling Progress Bar */
          (() => {
            const day = weekDays[0];
            const dayStr = normalizeDateStr(day);
            const amount = habit.logs[dayStr] || 0;
            const isFuture = isBefore(todayStart, startOfDay(day));
            const isEditing = editingDayStr === dayStr;

            let cellBg = habit.color;
            let cellText = `${formatAmount(amount)}/${formatAmount(habit.quota)}`;
            let textColor = 'text-gray-200';
            let progressPercent = 0;

            if (habit.type === 'START') {
              if (amount > 0) {
                progressPercent = Math.min(100, Math.round((amount / habit.quota) * 100));
                cellBg = habit.color;
                cellText = `${formatAmount(amount)}/${formatAmount(habit.quota)}`;
                textColor = 'text-white font-bold';
              } else {
                progressPercent = 0;
                cellText = `0/${formatAmount(habit.quota)}`;
                textColor = 'text-gray-400 font-bold';
              }
            } else {
              cellText = `${formatAmount(amount)}/${formatAmount(habit.quota)}`;
              cellBg = habit.color || '#22c55e';
              if (!isFuture) {
                if (amount === 0) {
                  progressPercent = 100;
                  textColor = 'text-white font-bold';
                } else if (amount < habit.quota) {
                  progressPercent = Math.max(0, Math.round(((habit.quota - amount) / habit.quota) * 100));
                  textColor = 'text-white font-bold';
                } else if (amount === habit.quota) {
                  progressPercent = 0;
                  textColor = 'text-amber-300 font-extrabold';
                } else {
                  progressPercent = 0;
                  textColor = 'text-red-400 font-extrabold';
                }
              } else {
                progressPercent = 0;
                textColor = 'text-gray-500 font-bold';
              }
            }

            return (
              <div 
                onClick={() => handleCellClick(day, dayStr, amount)}
                className={`flex-1 flex items-center justify-center relative px-4 h-full transition-all overflow-hidden ${
                  isFuture ? 'cursor-default' : 'cursor-pointer'
                }`}
                style={{
                  opacity: !isEditing && isFuture ? 0.15 : 1,
                }}
              >
                {/* Horizontal Left-to-Right Animated Progress Bar Fill */}
                {!isEditing && !isFuture && progressPercent > 0 && (
                  <div 
                    className="absolute left-0 top-0 bottom-0 pointer-events-none transition-all duration-300 ease-out"
                    style={{
                      width: `${progressPercent}%`,
                      background: habit.type === 'START' 
                        ? `linear-gradient(90deg, ${cellBg}80 0%, ${cellBg} 100%)` 
                        : `linear-gradient(90deg, ${cellBg} 0%, ${cellBg}cc 100%)`,
                      boxShadow: progressPercent >= 100 ? `0 0 20px ${cellBg}40` : undefined,
                    }}
                  />
                )}

                {/* Left: Anchored - Button */}
                {!isFuture && (
                  <div className="absolute left-3 sm:left-4 flex items-center z-10" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onLog(dayStr, Math.max(0, amount - stepAmount))}
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-950/80 hover:bg-gray-900 text-gray-200 hover:text-white border border-gray-700/80 shadow-md backdrop-blur-sm transition-all active:scale-95 hover:border-gray-500"
                    >
                      <Minus size={13} strokeWidth={2.5} />
                    </button>
                  </div>
                )}

                {/* Center: Goal Number / Denominator / Inline Input */}
                {isEditing ? (
                  <div className="flex items-center justify-center z-10" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      autoFocus
                      value={cellInputValue}
                      onChange={(e) => setCellInputValue(e.target.value)}
                      onBlur={() => handleCellCommit(dayStr)}
                      onKeyDown={handleCellKeyDown}
                      onFocus={(e) => e.target.select()}
                      placeholder="0"
                      className="w-20 h-8 text-center font-extrabold text-sm bg-gray-900 text-white rounded border-2 border-blue-500 shadow-xl focus:outline-none no-spinners px-1"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 z-10">
                    <span className={`text-sm sm:text-base font-extrabold select-none transition-all drop-shadow-sm ${textColor}`}>
                      {cellText}
                    </span>
                    {isTimeBased && !isFuture && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isHabitRunningHere) pauseTimer();
                          else if (isHabitActiveHere) resumeTimer();
                          else startTimer(habit);
                        }}
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

                {/* Right: Anchored + Button */}
                {!isFuture && (
                  <div className="absolute right-3 sm:right-4 flex items-center z-10" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onLog(dayStr, amount + stepAmount)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-950/80 hover:bg-gray-900 text-gray-200 hover:text-white border border-gray-700/80 shadow-md backdrop-blur-sm transition-all active:scale-95 hover:border-gray-500"
                    >
                      <Plus size={13} strokeWidth={2.5} />
                    </button>
                  </div>
                )}
              </div>
            );
          })()
        ) : (
          /* Week, Month, and Year Views: Seamless cells with optional togglable borders */
          timeframeChunks.map((chunk, chunkIdx) => {
            const hasEditingCell = chunk.days.some(d => normalizeDateStr(d) === editingDayStr);
            const isSingle = chunk.days.length === 1;
            const isYearView = viewMode === 'year';

            const renderDayCell = (day: Date) => {
              const dayStr = normalizeDateStr(day);
              const amount = habit.logs[dayStr] || 0;
              const isFuture = isBefore(todayStart, startOfDay(day));
              const isEditing = editingDayStr === dayStr;

              let cellBg = habit.color;
              let cellText = formatAmount(amount);
              let textColor = 'text-gray-300 font-bold';
              let fillOpacity = 0;

              if (habit.type === 'START') {
                if (amount > 0) {
                  const ratio = Math.min(amount / habit.quota, 1);
                  cellBg = habit.color;
                  cellText = formatAmount(amount);
                  textColor = 'text-white font-bold';
                  fillOpacity = amount >= habit.quota ? 1 : Math.max(0.35, ratio);
                } else {
                  cellText = '0';
                  textColor = 'text-transparent group-hover/cell:text-gray-500 font-medium';
                  fillOpacity = 0;
                }
              } else {
                cellText = formatAmount(amount);
                cellBg = habit.color || '#22c55e';
                if (!isFuture) {
                  if (amount === 0) {
                    fillOpacity = 1;
                    textColor = 'text-white font-bold';
                  } else if (amount < habit.quota) {
                    fillOpacity = (habit.quota - amount) / habit.quota;
                    textColor = 'text-white font-bold';
                  } else if (amount === habit.quota) {
                    fillOpacity = 0;
                    textColor = 'text-amber-300 font-extrabold';
                  } else {
                    fillOpacity = 0;
                    textColor = 'text-red-400 font-extrabold';
                  }
                } else {
                  fillOpacity = 0;
                  textColor = 'text-transparent group-hover/cell:text-gray-500 font-medium';
                }
              }

              const effectiveShowBorders = showBorders && !isYearView;

              return (
                <div
                  key={dayStr}
                  onClick={() => handleCellClick(day, dayStr, amount)}
                  className={`flex-1 ${
                    isYearView ? 'min-w-[1px]' : 'min-w-0'
                  } ${
                    effectiveShowBorders ? 'border-r border-gray-800/80' : ''
                  } group/cell relative flex flex-col items-center justify-center h-full transition-all ${
                    isFuture ? 'cursor-default' : 'cursor-pointer hover:brightness-110 hover:bg-gray-800/30'
                  }`}
                  style={{
                    opacity: !isEditing && isFuture ? 0.15 : 1,
                  }}
                >
                  {/* Background fill layer */}
                  {!isEditing && !isFuture && fillOpacity > 0 && (
                    <div 
                      className="absolute inset-0 pointer-events-none transition-all"
                      style={{
                        backgroundColor: cellBg,
                        opacity: fillOpacity,
                      }}
                    />
                  )}

                  {isEditing ? (
                    /* Inline number input mode */
                    <div className="w-full h-full p-1 flex items-center justify-center z-10" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        autoFocus
                        value={cellInputValue}
                        onChange={(e) => setCellInputValue(e.target.value)}
                        onBlur={() => handleCellCommit(dayStr)}
                        onKeyDown={handleCellKeyDown}
                        onFocus={(e) => e.target.select()}
                        placeholder="0"
                        className={`font-bold text-center text-white rounded bg-gray-900 border-2 border-blue-500 shadow-xl focus:outline-none no-spinners ${
                          viewMode === 'month' || viewMode === 'year' ? 'w-full h-full text-[11px] px-0' : 'w-14 h-7 text-xs px-1'
                        }`}
                      />
                    </div>
                  ) : (
                    /* Numbers are completely OFF in yearly view, and controlled by showNumbers in other views */
                    !isYearView && showNumbers && (
                      <span className={`text-[10px] sm:text-xs z-10 select-none transition-all ${textColor}`}>
                        {cellText}
                      </span>
                    )
                  )}
                </div>
              );
            };

            // If cell grouping is enabled, and this timeframe chunk is complete and has multiple days:
            if (isCellGrouping && chunk.isComplete && !isSingle) {
              const fullColor = habit.color || (habit.type === 'START' ? '#3b82f6' : '#22c55e');
              const chunkOpacity = habit.type === 'START' 
                ? 1 
                : (habit.quota > 0 ? Math.max(0, Math.min((habit.quota - chunk.amount) / habit.quota, 1)) : 1);
              const effectiveShowBorders = showBorders && !isYearView;

              return (
                <div
                  key={`chunk-${chunkIdx}`}
                  className="relative group/chunk flex items-stretch h-full min-w-0"
                  style={{ flex: `${chunk.days.length} 0 0%` }}
                >
                  {/* Combined Color Bar */}
                  {!hasEditingCell && (
                    <div
                      className={`absolute inset-0 flex items-center justify-center group-hover/chunk:hidden z-10 transition-all cursor-pointer shadow-inner ${
                        effectiveShowBorders ? 'border-r border-gray-800/80' : ''
                      }`}
                      style={{
                        backgroundColor: fullColor,
                        opacity: chunkOpacity,
                        color: '#ffffff'
                      }}
                    >
                      {!isYearView && showNumbers && (
                        <div className="flex items-center justify-center font-extrabold text-xs tracking-wide px-1.5 drop-shadow truncate">
                          <span className="truncate">
                            {viewMode === 'month' && habit.timeframe === 'weekly' 
                              ? `${formatAmount(chunk.amount)}/${formatAmount(habit.quota)}` 
                              : `${formatAmount(chunk.amount)}/${formatAmount(habit.quota)} ${unitLabel(habit.unit)}`}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Individual Day Cells */}
                  <div className="flex-1 flex items-stretch min-w-0 h-full">
                    {chunk.days.map((d) => renderDayCell(d))}
                  </div>
                </div>
              );
            }

            // Normal chunk (single day, incomplete, or grouping disabled)
            return (
              <div 
                key={`chunk-${chunkIdx}`}
                className="flex items-stretch h-full min-w-0"
                style={{ flex: `${chunk.days.length} 0 0%` }}
              >
                {chunk.days.map((d) => renderDayCell(d))}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
