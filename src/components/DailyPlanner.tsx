'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { addDays, format, isSameDay, startOfDay, differenceInCalendarDays } from 'date-fns';
import { CalendarClock, Check, ChevronDown, ChevronLeft, ChevronRight, Copy, NotebookPen, Plus, Repeat } from 'lucide-react';
import { PlanBlock } from '../types';
import { useHabits } from '../context/HabitsContext';
import { usePlanner } from '../context/PlannerContext';
import { usePersistentState } from '../hooks/usePersistentState';
import { generateId, normalizeDateStr } from '../lib/habitUtils';
import {
  MINUTES_PER_DAY, SNAP_MINUTES, snapMinutes, formatClock, formatHour, formatDuration, layoutBlocks,
  getDaySegments, isRepeating, withDoneOn, describeRepeat, PlanSegment,
} from '../lib/plannerUtils';
import { Modal } from './Modal';
import { PlanBlockEditor, DeleteScope } from './PlanBlockEditor';

const HOUR_HEIGHT = 32; // px per hour; the whole day is always shown, no scrolling
const COMPACT_HEIGHT_PX = 34; // shorter blocks show a single line
const DRAG_THRESHOLD_PX = 4; // below this a press counts as a click
const DEFAULT_BLOCK_COLOR = '#3b82f6';

// Move / resize act on the whole block (every day, for repeating blocks)
type Drag =
  | { kind: 'create'; anchor: number; current: number; startY: number; moved: boolean }
  | { kind: 'move'; segment: PlanSegment; offset: number; delta: number; startY: number; moved: boolean }
  | { kind: 'resize'; segment: PlanSegment; end: number; startY: number; moved: boolean };

const toPx = (minutes: number) => (minutes / 60) * HOUR_HEIGHT;

/** The block as it would be once the in-progress move / resize is dropped. */
function applyDrag(block: PlanBlock, drag: Exclude<Drag, { kind: 'create' }>): PlanBlock {
  if (drag.kind === 'move') return { ...block, start: block.start + drag.delta, end: block.end + drag.delta };
  return { ...block, end: drag.end };
}

function minutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
}

/** Current time, refreshed every `intervalMs`. */
function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

function dayLabel(date: Date, today: Date): string {
  const diff = differenceInCalendarDays(date, today);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return format(date, 'EEE, MMM d');
}

/** Hour-by-hour plan for a single day with a live "now" line. */
export function DailyPlanner({ className = '' }: { className?: string }) {
  const { habits } = useHabits();
  const { blocks, addBlocks, updateBlock, deleteBlock, notes, setNote } = usePlanner();
  const [notesOpen, setNotesOpen] = usePersistentState('habitthat_planner_notes_open', true);
  const now = useNow();

  const [date, setDate] = useState(() => startOfDay(new Date()));
  const [drag, setDrag] = useState<Drag | null>(null);
  const [editing, setEditing] = useState<{ block: PlanBlock; occurrenceDate: string; isNew: boolean } | null>(null);

  const gridRef = useRef<HTMLDivElement>(null);

  const dateStr = normalizeDateStr(date);
  const isToday = isSameDay(date, now);
  const nowMinutes = minutesOfDay(now);

  const habitsById = useMemo(() => new Map(habits.map(h => [h.id, h])), [habits]);
  const segments = useMemo(() => getDaySegments(blocks, date), [blocks, date]);

  // One-off blocks only; repeating blocks already show up every day
  const hasOneOffToday = blocks.some(b => !isRepeating(b) && b.date === dateStr);
  const previousDayStr = normalizeDateStr(addDays(date, -1));
  const previousDayBlocks = useMemo(
    () => blocks.filter(b => !isRepeating(b) && b.date === previousDayStr),
    [blocks, previousDayStr]
  );
  const note = notes[dateStr] || '';
  const noteWords = note.trim() ? note.trim().split(/\s+/).length : 0;

  // Segments as drawn, with any in-progress move / resize applied
  const activeDrag = drag && drag.kind !== 'create' && drag.moved ? drag : null;
  const shownSegments = activeDrag
    ? getDaySegments(blocks.map(b => b.id === activeDrag.segment.block.id ? applyDrag(b, activeDrag) : b), date)
    : segments;
  const layout = layoutBlocks(shownSegments);

  const plannedMinutes = segments.reduce((sum, s) => sum + (s.end - s.start), 0);
  const doneCount = segments.filter(s => s.done).length;

  const minuteAt = (clientY: number) => {
    const rect = gridRef.current!.getBoundingClientRect();
    return ((clientY - rect.top) / HOUR_HEIGHT) * 60;
  };

  const openNewBlock = (start: number, end: number) => {
    const s = Math.min(start, MINUTES_PER_DAY - SNAP_MINUTES);
    setEditing({
      isNew: true,
      occurrenceDate: dateStr,
      block: {
        id: generateId(),
        date: dateStr,
        start: s,
        end: Math.min(MINUTES_PER_DAY, Math.max(end, s + SNAP_MINUTES)),
        title: '',
        color: DEFAULT_BLOCK_COLOR,
      },
    });
  };

  const beginDrag = (e: React.PointerEvent, next: Drag) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    gridRef.current?.setPointerCapture(e.pointerId);
    setDrag(next);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const moved = drag.moved || Math.abs(e.clientY - drag.startY) > DRAG_THRESHOLD_PX;
    const m = minuteAt(e.clientY);
    if (drag.kind === 'create') {
      setDrag({ ...drag, moved, current: snapMinutes(m) });
    } else if (drag.kind === 'move') {
      const { segment } = drag;
      // Keep the block's start within its own day
      const minDelta = -segment.block.start;
      const maxDelta = MINUTES_PER_DAY - SNAP_MINUTES - segment.block.start;
      const delta = Math.min(maxDelta, Math.max(minDelta, snapMinutes(m - drag.offset) - segment.start));
      setDrag({ ...drag, moved, delta });
    } else {
      const { block, continued } = drag.segment;
      const end = (continued ? MINUTES_PER_DAY : 0) + snapMinutes(m);
      setDrag({ ...drag, moved, end: Math.min(block.start + MINUTES_PER_DAY, Math.max(block.start + SNAP_MINUTES, end)) });
    }
  };

  const handlePointerUp = () => {
    if (!drag) return;
    setDrag(null);

    if (drag.kind === 'create') {
      if (drag.moved) {
        openNewBlock(Math.min(drag.anchor, drag.current), Math.max(drag.anchor, drag.current));
      } else {
        openNewBlock(drag.anchor, drag.anchor + 60); // a click plans one hour
      }
      return;
    }

    const { block, occurrenceDate } = drag.segment;
    if (drag.moved) updateBlock(applyDrag(block, drag));
    else setEditing({ block, occurrenceDate, isNew: false });
  };

  const handleDelete = (scope: DeleteScope) => {
    if (!editing) return;
    const { block, occurrenceDate } = editing;
    if (scope === 'series') deleteBlock(block.id);
    else updateBlock({ ...block, skipDates: [...(block.skipDates || []), occurrenceDate] });
    setEditing(null);
  };

  // Repeat the previous day's blocks (unticked) on an empty day
  const copyPreviousDay = () => {
    addBlocks(previousDayBlocks.map(b => ({ ...b, id: generateId(), date: dateStr, done: undefined })));
  };

  const addAtNextSlot = () => {
    const start = isToday ? Math.ceil(nowMinutes / SNAP_MINUTES) * SNAP_MINUTES : 9 * 60;
    openNewBlock(start, start + 60);
  };

  // Dashed outline for a block being drawn, or a new block whose editor is open
  const preview = drag?.kind === 'create' && drag.moved
    ? { start: Math.min(drag.anchor, drag.current), end: Math.max(drag.anchor, drag.current, Math.min(drag.anchor, drag.current) + SNAP_MINUTES) }
    : editing?.isNew ? editing.block : null;

  return (
    <section className={`bg-[#090a0d] border border-gray-800 rounded-xl shadow-2xl flex flex-col overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-3 border-b border-gray-800 bg-[#0e1015] space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <CalendarClock size={15} />
            </div>
            <h2 className="text-xs font-bold text-white tracking-wide uppercase">Daily Planner</h2>
          </div>
          <button
            type="button"
            onClick={addAtNextSlot}
            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition flex items-center gap-1 active:scale-95"
          >
            <Plus size={13} />
            <span>Add</span>
          </button>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center bg-gray-900 rounded-lg border border-gray-700/60 overflow-hidden">
            <button
              aria-label="Previous day"
              onClick={() => setDate(d => addDays(d, -1))}
              className="p-1.5 hover:bg-gray-800 text-gray-400 hover:text-white transition border-r border-gray-800"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs font-bold text-white px-3 min-w-[104px] text-center">{dayLabel(date, now)}</span>
            <button
              aria-label="Next day"
              onClick={() => setDate(d => addDays(d, 1))}
              className="p-1.5 hover:bg-gray-800 text-gray-400 hover:text-white transition border-l border-gray-800"
            >
              <ChevronRight size={14} />
            </button>
          </div>
          {!isToday && (
            <button
              onClick={() => setDate(startOfDay(new Date()))}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-white border border-gray-700 transition"
            >
              Back to today
            </button>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 min-h-[22px]">
          <span className="text-[11px] font-semibold text-gray-400 truncate">
            {segments.length > 0
              ? `${formatDuration(plannedMinutes)} planned · ${doneCount}/${segments.length} done`
              : 'Click or drag on the timeline to plan'}
          </span>
          {!hasOneOffToday && previousDayBlocks.length > 0 && (
            <button
              type="button"
              onClick={copyPreviousDay}
              title={`Copy ${previousDayBlocks.length} block${previousDayBlocks.length === 1 ? '' : 's'}`}
              className="shrink-0 px-2 py-0.5 rounded-lg text-[11px] font-semibold text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 transition flex items-center gap-1"
            >
              <Copy size={11} />
              <span>Copy {isToday ? 'yesterday' : 'previous day'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div>
        <div className="relative my-3" style={{ height: 24 * HOUR_HEIGHT }}>
          {/* Hour labels */}
          {Array.from({ length: 24 }, (_, h) => {
            const hideForNow = isToday && Math.abs(nowMinutes - h * 60) < 15;
            return (
              <span
                key={h}
                className={`absolute left-0 w-16 pr-2 text-right text-[10px] font-semibold text-gray-500 -translate-y-1/2 select-none ${hideForNow ? 'invisible' : ''}`}
                style={{ top: h * HOUR_HEIGHT }}
              >
                {formatHour(h)}
              </span>
            );
          })}

          {/* Current time label */}
          {isToday && (
            <span
              className="absolute left-1 z-30 -translate-y-1/2 px-1 py-0.5 rounded-md bg-red-500 text-white text-[10px] font-bold whitespace-nowrap shadow-lg shadow-red-500/30 select-none"
              style={{ top: toPx(nowMinutes) }}
            >
              {formatClock(Math.floor(nowMinutes))}
            </span>
          )}

          <div
            ref={gridRef}
            title="Click or drag to plan · drag a block to move it · drag its bottom edge to resize"
            className="absolute top-0 bottom-0 left-[4.5rem] right-2 cursor-crosshair border-b border-gray-800/90"
            onPointerDown={(e) => {
              const m = snapMinutes(minuteAt(e.clientY), true);
              beginDrag(e, { kind: 'create', anchor: m, current: m, startY: e.clientY, moved: false });
            }}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={() => setDrag(null)}
          >
            {/* Hour and half-hour lines */}
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} className="absolute left-0 right-0 pointer-events-none" style={{ top: h * HOUR_HEIGHT, height: HOUR_HEIGHT }}>
                <div className="border-t border-gray-800/90" />
                <div className="border-t border-dashed border-gray-800/40" style={{ marginTop: HOUR_HEIGHT / 2 - 1 }} />
              </div>
            ))}

            {/* Time that has already passed today */}
            {isToday && (
              <div className="absolute left-0 right-0 top-0 bg-black/25 pointer-events-none" style={{ height: toPx(nowMinutes) }} />
            )}

            {preview && (
              <div
                className="absolute left-0.5 right-0.5 rounded-lg border-2 border-dashed border-blue-400/70 bg-blue-500/10 pointer-events-none z-10 px-2 py-1"
                style={{ top: toPx(preview.start), height: toPx(preview.end - preview.start) - 2 }}
              >
                <span className="text-[10px] font-bold text-blue-300">
                  {formatClock(preview.start)} – {formatClock(preview.end)}
                </span>
              </div>
            )}

            {shownSegments.map(seg => {
              const { block: b } = seg;
              const { col, cols } = layout.get(seg.key)!;
              const height = toPx(seg.end - seg.start);
              const compact = height < COMPACT_HEIGHT_PX;
              const isCurrent = isToday && nowMinutes >= seg.start && nowMinutes < seg.end;
              const habit = b.habitId ? habitsById.get(b.habitId) : undefined;
              const isDragging = activeDrag?.segment.block.id === b.id;
              const isOvernight = b.end > MINUTES_PER_DAY;
              // An overnight block's evening part is cut off at midnight, so its real end isn't here
              const endsHere = seg.continued || !isOvernight;
              const timeLabel = seg.continued ? `until ${formatClock(seg.end)}` : formatClock(seg.start);

              return (
                <div
                  key={seg.key}
                  onPointerDown={(e) => beginDrag(e, {
                    kind: 'move',
                    segment: seg,
                    offset: minuteAt(e.clientY) - seg.start,
                    delta: 0,
                    startY: e.clientY,
                    moved: false,
                  })}
                  title={isRepeating(b) ? `Repeats: ${describeRepeat(b.repeat!)}` : undefined}
                  className={`absolute border overflow-hidden select-none touch-none cursor-grab transition-shadow ${
                    seg.continued ? 'rounded-b-lg' : isOvernight ? 'rounded-t-lg' : 'rounded-lg'
                  } ${isDragging ? 'z-20 shadow-2xl cursor-grabbing' : 'z-10 hover:brightness-125'} ${compact ? 'px-1.5 py-0' : 'px-2 py-1'}`}
                  style={{
                    top: toPx(seg.start) + 1,
                    height: Math.max(12, height - 2),
                    left: `calc(${(col / cols) * 100}% + 2px)`,
                    width: `calc(${100 / cols}% - 4px)`,
                    backgroundColor: `${b.color}${seg.done ? '14' : '2e'}`,
                    // Longhands only: mixing borderColor with the borderLeft shorthand confuses React on re-render
                    borderColor: isCurrent ? b.color : `${b.color}66`,
                    borderLeftColor: b.color,
                    borderLeftWidth: 3,
                    boxShadow: isCurrent ? `0 0 0 1px ${b.color}, 0 0 18px -4px ${b.color}` : undefined,
                  }}
                >
                  <div className="flex items-start gap-1.5 min-w-0">
                    <button
                      type="button"
                      aria-label={seg.done ? 'Mark not done' : 'Mark done'}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => updateBlock(withDoneOn(b, seg.occurrenceDate, !seg.done))}
                      className={`mt-[1px] w-3.5 h-3.5 shrink-0 rounded border flex items-center justify-center transition ${
                        seg.done ? 'bg-emerald-500 border-emerald-400 text-white' : 'border-gray-500 hover:border-white text-transparent'
                      }`}
                    >
                      <Check size={9} strokeWidth={3} />
                    </button>
                    <div className="min-w-0 flex-1 leading-tight">
                      <div className={`text-[11px] font-bold truncate ${seg.done ? 'line-through text-gray-500' : 'text-white'}`}>
                        {habit && <span className="mr-1">{habit.icon}</span>}
                        {b.title}
                        {isRepeating(b) && <Repeat size={9} className="inline ml-1 -mt-0.5 text-gray-400" aria-label="Repeats" />}
                        {compact && <span className="ml-1.5 font-semibold text-gray-400">{timeLabel}</span>}
                      </div>
                      {!compact && (
                        <div className="text-[10px] font-medium text-gray-400 truncate">
                          {formatClock(b.start)} – {formatClock(b.end)} · {formatDuration(b.end - b.start)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Resize handle */}
                  {endsHere && (
                    <div
                      onPointerDown={(e) => beginDrag(e, { kind: 'resize', segment: seg, end: b.end, startY: e.clientY, moved: false })}
                      className="absolute left-0 right-0 bottom-0 h-2 cursor-ns-resize"
                    />
                  )}
                </div>
              );
            })}

            {/* Now indicator */}
            {isToday && (
              <div className="absolute left-0 right-0 z-30 pointer-events-none" style={{ top: toPx(nowMinutes) }}>
                <div className="relative h-0.5 -translate-y-1/2 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]">
                  <span className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-red-500" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Daily notes */}
      <div className="border-t border-gray-800 bg-[#0e1015]">
        <button
          type="button"
          onClick={() => setNotesOpen(!notesOpen)}
          aria-expanded={notesOpen}
          className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-gray-400 hover:text-white transition"
        >
          <span className="flex items-center gap-1.5">
            <NotebookPen size={13} className="text-amber-400" />
            Notes
            {note && !notesOpen && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" aria-label="Has notes" />}
          </span>
          <ChevronDown size={14} className={`transition-transform ${notesOpen ? '' : '-rotate-90'}`} />
        </button>

        {notesOpen && (
          <div className="px-3 pb-3">
            <textarea
              value={note}
              onChange={(e) => setNote(dateStr, e.target.value)}
              placeholder={`Thoughts, wins and reminders for ${isToday ? 'today' : format(date, 'EEE, MMM d')}...`}
              rows={5}
              className="w-full resize-none bg-[#12141c] border border-gray-800 focus:border-amber-500/60 rounded-lg p-2.5 text-xs leading-relaxed text-gray-200 placeholder-gray-600 focus:outline-none"
            />
            <p className="text-[10px] text-gray-600 text-right">
              {noteWords > 0 ? `${noteWords} word${noteWords === 1 ? '' : 's'} · saved automatically` : 'Saved automatically'}
            </p>
          </div>
        )}
      </div>

      <Modal isOpen={Boolean(editing)} onClose={() => setEditing(null)}>
        {editing && (
          <PlanBlockEditor
            key={`${editing.block.id}@${editing.occurrenceDate}`}
            block={editing.block}
            occurrenceDate={editing.occurrenceDate}
            isNew={editing.isNew}
            habits={habits}
            onCancel={() => setEditing(null)}
            onSave={(block) => {
              if (editing.isNew) addBlocks([block]);
              else updateBlock(block);
              setEditing(null);
            }}
            onDelete={editing.isNew ? undefined : handleDelete}
          />
        )}
      </Modal>
    </section>
  );
}
