export function maskCpf(cpf: string | null) {
  if (!cpf) return null
  const digits = cpf.replace(/\D/g, '')
  if (digits.length !== 11) return cpf
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

export function calcAge(dateIso: string) {
  const d = new Date(dateIso)
  const now = new Date()
  let age = now.getFullYear() - d.getFullYear()
  const m = now.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--
  return Math.max(0, age)
}

export function asStringArray(v: unknown) {
  if (!Array.isArray(v)) return []
  return v.map((x) => String(x)).filter(Boolean)
}

export type Remedio = { nome: string; dosagem: string; frequencia: string }

export function asRemedios(v: unknown): Remedio[] {
  if (!Array.isArray(v)) return []
  return v
    .map((r) => {
      const rr = (r ?? {}) as Record<string, unknown>
      return {
        nome: String(rr.nome ?? '').trim(),
        dosagem: String(rr.dosagem ?? '').trim(),
        frequencia: String(rr.frequencia ?? '').trim(),
      }
    })
    .filter((r) => r.nome && r.dosagem && r.frequencia)
}

