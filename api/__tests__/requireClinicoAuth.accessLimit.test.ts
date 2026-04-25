import express from 'express'
import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../services/auditLog.js', () => {
  return { writeAuditLog: async () => void 0 }
})

vi.mock('../supabaseClient.js', () => {
  let clinicaSessionsUpsertError: any = null
  let clinicaSessionsSelectError: any = null
  let clinicasMaybeSingleError: any = null
  let planMaybeSingleError: any = null

  const setErrors = (args: {
    upsert?: any
    sessions?: any
    clinicas?: any
    plan?: any
  }) => {
    if ('upsert' in args) clinicaSessionsUpsertError = args.upsert
    if ('sessions' in args) clinicaSessionsSelectError = args.sessions
    if ('clinicas' in args) clinicasMaybeSingleError = args.clinicas
    if ('plan' in args) planMaybeSingleError = args.plan
  }

  const resetErrors = () => {
    clinicaSessionsUpsertError = null
    clinicaSessionsSelectError = null
    clinicasMaybeSingleError = null
    planMaybeSingleError = null
  }

  const supabase = {
    auth: {
      getUser: async () => ({ data: { user: { id: 'u1', email: 'a@b.com' } }, error: null }),
    },
  }

  const supabaseAdmin = {
    from: (table: string) => {
      if (table === 'usuarios') {
        const api: any = {
          select: () => api,
          eq: () => api,
          maybeSingle: async () => ({ data: { papel: 'admin', clinica_id: 'c1', nome: 'Admin' }, error: null }),
        }
        return api
      }

      if (table === 'clinica_sessions') {
        const api: any = {
          upsert: async () => ({ data: null, error: clinicaSessionsUpsertError }),
          select: () => api,
          eq: () => api,
          gte: async () => ({
            data: [
              { papel: 'admin', last_seen: new Date().toISOString() },
              { papel: 'admin', last_seen: new Date().toISOString() },
              { papel: 'medico', last_seen: new Date().toISOString() },
              { papel: 'atendente', last_seen: new Date().toISOString() },
            ],
            error: clinicaSessionsSelectError,
          }),
        }
        return api
      }

      if (table === 'clinicas') {
        const api: any = {
          select: () => api,
          eq: () => api,
          maybeSingle: async () => ({ data: { plano_assinatura: 'bronze' }, error: clinicasMaybeSingleError }),
        }
        return api
      }

      if (table === 'subscription_plan_catalog') {
        const api: any = {
          select: () => api,
          eq: () => api,
          maybeSingle: async () => ({
            data: {
              tier: 'bronze',
              monthly_price_cents: 34990,
              max_concurrent_total: 3,
              max_concurrent_admin: 1,
              max_concurrent_atendente: 1,
              max_concurrent_medico: 1,
            },
            error: planMaybeSingleError,
          }),
        }
        return api
      }

      return { select: () => ({}) }
    },
  }

  return { supabase, supabaseAdmin, __setErrors: setErrors, __resetErrors: resetErrors }
})

import { requireClinicoAuth } from '../middleware/requireClinicoAuth.js'

const supabaseClientMock: any = await import('../supabaseClient.js')

describe('requireClinicoAuth access limit', () => {
  const prevFailOpen = process.env.ACCESS_LIMITS_FAIL_OPEN
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    process.env.ACCESS_LIMITS_FAIL_OPEN = prevFailOpen
    supabaseClientMock.__resetErrors()
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => void 0)
  })

  afterEach(() => {
    consoleErrorSpy?.mockRestore()
  })

  it('blocks when concurrent limit exceeded', async () => {
    const app = express()
    app.get('/t', requireClinicoAuth(), (_req, res) => res.status(200).json({ ok: true }))

    const res = await request(app).get('/t').set('Authorization', 'Bearer token')
    expect(res.status).toBe(403)
    expect(res.body.code).toBe('ACCESS_LIMIT')
  })

  it('returns 503 when access limit check fails (fail-closed)', async () => {
    supabaseClientMock.__setErrors({ sessions: { message: 'db down' } })

    const app = express()
    app.get('/t', requireClinicoAuth(), (_req, res) => res.status(200).json({ ok: true }))

    const res = await request(app).get('/t').set('Authorization', 'Bearer token')
    expect(res.status).toBe(503)
    expect(res.body.code).toBe('ACCESS_LIMIT_CHECK_FAILED')
  })

  it('allows request and marks header when access limit check fails (fail-open)', async () => {
    process.env.ACCESS_LIMITS_FAIL_OPEN = 'true'
    supabaseClientMock.__setErrors({ sessions: { message: 'db down' } })

    const app = express()
    app.get('/t', requireClinicoAuth(), (_req, res) => res.status(200).json({ ok: true }))

    const res = await request(app).get('/t').set('Authorization', 'Bearer token')
    expect(res.status).toBe(200)
    expect(res.headers['x-access-limits']).toBe('degraded')
  })

  it('still enforces limits when session upsert fails', async () => {
    supabaseClientMock.__setErrors({ upsert: { message: 'upsert failed' } })

    const app = express()
    app.get('/t', requireClinicoAuth(), (_req, res) => res.status(200).json({ ok: true }))

    const res = await request(app).get('/t').set('Authorization', 'Bearer token')
    expect(res.status).toBe(403)
    expect(res.body.code).toBe('ACCESS_LIMIT')
  })
})
