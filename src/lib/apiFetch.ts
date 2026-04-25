const devFallbackOrigin = 'http://127.0.0.1:3010'

function normalizePath(path: string) {
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  return path.startsWith('/') ? path : `/${path}`
}

function resolveUrl(path: string) {
  const normalized = normalizePath(path)
  const base = String(import.meta.env.VITE_API_BASE_URL ?? '').trim()
  if (!base) return normalized
  if (normalized.startsWith('http://') || normalized.startsWith('https://')) return normalized
  const cleanedBase = base.endsWith('/') ? base.slice(0, -1) : base
  return `${cleanedBase}${normalized}`
}

export async function apiFetch(path: string, init?: RequestInit) {
  const normalized = normalizePath(path)
  const primary = resolveUrl(normalized)

  try {
    return await fetch(primary, init)
  } catch (err) {
    const hasExplicitBase = String(import.meta.env.VITE_API_BASE_URL ?? '').trim().length > 0
    const canFallback =
      import.meta.env.DEV &&
      !hasExplicitBase &&
      typeof window !== 'undefined' &&
      window.location.hostname === 'localhost' &&
      window.location.port === '4000' &&
      normalized.startsWith('/api/')

    if (!canFallback) throw err

    return await fetch(new URL(normalized, devFallbackOrigin).toString(), init)
  }
}
