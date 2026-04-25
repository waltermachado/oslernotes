import { describe, expect, it } from 'vitest'

import { formatMaskedMoney, formatSignedPercent } from './clinicoDashboard'

describe('clinicoDashboard utils', () => {
  it('formats signed percent', () => {
    expect(formatSignedPercent(8)).toBe('+8%')
    expect(formatSignedPercent(-2)).toBe('-2%')
  })

  it('masks money unless reveal', () => {
    expect(formatMaskedMoney(1000, false)).toBe('R$ *****')
    expect(formatMaskedMoney(1000, true)).toContain('R$')
  })
})

