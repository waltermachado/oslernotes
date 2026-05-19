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

// ------------------------------------------------------------------
// Clinical records — prontuarios, receitas, exames, atestados
// ------------------------------------------------------------------

export type MedicoRef = {
  id: string
  nome: string
}

/**
 * Maps to the `prontuarios` table.
 * Primary fields: anamnese, diagnostico, observacoes.
 * `texto` is kept as a computed alias (anamnese) for backward-compatible
 * display helpers that referenced the old `evolucoes.texto` field.
 */
export type Evolucao = {
  id: string
  anamnese: string | null
  diagnostico: string | null
  observacoes: string | null
  /** Backward-compat alias: resolves to anamnese ?? '' for display */
  texto?: string
  atendimento_id: string | null
  templates_utilizados?: unknown[] | null
  created_at: string
  updated_at: string | null
  medico: MedicoRef | null
}

export type Medicamento = {
  nome: string
  dosagem: string
  frequencia: string
  quantidade?: string
  instrucoes?: string
}

/**
 * Maps to the `receitas` table.
 * Real columns: tipo, medicamentos (jsonb), instrucoes, status.
 */
export type ReceitaStatus = 'rascunho' | 'emitida' | 'cancelada'

export type Receita = {
  id: string
  tipo: string | null
  medicamentos: Medicamento[]
  instrucoes: string | null
  status: ReceitaStatus | null
  /** Legacy alias for instrucoes — kept for backward compat */
  observacoes?: string | null
  atendimento_id: string | null
  created_at: string
  medico: MedicoRef | null
}

/**
 * Maps to the `exames` table.
 * Real columns: tipo, descricao, arquivo_url, resultado,
 *   data_solicitacao, data_resultado, urgente (added), status (added).
 */
export type ExameStatus = 'solicitado' | 'coletado' | 'resultado_disponivel' | 'finalizado'

export type PedidoExame = {
  id: string
  tipo: string | null
  descricao: string | null
  urgente: boolean
  resultado: string | null
  arquivo_url: string | null
  data_solicitacao: string | null
  data_resultado: string | null
  status: ExameStatus
  atendimento_id: string | null
  created_at: string
  medico: MedicoRef | null
}

/** Keep legacy alias so existing imports of PedidoExameStatus still compile */
export type PedidoExameStatus = ExameStatus

/**
 * Maps to the `atestados` table.
 * Real columns: dias_afastamento, cid, data_retorno, observacoes, texto (added).
 * `texto` is nullable (added via migration); frontend falls back to `observacoes`.
 */
export type Atestado = {
  id: string
  texto: string | null
  observacoes: string | null
  cid: string | null
  dias_afastamento: number
  data_retorno: string | null
  atendimento_id: string | null
  created_at: string
  medico: MedicoRef | null
}
