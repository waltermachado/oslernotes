import express from 'express'
import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../services/auditLog.js', () => {
  return { writeAuditLog: async () => void 0 }
})

vi.mock('../supabaseClient.js', () => {
  const supabase = {
    auth: {
      getUser: async (_token: string) => ({ data: { user: { id: 'u1', email: 'super@oslernotes.com' } }, error: null }),
    },
  }

  const supabaseAdmin = {
    from: (table: string) => {
      if (table === 'usuarios') {
        const api: any = {
          select: () => api,
          eq: () => api,
          single: async () => ({ data: { papel: 'super_admin' }, error: null }),
        }
        return api
      }
      return { select: () => ({}) }
    },
    auth: {
      admin: {
        inviteUserByEmail: async () => ({ data: null, error: { message: 'should not be called' } }),
      },
    },
  }

  return { supabase, supabaseAdmin }
})

import adminRoutes from '../routes/admin.js'

describe('POST /api/admin/clinics validation', () => {
  it('returns 400 when CNPJ is invalid', async () => {
    const app = express()
    app.use(express.json())
    app.use('/api/admin', adminRoutes)

    const res = await request(app)
      .post('/api/admin/clinics')
      .set('Authorization', 'Bearer token')
      .send({
        nome: 'Clinica Teste',
        cnpj: '12.345.678/0001-0',
        nome_responsavel: 'Responsável',
        email: 'admin@clinica.com',
      })

    expect(res.status).toBe(400)
    expect(String(res.body?.error ?? '')).toContain('CNPJ')
  })
})

