'use client';

import { useMemo, useState } from 'react';
import { Habit } from '../types';
import { normalizeDateStr, getAmountInInterval, timeframeSuffix } from '../lib/habitUtils';
import {
  X, ChevronLeft, ChevronRight, Flame, Trophy, CalendarDays, Target,
  Check, AlertTriangle, Clock, ArrowRight,
} from 'lucide-react';
import {
  format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays,
  addMonths, isSameMonth, isSameDay, isBefore, isAfter, startOfDay, endOfDay,
  differenceInCalendarDays, eachDayOfInterval,
} from 'date-fns';

interface Props {
  habits: Habit[];
  onClose: () => void;
  onEditTask: (id: string) => void;
  onUpdateTask: (task: Habit) => void;
  onGoToDate: (date: Date) => void;
}

interface DayInfo {
  met: number;
  total: number;
  perfect: boolean;
  streak: number; // consecutive perfect units ending on this day
  evaluated: boolean; // false for future days or days before tracking began
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/* ---------- Helpers ---------- */

function taskDateStr(t: Habit) {
  return normalizeDateStr(t.targetDate || t.startDate || new Date());
}

function isTaskComplete(t: Habit) {
  const amt = t.logs[taskDateStr(t)] || 0;
  return t.type === 'START' ? amt >= t.quota : amt <= t.quota && amt > 0;
}

function habitStart(h: Habit): Date {
  let start = parseISO(h.startDate);
  for (const d of Object.keys(h.logs)) {
    const p = parseISO(d);
    if (isBefore(p, start)) start = p;
  }
  return startOfDay(start);
}

/** Whether a recurring habit's period containing `day` meets its goal. */
function isHabitMetOn(h: Habit, day: Date): boolean {
  let amt: number;
  if (h.timeframe === 'daily') {
    amt = h.logs[normalizeDateStr(day)] || 0;
  } else if (h.timeframe === 'weekly') {
    amt = getAmountInInterval(h.logs, startOfWeek(day, { weekStartsOn: 1 }), endOfWeek(day, { weekStartsOn: 1 }));
  } else {
    amt = getAmountInInterval(h.logs, startOfMonth(day), endOfMonth(day));
  }
  return h.type === 'START' ? amt >= h.quota : amt <= h.quota;
}

function relativeDayLabel(date: Date, today: Date) {
  const diff = differenceInCalendarDays(date, today);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff < 7) return `In ${diff} days`;
  return format(date, 'MMM d');
}

/* ---------- Component ---------- */

export function CalendarView({ habits, onClose, onEditTask, onUpdateTask, onGoToDate }: Props) {
  const [today] = useState(() => startOfDay(new Date()));
  const todayStr = normalizeDateStr(today);

  const [viewMonth, setViewMonth] = useState(startOfMonth(today));
  const [selectedDay, setSelectedDay] = useState<Date>(today);
  const [habitFilter, setHabitFilter] = useState<'all' | string>('all');

  const recurring = useMemo(() => habits.filter(h => h.isRecurring !== false), [habits]);
  const tasks = useMemo(() => habits.filter(h => h.isRecurring === false), [habits]);

  const focusedHabit = habitFilter === 'all' ? null : recurring.find(h => h.id === habitFilter) || null;

  // Habits that drive the "all habits" streak: daily ones (or everything if no daily habits exist)
  const streakHabits = useMemo(() => {
    if (focusedHabit) return [focusedHabit];
    const daily = recurring.filter(h => h.timeframe === 'daily');
    return daily.length > 0 ? daily : recurring;
  }, [recurring, focusedHabit]);

  // Calendar grid (Mon → Sun, full weeks)
  const gridDays = useMemo(() => {
    const start = startOfWeek(viewMonth, { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [viewMonth]);

  // Per-day streak info computed from the earliest tracked day through the end of the grid
  const dayInfo = useMemo(() => {
    const map = new Map<string, DayInfo>();
    if (streakHabits.length === 0) return map;

    const starts = streakHabits.map(habitStart);
    const earliest = starts.reduce((a, b) => (isBefore(b, a) ? b : a));
    const gridEnd = gridDays[gridDays.length - 1];
    const lastEval = isBefore(gridEnd, today) ? gridEnd : today;

    // Mark not-yet-evaluated grid days first
    gridDays.forEach(d => {
      map.set(normalizeDateStr(d), { met: 0, total: 0, perfect: false, streak: 0, evaluated: false });
    });
    if (isAfter(earliest, lastEval)) return map;

    const periodic = focusedHabit && focusedHabit.timeframe !== 'daily';
    let streak = 0;
    let lastPeriodKey = '';

    for (let d = earliest; !isAfter(d, lastEval); d = addDays(d, 1)) {
      const active = streakHabits.filter((_, i) => !isBefore(d, starts[i]));
      const met = active.filter(h => isHabitMetOn(h, d)).length;
      const total = active.length;
      const perfect = total > 0 && met === total;
      const isToday = isSameDay(d, today);

      if (periodic) {
        // Count streak in weeks / months rather than days
        const key = focusedHabit!.timeframe === 'weekly'
          ? normalizeDateStr(startOfWeek(d, { weekStartsOn: 1 }))
          : format(d, 'yyyy-MM');
        if (key !== lastPeriodKey) {
          lastPeriodKey = key;
          if (perfect) streak += 1;
          else if (!isToday) streak = 0;
        }
      } else if (perfect) {
        streak += 1;
      } else if (!isToday) {
        streak = 0; // today in progress doesn't break the streak
      }

      map.set(normalizeDateStr(d), {
        met, total, perfect,
        streak: perfect ? streak : 0,
        evaluated: total > 0,
      });
    }
    return map;
  }, [streakHabits, gridDays, focusedHabit, today]);

  // Streak summary (current + best) — independent of visible month
  const streakSummary = useMemo(() => {
    if (streakHabits.length === 0) return { current: 0, best: 0 };
    const starts = streakHabits.map(habitStart);
    const earliest = starts.reduce((a, b) => (isBefore(b, a) ? b : a));
    const periodic = focusedHabit && focusedHabit.timeframe !== 'daily';

    let run = 0, best = 0, current = 0;
    let lastKey = '';
    for (let d = earliest; !isAfter(d, today); d = addDays(d, 1)) {
      const active = streakHabits.filter((_, i) => !isBefore(d, starts[i]));
      const perfect = active.length > 0 && active.every(h => isHabitMetOn(h, d));
      const isToday = isSameDay(d, today);
      if (periodic) {
        const key = focusedHabit!.timeframe === 'weekly'
          ? normalizeDateStr(startOfWeek(d, { weekStartsOn: 1 }))
          : format(d, 'yyyy-MM');
        if (key === lastKey) continue;
        lastKey = key;
      }
      if (perfect) {
        run += 1;
        best = Math.max(best, run);
      } else if (!isToday) {
        run = 0;
      }
      current = run;
    }
    return { current, best };
  }, [streakHabits, focusedHabit, today]);

  // Tasks keyed by due date
  const tasksByDate = useMemo(() => {
    const map = new Map<string, Habit[]>();
    tasks.forEach(t => {
      const k = taskDateStr(t);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(t);
    });
    return map;
  }, [tasks]);

  const { overdue, upcoming } = useMemo(() => {
    const pending = tasks
      .filter(t => !isTaskComplete(t))
      .sort((a, b) => taskDateStr(a).localeCompare(taskDateStr(b)) || a.name.localeCompare(b.name));
    return {
      overdue: pending.filter(t => taskDateStr(t) < todayStr),
      upcoming: pending.filter(t => taskDateStr(t) >= todayStr),
    };
  }, [tasks, todayStr]);

  const selectedStr = normalizeDateStr(selectedDay);
  const selectedTasks = tasksByDate.get(selectedStr) || [];
  const selectedIsFuture = isAfter(selectedDay, endOfDay(today));
  const selectedHabitStatus = useMemo(
    () => recurring
      .filter(h => !isBefore(selectedDay, habitStart(h)))
      .map(h => ({ habit: h, met: isHabitMetOn(h, selectedDay) })),
    [recurring, selectedDay]
  );

  const toggleTask = (t: Habit) => {
    const dStr = taskDateStr(t);
    const done = isTaskComplete(t);
    const logs = { ...t.logs };
    const next = t.type === 'START' ? (done ? 0 : t.quota) : (done ? t.quota + 1 : 0);
    if (next <= 0) delete logs[dStr];
    else logs[dStr] = next;
    const subtasks = t.type === 'START' && t.subtasks?.length
      ? t.subtasks.map(s => ({ ...s, completed: !done }))
      : t.subtasks;
    onUpdateTask({ ...t, logs, subtasks });
  };

  const unitWord = focusedHabit
    ? (focusedHabit.timeframe === 'weekly' ? 'week' : focusedHabit.timeframe === 'monthly' ? 'month' : 'day')
    : 'day';

  return (
    <div className="w-full bg-[#0b0c10] border border-gray-800 rounded-2xl shadow-2xl text-white overflow-hidden max-h-[92vh] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-800/80 bg-gradient-to-r from-[#11131b] via-[#0e1015] to-[#140f1c] flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 text-blue-300 flex items-center justify-center">
            <CalendarDays size={18} />
          </div>
          <div>
            <h2 className="text-base font-black tracking-tight">Calendar</h2>
            <p className="text-[11px] text-gray-400">Streaks &amp; upcoming one-off tasks</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            id="calendar-habit-filter"
            value={habitFilter}
            onChange={(e) => setHabitFilter(e.target.value)}
            className="bg-[#12141c] border border-gray-700/70 focus:border-blue-500 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
          >
            <option value="all">All daily habits</option>
            {recurring.map(h => (
              <option key={h.id} value={h.id}>{h.icon} {h.name}</option>
            ))}
          </select>
          <button
            id="calendar-close"
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition"
            aria-label="Close calendar"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-[1fr_320px]">
        {/* ===== Left: Month grid ===== */}
        <div className="p-4 sm:p-5 space-y-4 lg:border-r border-gray-800/80">
          {/* Streak stats */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="rounded-xl border border-orange-500/25 bg-gradient-to-br from-orange-500/15 to-amber-500/5 px-3 py-2.5">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-orange-300/80">
                <Flame size={12} /> Current streak
              </div>
              <div className="text-xl font-black text-orange-300 mt-0.5">
                {streakSummary.current}
                <span className="text-xs font-bold text-orange-300/60 ml-1">
                  {focusedHabit ? timeframeSuffix(focusedHabit.timeframe) : 'd'}
                </span>
              </div>
            </div>
            <div className="rounded-xl border border-amber-400/25 bg-gradient-to-br from-amber-400/10 to-yellow-500/5 px-3 py-2.5">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-200/80">
                <Trophy size={12} /> Best streak
              </div>
              <div className="text-xl font-black text-amber-200 mt-0.5">
                {streakSummary.best}
                <span className="text-xs font-bold text-amber-200/60 ml-1">
                  {focusedHabit ? timeframeSuffix(focusedHabit.timeframe) : 'd'}
                </span>
              </div>
            </div>
            <div className="rounded-xl border border-purple-500/25 bg-gradient-to-br from-purple-500/15 to-blue-500/5 px-3 py-2.5">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-purple-300/80">
                <Target size={12} /> Tasks pending
              </div>
              <div className="text-xl font-black text-purple-200 mt-0.5">
                {upcoming.length + overdue.length}
                {overdue.length > 0 && (
                  <span className="text-[10px] font-bold text-red-400 ml-1.5">{overdue.length} overdue</span>
                )}
              </div>
            </div>
          </div>

          {/* Month navigation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center bg-gray-900 rounded-lg border border-gray-700/60 overflow-hidden">
              <button
                id="calendar-prev-month"
                onClick={() => setViewMonth(addMonths(viewMonth, -1))}
                className="p-1.5 hover:bg-gray-800 text-gray-400 hover:text-white transition border-r border-gray-800"
                aria-label="Previous month"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-bold px-4 min-w-[140px] text-center">{format(viewMonth, 'MMMM yyyy')}</span>
              <button
                id="calendar-next-month"
                onClick={() => setViewMonth(addMonths(viewMonth, 1))}
                className="p-1.5 hover:bg-gray-800 text-gray-400 hover:text-white transition border-l border-gray-800"
                aria-label="Next month"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <button
              id="calendar-today"
              onClick={() => { setViewMonth(startOfMonth(today)); setSelectedDay(today); }}
              disabled={isSameMonth(viewMonth, today) && isSameDay(selectedDay, today)}
              className="px-3 py-1 rounded-lg text-xs font-semibold border bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-white border-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Today
            </button>
          </div>

          {/* Weekday header */}
          <div className="grid grid-cols-7 text-center">
            {WEEKDAYS.map(d => (
              <div key={d} className="text-[10px] font-bold uppercase tracking-wider text-gray-500 py-1">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-y-1.5">
            {gridDays.map((day, idx) => {
              const dStr = normalizeDateStr(day);
              const info = dayInfo.get(dStr);
              const col = idx % 7;
              const inMonth = isSameMonth(day, viewMonth);
              const isToday = isSameDay(day, today);
              const isSelected = isSameDay(day, selectedDay);
              const dayTasks = tasksByDate.get(dStr) || [];

              const prevInfo = col > 0 ? dayInfo.get(normalizeDateStr(addDays(day, -1))) : undefined;
              const nextInfo = col < 6 ? dayInfo.get(normalizeDateStr(addDays(day, 1))) : undefined;
              const perfect = Boolean(info?.perfect);
              const joinLeft = perfect && Boolean(prevInfo?.perfect);
              const joinRight = perfect && Boolean(nextInfo?.perfect);
              const partial = info && info.evaluated && !perfect && info.met > 0;
              const missed = info && info.evaluated && info.met === 0 && !isToday;

              return (
                <button
                  key={dStr}
                  id={`calendar-day-${dStr}`}
                  onClick={() => setSelectedDay(day)}
                  className={`relative h-[74px] sm:h-[84px] text-left group focus:outline-none ${inMonth ? '' : 'opacity-35'}`}
                >
                  {/* Streak band connecting consecutive perfect days */}
                  {perfect && (
                    <div
                      className={`absolute top-1 bottom-1 bg-gradient-to-b from-orange-500/25 to-amber-500/10 border-y border-orange-400/30
                        ${joinLeft ? 'left-0' : 'left-1 rounded-l-xl border-l'}
                        ${joinRight ? 'right-0' : 'right-1 rounded-r-xl border-r'}`}
                    />
                  )}

                  <div
                    className={`absolute inset-1 rounded-xl border transition-all duration-150 flex flex-col p-1.5
                      ${isSelected
                        ? 'border-blue-400 bg-blue-500/10 shadow-[0_0_0_1px_rgba(96,165,250,0.4),0_8px_24px_-8px_rgba(59,130,246,0.5)]'
                        : perfect
                          ? 'border-transparent group-hover:border-orange-300/50'
                          : 'border-gray-800/80 bg-[#0f1117] group-hover:border-gray-600 group-hover:bg-[#141722]'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-extrabold leading-none w-6 h-6 flex items-center justify-center rounded-full
                          ${isToday ? 'bg-blue-600 text-white shadow-md shadow-blue-500/40' : perfect ? 'text-orange-100' : 'text-gray-300'}`}
                      >
                        {format(day, 'd')}
                      </span>
                      {perfect && (
                        <span className="flex items-center gap-0.5 text-[10px] font-black text-orange-300">
                          <Flame size={11} className="fill-orange-400/60" />
                          {info!.streak}
                        </span>
                      )}
                      {partial && (
                        <span className="text-[9px] font-bold text-gray-400">{info!.met}/{info!.total}</span>
                      )}
                      {missed && <span className="w-1.5 h-1.5 rounded-full bg-gray-700" />}
                    </div>

                    {/* Task chips */}
                    <div className="mt-auto space-y-0.5 min-w-0">
                      {dayTasks.slice(0, 2).map(t => {
                        const done = isTaskComplete(t);
                        const overdueTask = !done && dStr < todayStr;
                        return (
                          <div
                            key={t.id}
                            className={`truncate text-[9px] sm:text-[10px] font-semibold px-1.5 py-[1px] rounded-md border
                              ${done ? 'line-through text-gray-500 border-gray-700/60 bg-gray-800/40'
                                : overdueTask ? 'text-red-300 border-red-500/40 bg-red-500/15'
                                : 'text-white'}`}
                            style={!done && !overdueTask ? { backgroundColor: `${t.color}30`, borderColor: `${t.color}70` } : undefined}
                            title={t.name}
                          >
                            <span className="mr-0.5">{t.icon}</span>{t.name}
                          </div>
                        );
                      })}
                      {dayTasks.length > 2 && (
                        <div className="text-[9px] font-bold text-purple-300 px-1">+{dayTasks.length - 2} more</div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 flex-wrap text-[10px] text-gray-400 pt-1">
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-2.5 rounded bg-gradient-to-r from-orange-500/40 to-amber-500/20 border border-orange-400/40" />
              {focusedHabit ? `Goal met (${unitWord})` : 'All daily habits met'}
            </span>
            {!focusedHabit && (
              <span className="flex items-center gap-1.5"><span className="font-bold text-gray-300">2/3</span> Partially met</span>
            )}
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-gray-700" /> Missed</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-2.5 rounded bg-purple-500/30 border border-purple-400/60" /> Task due</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-2.5 rounded bg-red-500/20 border border-red-500/50" /> Overdue</span>
          </div>
        </div>

        {/* ===== Right: Day detail + upcoming ===== */}
        <aside className="p-4 sm:p-5 space-y-5 bg-[#090a0d]">
          {/* Selected day */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black">{format(selectedDay, 'EEEE')}</h3>
                <p className="text-[11px] text-gray-400">{format(selectedDay, 'MMMM d, yyyy')}</p>
              </div>
              {!selectedIsFuture && recurring.length > 0 && (
                <button
                  id="calendar-open-day"
                  onClick={() => onGoToDate(selectedDay)}
                  className="text-[11px] font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-blue-500/10 transition"
                >
                  Log this day <ArrowRight size={12} />
                </button>
              )}
            </div>

            {!selectedIsFuture && selectedHabitStatus.length > 0 && (
              <div className="space-y-1">
                {selectedHabitStatus.map(({ habit, met }) => (
                  <div key={habit.id} className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg bg-[#0f1117] border border-gray-800/80">
                    <span>{habit.icon}</span>
                    <span className="flex-1 truncate text-gray-200">{habit.name}</span>
                    {habit.timeframe !== 'daily' && (
                      <span className="text-[9px] uppercase font-bold text-gray-500">{habit.timeframe}</span>
                    )}
                    {met ? (
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center"><Check size={12} /></span>
                    ) : (
                      <span className="w-5 h-5 rounded-full border border-gray-700" />
                    )}
                  </div>
                ))}
              </div>
            )}

            {selectedTasks.length > 0 ? (
              <div className="space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-purple-300/80 pt-1">Tasks due</div>
                {selectedTasks.map(t => (
                  <TaskRow key={t.id} task={t} today={today} onToggle={toggleTask} onEdit={onEditTask} />
                ))}
              </div>
            ) : (
              selectedIsFuture && <p className="text-xs text-gray-500">Nothing scheduled for this day.</p>
            )}
          </section>

          {/* Overdue */}
          {overdue.length > 0 && (
            <section className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-red-400">
                <AlertTriangle size={12} /> Overdue ({overdue.length})
              </div>
              {overdue.map(t => (
                <TaskRow key={t.id} task={t} today={today} onToggle={toggleTask} onEdit={onEditTask} showDate />
              ))}
            </section>
          )}

          {/* Upcoming */}
          <section className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-purple-300">
              <Clock size={12} /> Upcoming ({upcoming.length})
            </div>
            {upcoming.length === 0 ? (
              <p className="text-xs text-gray-500">No upcoming one-off tasks. 🎉</p>
            ) : (
              upcoming.slice(0, 12).map(t => (
                <TaskRow
                  key={t.id}
                  task={t}
                  today={today}
                  onToggle={toggleTask}
                  onEdit={onEditTask}
                  onLocate={() => {
                    const d = parseISO(taskDateStr(t));
                    setViewMonth(startOfMonth(d));
                    setSelectedDay(d);
                  }}
                  showDate
                />
              ))
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

/* ---------- Task row ---------- */

function TaskRow({
  task, today, onToggle, onEdit, onLocate, showDate,
}: {
  task: Habit;
  today: Date;
  onToggle: (t: Habit) => void;
  onEdit: (id: string) => void;
  onLocate?: () => void;
  showDate?: boolean;
}) {
  const done = isTaskComplete(task);
  const date = parseISO(taskDateStr(task));
  const overdue = !done && isBefore(date, today);
  const subtasks = task.subtasks || [];
  const subDone = subtasks.filter(s => s.completed).length;

  return (
    <div
      className="group flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[#0f1117] border border-gray-800/80 hover:border-gray-600 transition"
      style={{ borderLeft: `3px solid ${task.color}` }}
    >
      <button
        onClick={() => onToggle(task)}
        aria-label={done ? 'Mark incomplete' : 'Mark complete'}
        className={`w-5 h-5 shrink-0 rounded-md border flex items-center justify-center transition
          ${done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-600 hover:border-emerald-400 text-transparent hover:text-emerald-400/60'}`}
      >
        <Check size={12} />
      </button>
      <button onClick={() => (onLocate ? onLocate() : onEdit(task.id))} className="flex-1 min-w-0 text-left">
        <div className={`text-xs font-semibold truncate ${done ? 'line-through text-gray-500' : 'text-gray-100'}`}>
          <span className="mr-1">{task.icon}</span>{task.name}
        </div>
        {(showDate || subtasks.length > 0) && (
          <div className="flex items-center gap-2 text-[10px]">
            {showDate && (
              <span className={overdue ? 'text-red-400 font-bold' : 'text-gray-400'}>{relativeDayLabel(date, today)}</span>
            )}
            {subtasks.length > 0 && <span className="text-gray-500">{subDone}/{subtasks.length} subtasks</span>}
          </div>
        )}
      </button>
      <button
        onClick={() => onEdit(task.id)}
        className="text-[10px] font-bold text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition px-1"
      >
        Edit
      </button>
    </div>
  );
}
