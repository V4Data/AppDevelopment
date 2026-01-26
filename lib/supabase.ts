
import { createClient } from '@supabase/supabase-js';

// Pull from Environment Variables with robust fallbacks
// @ts-ignore
const rawUrl = import.meta.env?.VITE_SUPABASE_URL;
// @ts-ignore
const rawKey = import.meta.env?.VITE_SUPABASE_ANON_KEY;

export const SUPABASE_URL = (rawUrl && rawUrl.trim() !== '') ? rawUrl : 'https://druhplxlcyaufqzqvaeu.supabase.co';
export const SUPABASE_ANON_KEY = (rawKey && rawKey.trim() !== '') ? rawKey : 'sb_publishable_ODVFa_Lsdo1vkgtLOzPGLA_osK8_VAj';

if (!SUPABASE_URL || SUPABASE_URL === 'undefined') {
  console.error("Supabase URL is missing. Check your environment variables.");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
