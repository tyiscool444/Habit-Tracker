'use client';

import { useState } from 'react';
import { useHabits } from '../hooks/useHabits';
import { HabitForm } from '../components/HabitForm';
import { HabitCard } from '../components/HabitCard';
import { PlusCircle, CalendarDays } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Home() {
  const router = useRouter();
  const { habits, addHabit, setLog, isLoaded } = useHabits();
  const [showForm, setShowForm] = useState(false);

  if (!isLoaded) return <div className="min-h-screen bg-black" />;

  return (
    <div className="min-h-screen bg-[#09090b] text-white p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        <header className="flex items-center justify-between mb-12 border-b border-gray-800 pb-6">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight">Habit Tracker</h1>
            <p className="text-gray-400 mt-2">Build good habits, quit bad ones.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link 
              href="/calendar"
              className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-5 py-3 rounded-full font-semibold transition"
            >
              <CalendarDays size={20} />
              <span className="hidden sm:inline">Overview</span>
            </Link>
            <button 
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 rounded-full font-semibold transition shadow-lg shadow-blue-500/20"
            >
              <PlusCircle size={20} />
              <span className="hidden sm:inline">New Habit</span>
            </button>
          </div>
        </header>

        {showForm ? (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <HabitForm 
              onSave={(h) => { addHabit(h); setShowForm(false); }} 
              onCancel={() => setShowForm(false)} 
            />
          </div>
        ) : null}

        {habits.length === 0 ? (
          <div className="text-center py-20 bg-gray-900/50 rounded-2xl border border-gray-800 border-dashed">
            <div className="text-gray-500 mb-4">
              <PlusCircle size={48} className="mx-auto" />
            </div>
            <h2 className="text-xl font-medium text-gray-300">No habits yet</h2>
            <p className="text-gray-500 mt-2 max-w-md mx-auto">Click "New Habit" to start tracking your progress. You can track things you want to build or quit.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {habits.map(habit => (
              <HabitCard 
                key={habit.id} 
                habit={habit} 
                onClick={() => router.push(`/habit/${habit.id}`)} 
                onLog={setLog.bind(null, habit.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
