'use client';

import { useState, useRef } from 'react';
import { Habit } from '../types';
import { getSampleHabits } from '../lib/sampleHabits';
import { 
  X, Download, Upload, Sparkles, Trash2, Database, 
  CheckCircle2, AlertTriangle, ShieldCheck, FileJson
} from 'lucide-react';

interface Props {
  habits: Habit[];
  onSetAllHabits: (habits: Habit[]) => void;
  onClearAll: () => void;
  onClose: () => void;
}

export function DataSyncModal({ habits, onSetAllHabits, onClearAll, onClose }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmPreset, setConfirmPreset] = useState(false);

  const totalRecurring = habits.filter(h => h.isRecurring !== false).length;
  const totalTasks = habits.filter(h => h.isRecurring === false).length;
  const totalLogs = habits.reduce((acc, h) => acc + Object.keys(h.logs || {}).length, 0);

  const triggerFeedback = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 3500);
  };

  // Export JSON Backup
  const handleExport = () => {
    try {
      const dataStr = JSON.stringify(habits, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const dateStr = new Date().toISOString().slice(0, 10);
      const link = document.createElement('a');
      link.href = url;
      link.download = `habitthat-backup-${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      triggerFeedback(`Successfully exported ${habits.length} habits!`, 'success');
    } catch {
      triggerFeedback('Failed to export data.', 'error');
    }
  };

  // Import JSON Backup
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        if (!Array.isArray(parsed)) {
          throw new Error('Import file must be a JSON array of habits.');
        }

        // Basic validation
        const valid = parsed.every(item => item && typeof item.id === 'string' && typeof item.name === 'string');
        if (!valid) {
          throw new Error('Invalid format: habits must have id and name.');
        }

        onSetAllHabits(parsed);
        triggerFeedback(`Successfully imported ${parsed.length} habits!`, 'success');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Invalid JSON file.';
        triggerFeedback(`Import failed: ${msg}`, 'error');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  // Load Preset
  const handleLoadPreset = () => {
    const preset = getSampleHabits();
    onSetAllHabits(preset);
    setConfirmPreset(false);
    triggerFeedback(`Loaded ${preset.length} starter habits & tasks!`, 'success');
  };

  // Handle Clear
  const handleClearAll = () => {
    onClearAll();
    setConfirmReset(false);
    triggerFeedback('All data has been cleared.', 'success');
  };

  return (
    <div className="bg-[#0b0c10] border border-gray-800 rounded-3xl p-6 sm:p-7 shadow-2xl text-white space-y-6 max-h-[90vh] overflow-y-auto no-scrollbar">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Database size={20} />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">Data & Backup Sync</h2>
            <p className="text-xs text-gray-400">Export backups, transfer across devices, or load sample templates</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-gray-900/80 hover:bg-gray-800 border border-gray-700/60 flex items-center justify-center text-gray-400 hover:text-white transition"
        >
          <X size={16} />
        </button>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div 
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-semibold animate-in fade-in slide-in-from-top-2 duration-200 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Storage Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#12141c] border border-gray-800/90 rounded-2xl p-3 text-center">
          <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block mb-1">Habits</span>
          <span className="text-lg font-black text-blue-400">{totalRecurring}</span>
        </div>
        <div className="bg-[#12141c] border border-gray-800/90 rounded-2xl p-3 text-center">
          <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block mb-1">Tasks</span>
          <span className="text-lg font-black text-purple-400">{totalTasks}</span>
        </div>
        <div className="bg-[#12141c] border border-gray-800/90 rounded-2xl p-3 text-center">
          <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block mb-1">Logged Entries</span>
          <span className="text-lg font-black text-emerald-400">{totalLogs}</span>
        </div>
      </div>

      {/* Action Cards */}
      <div className="space-y-3">
        {/* Export Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#12141c]/80 border border-gray-800/80 hover:border-gray-700/80 transition">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0">
              <Download size={18} />
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-1.5">
                Export JSON Backup
                <FileJson size={13} className="text-blue-400" />
              </div>
              <p className="text-xs text-gray-400">Save your full progress, streaks, logs, and subtasks to a JSON file.</p>
            </div>
          </div>
          <button
            onClick={handleExport}
            disabled={habits.length === 0}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-lg shadow-blue-500/20 shrink-0"
          >
            <Download size={14} />
            <span>Download</span>
          </button>
        </div>

        {/* Import Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#12141c]/80 border border-gray-800/80 hover:border-gray-700/80 transition">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0">
              <Upload size={18} />
            </div>
            <div>
              <div className="text-sm font-bold text-white">Import JSON Backup</div>
              <p className="text-xs text-gray-400">Restore your habits and logs from a previous backup file.</p>
            </div>
          </div>
          <div>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-lg shadow-purple-500/20 shrink-0"
            >
              <Upload size={14} />
              <span>Select File</span>
            </button>
          </div>
        </div>

        {/* Starter Preset Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#12141c]/80 border border-gray-800/80 hover:border-gray-700/80 transition">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="text-sm font-bold text-white">Load Starter Preset</div>
              <p className="text-xs text-gray-400">Populate sample habits (Health, Reading, Fitness, Tasks) to test features.</p>
            </div>
          </div>
          {confirmPreset ? (
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleLoadPreset}
                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition"
              >
                Yes, Load
              </button>
              <button
                onClick={() => setConfirmPreset(false)}
                className="px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium transition"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => habits.length > 0 ? setConfirmPreset(true) : handleLoadPreset()}
              className="px-4 py-2 rounded-xl bg-[#1d212c] hover:bg-[#252b39] text-amber-300 border border-amber-500/30 text-xs font-bold transition flex items-center justify-center gap-1.5 shrink-0"
            >
              <Sparkles size={14} />
              <span>Load Preset</span>
            </button>
          )}
        </div>

        {/* Clear Data Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-red-950/10 border border-red-900/30 hover:border-red-800/50 transition">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-500/15 text-red-400 flex items-center justify-center shrink-0">
              <Trash2 size={18} />
            </div>
            <div>
              <div className="text-sm font-bold text-white">Reset All Data</div>
              <p className="text-xs text-gray-400">Clear all habits, tasks, and historical logged data on this browser.</p>
            </div>
          </div>
          {confirmReset ? (
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleClearAll}
                className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition"
              >
                Confirm Delete
              </button>
              <button
                onClick={() => setConfirmReset(false)}
                className="px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium transition"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmReset(true)}
              disabled={habits.length === 0}
              className="px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 disabled:opacity-40 disabled:cursor-not-allowed text-red-400 border border-red-500/30 text-xs font-bold transition flex items-center justify-center gap-1.5 shrink-0"
            >
              <Trash2 size={14} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Cloud & Privacy Note */}
      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-gray-900/50 border border-gray-800/60 text-xs text-gray-400">
        <ShieldCheck size={16} className="text-emerald-400 shrink-0 mt-0.5" />
        <p>
          <strong className="text-gray-300">Privacy First:</strong> Your data is stored locally in your browser storage and never sent to external servers. Export backups anytime to sync between your phone, tablet, and PC.
        </p>
      </div>
    </div>
  );
}
