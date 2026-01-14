import { createClient } from '@supabase/supabase-js';

// Helper to check environment variables
const getEnv = (key: string): string => {
  // @ts-ignore
  const val = (import.meta.env?.[key]) || (window.process?.env?.[key]) || '';
  return typeof val === 'string' ? val : '';
};


export const SUPABASE_URL = getEnv('VITE_SUPABASE_URL');
export const SUPABASE_ANON_KEY = getEnv('VITE_SUPABASE_ANON_KEY');

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn("Supabase credentials missing. Check environment variables.");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
