'use client';

import { useState } from 'react';
import { X, Trash2, Tag, Shuffle } from 'lucide-react';
import { ICONS, COLORS, getRandomIcon, getRandomColor } from '../lib/constants';

/* Shared building blocks for HabitForm and TaskForm. */

export type Accent = 'blue' | 'purple';

// Full class names so Tailwind can see them
const ACCENT = {
  blue: {
    focusWithin: 'focus-within:border-blue-500',
    hoverText: 'hover:text-blue-400',
    link: 'text-blue-400 hover:text-blue-300',
    selectedIcon: 'bg-blue-600 border border-blue-400',
    ring: 'ring-blue-500/50',
    submit: 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30',
  },
  purple: {
    focusWithin: 'focus-within:border-purple-500',
    hoverText: 'hover:text-purple-400',
    link: 'text-purple-400 hover:text-purple-300',
    selectedIcon: 'bg-purple-600 border border-purple-400',
    ring: 'ring-purple-500/50',
    submit: 'bg-purple-600 hover:bg-purple-500 shadow-purple-600/30',
  },
} as const;

export const LABEL_CLASS = 'block text-[11px] font-bold uppercase tracking-wider text-gray-400';
export const INPUT_BOX_CLASS = 'bg-[#171922] border border-gray-700/80 rounded-xl flex items-center shadow-inner';

export function accentClasses(accent: Accent) {
  return ACCENT[accent];
}

export function FormShell({ title, icon, color, onCancel, onSubmit, children }: {
  title: string;
  icon: string;
  color: string;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#111318] border border-gray-800 rounded-2xl w-full max-w-md mx-auto shadow-2xl overflow-hidden text-white font-sans animate-in fade-in zoom-in-95 duration-150">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800/80 bg-[#151820]">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shadow-inner transition-colors"
            style={{ backgroundColor: `${color}25`, border: `1px solid ${color}60` }}
          >
            {icon}
          </div>
          <h2 className="text-base font-bold text-gray-100 tracking-tight">{title}</h2>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
        >
          <X size={18} />
        </button>
      </div>

      <form onSubmit={onSubmit} className="p-5 space-y-4">
        {children}
      </form>
    </div>
  );
}

/** Name input with icon / colour quick-pickers. */
export function IdentityField({ label, accent, name, onNameChange, placeholder, icon, onIconChange, color, onColorChange }: {
  label: string;
  accent: Accent;
  name: string;
  onNameChange: (v: string) => void;
  placeholder: string;
  icon: string;
  onIconChange: (v: string) => void;
  color: string;
  onColorChange: (v: string) => void;
}) {
  const [activePicker, setActivePicker] = useState<'icon' | 'color' | null>(null);
  const a = ACCENT[accent];
  const togglePicker = (p: 'icon' | 'color') => setActivePicker(activePicker === p ? null : p);

  return (
    <>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className={LABEL_CLASS}>{label}</label>
          <button
            type="button"
            onClick={() => {
              onIconChange(getRandomIcon());
              onColorChange(getRandomColor());
            }}
            className={`text-[11px] font-medium text-gray-400 ${a.hoverText} flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded-md hover:bg-gray-800/80 active:scale-95`}
          >
            <Shuffle size={11} />
            <span>Randomize</span>
          </button>
        </div>
        <div className={`flex items-center gap-2 bg-[#171922] border border-gray-700/80 rounded-xl p-1.5 ${a.focusWithin} transition-colors shadow-inner`}>
          <button
            type="button"
            onClick={() => togglePicker('icon')}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-xl bg-gray-800 hover:bg-gray-700 border border-gray-700/70 transition shrink-0 active:scale-95"
          >
            {icon}
          </button>

          <button
            type="button"
            onClick={() => togglePicker('color')}
            className="w-9 h-9 rounded-lg flex items-center justify-center bg-gray-800 hover:bg-gray-700 border border-gray-700/70 transition shrink-0 active:scale-95 group/col"
          >
            <div
              className="w-4 h-4 rounded-full border-2 border-white/40 shadow-sm group-hover/col:scale-110 transition"
              style={{ backgroundColor: color }}
            />
          </button>

          <input
            type="text"
            required
            autoFocus
            className="flex-1 bg-transparent px-2 text-sm text-white placeholder-gray-500 focus:outline-none font-medium"
            value={name}
            onChange={e => onNameChange(e.target.value)}
            placeholder={placeholder}
          />
        </div>
      </div>

      {activePicker && (
        <div className="bg-[#181b24] p-3 rounded-xl border border-gray-700 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-[11px] font-semibold text-gray-400">
            <span>{activePicker === 'icon' ? 'Choose an Icon' : 'Choose Accent Color'}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => activePicker === 'icon' ? onIconChange(getRandomIcon()) : onColorChange(getRandomColor())}
                className={`text-[10px] ${a.link} flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-gray-800 transition`}
              >
                <Shuffle size={10} /> Random
              </button>
              <button type="button" onClick={() => setActivePicker(null)} className="hover:text-white">
                Done
              </button>
            </div>
          </div>

          {activePicker === 'icon' ? (
            <div className="flex gap-1.5 flex-wrap max-h-36 overflow-y-auto p-0.5">
              {ICONS.map(ic => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => { onIconChange(ic); setActivePicker(null); }}
                  className={`w-8 h-8 rounded-lg text-base flex items-center justify-center transition-all ${
                    icon === ic ? `${a.selectedIcon} scale-105 shadow-md` : 'hover:bg-gray-700 bg-gray-800/60'
                  }`}
                >
                  {ic}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex gap-2 flex-wrap p-0.5">
              {COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => { onColorChange(c); setActivePicker(null); }}
                  className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 ${
                    color === c ? `border-white scale-110 shadow-lg ring-2 ${a.ring}` : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

/** Optional group / category input with chips for existing groups. */
export function GroupField({ accent, value, onChange, existingGroups, placeholder, emptyHint }: {
  accent: Accent;
  value: string;
  onChange: (v: string) => void;
  existingGroups: string[];
  placeholder: string;
  emptyHint: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className={LABEL_CLASS}>
          Group / Category <span className="text-gray-500 font-normal normal-case">(Optional)</span>
        </label>
        {value.trim() && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-[10px] font-semibold text-gray-400 hover:text-red-400 transition"
          >
            Clear
          </button>
        )}
      </div>

      <div className={`flex items-center gap-2 bg-[#171922] border border-gray-700/80 rounded-xl px-3 py-1.5 ${ACCENT[accent].focusWithin} transition-colors shadow-inner`}>
        <Tag size={13} className="text-gray-400 shrink-0" />
        <input
          type="text"
          className="flex-1 bg-transparent text-xs text-white placeholder-gray-500 focus:outline-none font-medium"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
        />
      </div>

      {existingGroups.length > 0 ? (
        <div className="space-y-1 mt-2">
          <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Existing Groups:</span>
          <div className="flex gap-1.5 flex-wrap max-h-20 overflow-y-auto pt-0.5">
            {existingGroups.map(g => {
              const isSelected = value.trim().toLowerCase() === g.toLowerCase();
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => onChange(isSelected ? '' : g)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1 ${
                    isSelected
                      ? 'bg-purple-600/30 text-purple-300 border border-purple-500/60 shadow-sm font-semibold'
                      : 'bg-gray-800/70 text-gray-400 hover:text-gray-200 hover:bg-gray-700 border border-gray-700/50'
                  }`}
                >
                  {isSelected && <span className="text-[9px]">✓</span>}
                  <span>{g}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="text-[11px] text-gray-500 mt-1.5 italic">{emptyHint}</p>
      )}
    </div>
  );
}

/** Two-option segmented control (Build/Quit, Task/Restraint). */
export function TypeToggle<T extends string>({ value, onChange, options }: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; activeClass: string }[];
}) {
  return (
    <div className="flex bg-[#171922] p-1 rounded-xl border border-gray-800">
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            value === o.value ? `${o.activeClass} text-white shadow-sm` : 'text-gray-400 hover:text-white'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function FormFooter({ accent, submitLabel, onCancel, onDelete }: {
  accent: Accent;
  submitLabel: string;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="flex items-center justify-between pt-3 border-t border-gray-800/80 mt-2">
      {onDelete ? (
        <button
          type="button"
          onClick={onDelete}
          className="px-3 py-2 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-500/10 transition flex items-center gap-1.5"
        >
          <Trash2 size={13} />
          <span>Delete</span>
        </button>
      ) : <div />}

      <div className="flex items-center gap-2 ml-auto">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-gray-800 transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          className={`px-5 py-2 rounded-xl text-xs font-bold ${ACCENT[accent].submit} text-white shadow-lg transition-all active:scale-95`}
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
}
