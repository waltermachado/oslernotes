import { describe, expect, it } from 'vitest'
import { allowedProntuarioTabs, prontuarioVisibilityLevel } from './prontuarioAccess'

describe('prontuario access', () => {
  it('atendente sees only ficha', () => {
    expect(allowedProntuarioTabs('atendente')).toEqual(['ficha'])
    expect(prontuarioVisibilityLevel('atendente')).toBe('limited')
  })

  it('medico sees all tabs', () => {
    expect(allowedProntuarioTabs('medico')).toContain('evolucoes')
    expect(prontuarioVisibilityLevel('medico')).toBe('full')
  })
})

