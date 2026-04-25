import type { ClinicoRole } from './clinicoNav'

export type ProntuarioTabKey = 'ficha' | 'evolucoes' | 'receitas' | 'exames' | 'atestados'

export function allowedProntuarioTabs(role: ClinicoRole): ProntuarioTabKey[] {
  if (role === 'medico') return ['ficha', 'evolucoes', 'receitas', 'exames', 'atestados']
  if (role === 'admin') return ['ficha', 'evolucoes', 'receitas', 'exames', 'atestados']
  if (role === 'atendente') return ['ficha']
  return []
}

export function prontuarioVisibilityLevel(role: ClinicoRole) {
  if (role === 'atendente') return 'limited' as const
  if (role === 'medico' || role === 'admin') return 'full' as const
  return 'none' as const
}

