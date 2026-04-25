export type ClinicoRole = 'super_admin' | 'admin' | 'medico' | 'atendente' | 'unknown'

export type ClinicoAuthContext = {
  userId: string
  email: string | null
  nome: string | null
  role: ClinicoRole
  clinicaId: string | null
}

export type ClinicoAuthedRequest = import('express').Request & { clinico?: ClinicoAuthContext }
