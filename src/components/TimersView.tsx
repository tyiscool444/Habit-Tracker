'use client';

import { useState } from 'react';
import { Coffee, Pause, Play, Plus, RotateCcw, SkipForward, Square, Volume2, VolumeX } from 'lucide-react';
import { useHabits } from '../context/HabitsContext';
import { useHabitTimer } from '../context/TimerContext';
import { STUDY_TIMER_TECHNIQUES, flowtimeBreakFor, formatTime, getTechniqueById } from '../lib/timerTechniques';
import { isTimeBasedUnit } from '../lib/habitUtils';

const MODE_LABEL = { focus: 'Focus', break: 'Break', longBreak: 'Long break' } as const;

const ICON_BUTTON = 'w-12 h-12 rounded-full flex items-center justify-center bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-white border border-gray-800 transition active:scale-95';

/** Distraction-free focus timer: pick a method, start, and watch one big clock. */
export function TimersView() {
  const { habits } = useHabits();
  const timer = useHabitTimer();
  const { isActive, isRunning, mode, cycle, targetSeconds, remainingSeconds, elapsedSeconds, progressPercent, activeHabit, activeTechnique } = timer;

  const [techniqueId, setTechniqueId] = useState('pomodoro');
  const [habitId, setHabitId] = useState('');
  const [customWork, setCustomWork] = useState(30);
  const [customBreak, setCustomBreak] = useState(5);

  const selected = getTechniqueById(techniqueId)!;
  const timeHabits = habits.filter(h => isTimeBasedUnit(h.unit));
  const workMinutes = selected.isCustom ? customWork : selected.workMinutes;
  const color = (isActive ? activeTechnique?.color || activeHabit?.color : selected.color) || '#06b6d4';

  const start = () => timer.startTechniqueTimer({
    technique: selected,
    habitId: habitId || null,
    customWorkMinutes: selected.isCustom ? customWork : undefined,
    customBreakMinutes: selected.isCustom ? customBreak : undefined,
  });

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center gap-10 py-8">
      <button
        type="button"
        onClick={timer.toggleSound}
        aria-label={timer.soundEnabled ? 'Mute chimes' : 'Unmute chimes'}
        title={timer.soundEnabled ? 'Mute chimes' : 'Unmute chimes'}
        className="absolute top-0 right-0 p-2.5 rounded-full text-gray-500 hover:text-white hover:bg-gray-900 transition"
      >
        {timer.soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
      </button>

      {/* Method */}
      {isActive ? (
        <div className="text-sm font-semibold text-gray-400">
          {activeTechnique?.emoji} {activeTechnique?.shortName || 'Stopwatch'}
          {targetSeconds !== null && <span className="text-gray-600"> · Cycle {cycle}</span>}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-1.5 flex-wrap justify-center">
            {STUDY_TIMER_TECHNIQUES.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTechniqueId(t.id)}
                className={`px-3.5 py-1.5 rounded-full text-sm font-semibold border transition ${
                  t.id === techniqueId ? 'text-white' : 'text-gray-400 border-gray-800 hover:text-white hover:border-gray-700'
                }`}
                style={t.id === techniqueId ? { backgroundColor: `${t.color}30`, borderColor: t.color } : undefined}
              >
                {t.emoji} {t.shortName}
              </button>
            ))}
          </div>

          {selected.isCustom && (
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <MinutesInput label="Focus" value={customWork} min={1} max={180} onChange={setCustomWork} />
              <MinutesInput label="Break" value={customBreak} min={0} max={60} onChange={setCustomBreak} />
            </div>
          )}
        </div>
      )}

      {/* Clock */}
      <div className="w-full max-w-3xl text-center">
        <div className="text-sm font-bold uppercase tracking-[0.3em]" style={{ color }}>
          {isActive ? MODE_LABEL[mode] : 'Ready'}
        </div>
        <div className="font-mono font-black tabular-nums leading-none text-white text-[clamp(5rem,17vw,13rem)] mt-2">
          {isActive ? formatTime(remainingSeconds) : selected.isFlowtime ? '00:00' : formatTime(workMinutes * 60)}
        </div>
        <div className="h-1.5 max-w-xl mx-auto mt-8 rounded-full bg-gray-800/80 overflow-hidden">
          {isActive && targetSeconds !== null && (
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progressPercent}%`, backgroundColor: color }} />
          )}
        </div>
      </div>

      {/* Habit link */}
      {isActive ? (
        activeHabit && (
          <div className="text-sm text-gray-400">
            Logging to <span className="font-semibold text-white">{activeHabit.icon} {activeHabit.name}</span>
          </div>
        )
      ) : timeHabits.length > 0 && (
        <label className="flex items-center gap-2 text-sm text-gray-400">
          Log to
          <select
            value={habitId}
            onChange={e => setHabitId(e.target.value)}
            className="bg-gray-900 border border-gray-800 focus:border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none"
          >
            <option value="">Nothing</option>
            {timeHabits.map(h => (
              <option key={h.id} value={h.id}>{h.icon} {h.name}</option>
            ))}
          </select>
        </label>
      )}

      {/* Controls */}
      {isActive ? (
        <div className="flex items-center gap-3">
          <button type="button" onClick={timer.resetTimer} aria-label="Restart interval" title="Restart interval" className={ICON_BUTTON}>
            <RotateCcw size={18} />
          </button>
          <button type="button" onClick={() => timer.addSeconds(300)} aria-label="Add 5 minutes" title="Add 5 minutes" className={ICON_BUTTON}>
            <Plus size={18} />
          </button>
          <button
            type="button"
            onClick={isRunning ? timer.pauseTimer : timer.resumeTimer}
            aria-label={isRunning ? 'Pause' : 'Resume'}
            className="w-20 h-20 rounded-full flex items-center justify-center text-white shadow-2xl transition active:scale-95 hover:brightness-110"
            style={{ backgroundColor: color, boxShadow: `0 10px 40px -10px ${color}` }}
          >
            {isRunning ? <Pause size={30} fill="currentColor" /> : <Play size={30} fill="currentColor" className="ml-1" />}
          </button>
          {activeTechnique?.isFlowtime && mode === 'focus' ? (
            <button
              type="button"
              onClick={timer.takeFlowtimeBreak}
              aria-label={`Take a ${flowtimeBreakFor(elapsedSeconds)} minute break`}
              title={`Take a ${flowtimeBreakFor(elapsedSeconds)} min break`}
              className={ICON_BUTTON}
            >
              <Coffee size={18} />
            </button>
          ) : targetSeconds !== null && (
            <button type="button" onClick={timer.skipToNextPhase} aria-label="Skip to next phase" title="Skip" className={ICON_BUTTON}>
              <SkipForward size={18} />
            </button>
          )}
          <button
            type="button"
            onClick={timer.stopTimer}
            aria-label="Stop"
            title="Stop"
            className={`${ICON_BUTTON} hover:!text-red-400 hover:!border-red-500/40`}
          >
            <Square size={16} fill="currentColor" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={start}
          className="px-12 py-4 rounded-full text-lg font-black text-white flex items-center gap-2.5 transition active:scale-95 hover:brightness-110"
          style={{ backgroundColor: color, boxShadow: `0 10px 40px -10px ${color}` }}
        >
          <Play size={20} fill="currentColor" />
          Start
        </button>
      )}
    </div>
  );
}

function MinutesInput({ label, value, min, max, onChange }: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (minutes: number) => void;
}) {
  return (
    <label className="flex items-center gap-2">
      {label}
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={e => onChange(Math.min(max, Math.max(min, parseInt(e.target.value, 10) || min)))}
        className="w-16 bg-gray-900 border border-gray-800 focus:border-gray-600 rounded-lg px-2 py-1 text-center text-white font-semibold focus:outline-none"
      />
      min
    </label>
  );
}
