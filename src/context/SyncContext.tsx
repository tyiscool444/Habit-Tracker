'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { CloudDownload, HardDrive } from 'lucide-react';
import { Habit, PlanBlock } from '../types';
import { useHabits } from './HabitsContext';
import { usePlanner } from './PlannerContext';
import { getSupabase, isSyncConfigured, LOGIN_EMAIL } from '../lib/supabase';
import { Modal } from '../components/Modal';

/*
 * Cloud sync: the whole data set (habits + planner) is one row per user in Supabase.
 *
 * Every device remembers the version it last agreed with the cloud (`syncedAt`) and a
 * hash of the data at that point (`syncedHash`). Comparing those with the cloud row and
 * the current local data tells us who changed what:
 *   - only this device changed  → upload
 *   - only the cloud changed    → download
 *   - both changed              → the most recent edit wins (or ask, on a device's first sync)
 * We always download before uploading, so a device with stale data can't overwrite newer work.
 */

export type SyncStatus = 'disabled' | 'signed-out' | 'syncing' | 'synced' | 'offline' | 'error' | 'conflict';

interface SyncData {
  habits: Habit[];
  planner: PlanBlock[];
}

interface RemoteRow {
  data: SyncData;
  saved_at: number;
}

interface SyncMeta {
  userId?: string;
  syncedHash?: string;
  syncedAt?: number;
  localModifiedAt?: number;
}

interface SyncContextValue {
  status: SyncStatus;
  /** False until we know whether this device is already unlocked. */
  authChecked: boolean;
  lastSyncedAt: number | null;
  /** Returns an error message, or null on success. */
  unlock: (password: string) => Promise<string | null>;
  lock: () => Promise<void>;
  syncNow: () => void;
}

const META_KEY = 'habitthat_sync_meta';
const UPLOAD_DELAY_MS = 1500;

function readMeta(): SyncMeta {
  try {
    return JSON.parse(localStorage.getItem(META_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeMeta(meta: SyncMeta) {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {
    // Storage unavailable; we'll just re-check with the cloud next time
  }
}

/** FNV-1a: a quick fingerprint to tell whether the data changed. */
function hashString(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36) + str.length.toString(36);
}

const serialize = (data: SyncData) => JSON.stringify({ habits: data.habits, planner: data.planner });

function normalizeRemote(row: RemoteRow): SyncData {
  return { habits: row.data?.habits ?? [], planner: row.data?.planner ?? [] };
}

const SyncContext = createContext<SyncContextValue | null>(null);

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { habits, setAllHabits } = useHabits();
  const { blocks, setAllBlocks } = usePlanner();
  const supabase = getSupabase();

  const [session, setSession] = useState<Session | null>(null);
  const [authChecked, setAuthChecked] = useState(!isSyncConfigured);
  // Status of the signed-in sync; 'disabled' / 'signed-out' are derived below
  const [status, setStatus] = useState<SyncStatus>('syncing');
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(() => readMeta().syncedAt ?? null);
  const [conflict, setConflict] = useState<SyncData & { row: RemoteRow } | null>(null);

  const userId = session?.user.id ?? null;
  const localJson = useMemo(() => serialize({ habits, planner: blocks }), [habits, blocks]);

  // Latest values for async callbacks
  const localRef = useRef({ data: { habits, planner: blocks } as SyncData, json: localJson });
  const readyRef = useRef(false); // first download for this sign-in has finished
  const prevJsonRef = useRef(localJson);

  useEffect(() => {
    localRef.current = { data: { habits, planner: blocks }, json: localJson };
    // Note when this device last changed anything, for "most recent edit wins"
    if (localJson !== prevJsonRef.current) {
      prevJsonRef.current = localJson;
      const meta = readMeta();
      if (hashString(localJson) !== meta.syncedHash) writeMeta({ ...meta, localModifiedAt: Date.now() });
    }
  }, [habits, blocks, localJson]);

  const applyRemote = useCallback((row: RemoteRow) => {
    if (!userId) return;
    const data = normalizeRemote(row);
    writeMeta({ userId, syncedHash: hashString(serialize(data)), syncedAt: row.saved_at });
    prevJsonRef.current = serialize(data);
    setAllHabits(data.habits);
    setAllBlocks(data.planner);
    setLastSyncedAt(row.saved_at);
    setStatus('synced');
  }, [userId, setAllHabits, setAllBlocks]);

  const upload = useCallback(async () => {
    if (!supabase || !userId) return;
    const { data, json } = localRef.current;
    const savedAt = Date.now();
    setStatus('syncing');
    const { error } = await supabase.from('user_data').upsert({ user_id: userId, data, saved_at: savedAt });
    if (error) {
      setStatus(navigator.onLine ? 'error' : 'offline');
      return;
    }
    writeMeta({ ...readMeta(), userId, syncedHash: hashString(json), syncedAt: savedAt });
    setLastSyncedAt(savedAt);
    setStatus('synced');
  }, [supabase, userId]);

  const reconcile = useCallback((remote: RemoteRow | null) => {
    if (!userId) return;
    const meta = readMeta();
    const sameUser = meta.userId === userId;
    const local = localRef.current;
    const localChanged = !sameUser || hashString(local.json) !== meta.syncedHash;

    if (!remote) return void upload(); // first device for this account
    if (sameUser && remote.saved_at === meta.syncedAt) {
      // The cloud hasn't moved since we last synced
      if (localChanged) void upload();
      else setStatus('synced');
      return;
    }
    if (!localChanged) return applyRemote(remote);

    // Both sides changed
    const remoteData = normalizeRemote(remote);
    const isFirstSync = !sameUser || meta.syncedAt === undefined;
    if (isFirstSync) {
      const localEmpty = local.data.habits.length === 0 && local.data.planner.length === 0;
      if (localEmpty || serialize(remoteData) === local.json) return applyRemote(remote);
      setConflict({ ...remoteData, row: remote });
      setStatus('conflict');
      return;
    }
    if ((meta.localModifiedAt ?? 0) > remote.saved_at) void upload();
    else applyRemote(remote);
  }, [userId, upload, applyRemote]);

  const pull = useCallback(async () => {
    if (!supabase || !userId) return;
    const { data, error } = await supabase.from('user_data').select('data, saved_at').eq('user_id', userId).maybeSingle();
    if (error) {
      setStatus(navigator.onLine ? 'error' : 'offline');
      return;
    }
    reconcile(data as RemoteRow | null);
    readyRef.current = true;
  }, [supabase, userId, reconcile]);

  // Track the signed-in session (it persists, so each device only needs the password once)
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthChecked(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => subscription.unsubscribe();
  }, [supabase]);

  // On sign-in: download first, then listen for changes from other devices
  useEffect(() => {
    readyRef.current = false;
    if (!supabase || !userId) return;
    void Promise.resolve().then(pull); // async start; all state updates happen after the fetch

    const channel = supabase
      .channel(`user_data:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_data', filter: `user_id=eq.${userId}` }, (payload) => {
        const row = payload.new as RemoteRow | undefined;
        if (!row?.saved_at || row.saved_at === readMeta().syncedAt) return; // our own upload
        reconcile(row);
      })
      .subscribe();

    // Phones pause connections in the background, so re-check when the app comes back
    const recheck = () => {
      if (document.visibilityState === 'visible' && readyRef.current) void pull();
    };
    document.addEventListener('visibilitychange', recheck);
    window.addEventListener('online', recheck);
    return () => {
      void supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', recheck);
      window.removeEventListener('online', recheck);
    };
  }, [supabase, userId, pull, reconcile]);

  // Upload local edits shortly after they happen
  useEffect(() => {
    if (!userId || !readyRef.current || conflict) return;
    if (hashString(localJson) === readMeta().syncedHash) return;
    const timer = setTimeout(() => void upload(), UPLOAD_DELAY_MS);
    return () => clearTimeout(timer);
  }, [localJson, userId, conflict, upload]);

  const unlock = useCallback(async (password: string) => {
    if (!supabase) return 'Sync is not set up.';
    const { error } = await supabase.auth.signInWithPassword({ email: LOGIN_EMAIL, password });
    if (!error) return null;
    return /invalid/i.test(error.message) ? 'Wrong password.' : error.message;
  }, [supabase]);

  const lock = useCallback(async () => {
    await supabase?.auth.signOut();
  }, [supabase]);

  const resolveConflict = (keep: 'cloud' | 'device') => {
    if (!conflict) return;
    if (keep === 'cloud') applyRemote(conflict.row);
    else void upload();
    setConflict(null);
  };

  const effectiveStatus: SyncStatus = !isSyncConfigured ? 'disabled' : !userId ? 'signed-out' : status;

  const value = useMemo<SyncContextValue>(() => ({
    status: effectiveStatus,
    authChecked,
    lastSyncedAt,
    unlock,
    lock,
    syncNow: () => {
      setStatus('syncing');
      void pull();
    },
  }), [effectiveStatus, authChecked, lastSyncedAt, unlock, lock, pull]);

  return (
    <SyncContext.Provider value={value}>
      {children}

      <Modal isOpen={Boolean(conflict)} onClose={() => { /* a choice is required */ }}>
        {conflict && (
          <div className="bg-[#111318] border border-gray-800 rounded-2xl p-6 text-white space-y-4 shadow-2xl">
            <div>
              <h2 className="text-base font-bold">Which data should this device use?</h2>
              <p className="text-xs text-gray-400 mt-1">
                Your account already has data in the cloud, and this device has different data of its own.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => resolveConflict('cloud')}
                className="p-4 rounded-xl border border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 text-left transition"
              >
                <CloudDownload size={18} className="text-blue-400 mb-2" />
                <div className="text-sm font-bold">Use cloud data</div>
                <div className="text-[11px] text-gray-400 mt-0.5">
                  {conflict.habits.length} habits &amp; tasks, {conflict.planner.length} planned blocks
                </div>
              </button>
              <button
                type="button"
                onClick={() => resolveConflict('device')}
                className="p-4 rounded-xl border border-gray-700 bg-gray-900 hover:bg-gray-800 text-left transition"
              >
                <HardDrive size={18} className="text-gray-300 mb-2" />
                <div className="text-sm font-bold">Keep this device&apos;s data</div>
                <div className="text-[11px] text-gray-400 mt-0.5">
                  {habits.length} habits &amp; tasks, {blocks.length} planned blocks
                </div>
              </button>
            </div>
            <p className="text-[11px] text-gray-500">The other copy is replaced. Export a backup first if you&apos;re unsure.</p>
          </div>
        )}
      </Modal>
    </SyncContext.Provider>
  );
}

export function useSync() {
  const context = useContext(SyncContext);
  if (!context) throw new Error('useSync must be used within a SyncProvider');
  return context;
}
