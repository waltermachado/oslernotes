import { createClient } from '@supabase/supabase-js';

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

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

const supabaseUrl = normalizeSupabaseUrl(rawSupabaseUrl);

if (rawSupabaseUrl && supabaseUrl && rawSupabaseUrl !== supabaseUrl) {
  console.warn(
    `[OslerNotes] Ajustando VITE_SUPABASE_URL (removendo path): "${rawSupabaseUrl}" -> "${supabaseUrl}"`
  );
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[OslerNotes] ATENÇÃO: Variáveis de ambiente do Supabase não encontradas.\n' +
    'Verifique se VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY estão configuradas\n' +
    'no Cloudflare Pages (Settings > Environment variables) ou no arquivo .env local.'
  );
}

export const supabase = createClient(
  supabaseUrl ?? '',
  supabaseAnonKey ?? ''
);
