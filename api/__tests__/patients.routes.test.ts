import express from 'express'
import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'

type AnyRecord = Record<string, unknown>

vi.mock('../middleware/requireClinicoAuth.js', () => {
  return {
    requireClinicoAuth: () => (req: AnyRecord, _res: unknown, next: () => void) => {
      const headers = (req as unknown as { headers?: Record<string, unknown> }).headers ?? {}
      const roleHeader = String(headers['x-test-role'] ?? 'medico')
      const role = roleHeader === 'atendente' || roleHeader === 'admin' || roleHeader === 'medico' ? roleHeader : 'medico'
      ;(req as AnyRecord & { clinico?: unknown }).clinico = {
        userId: 'u1',
        email: 'x@x.com',
        nome: 'X',
        role,
        clinicaId: 'c1',
      }
      next()
    },
    requireClinicoRole: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  }
})

vi.mock('../supabaseClient.js', () => {
  const store: { pacientes: AnyRecord[] } = { pacientes: [] }

  const from = (table: string) => {
    const state: {
      table: string
      insertRow: AnyRecord | null
      filters: Array<{ k: string; v: unknown }>
      updates: AnyRecord | null
      del: boolean
    } = { table, insertRow: null, filters: [], updates: null, del: false }

    const api: AnyRecord & {
      select: () => unknown
      eq: (k: string, v: unknown) => unknown
      maybeSingle: () => Promise<{ data: unknown; error: unknown }>
      single: () => Promise<{ data: unknown; error: unknown }>
      insert: (row: AnyRecord) => unknown
      update: (row: AnyRecord) => unknown
      delete: () => unknown
      order: () => unknown
      range: () => unknown
      or: () => unknown
      then: (resolve: (v: unknown) => void) => Promise<void>
      _execute: () => Promise<unknown>
    } = {
      select: () => api,
      eq: (k: string, v: unknown) => {
        state.filters.push({ k, v })
        return api
      },
      maybeSingle: async () => ({ data: null, error: null }),
      single: async () => {
        if (table === 'pacientes' && state.insertRow) {
          const row = {
            id: 'p1',
            ...state.insertRow,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
          store.pacientes.push(row)
          return { data: row, error: null }
        }
        if (table === 'pacientes') {
          const id = state.filters.find((f) => f.k === 'id')?.v
          const clinica = state.filters.find((f) => f.k === 'clinica_id')?.v
          const row = store.pacientes.find((p) => p.id === id && p.clinica_id === clinica)
          return row ? { data: row, error: null } : { data: null, error: { message: 'not_found' } }
        }
        return { data: null, error: null }
      },
      insert: (row: AnyRecord) => {
        state.insertRow = row
        return api
      },
      update: (row: AnyRecord) => {
        state.updates = row
        return api
      },
      delete: () => {
        state.del = true
        return api
      },
      order: () => api,
      range: () => api,
      or: () => api,
      async then(resolve: (v: unknown) => void) {
        resolve(await api._execute())
      },
      async _execute(): Promise<unknown> {
        if (table === 'pacientes' && state.insertRow) {
          const row = {
            id: 'p1',
            ...state.insertRow,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
          store.pacientes.push(row)
          return { data: row, error: null }
        }
        if (table === 'audit_logs' && state.insertRow) {
          return { data: state.insertRow, error: null }
        }
        if (table === 'pacientes' && state.updates) {
          const id = state.filters.find((f) => f.k === 'id')?.v
          const clinica = state.filters.find((f) => f.k === 'clinica_id')?.v
          const idx = store.pacientes.findIndex((p) => p.id === id && p.clinica_id === clinica)
          if (idx === -1) return { data: null, error: { message: 'not_found' } }
          store.pacientes[idx] = { ...store.pacientes[idx], ...state.updates }
          return { data: store.pacientes[idx], error: null }
        }
        if (table === 'pacientes' && state.del) {
          return { data: null, error: null }
        }
        return { data: [], error: null, count: 0 }
      },
    }

    return api
  }

  const supabaseAdmin: {
    from: typeof from
    storage: {
      from: (_bucket: string) => {
        createSignedUrl: (_path: string, _expiresIn: number) => Promise<{ data: { signedUrl: string }; error: null }>
        upload: (_path: string, _bytes: Uint8Array, _opts: AnyRecord) => Promise<{ data: AnyRecord; error: null }>
      }
    }
  } = {
    from,
    storage: {
      from: () => ({
        createSignedUrl: async () => ({ data: { signedUrl: 'https://signed' }, error: null }),
        upload: async () => ({ data: {}, error: null }),
      }),
    },
  }

  return { supabaseAdmin }
})

import patientsRouter from '../routes/patients.js'

describe('patients routes', () => {
  it('creates a patient when payload is valid', async () => {
    const app = express()
    app.use(express.json())
    app.use('/api/patients', patientsRouter)

    const res = await request(app)
      .post('/api/patients')
      .send({
        nome_completo: 'Fulano da Silva',
        idade: 30,
        sexo: 'Masculino',
        historico_breve_doencas: 'historico com mais de dez caracteres',
        queixa_principal: 'Dor de cabeça',
      })

    expect(res.status).toBe(201)
    expect(res.body.patient.nome_completo).toBe('Fulano da Silva')
  })

  it('limits record payload for atendente', async () => {
    const app = express()
    app.use(express.json())
    app.use('/api/patients', patientsRouter)

    const create = await request(app)
      .post('/api/patients')
      .set('x-test-role', 'medico')
      .send({
        nome_completo: 'Beltrano',
        idade: 22,
        sexo: 'Masculino',
        historico_breve_doencas: 'historico com mais de dez caracteres',
        queixa_principal: 'Dor',
        doencas: ['Asma'],
      })

    expect(create.status).toBe(201)
    const id = create.body.patient.id as string

    const res = await request(app).get(`/api/patients/${id}/record`).set('x-test-role', 'atendente')
    expect(res.status).toBe(200)
    expect(res.body.visibility.level).toBe('limited')
    expect(res.body.patient.historico_breve_doencas).toBeUndefined()
    expect(Array.isArray(res.body.patient.doencas)).toBe(true)
  })

  it('rejects invalid payload', async () => {
    const app = express()
    app.use(express.json())
    app.use('/api/patients', patientsRouter)

    const res = await request(app).post('/api/patients').send({ nome_completo: '' })
    expect(res.status).toBe(400)
  })

  it('blocks atendente from updating clinical narrative fields', async () => {
    const app = express()
    app.use(express.json())
    app.use('/api/patients', patientsRouter)

    const create = await request(app)
      .post('/api/patients')
      .set('x-test-role', 'medico')
      .send({
        nome_completo: 'Paciente X',
        idade: 40,
        sexo: 'Masculino',
        historico_breve_doencas: 'historico com mais de dez caracteres',
        queixa_principal: 'Dor',
      })

    expect(create.status).toBe(201)
    const id = create.body.patient.id as string

    const patch = await request(app)
      .patch(`/api/patients/${id}`)
      .set('x-test-role', 'atendente')
      .send({ historico_breve_doencas: 'novo historico com mais de dez caracteres' })

    expect(patch.status).toBe(403)
  })
})
