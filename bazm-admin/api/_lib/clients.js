import { createClient } from '@supabase/supabase-js';

const opts = { auth: { persistSession: false, autoRefreshToken: false } };

// full access, server only
export const admin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  opts
);

// acts as the logged-in user, so RLS and auth.uid() apply
export function userClient(token) {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    ...opts,
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}