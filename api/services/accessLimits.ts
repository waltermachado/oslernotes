import crypto from 'crypto'

export type PlanTier = 'bronze' | 'prata' | 'ouro'

export type ClinicoRole = 'admin' | 'medico' | 'atendente'

export type ActiveSessionCounts = {
  total: number
  admin: number
  medico: number
  atendente: number
}

export type PlanLimits = {
  tier: PlanTier
  monthly_price_cents: number
  max_concurrent_total: number
  max_concurrent_admin: number | null
  max_concurrent_atendente: number | null
  max_concurrent_medico: number | null
}

export function hashSessionKey(accessToken: string) {
  return crypto.createHash('sha256').update(accessToken).digest('hex')
}

export function normalizePlanTier(value: unknown): PlanTier {
  if (value === 'bronze') return 'bronze'
  if (value === 'prata' || value === 'silver') return 'prata'
  if (value === 'ouro' || value === 'gold' || value === 'platinum') return 'ouro'
  return 'bronze'
}

export function computeCounts(rows: Array<{ papel: string }>) : ActiveSessionCounts {
  const counts: ActiveSessionCounts = { total: 0, admin: 0, medico: 0, atendente: 0 }
  for (const r of rows) {
    counts.total += 1
    if (r.papel === 'admin') counts.admin += 1
    if (r.papel === 'medico') counts.medico += 1
    if (r.papel === 'atendente') counts.atendente += 1
  }
  return counts
}

export function checkAccessAllowed(args: {
  role: ClinicoRole
  plan: PlanLimits
  active: ActiveSessionCounts
}): { allowed: boolean; reason?: string } {
  const { plan, active } = args

  if (active.total > plan.max_concurrent_total) {
    return { allowed: false, reason: 'Limite total de acessos simultâneos atingido' }
  }

  if (plan.tier === 'bronze') {
    if (plan.max_concurrent_admin != null && active.admin > plan.max_concurrent_admin) {
      return { allowed: false, reason: 'Limite de acessos simultâneos (Admin da clínica) atingido' }
    }
    if (plan.max_concurrent_atendente != null && active.atendente > plan.max_concurrent_atendente) {
      return { allowed: false, reason: 'Limite de acessos simultâneos (Atendente) atingido' }
    }
    if (plan.max_concurrent_medico != null && active.medico > plan.max_concurrent_medico) {
      return { allowed: false, reason: 'Limite de acessos simultâneos (Médico) atingido' }
    }

  }

  return { allowed: true }
}
