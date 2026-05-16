import { describe, expect, it } from 'vitest'

import { validatePasswordPair } from './ResetPassword'

describe('ResetPassword validatePasswordPair', () => {
  it('requires password', () => {
    expect(validatePasswordPair('', '')).toBe('Informe a nova senha.')
  })

  it('requires minimum length', () => {
    expect(validatePasswordPair('abc', 'abc')).toBe('A senha deve ter no mínimo 10 caracteres.')
  })

  it('requires matching confirmation', () => {
    expect(validatePasswordPair('NovaSenha123', 'NovaSenha456')).toBe('A confirmação não confere.')
  })

  it('accepts matching pair', () => {
    expect(validatePasswordPair('NovaSenha123', 'NovaSenha123')).toBe('')
  })
})

