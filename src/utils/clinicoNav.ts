import {
  CalendarDays,
  LayoutDashboard,
  Users,
  NotebookPen,
  ListOrdered,
  FileText,
  Wallet,
  Settings,
} from 'lucide-react'

import type { ComponentType } from 'react'

export type ClinicoRole = 'admin' | 'medico' | 'atendente' | 'unknown'

export type ClinicSummary = {
  id: string
  nome: string
  ativa: boolean
}

export type ClinicoNavItem = {
  key: string
  label: string
  to: string
  icon: ComponentType<{ className?: string }>
  roles: Array<Exclude<ClinicoRole, 'unknown'>>
}

export const CLINICO_NAV: ClinicoNavItem[] = [
  {
    key: 'painel',
    label: 'Painel',
    to: '/clinico/painel',
    icon: LayoutDashboard,
    roles: ['admin', 'medico', 'atendente'],
  },
  {
    key: 'agenda',
    label: 'Agenda',
    to: '/clinico/agenda',
    icon: CalendarDays,
    roles: ['admin', 'medico', 'atendente'],
  },
  {
    key: 'fila',
    label: 'Fila',
    to: '/clinico/fila',
    icon: ListOrdered,
    roles: ['admin', 'medico', 'atendente'],
  },
  {
    key: 'pacientes',
    label: 'Pacientes',
    to: '/clinico/pacientes',
    icon: Users,
    roles: ['admin', 'medico', 'atendente'],
  },
  {
    key: 'prontuarios',
    label: 'Prontuários',
    to: '/clinico/prontuarios',
    icon: NotebookPen,
    roles: ['admin', 'medico', 'atendente'],
  },
  {
    key: 'exames',
    label: 'Exames',
    to: '/clinico/exames',
    icon: FileText,
    roles: ['admin', 'medico'],
  },
  {
    key: 'financeiro',
    label: 'Financeiro',
    to: '/clinico/financeiro',
    icon: Wallet,
    roles: ['admin'],
  },
  {
    key: 'configuracoes',
    label: 'Configurações',
    to: '/clinico/configuracoes',
    icon: Settings,
    roles: ['admin'],
  },
]

export function navForRole(role: ClinicoRole, basePath = '/clinico') {
  if (role === 'unknown') return []
  return CLINICO_NAV.filter((i) => i.roles.includes(role)).map((i) => ({
    ...i,
    to: i.to.replace(/^\/clinico/, basePath),
  }))
}
