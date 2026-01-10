
import { createClient } from '@supabase/supabase-js';

/**
 * 🛠️ THE CAGE DATABASE REPAIR SCRIPT 🛠️
 * --------------------------------------------------
 * If you see "Column not found" or "Schema cache" errors:
 * 1. Go to your Supabase Dashboard > SQL Editor.
 * 2. Run this EXACT script:
 *
 * -- Ensure columns exist with EXACT names
 * ALTER TABLE members ADD COLUMN IF NOT EXISTS welcome_sent BOOLEAN DEFAULT FALSE;
 * ALTER TABLE members ADD COLUMN IF NOT EXISTS reminder_count INTEGER DEFAULT 0;
 *
 * -- Ensure logs have the required columns
 * ALTER TABLE logs ADD COLUMN IF NOT EXISTS old_value TEXT;
 * ALTER TABLE logs ADD COLUMN IF NOT EXISTS new_value TEXT;
 *
 * -- CRITICAL: Force the API to refresh its column list
 * NOTIFY pgrst, 'reload schema';
 */

export const PROJECT_ID = 'druhplxlcyaufqzqvaeu';
const SUPABASE_URL = `https://${PROJECT_ID}.supabase.co`;

// ⚠️ Ensure this is your actual "anon public" key from Supabase Settings > API
export const SUPABASE_ANON_KEY = 'sb_publishable_ODVFa_Lsdo1vkgtLOzPGLA_osK8_VAj';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
