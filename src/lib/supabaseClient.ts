// ==============================
// Supabase Client
// ==============================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xhynygijwclnagawvqkm.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_ss8KWJHkueBVE2p7DNp3CA_0IWthm7n';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);