'use client';

import { useSyncExternalStore } from 'react';
import { HabitsProvider } from '../context/HabitsContext';
import { PlannerProvider } from '../context/PlannerContext';
import { TimerProvider } from '../context/TimerContext';
import { Sidebar } from './Sidebar';
import { FloatingTimerWidget } from './FloatingTimerWidget';

const emptySubscribe = () => () => {};

/**
 * App-wide providers + sidebar layout. All data lives in localStorage, so nothing
 * renders until the client has hydrated; the providers then read storage directly.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const isClient = useSyncExternalStore(emptySubscribe, () => true, () => false);
  if (!isClient) return <div className="min-h-screen bg-[#07080a]" />;

  return (
    <HabitsProvider>
      <PlannerProvider>
        <TimerProvider>
          <div className="min-h-screen flex bg-[#07080a] text-slate-100 font-sans selection:bg-blue-600/30">
            <Sidebar />
            <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">{children}</main>
          </div>
          <FloatingTimerWidget />
        </TimerProvider>
      </PlannerProvider>
    </HabitsProvider>
  );
}
