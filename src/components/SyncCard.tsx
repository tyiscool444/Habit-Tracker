'use client';

import { formatDistanceToNow } from 'date-fns';
import { Cloud, Lock, RefreshCw } from 'lucide-react';
import { useSync } from '../context/SyncContext';

const STATUS_TEXT = {
  syncing: 'Syncing…',
  synced: 'Up to date',
  offline: 'Offline. Changes will sync when you reconnect.',
  error: 'Could not reach the cloud. Try "Sync now".',
  conflict: 'Choose which data to keep.',
} as const;

/** Sync status for this device, with manual sync and lock. */
export function SyncCard() {
  const { status, lastSyncedAt, lock, syncNow } = useSync();

  return (
    <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/25 space-y-2">
      <div className="flex items-center gap-2 text-sm font-bold text-white">
        <Cloud size={16} className="text-blue-400" />
        Sync across devices
      </div>

      {status === 'disabled' ? (
        <p className="text-xs text-gray-400">
          Cloud sync isn&apos;t set up for this app yet. Follow the &quot;Cloud sync&quot; steps in the README to switch it on.
        </p>
      ) : (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className={`text-xs ${status === 'error' || status === 'offline' ? 'text-amber-400' : 'text-gray-400'}`}>
            {STATUS_TEXT[status as keyof typeof STATUS_TEXT] ?? ''}
            {status === 'synced' && lastSyncedAt && ` · last synced ${formatDistanceToNow(lastSyncedAt, { addSuffix: true })}`}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={syncNow}
              disabled={status === 'syncing'}
              className="px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 transition"
            >
              <RefreshCw size={13} className={status === 'syncing' ? 'animate-spin' : ''} />
              Sync now
            </button>
            <button
              type="button"
              onClick={() => void lock()}
              title="Lock this device; the password is needed to open the app again"
              className="px-3 py-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 text-xs font-bold flex items-center gap-1.5 transition"
            >
              <Lock size={13} />
              Lock
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
