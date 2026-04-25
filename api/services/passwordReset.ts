import crypto from 'crypto'

export type PasswordResetRateLimitConfig = {
  maxAttempts: number
  windowSeconds: number
}

export function normalizeEmail(input: unknown) {
  return String(input ?? '').trim().toLowerCase()
}

export function isValidEmail(email: string) {
  if (!email) return false
  if (email.length > 254) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function hashToken(token: string) {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex')
}

export function createRawToken() {
  return crypto.randomBytes(32).toString('base64url')
}

export function createRateLimitKey(params: { email: string; ip: string }) {
  const base = `${params.email}|${params.ip}`
  return crypto.createHash('sha256').update(base, 'utf8').digest('hex')
}

export function readClientIp(value: unknown) {
  const raw = String(value ?? '').trim()
  if (!raw) return 'unknown'
  const first = raw.split(',')[0]?.trim()
  return first || 'unknown'
}

export function validatePassword(password: string) {
  const p = String(password ?? '')
  if (p.length < 10) return { ok: false as const, code: 'WEAK_PASSWORD', message: 'A senha deve ter pelo menos 10 caracteres.' }
  if (p.length > 72) return { ok: false as const, code: 'WEAK_PASSWORD', message: 'A senha deve ter no máximo 72 caracteres.' }
  if (!/[a-z]/.test(p) || !/[A-Z]/.test(p) || !/\d/.test(p)) {
    return { ok: false as const, code: 'WEAK_PASSWORD', message: 'Use letras maiúsculas, minúsculas e números.' }
  }
  return { ok: true as const }
}

export function buildResetUrl(params: { appUrl: string; token: string }) {
  const u = new URL('/reset-password', params.appUrl)
  u.searchParams.set('token', params.token)
  return u.toString()
}
