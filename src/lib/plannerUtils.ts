import { addDays } from 'date-fns';
import { PlanBlock } from '../types';
import { normalizeDateStr } from './habitUtils';

export const MINUTES_PER_DAY = 24 * 60;
export const SNAP_MINUTES = 15;

function clampMinutes(m: number): number {
  return Math.min(MINUTES_PER_DAY, Math.max(0, m));
}

/** Rounds to the nearest snap interval (or down, with `floor`). */
export function snapMinutes(m: number, floor = false): number {
  const steps = m / SNAP_MINUTES;
  return clampMinutes((floor ? Math.floor(steps) : Math.round(steps)) * SNAP_MINUTES);
}

/** 570 → "9:30 AM"; 1440 → "12:00 AM". */
export function formatClock(minutes: number): string {
  const h24 = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const h12 = h24 % 12 || 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${h24 < 12 ? 'AM' : 'PM'}`;
}

/** 9 → "9 AM", 0 → "12 AM". */
export function formatHour(hour: number): string {
  return `${hour % 12 || 12} ${hour < 12 ? 'AM' : 'PM'}`;
}

/** 90 → "1h 30m". */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** Minutes ↔ "HH:mm" for <input type="time">. Midnight as an end time maps to "23:59" since inputs stop there. */
export function minutesToInput(minutes: number): string {
  const m = minutes === MINUTES_PER_DAY ? MINUTES_PER_DAY - 1 : minutes % MINUTES_PER_DAY;
  return `${Math.floor(m / 60).toString().padStart(2, '0')}:${(m % 60).toString().padStart(2, '0')}`;
}

export function inputToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const minutes = Number(match[1]) * 60 + Number(match[2]);
  // Treat 23:59 as end of day so blocks can run to midnight
  return minutes === MINUTES_PER_DAY - 1 ? MINUTES_PER_DAY : minutes;
}

/**
 * Side-by-side columns for overlapping items: each cluster of mutually
 * overlapping items is split into as many columns as it needs.
 */
export function layoutBlocks(items: { key: string; start: number; end: number }[]): Map<string, { col: number; cols: number }> {
  const sorted = [...items].sort((a, b) => a.start - b.start || b.end - a.end);
  const result = new Map<string, { col: number; cols: number }>();
  let cluster: { key: string; col: number }[] = [];
  let colEnds: number[] = [];
  let clusterEnd = -1;

  const flush = () => {
    cluster.forEach(c => result.set(c.key, { col: c.col, cols: colEnds.length }));
    cluster = [];
    colEnds = [];
    clusterEnd = -1;
  };

  for (const item of sorted) {
    if (item.start >= clusterEnd) flush();
    let col = colEnds.findIndex(end => end <= item.start);
    if (col === -1) {
      col = colEnds.length;
      colEnds.push(item.end);
    } else {
      colEnds[col] = item.end;
    }
    cluster.push({ key: item.key, col });
    clusterEnd = Math.max(clusterEnd, item.end);
  }
  flush();
  return result;
}

/* ---------- Repeating & overnight blocks ---------- */

// Monday-first, using Date#getDay numbering
export const WEEKDAYS = [
  { day: 1, short: 'M', name: 'Mon' },
  { day: 2, short: 'T', name: 'Tue' },
  { day: 3, short: 'W', name: 'Wed' },
  { day: 4, short: 'T', name: 'Thu' },
  { day: 5, short: 'F', name: 'Fri' },
  { day: 6, short: 'S', name: 'Sat' },
  { day: 0, short: 'S', name: 'Sun' },
];
export const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];
export const WEEKDAYS_ONLY = [1, 2, 3, 4, 5];
export const WEEKENDS_ONLY = [0, 6];

export function isRepeating(block: PlanBlock): boolean {
  return Boolean(block.repeat?.length);
}

function sameDays(a: number[], b: number[]) {
  return a.length === b.length && b.every(d => a.includes(d));
}

/** [1,2,3,4,5] → "Weekdays"; [1,3] → "Mon, Wed". */
export function describeRepeat(days: number[]): string {
  if (sameDays(days, EVERY_DAY)) return 'Every day';
  if (sameDays(days, WEEKDAYS_ONLY)) return 'Weekdays';
  if (sameDays(days, WEEKENDS_ONLY)) return 'Weekends';
  return WEEKDAYS.filter(w => days.includes(w.day)).map(w => w.name).join(', ');
}

/** Whether the block starts on `date` (a one-off on that day, or a repeat that hasn't been skipped). */
function startsOn(block: PlanBlock, date: Date): boolean {
  const dateStr = normalizeDateStr(date);
  if (!isRepeating(block)) return block.date === dateStr;
  return dateStr >= block.date && block.repeat!.includes(date.getDay()) && !block.skipDates?.includes(dateStr);
}

export function isDoneOn(block: PlanBlock, occurrenceDate: string): boolean {
  return isRepeating(block) ? Boolean(block.doneDates?.includes(occurrenceDate)) : Boolean(block.done);
}

/** Ticks or unticks one occurrence (the block itself for one-offs). */
export function withDoneOn(block: PlanBlock, occurrenceDate: string, done: boolean): PlanBlock {
  if (!isRepeating(block)) return { ...block, done: done || undefined };
  const dates = new Set(block.doneDates);
  if (done) dates.add(occurrenceDate);
  else dates.delete(occurrenceDate);
  return { ...block, doneDates: dates.size ? [...dates] : undefined };
}

/** The part of a block that falls on one day's timeline. */
export interface PlanSegment {
  key: string;
  block: PlanBlock;
  occurrenceDate: string; // the day this occurrence started
  start: number; // 0–1440 on this day's timeline
  end: number;
  continued: boolean; // the after-midnight tail of an overnight block that started the day before
  done: boolean;
}

/**
 * Everything drawn on `date`: blocks starting that day (cut off at midnight) plus the
 * after-midnight part of overnight blocks that started the previous day.
 */
export function getDaySegments(blocks: PlanBlock[], date: Date): PlanSegment[] {
  const dateStr = normalizeDateStr(date);
  const prevDate = addDays(date, -1);
  const prevStr = normalizeDateStr(prevDate);
  const segments: PlanSegment[] = [];

  for (const block of blocks) {
    if (startsOn(block, date)) {
      segments.push({
        key: `${block.id}@${dateStr}`,
        block,
        occurrenceDate: dateStr,
        start: block.start,
        end: Math.min(block.end, MINUTES_PER_DAY),
        continued: false,
        done: isDoneOn(block, dateStr),
      });
    }
    if (block.end > MINUTES_PER_DAY && startsOn(block, prevDate)) {
      segments.push({
        key: `${block.id}@${prevStr}+`,
        block,
        occurrenceDate: prevStr,
        start: 0,
        end: block.end - MINUTES_PER_DAY,
        continued: true,
        done: isDoneOn(block, prevStr),
      });
    }
  }
  return segments.sort((a, b) => a.start - b.start);
}
