import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://opslebsdmwsnsyfmbynf.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_AateqAZXqTwmEsSwqweiPA_iGelY6O3';

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
