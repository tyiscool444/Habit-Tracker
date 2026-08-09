'use client';

import { useState, useMemo } from 'react';
import { useHabits } from '../hooks/useHabits';
import { HabitForm } from '../components/HabitForm';
import { HabitCard } from '../components/HabitCard';
import { PlusCircle, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { normalizeDateStr } from '../lib/habitUtils';

const formatDateLabel = (date: Date) => {
  const today = new Date();
  today.setHours(0,0,0,0);
  const compareDate = new Date(date);
  compareDate.setHours(0,0,0,0);
  
  const diffTime = compareDate.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 3600 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays === 1) return 'Tomorrow';
  
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

export default function Home() {
  const router = useRouter();
  const { habits, addHabit, updateHabit, deleteHabit, setLog, isLoaded } = useHabits();
  const [showForm, setShowForm] = useState(false);
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const selectedDateStr = normalizeDateStr(selectedDate);

  const changeDate = (days: number) => {
    const nextDate = new Date(selectedDate);
    nextDate.setDate(nextDate.getDate() + days);
    setSelectedDate(nextDate);
  };

  const globalCompletion = useMemo(() => {
    if (habits.length === 0) return 0;
    
    let totalPercent = 0;
    habits.forEach(habit => {
      const amount = habit.logs[selectedDateStr] || 0;
      let percent = 0;
      if (habit.type === 'START') {
        percent = Math.min(amount / habit.quota, 1);
      } else {
        percent = amount === 0 ? 1 : Math.max(0, 1 - (amount / habit.quota));
      }
      totalPercent += percent;
    });
    
    return Math.round((totalPercent / habits.length) * 100);
  }, [habits, selectedDateStr]);

  const editingHabit = useMemo(() => habits.find(h => h.id === editingHabitId), [habits, editingHabitId]);

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

        {habits.length > 0 && (
          <div className="flex items-center justify-between mb-8 bg-gray-900/40 p-4 rounded-2xl border border-gray-800">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
                <button 
                  onClick={() => changeDate(-1)}
                  className="p-2 hover:bg-gray-700 rounded-md transition text-gray-400 hover:text-white"
                >
                  <ChevronLeft size={20} />
                </button>
                <button 
                  onClick={() => changeDate(1)}
                  className="p-2 hover:bg-gray-700 rounded-md transition text-gray-400 hover:text-white"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
              <h2 className="text-xl font-bold w-32">{formatDateLabel(selectedDate)}</h2>
            </div>
            
            <div className="flex flex-col items-end">
              <span className="text-3xl font-extrabold text-white">{globalCompletion}%</span>
              <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Completed</span>
            </div>
          </div>
        )}

        {showForm ? (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <HabitForm 
              onSave={(h) => { addHabit(h); setShowForm(false); }} 
              onCancel={() => setShowForm(false)} 
            />
          </div>
        ) : null}

        {editingHabitId && editingHabit ? (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <HabitForm 
              initialHabit={editingHabit}
              onSave={(h) => { updateHabit(h); setEditingHabitId(null); }} 
              onCancel={() => setEditingHabitId(null)}
              onDelete={() => { deleteHabit(editingHabit.id); setEditingHabitId(null); }}
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
                selectedDateStr={selectedDateStr}
                onClick={() => router.push(`/habit/${habit.id}`)} 
                onLog={setLog.bind(null, habit.id)}
                onEdit={() => setEditingHabitId(habit.id)}
              />
            ))}
            
            <div 
              onClick={() => setShowForm(true)}
              className="bg-transparent border-2 border-dashed border-gray-800 rounded-xl py-6 px-4 flex items-center justify-center cursor-pointer hover:border-gray-700 hover:bg-gray-900/30 transition-all group"
            >
              <div className="flex items-center gap-3 text-gray-500 group-hover:text-gray-400 transition-colors">
                <PlusCircle size={24} />
                <span className="text-lg font-medium">Add New Habit</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
