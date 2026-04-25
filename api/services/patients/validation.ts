export type PatientSexo = 'Masculino' | 'Feminino'

export type PatientRemedio = {
  nome: string
  dosagem: string
  frequencia: string
}

export type CreatePatientInput = {
  nome_completo: string
  idade: number
  sexo: PatientSexo
  sexualidade?: string
  historico_breve_doencas: string
  queixa_principal: string
  doencas?: string[]
  remedios?: PatientRemedio[]
  futuras_anotacoes?: string
  cpf?: string
  telefone?: string
  email?: string
  endereco?: unknown
  convenio?: string
  numero_carteirinha?: string
  nome_mae?: string
}

export type ValidationError = { field: string; message: string }

export function estimateBirthDateFromAge(idade: number) {
  const now = new Date()
  const birth = new Date(Date.UTC(now.getUTCFullYear() - idade, now.getUTCMonth(), now.getUTCDate()))
  return birth.toISOString().slice(0, 10)
}

export function normalizeCpf(input: string) {
  return input.replace(/\D/g, '')
}

export function validateCreatePatient(body: unknown): { ok: true; data: CreatePatientInput } | { ok: false; errors: ValidationError[] } {
  const errors: ValidationError[] = []

  const b = (body ?? {}) as Record<string, unknown>

  const nome = String(b.nome_completo ?? '').trim()
  if (!nome) errors.push({ field: 'nome_completo', message: 'Nome completo é obrigatório' })
  if (nome.length > 150) errors.push({ field: 'nome_completo', message: 'Máximo de 150 caracteres' })

  const idade = Number(b.idade)
  if (!Number.isInteger(idade)) errors.push({ field: 'idade', message: 'Idade deve ser número inteiro' })
  if (Number.isInteger(idade) && (idade < 0 || idade > 115)) errors.push({ field: 'idade', message: 'Idade deve estar entre 0 e 115' })

  const sexoRaw = b.sexo
  if (sexoRaw !== 'Masculino' && sexoRaw !== 'Feminino') errors.push({ field: 'sexo', message: 'Sexo inválido' })

  const historico = String(b.historico_breve_doencas ?? '').trim()
  if (!historico) errors.push({ field: 'historico_breve_doencas', message: 'Histórico breve é obrigatório' })
  if (historico && historico.length < 10) errors.push({ field: 'historico_breve_doencas', message: 'Mínimo de 10 caracteres' })

  const queixa = String(b.queixa_principal ?? '').trim()
  if (!queixa) errors.push({ field: 'queixa_principal', message: 'Queixa principal é obrigatória' })

  const sexualidade = b.sexualidade != null ? String(b.sexualidade).trim() : undefined
  if (sexualidade && sexualidade.length > 120) errors.push({ field: 'sexualidade', message: 'Máximo de 120 caracteres' })

  let cpf: string | undefined
  if (b.cpf) {
    cpf = normalizeCpf(String(b.cpf))
    if (cpf.length !== 11) errors.push({ field: 'cpf', message: 'CPF deve ter 11 dígitos' })
  }

  const telefone = b.telefone != null ? String(b.telefone).trim() : undefined
  const email = b.email != null ? String(b.email).trim() : undefined

  const doencasRaw = b.doencas
  const doencas = Array.isArray(doencasRaw) ? doencasRaw.map((d) => String(d).trim()).filter(Boolean) : undefined

  const remediosRaw = b.remedios
  const remedios = Array.isArray(remediosRaw)
    ? remediosRaw
        .map((r) => {
          const rr = (r ?? {}) as Record<string, unknown>
          return {
            nome: String(rr.nome ?? '').trim(),
            dosagem: String(rr.dosagem ?? '').trim(),
            frequencia: String(rr.frequencia ?? '').trim(),
          }
        })
        .filter((r) => r.nome && r.dosagem && r.frequencia)
    : undefined

  const futuras = b.futuras_anotacoes != null ? String(b.futuras_anotacoes).trim() : undefined

  if (errors.length) return { ok: false, errors }

  const sexo = sexoRaw as PatientSexo

  return {
    ok: true,
    data: {
      nome_completo: nome,
      idade,
      sexo,
      sexualidade,
      historico_breve_doencas: historico,
      queixa_principal: queixa,
      doencas,
      remedios,
      futuras_anotacoes: futuras,
      cpf,
      telefone,
      email,
      endereco: b.endereco,
      convenio: b.convenio != null ? String(b.convenio).trim() : undefined,
      numero_carteirinha: b.numero_carteirinha != null ? String(b.numero_carteirinha).trim() : undefined,
      nome_mae: b.nome_mae != null ? String(b.nome_mae).trim() : undefined,
    },
  }
}

export function buildHistoricoComQueixa(historico: string, queixa: string) {
  const raw = historico.trim()
  const base = raw.replace(/\n\n?Queixa principal:[\s\S]*$/i, '').trim()
  const q = queixa.trim()
  if (!base) return `Queixa principal: ${q}`
  return `${base}\n\nQueixa principal: ${q}`
}
