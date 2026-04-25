import type express from 'express'
import { supabase, supabaseAdmin } from '../supabaseClient.js'
import type { ClinicoAuthedRequest, ClinicoRole } from '../types/clinicoAuth.js'
import { writeAuditLog } from '../services/auditLog.js'
import { checkAccessAllowed, computeCounts, hashSessionKey, normalizePlanTier, type PlanLimits } from '../services/accessLimits.js'

export function requireClinicoAuth() {
  return async (req: ClinicoAuthedRequest, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing token' })
    }

    const token = authHeader.slice('Bearer '.length)

    const failOpen = process.env.ACCESS_LIMITS_FAIL_OPEN === 'true'

    const safeError = (err: unknown) => {
      if (err instanceof Error) return { name: err.name, message: err.message }
      return { message: String(err) }
    }

    const writeAuditLogBestEffort = async (args: Parameters<typeof writeAuditLog>[0]) => {
      try {
        await writeAuditLog(args)
      } catch (err) {
        console.error('writeAuditLog failed', err)
      }
    }

    try {
      const { data, error } = await supabase.auth.getUser(token)
      if (error || !data.user) {
        return res.status(401).json({ error: 'Unauthorized: Invalid token' })
      }

      const user = data.user

      const { data: userRow, error: userError } = await supabaseAdmin
        .from('usuarios')
        .select('papel, clinica_id, nome')
        .eq('id', user.id)
        .maybeSingle()

      const role = (userRow?.papel ?? 'unknown') as ClinicoRole
      const clinicaId = userRow?.clinica_id ?? null
      const nome = userRow?.nome ?? null

      req.clinico = {
        userId: user.id,
        email: user.email ?? null,
        nome,
        role,
        clinicaId,
      }

      if (userError) {
        return res.status(403).json({ error: 'Forbidden: User not registered in usuarios' })
      }

      if (clinicaId && (role === 'admin' || role === 'medico' || role === 'atendente')) {
        const sessionKey = hashSessionKey(token)
        const userAgent = String(req.header('user-agent') ?? '')
        const ip = String(req.header('x-forwarded-for') ?? req.socket.remoteAddress ?? '')

        try {
          const { error: upsertError } = await supabaseAdmin
            .from('clinica_sessions')
            .upsert(
              {
                clinica_id: clinicaId,
                user_id: user.id,
                papel: role,
                session_key: sessionKey,
                user_agent: userAgent || null,
                ip: ip || null,
                last_seen: new Date().toISOString(),
              },
              { onConflict: 'clinica_id,session_key' },
            )

          if (upsertError) throw upsertError
        } catch (err) {
          console.error('clinica_sessions upsert failed', err)
          await writeAuditLogBestEffort({
            clinica_id: clinicaId,
            actor_user_id: user.id,
            entity_type: 'access',
            entity_id: null,
            action: 'access.session.upsert.failed',
            metadata: { error: safeError(err) },
          })
        }

        try {
          const sinceIso = new Date(Date.now() - 10 * 60 * 1000).toISOString()
          const { data: sessions, error: sessionsError } = await supabaseAdmin
            .from('clinica_sessions')
            .select('papel,last_seen')
            .eq('clinica_id', clinicaId)
            .gte('last_seen', sinceIso)

          if (sessionsError) throw sessionsError

          const counts = computeCounts((sessions ?? []) as Array<{ papel: string }>)

          const { data: clinicRow, error: clinicError } = await supabaseAdmin
            .from('clinicas')
            .select('plano_assinatura')
            .eq('id', clinicaId)
            .maybeSingle()

          if (clinicError) throw clinicError

          const tier = normalizePlanTier(clinicRow?.plano_assinatura)
          const { data: planRow, error: planError } = await supabaseAdmin
            .from('subscription_plan_catalog')
            .select('tier,monthly_price_cents,max_concurrent_total,max_concurrent_admin,max_concurrent_atendente,max_concurrent_medico')
            .eq('tier', tier)
            .maybeSingle()

          if (planError) throw planError

          const plan: PlanLimits =
            (planRow as PlanLimits | null) ??
            (tier === 'bronze'
              ? {
                  tier,
                  monthly_price_cents: 34990,
                  max_concurrent_total: 3,
                  max_concurrent_admin: 1,
                  max_concurrent_atendente: 1,
                  max_concurrent_medico: 1,
                }
              : tier === 'prata'
                ? {
                    tier,
                    monthly_price_cents: 54990,
                    max_concurrent_total: 10,
                    max_concurrent_admin: null,
                    max_concurrent_atendente: null,
                    max_concurrent_medico: null,
                  }
                : {
                    tier,
                    monthly_price_cents: 74990,
                    max_concurrent_total: 50,
                    max_concurrent_admin: null,
                    max_concurrent_atendente: null,
                    max_concurrent_medico: null,
                  })

          const verdict = checkAccessAllowed({ role, plan, active: counts })
          if (!verdict.allowed) {
            await writeAuditLogBestEffort({
              clinica_id: clinicaId,
              actor_user_id: user.id,
              entity_type: 'access',
              entity_id: null,
              action: 'access.blocked',
              metadata: { plan: plan.tier, counts, reason: verdict.reason },
            })
            return res.status(403).json({ error: verdict.reason ?? 'Acesso bloqueado por limite do plano', code: 'ACCESS_LIMIT' })
          }
        } catch (err) {
          console.error('access limit check failed', err)
          await writeAuditLogBestEffort({
            clinica_id: clinicaId,
            actor_user_id: user.id,
            entity_type: 'access',
            entity_id: null,
            action: 'access.limit.check.failed',
            metadata: { error: safeError(err) },
          })

          if (!failOpen) {
            return res.status(503).json({ error: 'Access limit check unavailable', code: 'ACCESS_LIMIT_CHECK_FAILED' })
          }

          res.setHeader('X-Access-Limits', 'degraded')
        }
      }

      next()
    } catch (err) {
      console.error('requireClinicoAuth failed', err)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }
}

export function requireClinicoRole(allowed: Array<Exclude<ClinicoRole, 'unknown'>>) {
  return (req: ClinicoAuthedRequest, res: express.Response, next: express.NextFunction) => {
    const role = req.clinico?.role
    if (!role || role === 'unknown') {
      return res.status(403).json({ error: 'Forbidden: Missing role' })
    }
    if (!allowed.includes(role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient role' })
    }
    next()
  }
}
