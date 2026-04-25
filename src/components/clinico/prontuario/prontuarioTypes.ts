export type PatientSexo = 'Masculino' | 'Feminino'

export type PatientRecordBase = {
  id: string
  nome_completo: string
  cpf: string | null
  data_nascimento: string
  sexo: PatientSexo | null
  convenio: string | null
  foto_url: string | null
  updated_at: string | null
}

export type PatientRecordLimited = PatientRecordBase & {
  alergias: unknown[]
  doencas: string[]
  medicamentos_em_uso: unknown[]
}

export type PatientRecordFull = PatientRecordBase & {
  email: string | null
  telefone: string | null
  endereco: unknown
  numero_carteirinha: string | null
  nome_mae: string | null
  alergias: unknown[]
  doencas: string[]
  medicamentos_em_uso: unknown[]
  remedios: Array<{ nome: string; dosagem: string; frequencia: string }>
  historico_breve_doencas: string | null
  queixa_principal: string | null
  futuras_anotacoes: string | null
}

export type RecordResponse =
  | { patient: PatientRecordLimited; visibility: { level: 'limited' } }
  | { patient: PatientRecordFull; visibility: { level: 'full' } }
