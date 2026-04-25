import { describe, expect, it } from 'vitest'

import { navForRole } from './clinicoNav'

describe('navForRole', () => {
  it('returns empty array for unknown', () => {
    expect(navForRole('unknown')).toEqual([])
  })

  it('includes agenda for all roles', () => {
    const admin = navForRole('admin').some((i) => i.key === 'agenda')
    const medico = navForRole('medico').some((i) => i.key === 'agenda')
    const atendente = navForRole('atendente').some((i) => i.key === 'agenda')
    expect(admin).toBe(true)
    expect(medico).toBe(true)
    expect(atendente).toBe(true)
  })

  it('restricts financeiro and configuracoes to admin', () => {
    const admin = navForRole('admin')
    const medico = navForRole('medico')
    const atendente = navForRole('atendente')

    expect(admin.some((i) => i.key === 'financeiro')).toBe(true)
    expect(admin.some((i) => i.key === 'configuracoes')).toBe(true)

    expect(medico.some((i) => i.key === 'financeiro')).toBe(false)
    expect(medico.some((i) => i.key === 'configuracoes')).toBe(false)

    expect(atendente.some((i) => i.key === 'financeiro')).toBe(false)
    expect(atendente.some((i) => i.key === 'configuracoes')).toBe(false)
  })
})

