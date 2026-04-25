import { describe, expect, it } from 'vitest'
import { buildHistoricoComQueixa, validateCreatePatient } from '../services/patients/validation.js'

describe('patients validation', () => {
  it('validates required fields and bounds', () => {
    const result = validateCreatePatient({})
    expect('errors' in result).toBe(true)
  })

  it('rejects idade out of range', () => {
    const result = validateCreatePatient({
      nome_completo: 'Teste',
      idade: 200,
      sexo: 'Masculino',
      historico_breve_doencas: 'abcdefghij',
      queixa_principal: 'Dor',
    })
    expect('errors' in result).toBe(true)
  })

  it('builds historico with queixa', () => {
    const h = buildHistoricoComQueixa('Hist', 'Queixa')
    expect(h).toContain('Queixa principal: Queixa')
  })
})

