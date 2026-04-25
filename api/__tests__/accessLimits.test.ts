import { describe, expect, it } from 'vitest'

import { checkAccessAllowed, normalizePlanTier, type PlanLimits } from '../services/accessLimits.js'

describe('accessLimits', () => {
  it('normalizes plan tiers', () => {
    expect(normalizePlanTier('bronze')).toBe('bronze')
    expect(normalizePlanTier('silver')).toBe('prata')
    expect(normalizePlanTier('prata')).toBe('prata')
    expect(normalizePlanTier('gold')).toBe('ouro')
    expect(normalizePlanTier('platinum')).toBe('ouro')
    expect(normalizePlanTier('ouro')).toBe('ouro')
    expect(normalizePlanTier('unknown')).toBe('bronze')
  })

  it('allows within bronze role limits', () => {
    const plan: PlanLimits = {
      tier: 'bronze',
      monthly_price_cents: 34990,
      max_concurrent_total: 3,
      max_concurrent_admin: 1,
      max_concurrent_atendente: 1,
      max_concurrent_medico: 1,
    }

    expect(checkAccessAllowed({ role: 'admin', plan, active: { total: 1, admin: 1, medico: 0, atendente: 0 } }).allowed).toBe(true)
    expect(checkAccessAllowed({ role: 'medico', plan, active: { total: 2, admin: 1, medico: 1, atendente: 0 } }).allowed).toBe(true)
    expect(checkAccessAllowed({ role: 'atendente', plan, active: { total: 3, admin: 1, medico: 1, atendente: 1 } }).allowed).toBe(true)
  })

  it('blocks when exceeding bronze total limit', () => {
    const plan: PlanLimits = {
      tier: 'bronze',
      monthly_price_cents: 34990,
      max_concurrent_total: 3,
      max_concurrent_admin: 1,
      max_concurrent_atendente: 1,
      max_concurrent_medico: 1,
    }

    const verdict = checkAccessAllowed({ role: 'admin', plan, active: { total: 4, admin: 2, medico: 1, atendente: 1 } })
    expect(verdict.allowed).toBe(false)
    expect(verdict.reason).toMatch(/total/i)
  })

  it('blocks when exceeding bronze per-role limit', () => {
    const plan: PlanLimits = {
      tier: 'bronze',
      monthly_price_cents: 34990,
      max_concurrent_total: 3,
      max_concurrent_admin: 1,
      max_concurrent_atendente: 1,
      max_concurrent_medico: 1,
    }

    const verdict = checkAccessAllowed({ role: 'admin', plan, active: { total: 2, admin: 2, medico: 0, atendente: 0 } })
    expect(verdict.allowed).toBe(false)
    expect(verdict.reason).toMatch(/admin/i)
  })

  it('allows within prata/ouro total limit', () => {
    const prata: PlanLimits = {
      tier: 'prata',
      monthly_price_cents: 54990,
      max_concurrent_total: 10,
      max_concurrent_admin: null,
      max_concurrent_atendente: null,
      max_concurrent_medico: null,
    }
    expect(checkAccessAllowed({ role: 'admin', plan: prata, active: { total: 10, admin: 2, medico: 4, atendente: 4 } }).allowed).toBe(true)
    expect(checkAccessAllowed({ role: 'admin', plan: prata, active: { total: 11, admin: 2, medico: 4, atendente: 5 } }).allowed).toBe(false)

    const ouro: PlanLimits = { ...prata, tier: 'ouro', monthly_price_cents: 74990, max_concurrent_total: 50 }
    expect(checkAccessAllowed({ role: 'medico', plan: ouro, active: { total: 50, admin: 10, medico: 20, atendente: 20 } }).allowed).toBe(true)
    expect(checkAccessAllowed({ role: 'medico', plan: ouro, active: { total: 51, admin: 10, medico: 20, atendente: 21 } }).allowed).toBe(false)
  })
})

