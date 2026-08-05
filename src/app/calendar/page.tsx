'use client';

import { useHabits } from '../../hooks/useHabits';
import { getAmountInInterval } from '../../lib/habitUtils';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { subDays, eachDayOfInterval, startOfDay, endOfDay } from 'date-fns';
import { useState, useMemo } from 'react';

export default function CalendarOverview() {
  const { habits, isLoaded } = useHabits();
  const [viewMode, setViewMode] = useState<'month' | 'year'>('month');

  const heatmapData = useMemo(() => {
    const end = new Date();
    const startMonth = subDays(end, 29); // 30 days
    const startYear = subDays(end, 364); // 365 days

    const monthDays = eachDayOfInterval({ start: startMonth, end });
    const yearDays = eachDayOfInterval({ start: startYear, end });
    
    const monthPad = Array.from({ length: startMonth.getDay() }).map(() => null);

    return { monthDays, yearDays, monthPad };
  }, []);

  const activeDays = viewMode === 'month' ? heatmapData.monthDays : heatmapData.yearDays;

  if (!isLoaded) return <div className="min-h-screen bg-black" />;

  return (
    <div className="min-h-screen bg-[#09090b] text-white p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between mb-10 gap-4">
          <div className="flex items-center">
            <Link 
              href="/"
              className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-900 hover:bg-gray-800 transition mr-4 shrink-0"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">Overview</h1>
              <p className="text-gray-400 mt-1">A high-level view of your habits.</p>
            </div>
          </div>

          <div className="flex bg-gray-900 p-1 rounded-lg shrink-0 w-fit">
            <button 
              onClick={() => setViewMode('month')}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition ${viewMode === 'month' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
            >
              Month
            </button>
            <button 
              onClick={() => setViewMode('year')}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition ${viewMode === 'year' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
            >
              Year
            </button>
          </div>
        </header>

        {habits.length === 0 ? (
          <div className="text-center py-20 bg-gray-900/50 rounded-2xl border border-gray-800 border-dashed text-gray-500">
            No habits yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {habits.map((habit) => {
              return (
                <div key={habit.id} className="bg-gray-900/40 border border-gray-800/50 rounded-2xl p-5 shadow-lg flex flex-col">
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${habit.color}20`, border: `1px solid ${habit.color}30` }}
                    >
                      {habit.icon}
                    </div>
                    <h2 className="text-lg font-bold truncate">{habit.name}</h2>
                  </div>

                  <div className={viewMode === 'month' ? "grid grid-cols-7 gap-1 mt-auto" : "flex flex-wrap gap-[3px] mt-auto"}>
                    {viewMode === 'month' && heatmapData.monthPad.map((_, i) => (
                      <div key={`pad-${i}`} className="aspect-square rounded-sm bg-transparent" />
                    ))}
                    
                    {activeDays.map((day) => {
                      const amt = getAmountInInterval(habit.logs, startOfDay(day), endOfDay(day));
                      let opacity = 0.08; // Default empty state

                      if (amt > 0) {
                        if (habit.type === 'START') {
                          opacity = Math.min(amt / habit.quota, 1);
                        } else {
                          opacity = Math.max(0.2, 1 - (amt / habit.quota));
                        }
                        // Minimum visible opacity if there is some progress
                        opacity = Math.max(opacity, 0.25);
                      }

                      // For STOP habits, 0 amount is perfect (100% opacity) if it's in the past
                      if (habit.type === 'STOP' && amt === 0 && day.getTime() < endOfDay(new Date()).getTime()) {
                        opacity = 1;
                      }

                      // Future days for STOP habits shouldn't look successful yet
                      if (habit.type === 'STOP' && day.getTime() > new Date().getTime() && opacity === 1) {
                        opacity = 0.08;
                      }

                      return (
                        <div 
                          key={day.toISOString()} 
                          className={`${viewMode === 'month' ? 'aspect-square w-full' : 'w-2 h-2'} rounded-sm`}
                          style={{ 
                            backgroundColor: opacity > 0.08 ? habit.color : '#1f2937', 
                            opacity: opacity > 0.08 ? opacity : 1
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
