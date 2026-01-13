
import { createClient } from '@supabase/supabase-js';

// Pull from Vercel Environment Variables
// @ts-ignore
export const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL || '';
// @ts-ignore
export const SUPABASE_ANON_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn("Supabase credentials missing from environment variables.");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
