'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useHabits } from '../../context/HabitsContext';
import { CalendarView } from '../../components/CalendarView';
import { Modal } from '../../components/Modal';
import { TaskForm } from '../../components/TaskForm';
import { getExistingGroups, normalizeDateStr } from '../../lib/habitUtils';

export function CalendarClient() {
  const router = useRouter();
  const { habits, updateHabit, deleteHabits } = useHabits();
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const editingTask = habits.find(h => h.id === editingTaskId);
  const existingGroups = useMemo(() => getExistingGroups(habits), [habits]);
  const close = () => setEditingTaskId(null);

  return (
    <>
      <CalendarView
        habits={habits}
        onUpdateTask={updateHabit}
        onEditTask={setEditingTaskId}
        onGoToDate={(d) => router.push(`/?date=${normalizeDateStr(d)}&view=day`)}
      />

      <Modal isOpen={Boolean(editingTask)} onClose={close}>
        {editingTask && (
          <TaskForm
            initialTask={editingTask}
            existingGroups={existingGroups}
            onSave={(t) => { updateHabit(t); close(); }}
            onCancel={close}
            onDelete={() => { deleteHabits([editingTask.id]); close(); }}
          />
        )}
      </Modal>
    </>
  );
}
