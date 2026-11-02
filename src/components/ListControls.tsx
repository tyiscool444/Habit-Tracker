'use client';

import { useState } from 'react';
import { Filter, Search, Tag, X } from 'lucide-react';

/* Search / filter controls shared by the habit grid and the one-off task list. */

export const UNGROUPED = '__ungrouped__';

type Accent = 'blue' | 'purple';

// Full class names so Tailwind can see them
const ACCENT = {
  blue: { focus: 'focus:border-blue-500', active: 'bg-blue-600/20 text-blue-400 border-blue-500/40', badge: 'bg-blue-500' },
  purple: { focus: 'focus:border-purple-500', active: 'bg-purple-600/20 text-purple-300 border-purple-500/40', badge: 'bg-purple-500' },
} as const;

const ICON_BUTTON = 'p-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white border border-gray-700 transition';

/** Case-insensitive match against the item's name and group. */
export function matchesSearch(item: { name: string; group?: string }, query: string): boolean {
  const q = query.trim().toLowerCase();
  return !q || item.name.toLowerCase().includes(q) || Boolean(item.group?.toLowerCase().includes(q));
}

/** `filter` is 'all', UNGROUPED, or a group name. */
export function matchesGroup(item: { group?: string }, filter: string): boolean {
  if (filter === 'all') return true;
  const g = item.group?.trim();
  return filter === UNGROUPED ? !g : g?.toLowerCase() === filter.toLowerCase();
}

/** A search icon that expands into a text box; collapses again when emptied. */
export function SearchToggle({ value, onChange, label, accent = 'blue' }: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  accent?: Accent;
}) {
  const [open, setOpen] = useState(false);
  const close = () => {
    onChange('');
    setOpen(false);
  };

  if (!open && !value) {
    return (
      <button type="button" aria-label={label} title="Search" onClick={() => setOpen(true)} className={ICON_BUTTON}>
        <Search size={14} />
      </button>
    );
  }
  return (
    <div className="relative">
      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      <input
        type="text"
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => { if (!value) setOpen(false); }}
        onKeyDown={(e) => { if (e.key === 'Escape') close(); }}
        placeholder={`${label}...`}
        aria-label={label}
        className={`w-44 bg-gray-900 border border-gray-700 ${ACCENT[accent].focus} rounded-lg pl-8 pr-7 py-1 text-xs text-white placeholder-gray-500 focus:outline-none transition`}
      />
      <button
        type="button"
        aria-label="Clear search"
        onMouseDown={(e) => e.preventDefault()}
        onClick={close}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
      >
        <X size={12} />
      </button>
    </div>
  );
}

/** Filter icon with a badge counting active filters. */
export function FilterButton({ open, activeCount, onClick, label = 'Filters', accent = 'blue' }: {
  open: boolean;
  activeCount: number;
  onClick: () => void;
  label?: string;
  accent?: Accent;
}) {
  const a = ACCENT[accent];
  return (
    <button
      type="button"
      aria-label={label}
      aria-expanded={open}
      title="Filters"
      onClick={onClick}
      className={`relative p-1.5 rounded-lg border transition ${open || activeCount > 0 ? a.active : 'bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white border-gray-700'}`}
    >
      <Filter size={14} />
      {activeCount > 0 && (
        <span className={`absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 rounded-full ${a.badge} text-white text-[9px] font-bold flex items-center justify-center`}>
          {activeCount}
        </span>
      )}
    </button>
  );
}

export function SegmentFilter<T extends string>({ label, value, onChange, options, activeClass }: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  activeClass: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">{label}:</span>
      <div className="flex bg-[#141620] p-0.5 rounded-lg border border-gray-800">
        {options.map(o => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition capitalize ${
              value === o.value ? `${activeClass} text-white shadow-sm` : 'text-gray-400 hover:text-white'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function GroupChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-0.5 rounded-lg text-[11px] font-semibold transition border ${
        active
          ? 'bg-purple-600 text-white border-purple-500 shadow-sm'
          : 'bg-[#141620] text-gray-400 hover:text-white border-gray-800'
      }`}
    >
      {children}
    </button>
  );
}

/** "Group:" chips — All, each group name, and Ungrouped. Renders nothing without groups. */
export function GroupFilter({ groups, value, onChange }: {
  groups: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  if (groups.length === 0) return null;
  const toggle = (g: string) => onChange(value.toLowerCase() === g.toLowerCase() ? 'all' : g);
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider flex items-center gap-1">
        <Tag size={11} className="text-purple-400" />
        Group:
      </span>
      <div className="flex gap-1.5 flex-wrap">
        <GroupChip active={value === 'all'} onClick={() => onChange('all')}>All Groups</GroupChip>
        {groups.map(g => (
          <GroupChip key={g} active={value.toLowerCase() === g.toLowerCase()} onClick={() => toggle(g)}>{g}</GroupChip>
        ))}
        <GroupChip active={value === UNGROUPED} onClick={() => toggle(UNGROUPED)}>Ungrouped</GroupChip>
      </div>
    </div>
  );
}

export function ClearFiltersButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="ml-auto px-2.5 py-1 rounded-lg text-[11px] font-semibold text-red-400 hover:bg-red-500/10 transition flex items-center gap-1"
    >
      <X size={12} />
      <span>Clear filters</span>
    </button>
  );
}
