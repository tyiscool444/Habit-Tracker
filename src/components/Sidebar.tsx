'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, Database, LayoutDashboard, PanelLeftClose, PanelLeftOpen, Timer } from 'lucide-react';
import { useHabitTimer } from '../context/TimerContext';
import { usePersistentState } from '../hooks/usePersistentState';
import { formatTime } from '../lib/timerTechniques';

const NAV_ITEMS = [
  { href: '/', label: 'Today', icon: LayoutDashboard, accent: 'text-blue-400' },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays, accent: 'text-orange-400' },
  { href: '/timers', label: 'Timers', icon: Timer, accent: 'text-cyan-400' },
  { href: '/data', label: 'Data & Backup', icon: Database, accent: 'text-emerald-400' },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = usePersistentState('habitthat_sidebar_collapsed', false);
  const { isActive, isRunning, mode, remainingSeconds } = useHabitTimer();

  return (
    <aside
      className={`sticky top-0 h-screen shrink-0 flex flex-col border-r border-gray-800/80 bg-[#0a0b0e] transition-[width] duration-200 w-16 ${
        collapsed ? '' : 'md:w-56'
      }`}
    >
      {/* Brand */}
      <div className="h-16 flex items-center gap-2.5 px-4 border-b border-gray-800/80">
        <div className="w-8 h-8 shrink-0 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-blue-600/30">
          H
        </div>
        <span className={`text-lg font-black tracking-tight text-white truncate hidden ${collapsed ? '' : 'md:inline'}`}>
          Habit<span className="text-blue-500">That</span>
        </span>
      </div>

      <nav className="flex-1 p-2.5 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon, accent }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
          const showTimerBadge = href === '/timers' && isActive;
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
                active
                  ? 'bg-[#161924] text-white border border-gray-700/70 shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-[#12141c] border border-transparent'
              }`}
            >
              <Icon size={18} className={`shrink-0 ${active ? accent : ''}`} />
              <span className={`truncate hidden ${collapsed ? '' : 'md:inline'}`}>{label}</span>

              {/* Running session indicator */}
              {showTimerBadge && (
                <>
                  <span className={`absolute top-2 left-7 w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                  <span className={`ml-auto font-mono text-[11px] font-bold hidden ${collapsed ? '' : 'md:inline'} ${
                    mode === 'focus' ? 'text-emerald-400' : 'text-amber-300'
                  }`}>
                    {formatTime(remainingSeconds)}
                  </span>
                </>
              )}
            </Link>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="hidden md:flex items-center gap-3 m-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:text-white hover:bg-[#12141c] transition"
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        {!collapsed && <span>Collapse</span>}
      </button>
    </aside>
  );
}
