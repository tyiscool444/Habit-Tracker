import type { Metadata } from 'next';
import { TimersView } from '../../components/TimersView';

export const metadata: Metadata = { title: 'Timers' };

export default function TimersPage() {
  return (
    <div className="max-w-5xl mx-auto">
      <TimersView />
    </div>
  );
}
