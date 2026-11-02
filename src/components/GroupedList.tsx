'use client';

import { Layers } from 'lucide-react';

interface CategoryGroup<T> {
  name: string;
  isUngrouped: boolean;
  items: T[];
}

/** Buckets items by group name (in first-seen order), with ungrouped items last. */
function groupItemsByCategory<T extends { group?: string }>(items: T[]): CategoryGroup<T>[] {
  const groupMap = new Map<string, T[]>();
  const ungrouped: T[] = [];

  for (const item of items) {
    const g = item.group?.trim();
    if (!g) {
      ungrouped.push(item);
      continue;
    }
    if (!groupMap.has(g)) groupMap.set(g, []);
    groupMap.get(g)!.push(item);
  }

  const result: CategoryGroup<T>[] = [...groupMap].map(([name, list]) => ({ name, isUngrouped: false, items: list }));
  if (ungrouped.length > 0) {
    result.push({ name: 'General / Other', isUngrouped: true, items: ungrouped });
  }
  return result;
}

function GroupHeader({ name, count, noun, className = '' }: { name: string; count: number; noun: string; className?: string }) {
  return (
    <div className={`w-full flex items-center justify-between bg-[#0e1117] border-y border-gray-800/90 py-1.5 px-3 select-none ${className}`}>
      <div className="flex items-center gap-2">
        <Layers size={13} className="text-purple-400 shrink-0" />
        <span className="text-xs font-bold text-gray-200 tracking-wide uppercase">{name}</span>
        <span className="text-[10px] font-semibold text-gray-400 bg-gray-900 px-2 py-0.5 rounded-full border border-gray-700/60">
          {count} {count === 1 ? noun : `${noun}s`}
        </span>
      </div>
    </div>
  );
}

/**
 * Renders items under group headers when grouping is on and at least one item has a
 * group, otherwise as one flat list. Item order within each group is preserved.
 */
export function GroupedList<T extends { id: string; group?: string }>({ items, grouped, noun, headerClassName, renderItem }: {
  items: T[];
  grouped: boolean;
  noun: string;
  headerClassName?: string;
  renderItem: (item: T) => React.ReactNode;
}) {
  const list = (list: T[]) => (
    <div className="flex flex-col gap-0 divide-y divide-gray-800/80">{list.map(renderItem)}</div>
  );
  const groups = grouped ? groupItemsByCategory(items) : [];
  if (!groups.some(g => !g.isUngrouped)) return list(items);
  return (
    <>
      {groups.map(grp => (
        <div key={grp.name} className="flex flex-col">
          <GroupHeader name={grp.name} count={grp.items.length} noun={noun} className={headerClassName} />
          {list(grp.items)}
        </div>
      ))}
    </>
  );
}
