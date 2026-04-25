import { describe, expect, it } from 'vitest'

import { validatePasswordPair } from './ResetPassword'

describe('ResetPassword validatePasswordPair', () => {
  it('requires password', () => {
    expect(validatePasswordPair('', '')).toBe('Informe a nova senha.')
  })

  it('requires matching confirmation', () => {
    expect(validatePasswordPair('abc', 'def')).toBe('A confirmação não confere.')
  })

  it('accepts matching pair', () => {
    expect(validatePasswordPair('NovaSenha123', 'NovaSenha123')).toBe('')
  })
})

