import express from 'express'
import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'

type AnyRecord = Record<string, unknown>

vi.mock('../middleware/requireClinicoAuth.js', () => {
  return {
    requireClinicoAuth: () => (req: AnyRecord, _res: unknown, next: () => void) => {
      ;(req as AnyRecord & { clinico?: unknown }).clinico = {
        userId: 'u_med',
        email: 'm@x.com',
        nome: 'Med',
        role: 'medico',
        clinicaId: 'c1',
      }
      next()
    },
    requireClinicoRole: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  }
})

vi.mock('../supabaseClient.js', () => {
  const from = () => {
    const api: AnyRecord & {
      insert: (row: AnyRecord) => unknown
      update: (row: AnyRecord) => unknown
      eq: () => unknown
      is: () => unknown
      in: () => unknown
      select: () => unknown
      single: () => Promise<{ data: AnyRecord; error: null }>
      maybeSingle: () => Promise<{ data: AnyRecord | null; error: null }>
    } = {
      insert: () => api,
      update: () => api,
      eq: () => api,
      is: () => api,
      in: () => api,
      select: () => api,
      single: async () => ({ data: { id: 'a1', paciente_id: 'p1', medico_id: 'u_med', status: 'aguardando' }, error: null }),
      maybeSingle: async () => ({ data: { id: 'a1', paciente_id: 'p1', medico_id: 'u_med', status: 'aguardando' }, error: null }),
      then: async (resolve: (v: unknown) => void) => resolve({ data: { id: 'a1', paciente_id: 'p1', medico_id: 'u_med', status: 'aguardando' }, error: null }),
    }
    return api
  }

  return { supabaseAdmin: { from } }
})

import queueRouter from '../routes/queue.js'

describe('queue audit', () => {
  it('accept endpoint responds ok', async () => {
    const app = express()
    app.use(express.json())
    app.use('/api/queue', queueRouter)

    const res = await request(app).post('/api/queue/a1/accept').send({})
    expect([200, 409]).toContain(res.status)
  })
})
