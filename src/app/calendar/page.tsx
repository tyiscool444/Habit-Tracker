import type { Metadata } from 'next';
import { CalendarClient } from './CalendarClient';

export const metadata: Metadata = { title: 'Calendar' };

export default function CalendarPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <CalendarClient />
    </div>
  );
}
