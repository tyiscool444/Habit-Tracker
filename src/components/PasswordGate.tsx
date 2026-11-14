'use client';

import { useState } from 'react';
import { Lock } from 'lucide-react';
import { useSync } from '../context/SyncContext';

/**
 * When cloud sync is set up, the app stays behind a password until this device is unlocked.
 * Without sync configured it's a local-only app and renders straight through.
 */
export function PasswordGate({ children }: { children: React.ReactNode }) {
  const { status, authChecked, unlock } = useSync();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (status === 'disabled') return <>{children}</>;
  if (!authChecked) return <div className="min-h-screen bg-[#07080a]" />;
  if (status !== 'signed-out') return <>{children}</>;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setBusy(true);
    setError(null);
    const message = await unlock(password);
    setBusy(false);
    if (message) setError(message);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#07080a] p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-5 text-center">
        <div className="space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
            <Lock size={20} />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Habit<span className="text-blue-500">That</span>
          </h1>
        </div>

        <input
          type="password"
          autoFocus
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          aria-label="Password"
          className="w-full bg-[#12141c] border border-gray-700 focus:border-blue-500 rounded-xl px-4 py-3 text-white text-center placeholder-gray-600 focus:outline-none"
        />
        {error && <p className="text-xs text-red-400 -mt-2">{error}</p>}

        <button
          type="submit"
          disabled={busy || !password}
          className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-bold transition active:scale-[0.98]"
        >
          {busy ? 'Unlocking…' : 'Unlock'}
        </button>
      </form>
    </div>
  );
}
