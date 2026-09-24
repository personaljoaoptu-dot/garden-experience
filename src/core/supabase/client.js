import { createClient } from '@supabase/supabase-js';
import { env, validateEnv } from '../config/env.js';

validateEnv();

// Initialize single Supabase client instance
// If credentials are empty strings, createClient is initialized safely without crashing,
// allowing graceful offline/mock fallback when environment variables are not set.
const supabaseUrl = env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});

export const isSupabaseConfigured = () => Boolean(env.SUPABASE_URL && env.SUPABASE_ANON_KEY);
