import { createClient } from '@supabase/supabase-js';

const env = (import.meta as any).env || {};
const url = env.VITE_SUPABASE_URL as string;
const anon = env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anon) {
  console.error(
    '[Onboarding] Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY on the Render static site env vars, then redeploy.'
  );
}

export const supabase = createClient(url, anon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
