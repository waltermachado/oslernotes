declare const Deno: { env: { get: (key: string) => string | undefined } }

export function getAllowedOrigin(req: Request) {
  const envOrigin = (Deno.env.get('CORS_ORIGIN') ?? '').trim()
  const publicUrl = (Deno.env.get('PUBLIC_APP_URL') ?? '').trim()
  const origin = req.headers.get('origin') ?? ''

  const allowed = new Set<string>([envOrigin, publicUrl].filter(Boolean))
  if (!origin) return allowed.values().next().value ?? '*'
  if (allowed.has(origin)) return origin
  return allowed.size ? '' : '*'
}

export function corsHeaders(req: Request) {
  const origin = getAllowedOrigin(req)
  const headers: Record<string, string> = {
    'access-control-allow-methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
    'access-control-allow-headers': 'authorization,content-type,x-client-info,apikey',
    'access-control-max-age': '86400',
  }
  if (origin) headers['access-control-allow-origin'] = origin
  return headers
}

export function corsResponse(req: Request, body: BodyInit | null, init?: ResponseInit) {
  const headers = new Headers(init?.headers)
  const cors = corsHeaders(req)
  for (const [k, v] of Object.entries(cors)) headers.set(k, v)
  return new Response(body, { ...init, headers })
}
