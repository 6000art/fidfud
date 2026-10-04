/**
 * Supabase Client Integration for Fidfud
 * Configured with lazy-initialization and clean environment checks to avoid workspace crashes.
 */

import { createClient } from '@supabase/supabase-js';

// Accessing public Vite-prefixed environment variables safely
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

// Fallback checking helper
export const isSupabaseConfigured = () => {
  return !!supabaseUrl && !!supabaseAnonKey;
};

// Create client with lazy initialization or mock fallback if not yet configured
let supabaseInstance: any = null;

export const getSupabase = () => {
  if (!isSupabaseConfigured()) {
    const isDev = Boolean(import.meta.env?.DEV || import.meta.env?.MODE === 'development');
    if (isDev) {
      console.warn(
        '⚠️ Supabase parameters are missing! Fidfud is operating with high-fidelity local Express session sync instead.\n' +
        'To connect your live Supabase database and Auth, add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your settings.'
      );
    }
    return null;
  }

  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
    } catch (err) {
      console.warn('[Supabase] Failed to initialize client, continuing without live Supabase:', err);
      return null;
    }
  }
  return supabaseInstance;
};

export default getSupabase;
