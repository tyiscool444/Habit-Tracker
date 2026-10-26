'use client';

import React, { useState, useMemo } from 'react';
import { Habit } from '../types';
import { useHabitTimer } from '../context/TimerContext';
import {
  STUDY_TIMER_TECHNIQUES,
  TimerTechnique,
  calculateFlowtimeBreak,
} from '../lib/timerTechniques';
import {
  Timer, X, Play, Pause, RotateCcw, SkipForward, Square,
  Volume2, VolumeX, Coffee, Sparkles, Check, ChevronRight,
  Sliders, ArrowLeft, Brain, Clock, ShieldCheck
} from 'lucide-react';

interface Props {
  habits: Habit[];
  onClose: () => void;
}

export function TimersModal({ habits, onClose }: Props) {
  const {
    timerState,
    activeHabitId,
    activeHabit,
    activeTechnique,
    isRunning,
    mode,
    cycle,
    elapsedSeconds,
    targetSeconds,
    remainingSeconds,
    progressPercent,
    soundEnabled,
    startTechniqueTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    resetTimer,
    skipToNextPhase,
    addSeconds,
    formatTime,
    toggleSound,
    takeFlowtimeBreak,
  } = useHabitTimer();

  // Selected technique for the habit contribution & launch view
  const [selectedTechnique, setSelectedTechnique] = useState<TimerTechnique | null>(null);
  const [chosenHabitId, setChosenHabitId] = useState<string | null>(null);
  const [customWorkMins, setCustomWorkMins] = useState<number>(30);
  const [customBreakMins, setCustomBreakMins] = useState<number>(5);

  // Filter habits strictly to minute and hourly habits only
  const timeBasedHabits = useMemo(() => {
    return habits.filter(h => h.unit === 'hours' || h.unit === 'minutes');
  }, [habits]);

  // Open the habit link prompt for a chosen technique
  const handleCardClick = (technique: TimerTechnique) => {
    setSelectedTechnique(technique);
    // If currently active habit is time-based, keep it selected, else null
    const isActiveHabitTimeBased = activeHabit && (activeHabit.unit === 'hours' || activeHabit.unit === 'minutes');
    setChosenHabitId(isActiveHabitTimeBased ? activeHabitId : null);
    if (technique.isCustom) {
      setCustomWorkMins(technique.workMinutes || 30);
      setCustomBreakMins(technique.breakMinutes || 5);
    }
  };

  // Confirm and start the timer
  const handleConfirmStart = () => {
    if (!selectedTechnique) return;

    startTechniqueTimer({
      technique: selectedTechnique,
      habitId: chosenHabitId,
      customWorkMinutes: selectedTechnique.isCustom ? customWorkMins : undefined,
      customBreakMinutes: selectedTechnique.isCustom ? customBreakMins : undefined,
    });

    setSelectedTechnique(null);
  };

  const isAnyTimerActive = Boolean(timerState.activeHabitId || timerState.techniqueId);
  const isTechniqueRunning = isAnyTimerActive && isRunning;

  // Active technique display attributes
  const currentTechnique = activeTechnique || (timerState.techniqueId ? STUDY_TIMER_TECHNIQUES.find(t => t.id === timerState.techniqueId) : null);
  const themeColor = currentTechnique?.color || (activeHabit?.color || '#06b6d4');

  // SVG circular countdown progress dimensions
  const radius = 64;
  const stroke = 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = targetSeconds !== null && targetSeconds > 0
    ? circumference - (progressPercent / 100) * circumference
    : 0;

  return (
    <div className="bg-[#0b0c10] border border-gray-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] relative font-sans">
      {/* Top Modal Header */}
      <div className="p-4 sm:p-5 border-b border-gray-800/80 bg-[#0e1017] flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          {selectedTechnique ? (
            <button
              type="button"
              onClick={() => setSelectedTechnique(null)}
              className="p-2 rounded-xl bg-gray-800/80 hover:bg-gray-800 text-gray-300 hover:text-white border border-gray-700/60 transition flex items-center gap-1.5 text-xs font-bold"
            >
              <ArrowLeft size={16} />
              <span>Back</span>
            </button>
          ) : (
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shadow-lg shadow-cyan-500/10">
              <Timer size={20} />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">
                {selectedTechnique ? `Configure ${selectedTechnique.shortName}` : 'Study & Focus Timers'}
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/25 uppercase tracking-wider">
                Focus Suite
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {selectedTechnique 
                ? 'Contribute focus time to minute or hourly habits (e.g. study 1 hour per week).'
                : 'Select a timer method to start a focused study session.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Sound Toggle Button */}
          <button
            type="button"
            onClick={toggleSound}
            className={`p-2 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 ${
              soundEnabled
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                : 'bg-gray-800/80 text-gray-400 border-gray-700 hover:text-gray-200'
            }`}
            title={soundEnabled ? 'Chimes are ON (click to mute)' : 'Chimes are MUTED (click to enable)'}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span className="hidden sm:inline text-[11px] font-bold">{soundEnabled ? 'Sound On' : 'Muted'}</span>
          </button>

          {/* Close Modal Button */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-gray-800/60 hover:bg-gray-800 text-gray-400 hover:text-white border border-gray-700/60 transition"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Main Body: Either Habit Contribution / Launch Screen OR Main Techniques List */}
      {selectedTechnique ? (
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 animate-in fade-in zoom-in-95 duration-150">
          {/* Technique Highlight Card */}
          <div 
            className="p-5 rounded-3xl border relative overflow-hidden"
            style={{
              backgroundColor: '#11141f',
              borderColor: `${selectedTechnique.color}50`,
            }}
          >
            <div 
              className="absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none"
              style={{ backgroundColor: selectedTechnique.color }}
            />

            <div className="flex items-start gap-4 relative z-10">
              <div 
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0 shadow-inner"
                style={{
                  backgroundColor: `${selectedTechnique.color}20`,
                  border: `1px solid ${selectedTechnique.color}45`,
                }}
              >
                {selectedTechnique.emoji}
              </div>

              <div className="space-y-2 flex-1">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h3 className="text-lg font-black text-white">{selectedTechnique.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-gray-900 border border-gray-800 text-gray-300">
                      Focus: <strong className="text-white">{selectedTechnique.focusLabel}</strong>
                    </span>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-gray-900 border border-gray-800 text-gray-300">
                      Break: <strong className="text-white">{selectedTechnique.breakLabel}</strong>
                    </span>
                  </div>
                </div>

                <p className="text-xs text-gray-300 leading-relaxed">
                  {selectedTechnique.summary}
                </p>
              </div>
            </div>
          </div>

          {/* Custom Duration Adjusters (If Custom Timer is selected) */}
          {selectedTechnique.isCustom && (
            <div className="bg-[#121622] border border-gray-800 rounded-3xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-pink-400 uppercase tracking-wider">
                <Sliders size={14} />
                <span>Adjust Custom Durations</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-300">Focus Duration:</span>
                    <span className="font-mono font-bold text-pink-400">{customWorkMins} min</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={120}
                    step={1}
                    value={customWorkMins}
                    onChange={(e) => setCustomWorkMins(parseInt(e.target.value) || 25)}
                    className="w-full accent-pink-500 cursor-pointer"
                  />
                  <div className="flex gap-1.5 flex-wrap">
                    {[15, 25, 30, 45, 60, 90].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setCustomWorkMins(m)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition ${
                          customWorkMins === m 
                            ? 'bg-pink-500 text-white border-pink-400' 
                            : 'bg-gray-800/80 text-gray-400 border-gray-700 hover:text-white'
                        }`}
                      >
                        {m}m
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-300">Break Duration:</span>
                    <span className="font-mono font-bold text-pink-400">{customBreakMins} min</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={30}
                    step={1}
                    value={customBreakMins}
                    onChange={(e) => setCustomBreakMins(parseInt(e.target.value) || 5)}
                    className="w-full accent-pink-500 cursor-pointer"
                  />
                  <div className="flex gap-1.5 flex-wrap">
                    {[0, 3, 5, 10, 15].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setCustomBreakMins(m)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition ${
                          customBreakMins === m 
                            ? 'bg-pink-500 text-white border-pink-400' 
                            : 'bg-gray-800/80 text-gray-400 border-gray-700 hover:text-white'
                        }`}
                      >
                        {m === 0 ? 'No Break' : `${m}m`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Habit Contribution Section: Only applies to minute/hourly habits */}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck size={14} className="text-cyan-400" />
                Contribute time to a habit?
              </label>
              <p className="text-xs text-gray-400 mt-0.5">
                Timers apply specifically to minute or hourly habits (e.g. study 1 hour per week).
              </p>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {/* Option 1: Standalone / No Habit */}
              <div
                id="option-standalone-focus"
                onClick={() => setChosenHabitId(null)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                  chosenHabitId === null
                    ? 'bg-cyan-500/15 border-cyan-500/60 text-white shadow-sm'
                    : 'bg-[#121520] border-gray-800 text-gray-400 hover:text-gray-200 hover:bg-[#161a29]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gray-800/90 border border-gray-700 flex items-center justify-center text-base">
                    ✨
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">None (Standalone Focus Session)</div>
                    <div className="text-[11px] text-gray-400">Just run the timer without logging habit time</div>
                  </div>
                </div>
                {chosenHabitId === null && (
                  <div className="w-6 h-6 rounded-full bg-cyan-500 text-black flex items-center justify-center shadow">
                    <Check size={14} strokeWidth={3} />
                  </div>
                )}
              </div>

              {/* Option 2: Existing Minute and Hourly Habits */}
              {timeBasedHabits.map((habit) => {
                const isSelected = chosenHabitId === habit.id;

                return (
                  <div
                    key={habit.id}
                    id={`option-habit-${habit.id}`}
                    onClick={() => setChosenHabitId(habit.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'border-blue-500 bg-blue-500/15 shadow-md'
                        : 'bg-[#121520] border-gray-800 hover:border-gray-700 hover:bg-[#161a29]'
                    }`}
                    style={{
                      borderColor: isSelected ? habit.color : undefined,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shadow-sm"
                        style={{
                          backgroundColor: `${habit.color}25`,
                          border: `1px solid ${habit.color}50`,
                        }}
                      >
                        {habit.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{habit.name}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/25">
                            {habit.unit}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          Goal: <strong className="text-gray-200">{habit.quota} {habit.unit} per {habit.timeframe}</strong>
                          {habit.group && ` • ${habit.group}`}
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <div 
                        className="w-6 h-6 rounded-full text-white flex items-center justify-center shadow-sm"
                        style={{ backgroundColor: habit.color }}
                      >
                        <Check size={14} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                );
              })}

              {timeBasedHabits.length === 0 && (
                <div className="p-4 text-center rounded-2xl bg-[#121520] border border-gray-800/80 text-xs space-y-1">
                  <p className="font-semibold text-gray-300">No minute or hourly habits found</p>
                  <p className="text-gray-500 text-[11px]">
                    Timers only apply to habits measured in minutes or hours (e.g. study 1 hr/week). You can run a standalone session now, or create a minute/hourly habit anytime.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Action Bar */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSelectedTechnique(null)}
              className="py-3 px-5 rounded-2xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold transition"
            >
              Cancel
            </button>
            <button
              type="button"
              id="confirm-start-timer-button"
              onClick={handleConfirmStart}
              className="flex-1 py-3 px-5 rounded-2xl text-white text-xs font-black transition flex items-center justify-center gap-2 shadow-xl active:scale-95"
              style={{
                backgroundColor: selectedTechnique.color,
                boxShadow: `0 8px 25px -4px ${selectedTechnique.color}50`,
              }}
            >
              <Play size={15} fill="currentColor" />
              <span>Start {selectedTechnique.shortName}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          {/* Active Focus Player (When a session is currently running or paused) */}
          {isAnyTimerActive && (
            <div 
              className="relative overflow-hidden rounded-3xl border p-5 sm:p-6 shadow-2xl transition-all backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200"
              style={{
                borderColor: `${themeColor}50`,
                backgroundColor: '#0f121a',
                boxShadow: `0 10px 40px -10px ${themeColor}25`,
              }}
            >
              {/* Background Ambient Glow */}
              <div 
                className="absolute -top-24 -right-24 w-64 h-64 rounded-full blur-3xl opacity-20 pointer-events-none"
                style={{ backgroundColor: themeColor }}
              />

              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                {/* Circular Countdown Progress Ring */}
                <div className="flex items-center gap-5">
                  <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
                    <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 160 160">
                      {/* Background Track */}
                      <circle
                        cx="80"
                        cy="80"
                        r={radius}
                        stroke="#1e2433"
                        strokeWidth={stroke}
                        fill="transparent"
                      />
                      {/* Progress Circle */}
                      <circle
                        cx="80"
                        cy="80"
                        r={radius}
                        stroke={themeColor}
                        strokeWidth={stroke}
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        fill="transparent"
                        className="transition-all duration-500 ease-out"
                      />
                    </svg>

                    {/* Centered Big Time Display */}
                    <div className="absolute flex flex-col items-center justify-center text-center">
                      <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white drop-shadow-md">
                        {formatTime(remainingSeconds)}
                      </span>
                      <span 
                        className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full mt-0.5"
                        style={{
                          backgroundColor: `${themeColor}25`,
                          color: themeColor,
                        }}
                      >
                        {mode === 'focus' ? 'Focus' : mode === 'longBreak' ? 'Long Break' : 'Break'}
                      </span>
                    </div>
                  </div>

                  {/* Session Info & Technique Badges */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{currentTechnique?.emoji || '⏱️'}</span>
                      <div>
                        <h3 className="text-base sm:text-lg font-black text-white leading-tight">
                          {currentTechnique?.shortName || activeHabit?.name || 'Active Focus Session'}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            isTechniqueRunning ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}>
                            {isTechniqueRunning ? 'RUNNING' : 'PAUSED'}
                          </span>
                          {targetSeconds !== null && (
                            <span className="text-[11px] font-semibold text-gray-400">
                              Cycle {cycle}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Linked Habit Indicator */}
                    {activeHabit ? (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-semibold">
                        <span>{activeHabit.icon}</span>
                        <span>Logging to: <strong className="text-white">{activeHabit.name}</strong></span>
                        <span className="text-[11px] text-blue-400 font-mono">({activeHabit.quota} {habitUnitShort(activeHabit.unit)}/{activeHabit.timeframe})</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gray-800/80 border border-gray-700/60 text-gray-400 text-xs font-medium">
                        <Sparkles size={13} className="text-amber-400" />
                        <span>Standalone Session (Not linked to a habit)</span>
                      </div>
                    )}

                    {/* Flowtime Proportional Break Button */}
                    {currentTechnique?.isFlowtime && mode === 'focus' && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={takeFlowtimeBreak}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95"
                        >
                          <Coffee size={14} />
                          <span>Take Break ({calculateFlowtimeBreak(Math.max(1, Math.round(elapsedSeconds / 60)))}m recommended)</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Player Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Play / Pause Toggle */}
                  {isRunning ? (
                    <button
                      type="button"
                      onClick={pauseTimer}
                      className="px-4 py-2.5 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs flex items-center gap-2 transition active:scale-95 shadow-lg shadow-amber-500/10"
                    >
                      <Pause size={16} fill="currentColor" />
                      <span>Pause</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={resumeTimer}
                      className="px-4 py-2.5 rounded-2xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold text-xs flex items-center gap-2 transition active:scale-95 shadow-lg shadow-emerald-500/10"
                    >
                      <Play size={16} fill="currentColor" />
                      <span>Resume</span>
                    </button>
                  )}

                  {/* Skip to Next Phase */}
                  {targetSeconds !== null && (
                    <button
                      type="button"
                      onClick={skipToNextPhase}
                      className="px-3.5 py-2.5 rounded-2xl bg-gray-800 hover:bg-gray-700/80 text-gray-200 border border-gray-700 text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
                      title={mode === 'focus' ? 'Skip to break' : 'Skip break to next focus cycle'}
                    >
                      <SkipForward size={15} />
                      <span>{mode === 'focus' ? 'Skip to Break' : 'Next Cycle'}</span>
                    </button>
                  )}

                  {/* Reset current phase */}
                  <button
                    type="button"
                    onClick={resetTimer}
                    className="p-2.5 rounded-2xl bg-gray-800 hover:bg-gray-700/80 text-gray-400 hover:text-white border border-gray-700 transition active:scale-95"
                    title="Reset interval"
                  >
                    <RotateCcw size={15} />
                  </button>

                  {/* Quick Add +5 min */}
                  <button
                    type="button"
                    onClick={() => addSeconds(300)}
                    className="px-2.5 py-2.5 rounded-2xl bg-gray-800 hover:bg-gray-700/80 text-gray-300 border border-gray-700 text-xs font-bold transition active:scale-95"
                    title="Add 5 minutes to countdown"
                  >
                    +5m
                  </button>

                  {/* Stop & Finish Session */}
                  <button
                    type="button"
                    onClick={stopTimer}
                    className="px-3.5 py-2.5 rounded-2xl bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
                    title="Finish session and save habit time"
                  >
                    <Square size={13} fill="currentColor" />
                    <span>Stop</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Section: Popular Study Timer Techniques Header */}
          <div>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white tracking-wide uppercase flex items-center gap-2">
                  <Brain size={16} className="text-cyan-400" />
                  Popular Study Timer Techniques
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Pick a study timer method to begin and optionally contribute time to your minute or hourly habits.
                </p>
              </div>
            </div>
          </div>

          {/* Grid of Uniform Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {STUDY_TIMER_TECHNIQUES.map((tech) => {
              const isThisRunning = timerState.techniqueId === tech.id && isRunning;
              const isThisSelected = timerState.techniqueId === tech.id;

              return (
                <div
                  key={tech.id}
                  id={`technique-card-${tech.id}`}
                  onClick={() => handleCardClick(tech)}
                  className={`group relative rounded-3xl border p-5 flex flex-col justify-between transition-all duration-200 cursor-pointer overflow-hidden select-none hover:-translate-y-1 ${
                    isThisSelected
                      ? 'border-cyan-500/70 shadow-xl shadow-cyan-500/10'
                      : 'border-gray-800 hover:border-gray-700 hover:shadow-xl'
                  }`}
                  style={{
                    background: 'linear-gradient(145deg, #0e111a 0%, #090b10 100%)',
                  }}
                >
                  {/* Subtle Glow in Technique Color on Hover */}
                  <div 
                    className="absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl opacity-10 group-hover:opacity-25 transition-opacity pointer-events-none"
                    style={{ backgroundColor: tech.color }}
                  />

                  <div className="space-y-3.5 relative z-10">
                    {/* Header Row: Emoji Icon + Active Status */}
                    <div className="flex items-center justify-between gap-3">
                      <div 
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-inner group-hover:scale-110 transition-transform"
                        style={{
                          backgroundColor: `${tech.color}20`,
                          border: `1px solid ${tech.color}45`,
                        }}
                      >
                        {tech.emoji}
                      </div>

                      {isThisRunning && (
                        <span className="flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          ACTIVE
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h4 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors leading-snug">
                      {tech.name}
                    </h4>

                    {/* Standardized Focus Time & Break Time Stat Row */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-900/90 border border-gray-800/90 text-gray-300">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">Focus:</span>
                        <span className="font-bold text-white truncate">{tech.focusLabel}</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-900/90 border border-gray-800/90 text-gray-300">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">Break:</span>
                        <span className="font-bold text-gray-200 truncate">{tech.breakLabel}</span>
                      </div>
                    </div>

                    {/* Combined Simple Description & Best For */}
                    <p className="text-xs text-gray-400 leading-relaxed min-h-[48px]">
                      {tech.summary}
                    </p>
                  </div>

                  {/* Bottom Action Area */}
                  <div className="pt-4 mt-3 border-t border-gray-800/80 flex items-center justify-between relative z-10">
                    <span className="text-xs font-bold text-gray-400 group-hover:text-white transition-colors flex items-center gap-1">
                      Select Technique
                    </span>
                    <div 
                      className="w-8 h-8 rounded-xl flex items-center justify-center transition-all group-hover:scale-105"
                      style={{
                        backgroundColor: `${tech.color}25`,
                        color: tech.color,
                        border: `1px solid ${tech.color}50`,
                      }}
                    >
                      <Play size={13} fill="currentColor" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function habitUnitShort(unit: string) {
  switch (unit) {
    case 'hours': return 'hr';
    case 'minutes': return 'min';
    case 'seconds': return 'sec';
    case 'amount': return 'x';
    default: return unit;
  }
}
