import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const rawSupabaseUrl =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const normalizeSupabaseUrl = (value?: string) => {
  if (!value) return value;
  const trimmed = value.trim();

  try {
    const url = new URL(trimmed);
    return url.origin;
  } catch {
    return trimmed
      .replace(/\/(rest|auth|functions)\/v1\/?$/i, '')
      .replace(/\/+$/, '');
  }
};

const supabaseUrl = normalizeSupabaseUrl(rawSupabaseUrl) || '';

if (rawSupabaseUrl && supabaseUrl && rawSupabaseUrl !== supabaseUrl) {
  console.warn(
    `[OslerNotes] Ajustando SUPABASE_URL (removendo path): "${rawSupabaseUrl}" -> "${supabaseUrl}"`
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
