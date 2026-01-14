import { createClient } from '@supabase/supabase-js';

const getEnv = (key: string): string => {
  // @ts-ignore
  const val = (import.meta.env?.[key]) || (window.process?.env?.[key]) || '';
  return typeof val === 'string' ? val : '';
};

// Use provided project credentials as defaults
export const SUPABASE_URL = getEnv('VITE_SUPABASE_URL') || 'https://druhplxlcyaufqzqvaeu.supabase.co';
export const SUPABASE_ANON_KEY = getEnv('VITE_SUPABASE_ANON_KEY') || 'sb_publishable_ODVFa_Lsdo1vkgtLOzPGLA_osK8_VAj';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
