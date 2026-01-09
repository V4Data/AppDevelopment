
import { createClient } from '@supabase/supabase-js';

/**
 * 🚀 DATABASE SETUP INSTRUCTIONS:
 * 1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/druhplxlcyaufqzqvaeu
 * 2. Click "SQL Editor" in the left sidebar.
 * 3. Click "New Query" and paste the following SQL then click "Run":
 *
 * CREATE TABLE members (
 *   id TEXT PRIMARY KEY,
 *   full_name TEXT NOT NULL,
 *   phone_number TEXT NOT NULL,
 *   email TEXT,
 *   membership_type TEXT,
 *   service_category TEXT,
 *   package_id TEXT,
 *   joining_date TIMESTAMPTZ,
 *   expiry_date TIMESTAMPTZ,
 *   total_paid NUMERIC,
 *   total_fee NUMERIC,
 *   updated_at TIMESTAMPTZ DEFAULT NOW()
 * );
 *
 * CREATE TABLE logs (
 *   id TEXT PRIMARY KEY,
 *   user_phone TEXT,
 *   user_name TEXT,
 *   action TEXT,
 *   details TEXT,
 *   timestamp TIMESTAMPTZ DEFAULT NOW()
 * );
 *
 * 4. Go to Settings -> API and find your "anon public" key.
 * 5. Paste it in SUPABASE_ANON_KEY below.
 */

export const PROJECT_ID = 'druhplxlcyaufqzqvaeu';
const SUPABASE_URL = `https://${PROJECT_ID}.supabase.co`;

// IMPORTANT: Replace this with your actual VERY LONG "anon public" JWT key
const SUPABASE_ANON_KEY = 'sb_publishable_ODVFa_Lsdo1vkgtLOzPGLA_osK8_VAj';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
