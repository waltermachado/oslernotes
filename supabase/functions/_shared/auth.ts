import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

declare const Deno: { env: { get: (key: string) => string | undefined } }

export type ClinicoContext = {
  userId: string
  clinicaId: string
  role: 'super_admin' | 'admin' | 'medico' | 'atendente'
}

export function getEnv() {
  const url = Deno.env.get('SUPABASE_URL') ?? ''
  const anon = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  return { url, anon, service }
}

export function adminClient() {
  const { url, service } = getEnv()
  return createClient(url, service, { auth: { persistSession: false } })
}

export function authedClient(req: Request) {
  const { url, anon } = getEnv()
  const authorization = req.headers.get('authorization') ?? ''
  return createClient(url, anon, {
    auth: { persistSession: false },
    global: { headers: { Authorization: authorization } },
  })
}

export async function requireClinicoAuth(req: Request) {
  const sb = authedClient(req)
  const { data, error } = await sb.auth.getUser()
  if (error || !data?.user) return { ok: false as const, status: 401, error: 'Unauthorized' }

  const userId = data.user.id
  const admin = adminClient()
  const { data: row, error: rowErr } = await admin
    .from('usuarios')
    .select('clinica_id, papel')
    .eq('id', userId)
    .maybeSingle()

  if (rowErr || !row?.clinica_id || !row?.papel) return { ok: false as const, status: 403, error: 'Forbidden' }

  return {
    ok: true as const,
    ctx: { userId, clinicaId: row.clinica_id as string, role: row.papel as ClinicoContext['role'] },
  }
}

export function requireRole(ctx: ClinicoContext, roles: ClinicoContext['role'][]) {
  if (!roles.includes(ctx.role)) return { ok: false as const, status: 403, error: 'Forbidden' }
  return { ok: true as const }
}
