import express from 'express'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

type TokenRow = {
  id: string
  user_id: string
  email: string
  token_hash: string
  expires_at: string
  used_at: string | null
}

vi.mock('../services/mailer.js', () => {
  return {
    sendMail: vi.fn(async () => void 0),
  }
})

vi.mock('../supabaseClient.js', () => {
  const usuarios = new Map<string, { id: string; email: string; ativo: boolean }>()
  const rateLimit = new Map<string, { id: string; key: string; count: number; window_start: string }>()
  const tokens = new Map<string, TokenRow>()
  const audits: any[] = []

  const reset = () => {
    usuarios.clear()
    rateLimit.clear()
    tokens.clear()
    audits.length = 0
    usuarios.set('a@b.com', { id: 'u1', email: 'a@b.com', ativo: true })
  }

  const supabase = {
    auth: {
      signInWithPassword: async () => ({ data: { session: null }, error: null }),
    },
  }

  const supabaseAdmin: any = {
    auth: {
      admin: {
        updateUserById: async () => ({ data: null, error: null }),
      },
    },
    from: (table: string) => {
      if (table === 'usuarios') {
        let eqEmail = ''
        const api: any = {
          select: () => api,
          eq: (_col: string, value: string) => {
            eqEmail = value
            return api
          },
          maybeSingle: async () => {
            const found = usuarios.get(eqEmail)
            return { data: found ?? null, error: null }
          },
        }
        return api
      }

      if (table === 'password_reset_rate_limit') {
        let eqKey = ''
        const api: any = {
          select: () => api,
          eq: (_col: string, value: string) => {
            eqKey = value
            return api
          },
          maybeSingle: async () => ({ data: rateLimit.get(eqKey) ?? null, error: null }),
          upsert: async (row: any) => {
            const prev = rateLimit.get(row.key)
            rateLimit.set(row.key, { id: prev?.id ?? 'rl1', key: row.key, count: row.count, window_start: row.window_start })
            return { data: null, error: null }
          },
        }
        return api
      }

      if (table === 'password_reset_tokens') {
        let eqTokenHash = ''
        let eqId = ''
        const api: any = {
          select: () => api,
          eq: (_col: string, value: string) => {
            if (_col === 'token_hash') eqTokenHash = value
            if (_col === 'id') eqId = value
            return api
          },
          maybeSingle: async () => {
            const found = tokens.get(eqTokenHash)
            return { data: found ?? null, error: null }
          },
          insert: async (row: any) => {
            const id = `t_${tokens.size + 1}`
            tokens.set(String(row.token_hash), {
              id,
              user_id: String(row.user_id),
              email: String(row.email),
              token_hash: String(row.token_hash),
              expires_at: String(row.expires_at),
              used_at: null,
            })
            return { data: null, error: null }
          },
          update: (row: any) => {
            const chain: any = {
              eq: async (_col: string, value: string) => {
                if (_col === 'id') eqId = value
                for (const [k, v] of tokens.entries()) {
                  if (v.id === eqId) {
                    tokens.set(k, { ...v, used_at: row.used_at ?? v.used_at })
                  }
                }
                return { data: null, error: null }
              },
            }
            return chain
          },
        }
        return api
      }

      if (table === 'password_reset_audit') {
        const api: any = {
          insert: async (row: any) => {
            audits.push(row)
            return { data: null, error: null }
          },
        }
        return api
      }

      return { select: () => ({}) }
    },
    __reset: reset,
    __state: { usuarios, rateLimit, tokens, audits },
  }

  reset()

  return { supabase, supabaseAdmin }
})

import authRoutes from '../routes/auth.js'
import { sendMail } from '../services/mailer.js'
import { supabaseAdmin } from '../supabaseClient.js'

function makeApp() {
  const app = express()
  app.use(express.json())
  app.use('/api/auth', authRoutes)
  return app
}

describe('password reset flow', () => {
  beforeEach(() => {
    process.env.PUBLIC_APP_URL = 'http://localhost:4000'
    process.env.PASSWORD_RESET_MAX_ATTEMPTS = '2'
    process.env.PASSWORD_RESET_WINDOW_SECONDS = '900'
    process.env.PASSWORD_RESET_TTL_MINUTES = '60'
    process.env.MAIL_FROM = 'no-reply@oslernotes.local'
    process.env.SMTP_HOST = 'smtp.test'
    process.env.SMTP_PORT = '587'
    process.env.SMTP_USER = 'u'
    process.env.SMTP_PASS = 'p'
    ;(sendMail as any).mockClear()
    ;(supabaseAdmin as any).__reset()
  })

  it('validates email', async () => {
    const app = makeApp()
    const res = await request(app).post('/api/auth/forgot-password').send({ email: 'bad' })
    expect(res.status).toBe(400)
  })

  it('returns neutral response for unknown email', async () => {
    const app = makeApp()
    const res = await request(app).post('/api/auth/forgot-password').send({ email: 'missing@x.com' })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(sendMail).not.toHaveBeenCalled()
  })

  it('sends email for existing user', async () => {
    const app = makeApp()
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .set('x-forwarded-for', '1.2.3.4')
      .send({ email: 'a@b.com' })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(sendMail).toHaveBeenCalledTimes(1)
  })

  it('rate limits repeated requests', async () => {
    const app = makeApp()
    const send = () =>
      request(app)
        .post('/api/auth/forgot-password')
        .set('x-forwarded-for', '1.2.3.4')
        .send({ email: 'a@b.com' })

    const r1 = await send()
    const r2 = await send()
    const r3 = await send()

    expect(r1.status).toBe(200)
    expect(r2.status).toBe(200)
    expect(r3.status).toBe(429)
    expect(r3.body.ok).toBe(true)
  })

  it('validates token and resets password', async () => {
    const app = makeApp()
    const r = await request(app)
      .post('/api/auth/forgot-password')
      .set('x-forwarded-for', '1.2.3.4')
      .send({ email: 'a@b.com' })
    expect(r.status).toBe(200)

    const sentHtml = (sendMail as any).mock.calls[0][0].html as string
    const match = sentHtml.match(/token=([^"&]+)/)
    expect(match).toBeTruthy()
    const token = decodeURIComponent(String(match?.[1]))

    const v = await request(app).get(`/api/auth/reset-password/validate?token=${encodeURIComponent(token)}`)
    expect(v.status).toBe(200)
    expect(v.body.ok).toBe(true)

    const weak = await request(app).post('/api/auth/reset-password').send({ token, password: 'abc' })
    expect(weak.status).toBe(400)

    const ok = await request(app).post('/api/auth/reset-password').send({ token, password: 'NovaSenha123' })
    expect(ok.status).toBe(200)
    expect(ok.body.ok).toBe(true)

    const used = await request(app).post('/api/auth/reset-password').send({ token, password: 'OutraSenha123' })
    expect(used.status).toBe(400)
    expect(used.body.code).toBe('TOKEN_USED')
  })
})
