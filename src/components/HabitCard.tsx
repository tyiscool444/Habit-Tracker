'use client';

import { Habit } from '../types';
import { calculateHabitStats, unitLabel, normalizeDateStr, getAmountInInterval, timeframeSuffix } from '../lib/habitUtils';
import { useMemo, useState } from 'react';
import { Plus, Minus, Flame, Check } from 'lucide-react';
import { startOfWeek, endOfWeek, addDays, startOfMonth, endOfMonth, isBefore, isSameDay, startOfDay, format } from 'date-fns';

interface Props {
  habit: Habit;
  selectedDate: Date;
  selectedDateStr: string;
  weekDays: Date[];
  viewMode?: 'day' | 'week' | 'month' | 'year';
  showNumbers?: boolean;
  groupingEnabled?: boolean;
  showBorders?: boolean;
  onLog: (date: string, amount: number) => void;
  onEdit?: () => void;
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
  selectedDate,
  selectedDateStr,
  weekDays,
  viewMode = 'week',
  showNumbers = true,
  groupingEnabled = true,
  showBorders = false,
  onLog,
  onEdit,
  onSelectDate
}: Props) {
  const stats = useMemo(() => calculateHabitStats(habit), [habit]);
  const activeDateStr = selectedDateStr || normalizeDateStr(new Date());
  const activeAmount = habit.logs[activeDateStr] || 0;

  // State for inline cell editing on all timeframes (Day, Week, Month, Year)
  const [editingDayStr, setEditingDayStr] = useState<string | null>(null);
  const [cellInputValue, setCellInputValue] = useState<string>('');

  const weekStart = startOfWeek(new Date(activeDateStr + 'T12:00:00'), { weekStartsOn: 1 });
  const todayStart = startOfDay(new Date());

  let timeframeAmount = activeAmount;
  if (habit.timeframe === 'weekly') {
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

  let isComplete = false;
  if (habit.type === 'START') {
    if (timeframeAmount >= habit.quota) {
      isComplete = true;
    }
  } else {
    if (timeframeAmount === 0) {
      isComplete = true;
    }
  }

  // Compute timeframe chunks to combine cells when goal is complete
  const timeframeChunks = useMemo((): TimeframeChunk[] => {
    if (weekDays.length === 0) return [];

    if (viewMode === 'day') {
      const day = weekDays[0] || selectedDate;
      const dayStr = normalizeDateStr(day);
      const amt = habit.logs[dayStr] || 0;
      const isComp = habit.type === 'START' ? amt >= habit.quota : amt === 0;
      return [{ days: [day], isComplete: isComp, amount: amt }];
    }

    if (habit.timeframe === 'monthly') {
      if (viewMode === 'year') {
        // Partition 365 days into 12 month chunks
        const chunks: TimeframeChunk[] = [];
        let currentMonthKey = '';
        let currentChunk: Date[] = [];

        weekDays.forEach(day => {
          const mStart = startOfMonth(day);
          const key = normalizeDateStr(mStart);
          if (key !== currentMonthKey) {
            if (currentChunk.length > 0) {
              const start = startOfMonth(currentChunk[0]);
              const end = endOfMonth(currentChunk[0]);
              const amt = getAmountInInterval(habit.logs, start, end);
              const isComp = habit.type === 'START' ? amt >= habit.quota : (amt === 0 && !isBefore(todayStart, start));
              chunks.push({ days: currentChunk, isComplete: isComp, amount: amt, label: `${amt}/${habit.quota}` });
            }
            currentMonthKey = key;
            currentChunk = [day];
          } else {
            currentChunk.push(day);
          }
        });

        if (currentChunk.length > 0) {
          const start = startOfMonth(currentChunk[0]);
          const end = endOfMonth(currentChunk[0]);
          const amt = getAmountInInterval(habit.logs, start, end);
          const isComp = habit.type === 'START' ? amt >= habit.quota : (amt === 0 && !isBefore(todayStart, start));
          chunks.push({ days: currentChunk, isComplete: isComp, amount: amt, label: `${amt}/${habit.quota}` });
        }

        return chunks;
      }

      // viewMode is month, week or day
      const monthStart = startOfMonth(weekDays[0]);
      const monthEnd = endOfMonth(weekDays[0]);
      const amt = getAmountInInterval(habit.logs, monthStart, monthEnd);
      const isComp = habit.type === 'START' ? amt >= habit.quota : (amt === 0 && !isBefore(todayStart, monthStart));
      return [{ days: weekDays, isComplete: isComp, amount: amt, label: `${amt}/${habit.quota} ${unitLabel(habit.unit)}` }];
    }

    if (habit.timeframe === 'weekly') {
      if (viewMode === 'week') {
        // All 7 displayed days belong to this 1 week
        const wStart = startOfWeek(weekDays[0], { weekStartsOn: 1 });
        const wEnd = endOfWeek(weekDays[0], { weekStartsOn: 1 });
        const amt = getAmountInInterval(habit.logs, wStart, wEnd);
        const isComp = habit.type === 'START' ? amt >= habit.quota : (amt === 0 && !isBefore(todayStart, weekDays[0]));
        return [{ days: weekDays, isComplete: isComp, amount: amt, label: `${amt}/${habit.quota} ${unitLabel(habit.unit)}` }];
      } else {
        // Month or Year view: partition days into week chunks
        const chunks: TimeframeChunk[] = [];
        let currentWeekKey = '';
        let currentChunk: Date[] = [];

        weekDays.forEach(day => {
          const wStart = startOfWeek(day, { weekStartsOn: 1 });
          const key = normalizeDateStr(wStart);
          if (key !== currentWeekKey) {
            if (currentChunk.length > 0) {
              const start = startOfWeek(currentChunk[0]);
              const end = endOfWeek(currentChunk[0]);
              const amt = getAmountInInterval(habit.logs, start, end);
              const isComp = habit.type === 'START' ? amt >= habit.quota : (amt === 0 && !isBefore(todayStart, currentChunk[0]));
              chunks.push({ days: currentChunk, isComplete: isComp, amount: amt, label: `${amt}/${habit.quota}` });
            }
            currentWeekKey = key;
            currentChunk = [day];
          } else {
            currentChunk.push(day);
          }
        });

        if (currentChunk.length > 0) {
          const start = startOfWeek(currentChunk[0]);
          const end = endOfWeek(currentChunk[0]);
          const amt = getAmountInInterval(habit.logs, start, end);
          const isComp = habit.type === 'START' ? amt >= habit.quota : (amt === 0 && !isBefore(todayStart, currentChunk[0]));
          chunks.push({ days: currentChunk, isComplete: isComp, amount: amt, label: `${amt}/${habit.quota}` });
        }

        return chunks;
      }
    }

    // Daily habit: each day is its own individual chunk
    return weekDays.map(day => {
      const dayStr = normalizeDateStr(day);
      const amt = habit.logs[dayStr] || 0;
      const isComp = habit.type === 'START' ? amt >= habit.quota : (amt === 0 && !isBefore(todayStart, day));
      return { days: [day], isComplete: isComp, amount: amt };
    });
  }, [weekDays, habit, viewMode, selectedDate, todayStart]);

  const handleCellClick = (day: Date, dayStr: string, currentAmount: number) => {
    // Remove ability to edit future dates
    if (isBefore(todayStart, startOfDay(day))) return;

    onSelectDate(day);
    if (viewMode === 'year') {
      return;
    }
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

  const handleCellKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, dayStr: string) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      setEditingDayStr(null);
    }
  };

  const getStep = (quota: number) => {
    if (quota < 20) return 1;
    if (quota < 100) return 5;
    if (quota < 200) return 10;
    if (quota <= 500) return 20;
    return 100;
  };
  const stepAmount = getStep(habit.quota);

  const getQuotaBadgeStyle = () => {
    if (habit.type === 'START') {
      if (timeframeAmount === 0) {
        return 'bg-red-500/15 text-red-400 border-red-500/30';
      }
      if (timeframeAmount < habit.quota) {
        return 'bg-gray-800/90 text-gray-300 border-gray-700/60';
      }
      return 'bg-green-500/20 text-green-400 border-green-500/40';
    } else {
      // STOP habit
      if (timeframeAmount === 0) {
        return 'bg-green-500/20 text-green-400 border-green-500/40';
      }
      if (timeframeAmount <= habit.quota) {
        return 'bg-gray-800/90 text-gray-300 border-gray-700/60';
      }
      return 'bg-red-500/15 text-red-400 border-red-500/30';
    }
  };

  return (
    <div className="w-full flex items-stretch bg-[#0c0d10] border-b border-gray-800/80 hover:bg-[#101115] transition-colors group h-[52px]">
      {/* Left Column (Y-Axis Meta & Controls) - Retains right border to separate from grid */}
      {viewMode === 'month' || viewMode === 'year' ? (
        /* Compact icon-only view for Month and Year Modes */
        <div 
          onClick={onEdit}
          className="w-14 min-w-[56px] max-w-[56px] shrink-0 flex items-center justify-center px-3 border-r border-gray-800 cursor-pointer bg-[#0e0f13]/80 group-hover:bg-[#121418] transition-colors h-full"
          title={`${habit.name} (${habit.type === 'START' ? 'Build' : 'Quit'}) - Click to edit`}
        >
          <div
            className="w-8 h-8 min-w-[32px] min-h-[32px] max-w-[32px] max-h-[32px] rounded flex items-center justify-center text-base shrink-0 select-none"
            style={{ backgroundColor: `${habit.color}20`, border: `1px solid ${habit.color}40` }}
          >
            {habit.icon}
          </div>
        </div>
      ) : viewMode === 'week' ? (
        /* Weekly View: Icon and Name on left; Quota badge and Streak anchored on right */
        <div 
          onClick={onEdit}
          className="w-[230px] sm:w-[270px] md:w-[290px] min-w-[220px] shrink-0 flex items-center justify-between gap-2 px-3 py-1.5 border-r border-gray-800 cursor-pointer min-w-0 bg-[#0e0f13]/80 group-hover:bg-[#121418] transition-colors h-full"
          title={`${habit.name} - Click to edit`}
        >
          {/* Left: Icon, Name, Checkmark */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-1.5">
            <div
              className="w-8 h-8 min-w-[32px] min-h-[32px] max-w-[32px] max-h-[32px] rounded flex items-center justify-center text-base shrink-0 select-none"
              style={{ backgroundColor: `${habit.color}20`, border: `1px solid ${habit.color}40` }}
            >
              {habit.icon}
            </div>

            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <h3 className="text-xs sm:text-sm font-semibold text-white group-hover:text-blue-400 transition-colors truncate">
                {habit.name}
              </h3>
              {isComplete && (
                <div className="shrink-0 w-3.5 h-3.5 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center border border-green-500/40" title="Goal Met">
                  <Check size={9} strokeWidth={3} />
                </div>
              )}
            </div>
          </div>

          {/* Right: Anchored Quota badge and Streak */}
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            <span className={`border px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-semibold whitespace-nowrap shrink-0 transition-colors ${getQuotaBadgeStyle()}`}>
              {timeframeAmount}/{habit.quota} {unitLabel(habit.unit)}
            </span>

            {stats.currentStreak > 0 ? (
              <span className="text-[11px] sm:text-xs font-bold text-orange-400 flex items-center gap-0.5 shrink-0 min-w-[32px] justify-end" title={`Current Streak: ${stats.currentStreak}${timeframeSuffix(habit.timeframe)}`}>
                <Flame size={11} className="text-orange-500" />
                {stats.currentStreak}{timeframeSuffix(habit.timeframe)}
              </span>
            ) : (
              <div className="w-[32px] shrink-0" />
            )}
          </div>
        </div>
      ) : (
        /* Daily View Left Meta: Wide, spacious, left side has icon & name, right side has anchored info badges and streak */
        <div 
          onClick={onEdit}
          className="w-[380px] sm:w-[460px] md:w-[520px] min-w-[340px] shrink-0 flex items-center justify-between gap-3 px-3 py-1.5 border-r border-gray-800 cursor-pointer min-w-0 bg-[#0e0f13]/80 group-hover:bg-[#121418] transition-colors h-full"
          title={`${habit.name} - Click to edit`}
        >
          {/* Left: Icon, Name, Checkmark */}
          <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
            <div
              className="w-8 h-8 min-w-[32px] min-h-[32px] max-w-[32px] max-h-[32px] rounded flex items-center justify-center text-base shrink-0 select-none"
              style={{ backgroundColor: `${habit.color}20`, border: `1px solid ${habit.color}40` }}
            >
              {habit.icon}
            </div>

            <div className="flex items-center gap-2 min-w-0 flex-1">
              <h3 className="text-xs sm:text-sm font-semibold text-white group-hover:text-blue-400 transition-colors truncate">
                {habit.name}
              </h3>

              {isComplete && (
                <div className="shrink-0 w-4 h-4 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center border border-green-500/40" title="Goal Met">
                  <Check size={10} strokeWidth={3} />
                </div>
              )}
            </div>
          </div>

          {/* Right: Anchored Quota badge and Streak */}
          <div className="flex items-center gap-2.5 shrink-0 ml-auto">
            <span className={`border px-2.5 py-0.5 rounded text-[10px] sm:text-[11px] font-semibold whitespace-nowrap shrink-0 transition-colors ${getQuotaBadgeStyle()}`}>
              {timeframeAmount}/{habit.quota}{unitLabel(habit.unit)} {habit.timeframe === 'daily' ? 'today' : habit.timeframe === 'weekly' ? 'this week' : 'this month'}
            </span>

            {stats.currentStreak > 0 ? (
              <span className="text-xs font-bold text-orange-400 flex items-center gap-0.5 shrink-0 min-w-[36px] justify-end" title={`Current Streak: ${stats.currentStreak}${timeframeSuffix(habit.timeframe)}`}>
                <Flame size={12} className="text-orange-500" />
                {stats.currentStreak}{timeframeSuffix(habit.timeframe)}
              </span>
            ) : (
              <div className="w-[36px] shrink-0" />
            )}
          </div>
        </div>
      )}

      {/* Right Heatmap / Interactive Input Cells */}
      <div className="flex-1 flex items-stretch min-w-0">
        {viewMode === 'day' ? (
          /* Daily View: [-] on left, Centered Goal Number/Denominator in center, [+] on right */
          (() => {
            const day = weekDays[0] || selectedDate;
            const dayStr = normalizeDateStr(day);
            const amount = habit.logs[dayStr] || 0;
            const isFuture = isBefore(todayStart, startOfDay(day));
            const isEditing = editingDayStr === dayStr;

            let cellBg = 'transparent';
            let cellText = `${amount}/${habit.quota}`;
            let textColor = 'text-gray-200';

            if (habit.type === 'START') {
              if (amount > 0) {
                const ratio = Math.min(amount / habit.quota, 1);
                cellBg = habit.color;
                cellText = `${amount}/${habit.quota}`;
                textColor = ratio >= 0.7 ? 'text-white font-bold' : 'text-gray-100 font-bold';
              } else {
                cellText = `0/${habit.quota}`;
                textColor = 'text-gray-500 font-bold';
              }
            } else {
              // STOP habit
              if (amount === 0) {
                if (!isFuture) {
                  cellBg = '#22c55e'; // Green for clean stop habit
                  cellText = `0/${habit.quota}`;
                  textColor = 'text-white font-bold';
                } else {
                  cellText = `0/${habit.quota}`;
                  textColor = 'text-gray-500 font-bold';
                }
              } else if (amount > habit.quota) {
                cellBg = '#ef4444'; // Red for exceeding quota
                cellText = `${amount}/${habit.quota}`;
                textColor = 'text-white font-bold';
              } else {
                cellBg = '#eab308'; // Warning/yellow for logged amount within quota
                cellText = `${amount}/${habit.quota}`;
                textColor = 'text-black font-bold';
              }
            }

            const opacity = habit.type === 'START' && amount > 0 
              ? (amount >= habit.quota ? 1 : Math.max(0.35, Math.min(amount / habit.quota, 1)))
              : (!isFuture && habit.type === 'STOP' && amount === 0 ? 1 : (amount > 0 ? 0.9 : 1));

            return (
              <div 
                onClick={() => handleCellClick(day, dayStr, amount)}
                className={`flex-1 flex items-center justify-center relative px-4 h-full transition-all ${
                  isFuture ? 'cursor-default' : 'cursor-pointer'
                }`}
                style={{
                  backgroundColor: !isEditing && (amount > 0 || (habit.type === 'STOP' && !isFuture && amount === 0)) ? cellBg : undefined,
                  opacity: !isEditing && isFuture ? 0.15 : (isEditing ? 1 : opacity),
                }}
                title={isEditing ? '' : `${habit.name} - ${dayStr}: ${amount}/${habit.quota} ${habit.unit !== 'amount' ? habit.unit : ''}${isFuture ? ' (Future date)' : ' (Click to input number)'}`}
              >
                {/* Left: Anchored - Button (Disabled for future dates) */}
                {!isFuture && (
                  <div className="absolute left-3 sm:left-4 flex items-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onLog(dayStr, Math.max(0, amount - stepAmount))}
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-950/80 hover:bg-gray-900 text-gray-200 hover:text-white border border-gray-700/80 shadow-md backdrop-blur-sm transition-all active:scale-95 hover:border-gray-500"
                      title={`Subtract ${stepAmount}`}
                    >
                      <Minus size={13} strokeWidth={2.5} />
                    </button>
                  </div>
                )}

                {/* Center: Goal Number / Denominator / Inline Input */}
                {isEditing ? (
                  <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      autoFocus
                      value={cellInputValue}
                      onChange={(e) => setCellInputValue(e.target.value)}
                      onBlur={() => handleCellCommit(dayStr)}
                      onKeyDown={(e) => handleCellKeyDown(e, dayStr)}
                      onFocus={(e) => e.target.select()}
                      placeholder="0"
                      className="w-20 h-8 text-center font-extrabold text-sm bg-gray-900 text-white rounded border-2 border-blue-500 shadow-xl focus:outline-none no-spinners px-1"
                    />
                  </div>
                ) : (
                  <span className={`text-sm sm:text-base font-extrabold select-none transition-all drop-shadow-sm ${textColor}`}>
                    {cellText}
                  </span>
                )}

                {/* Right: Anchored + Button (Disabled for future dates) */}
                {!isFuture && (
                  <div className="absolute right-3 sm:right-4 flex items-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onLog(dayStr, amount + stepAmount)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-950/80 hover:bg-gray-900 text-gray-200 hover:text-white border border-gray-700/80 shadow-md backdrop-blur-sm transition-all active:scale-95 hover:border-gray-500"
                      title={`Add ${stepAmount}`}
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
              const isSelected = isSameDay(day, selectedDate);
              const isFuture = isBefore(todayStart, startOfDay(day));
              const isEditing = editingDayStr === dayStr;

              let cellBg = 'transparent';
              let cellText = '';
              let textColor = 'text-transparent group-hover/cell:text-gray-400';

              if (habit.type === 'START') {
                if (amount > 0) {
                  const ratio = Math.min(amount / habit.quota, 1);
                  cellBg = habit.color;
                  cellText = `${amount}`;
                  textColor = ratio >= 0.7 ? 'text-white font-bold' : 'text-gray-100 font-bold';
                }
              } else {
                // STOP habit
                if (amount === 0) {
                  if (!isFuture) {
                    cellBg = '#22c55e'; // Green for clean stop habit
                    cellText = '✓';
                    textColor = 'text-white font-bold';
                  }
                } else if (amount > habit.quota) {
                  cellBg = '#ef4444'; // Red for exceeding quota
                  cellText = `${amount}`;
                  textColor = 'text-white font-bold';
                } else {
                  cellBg = '#eab308'; // Warning/yellow for logged amount within quota
                  cellText = `${amount}`;
                  textColor = 'text-black font-bold';
                }
              }

              const opacity = habit.type === 'START' && amount > 0 
                ? (amount >= habit.quota ? 1 : Math.max(0.35, Math.min(amount / habit.quota, 1)))
                : (!isFuture && habit.type === 'STOP' && amount === 0 ? 1 : (amount > 0 ? 0.9 : 1));

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
                    backgroundColor: !isEditing && (amount > 0 || (habit.type === 'STOP' && !isFuture && amount === 0)) ? cellBg : undefined,
                    opacity: !isEditing && isFuture ? 0.12 : (isEditing ? 1 : opacity),
                  }}
                  title={isEditing ? '' : isYearView ? `${format(day, 'EEEE, MMMM d, yyyy')} - ${habit.name}: ${amount} ${habit.unit !== 'amount' ? habit.unit : ''} (Click to open Daily View)` : `${habit.name} - ${dayStr}: ${amount} ${habit.unit !== 'amount' ? habit.unit : ''}${isFuture ? ' (Future date)' : ' (Click to input number)'}`}
                >
                  {isEditing ? (
                    /* Inline number input mode */
                    <div className="w-full h-full p-1 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        autoFocus
                        value={cellInputValue}
                        onChange={(e) => setCellInputValue(e.target.value)}
                        onBlur={() => handleCellCommit(dayStr)}
                        onKeyDown={(e) => handleCellKeyDown(e, dayStr)}
                        onFocus={(e) => e.target.select()}
                        placeholder="0"
                        className={`font-bold text-center text-white rounded bg-gray-900 border-2 border-blue-500 shadow-xl focus:outline-none no-spinners ${
                          viewMode === 'month' || viewMode === 'year' ? 'w-full h-full text-[11px] px-0' : 'w-14 h-7 text-xs px-1'
                        }`}
                      />
                    </div>
                  ) : (
                    <>
                      {/* Numbers are completely OFF in yearly view, and controlled by showNumbers in other views */}
                      {!isYearView && showNumbers && (
                        <span className={`text-[10px] sm:text-xs font-bold select-none transition-all ${textColor}`}>
                          {cellText}
                        </span>
                      )}

                      {/* Hover tooltip for quick preview */}
                      <div className="pointer-events-none absolute bottom-full mb-1 opacity-0 group-hover/cell:opacity-100 transition-opacity bg-gray-950 text-white text-[10px] py-0.5 px-2 rounded border border-gray-700 shadow-2xl whitespace-nowrap z-30">
                        {isYearView ? (
                          <span className="flex items-center gap-1.5 font-medium">
                            <span className="font-semibold text-gray-300">{format(day, 'EEE, MMM d, yyyy')}</span>
                            <span className="text-gray-500">•</span>
                            <span className={amount > 0 ? 'text-blue-400 font-bold' : 'text-gray-400'}>
                              {amount > 0 ? `${amount} ${unitLabel(habit.unit)}` : (isFuture ? 'Future date' : '0')}
                            </span>
                          </span>
                        ) : (
                          amount > 0 ? `${amount} ${unitLabel(habit.unit)}` : (isFuture ? 'Future date' : 'Click to input number')
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            };

            // If grouping is enabled, and this timeframe chunk is complete and has multiple days:
            if (groupingEnabled && chunk.isComplete && !isSingle) {
              const fullColor = habit.type === 'START' ? habit.color : '#22c55e';
              const effectiveShowBorders = showBorders && !isYearView;

              return (
                <div
                  key={`chunk-${chunkIdx}`}
                  className="relative group/chunk flex items-stretch h-full min-w-0"
                  style={{ flex: `${chunk.days.length} 0 0%` }}
                >
                  {/* Combined 100% Color Bar: Suffix text only when showNumbers is ON and not year view */}
                  {!hasEditingCell && (
                    <div
                      className={`absolute inset-0 flex items-center justify-center group-hover/chunk:hidden z-10 transition-all cursor-pointer shadow-inner ${
                        effectiveShowBorders ? 'border-r border-gray-800/80' : ''
                      }`}
                      style={{
                        backgroundColor: fullColor,
                        color: '#ffffff'
                      }}
                      title={`${habit.name} - Goal Complete! Hover to see individual days`}
                    >
                      {!isYearView && showNumbers && (
                        <div className="flex items-center justify-center font-extrabold text-xs tracking-wide px-1.5 drop-shadow truncate">
                          <span className="truncate">
                            {viewMode === 'month' && habit.timeframe === 'weekly' 
                              ? `${chunk.amount}/${habit.quota}` 
                              : `${chunk.amount}/${habit.quota} ${unitLabel(habit.unit)}`}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Individual Day Cells (Revealed on hover or when editing) */}
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
