import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
/** The single account this personal app signs in to; only the password is ever asked for. */
export const LOGIN_EMAIL = process.env.NEXT_PUBLIC_SUPABASE_LOGIN_EMAIL ?? '';

/** Sync (and the password screen) only switch on once all three settings are present (see README). */
export const isSyncConfigured = Boolean(url && anonKey && LOGIN_EMAIL);

let client: SupabaseClient | null = null;

/** The browser's Supabase client, or null when sync isn't configured. */
export function getSupabase(): SupabaseClient | null {
  if (!isSyncConfigured || typeof window === 'undefined') return null;
  client ??= createClient(url!, anonKey!);
  return client;
}
