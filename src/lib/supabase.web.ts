import { createClient } from '@supabase/supabase-js';

// Web preview: the browser already has localStorage, no expo-sqlite needed.
export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  {
    auth: {
      storage: typeof window === 'undefined' ? undefined : window.localStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);
