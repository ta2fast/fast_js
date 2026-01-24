import { createClient } from '@supabase/supabase-js';

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Fallback values (for development/static build only)
const DEFAULT_URL = 'https://xhynygijwclnagawvqkm.supabase.co';
const DEFAULT_KEY = 'sb_publishable_ss8KWJHkueBVE2p7DNp3CA_0IWthm7n';

// Validation function for URL
const isValidUrl = (url: string | undefined): boolean => {
    if (!url) return false;
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
};

const finalUrl = isValidUrl(supabaseUrl) ? supabaseUrl! : DEFAULT_URL;
const finalKey = supabaseAnonKey || DEFAULT_KEY;

if (!finalUrl.startsWith('http')) {
    console.warn('Supabase URL is invalid, using fallback. This may fail in production if environment variables are missing.');
}

export const supabase = createClient(finalUrl, finalKey);
