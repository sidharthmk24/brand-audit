import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ============================================================
// Supabase Admin Client (Service Role) — Lazy Singleton
// ============================================================
// Uses the service role key for server-side operations.
// This client bypasses RLS and should NEVER be exposed to the browser.
// Safe to use inside Route Handlers and after() callbacks.
//
// Lazy initialization prevents build-time crashes when env vars
// aren't available (e.g. during `next build` page data collection).

let _client: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (_client) return _client;

  let url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY'
    );
  }

  // Strip trailing slash if the user accidentally included it (prevents PGRST125 errors)
  url = url.replace(/\/$/, '');

  _client = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _client;
}
