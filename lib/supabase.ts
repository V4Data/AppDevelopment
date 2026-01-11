
import { createClient } from '@supabase/supabase-js';

/**
 * 🛠️ THE CAGE DATABASE REPAIR SCRIPT 🛠️
 * --------------------------------------------------
 * If you see "Column not found" or "Schema cache" errors, 
 * or if Master Admin cannot remove devices:
 * 
 * 1. Go to your Supabase Dashboard > SQL Editor.
 * 2. Run this EXACT script:
 *
 * -- 1. Members Table Updates
 * ALTER TABLE members ADD COLUMN IF NOT EXISTS welcome_sent BOOLEAN DEFAULT FALSE;
 * ALTER TABLE members ADD COLUMN IF NOT EXISTS reminder_count INTEGER DEFAULT 0;
 *
 * -- 2. Logs Table Updates
 * ALTER TABLE logs ADD COLUMN IF NOT EXISTS old_value TEXT;
 * ALTER TABLE logs ADD COLUMN IF NOT EXISTS new_value TEXT;
 *
 * -- 3. Authorized Devices Table (Includes requested IP column)
 * CREATE TABLE IF NOT EXISTS authorized_devices (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   user_phone TEXT UNIQUE NOT NULL,
 *   device_id TEXT NOT NULL,
 *   ip_address TEXT,
 *   created_at TIMESTAMPTZ DEFAULT now()
 * );
 *
 * -- 4. RLS FIX (Ensures Master Admin can delete any session)
 * -- This allows the "Remove Device" feature to work correctly.
 * ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Enable delete for all users" ON sessions FOR DELETE USING (true);
 * CREATE POLICY "Enable insert for all users" ON sessions FOR INSERT WITH CHECK (true);
 * CREATE POLICY "Enable select for all users" ON sessions FOR SELECT USING (true);
 * CREATE POLICY "Enable update for all users" ON sessions FOR UPDATE USING (true) WITH CHECK (true);
 *
 * -- CRITICAL: Force the API to refresh its column list
 * NOTIFY pgrst, 'reload schema';
 */

export const PROJECT_ID = 'druhplxlcyaufqzqvaeu';
const SUPABASE_URL = `https://${PROJECT_ID}.supabase.co`;

// ⚠️ Ensure this is your actual "anon public" key from Supabase Settings > API
export const SUPABASE_ANON_KEY = 'sb_publishable_ODVFa_Lsdo1vkgtLOzPGLA_osK8_VAj';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
