'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  AlertTriangle, CalendarDays, Cloud, CloudOff, Database, LayoutDashboard, Loader2, PanelLeftClose, PanelLeftOpen, Timer,
} from 'lucide-react';
import { useHabitTimer } from '../context/TimerContext';
import { useSync, SyncStatus } from '../context/SyncContext';
import { usePersistentState } from '../hooks/usePersistentState';
import { formatTime } from '../lib/timerTechniques';

const NAV_ITEMS = [
  { href: '/', label: 'Today', short: 'Today', icon: LayoutDashboard, accent: 'text-blue-400' },
  { href: '/calendar', label: 'Calendar', short: 'Calendar', icon: CalendarDays, accent: 'text-orange-400' },
  { href: '/timers', label: 'Timers', short: 'Timers', icon: Timer, accent: 'text-cyan-400' },
  { href: '/data', label: 'Data & Backup', short: 'Data', icon: Database, accent: 'text-emerald-400' },
];

// Cloud sync indicator; hidden when sync isn't set up
const SYNC_DISPLAY: Record<SyncStatus, { label: string; icon: typeof Cloud; className: string; dot: string } | null> = {
  disabled: null,
  'signed-out': null, // the password screen covers the app while locked
  syncing: { label: 'Syncing…', icon: Loader2, className: 'text-blue-400 animate-spin', dot: 'bg-blue-400' },
  synced: { label: 'Synced', icon: Cloud, className: 'text-emerald-400', dot: 'bg-emerald-400' },
  offline: { label: 'Offline, will sync later', icon: CloudOff, className: 'text-amber-400', dot: 'bg-amber-400' },
  error: { label: 'Sync problem', icon: AlertTriangle, className: 'text-red-400', dot: 'bg-red-400' },
  conflict: { label: 'Sync needs a choice', icon: AlertTriangle, className: 'text-amber-400', dot: 'bg-amber-400' },
};

function useNavState() {
  const pathname = usePathname();
  const timer = useHabitTimer();
  const { status } = useSync();
  return {
    isActiveRoute: (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href)),
    timer,
    sync: SYNC_DISPLAY[status],
  };
}

/** Left-hand navigation on tablets and desktops (phones use MobileNav). */
export function Sidebar() {
  const [collapsed, setCollapsed] = usePersistentState('habitthat_sidebar_collapsed', false);
  const { isActiveRoute, timer, sync } = useNavState();

  return (
    <aside
      className={`hidden md:flex sticky top-0 h-screen shrink-0 flex-col border-r border-gray-800/80 bg-[#0a0b0e] transition-[width] duration-200 ${
        collapsed ? 'w-16' : 'w-56'
      }`}
    >
      {/* Brand */}
      <div className="h-16 flex items-center gap-2.5 px-4 border-b border-gray-800/80">
        <div className="w-8 h-8 shrink-0 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-blue-600/30">
          H
        </div>
        {!collapsed && (
          <span className="text-lg font-black tracking-tight text-white truncate">
            Habit<span className="text-blue-500">That</span>
          </span>
        )}
      </div>

      <nav className="flex-1 p-2.5 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon, accent }) => {
          const active = isActiveRoute(href);
          const showTimerBadge = href === '/timers' && timer.isActive;
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
              {!collapsed && <span className="truncate">{label}</span>}

              {/* Running session indicator */}
              {showTimerBadge && (
                <>
                  <span className={`absolute top-2 left-7 w-2 h-2 rounded-full ${timer.isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                  {!collapsed && (
                    <span className={`ml-auto font-mono text-[11px] font-bold ${timer.mode === 'focus' ? 'text-emerald-400' : 'text-amber-300'}`}>
                      {formatTime(timer.remainingSeconds)}
                    </span>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      {sync && (
        <Link
          href="/data"
          title={sync.label}
          className="flex items-center gap-3 mx-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-[#12141c] transition"
        >
          <sync.icon size={16} className={`shrink-0 ${sync.className}`} />
          {!collapsed && <span className="truncate">{sync.label}</span>}
        </Link>
      )}

      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-3 m-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:text-white hover:bg-[#12141c] transition"
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        {!collapsed && <span>Collapse</span>}
      </button>
    </aside>
  );
}

/** Bottom tab bar on phones. */
export function MobileNav() {
  const { isActiveRoute, timer, sync } = useNavState();

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-gray-800 bg-[#0a0b0e]/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-4">
        {NAV_ITEMS.map(({ href, label, short, icon: Icon, accent }) => {
          const active = isActiveRoute(href);
          const showTimer = href === '/timers' && timer.isActive;
          const showSync = href === '/data' && sync;
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className={`relative flex flex-col items-center gap-1 pt-2 pb-1.5 text-[10px] font-semibold transition ${
                active ? 'text-white' : 'text-gray-500 active:text-gray-300'
              }`}
            >
              <Icon size={21} className={active ? accent : ''} />
              {showTimer ? (
                <span className={`font-mono font-bold ${timer.mode === 'focus' ? 'text-emerald-400' : 'text-amber-300'}`}>
                  {formatTime(timer.remainingSeconds)}
                </span>
              ) : (
                <span>{short}</span>
              )}
              {showSync && (
                <span className={`absolute top-1.5 left-1/2 ml-2.5 w-2 h-2 rounded-full ${sync.dot}`} title={sync.label} />
              )}
              {active && <span className="absolute top-0 inset-x-6 h-0.5 rounded-full bg-current opacity-60" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
