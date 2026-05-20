import React, { useState } from 'react'
import { Mail, ShieldCheck } from 'lucide-react'

import { cn } from '../../lib/utils'

export type ClinicDetailPlan = {
  tier: string
  monthly_price_cents: number
  max_concurrent_total: number
  max_concurrent_admin: number | null
  max_concurrent_atendente: number | null
  max_concurrent_medico: number | null
} | null

export default function ClinicDetailSummaryCards(props: {
  tier: string
  plan: ClinicDetailPlan
  planLabel: (value: string) => string
  usersCount: { admin: number; medico: number; atendente: number }
  activeSessions: { total: number; admin: number; medico: number; atendente: number } | null
  assignTier: 'bronze' | 'prata' | 'ouro'
  onAssignTierChange: (tier: 'bronze' | 'prata' | 'ouro') => void
  onAssignPlan: () => void
  onSendCredentials: (payload: { email: string; role: 'admin' | 'medico' | 'atendente'; full_name: string }) => void
}) {
  const [credEmail, setCredEmail] = useState('')
  const [credRole, setCredRole] = useState<'admin' | 'medico' | 'atendente'>('admin')
  const [credName, setCredName] = useState('')
  const [credStatus, setCredStatus] = useState('')

  async function send() {
    setCredStatus('')
    try {
      await props.onSendCredentials({ email: credEmail, role: credRole, full_name: credName })
      setCredStatus('Credencial criada. Oriente o usuário a resetar a senha no primeiro acesso.')
      setCredEmail('')
      setCredName('')
    } catch (e) {
      setCredStatus(e instanceof Error ? e.message : 'Falha ao enviar credencial')
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="bg-surface border border-cream-300 rounded-2xl p-6">
        <div className="text-sm text-ink-500">Contas</div>
        <div className="mt-3 space-y-2">
          <div className="text-sm text-ink-700">Admins: {props.usersCount.admin}</div>
          <div className="text-sm text-ink-700">Médicos: {props.usersCount.medico}</div>
          <div className="text-sm text-ink-700">Atendentes: {props.usersCount.atendente}</div>
        </div>
      </div>

      <div className="bg-surface border border-cream-300 rounded-2xl p-6">
        <div className="text-sm text-ink-500">Plano & Limites</div>
        <div className="mt-3 space-y-2">
          <div className="text-sm text-ink-700">Plano atual: {props.planLabel(props.tier)}</div>
          {props.plan ? (
            <div className="text-xs text-ink-500">
              Limite total: {props.plan.max_concurrent_total}
              {props.plan.max_concurrent_admin != null ? ` | Admin: ${props.plan.max_concurrent_admin}` : ''}
              {props.plan.max_concurrent_medico != null ? ` | Médico: ${props.plan.max_concurrent_medico}` : ''}
              {props.plan.max_concurrent_atendente != null ? ` | Atendente: ${props.plan.max_concurrent_atendente}` : ''}
            </div>
          ) : (
            <div className="text-xs text-ink-500">Sem catálogo aplicado</div>
          )}
        </div>
        <div className="mt-4 flex items-center gap-2">
          <select
            value={props.assignTier}
            onChange={(e) => props.onAssignTierChange(e.target.value as any)}
            className="bg-sunken border border-cream-300 rounded-xl px-3 py-2 text-sm text-ink-700"
          >
            <option value="bronze">Bronze</option>
            <option value="prata">Prata</option>
            <option value="ouro">Ouro</option>
          </select>
          <button
            onClick={props.onAssignPlan}
            className="bg-navy-500 hover:bg-navy-600 text-ink-900 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            Aplicar
          </button>
        </div>
        {props.activeSessions && props.plan && (
          <div className="mt-3 text-xs text-ink-500">
            Acessos ativos: {props.activeSessions.total}/{props.plan.max_concurrent_total}
          </div>
        )}
      </div>

      <div className="bg-surface border border-cream-300 rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div className="text-sm text-ink-500">Credenciais</div>
          <ShieldCheck className="w-4 h-4 text-ink-500" />
        </div>
        <div className="mt-3 space-y-2">
          <div className="text-xs text-ink-500">Cria conta e envia credencial para o responsável.</div>
          <div className="grid grid-cols-1 gap-2">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-500" />
              <input
                value={credEmail}
                onChange={(e) => setCredEmail(e.target.value)}
                placeholder="E-mail"
                className="w-full bg-sunken border border-cream-300 rounded-xl pl-9 pr-4 py-2 text-sm text-ink-700"
              />
            </div>
            <input
              value={credName}
              onChange={(e) => setCredName(e.target.value)}
              placeholder="Nome (opcional)"
              className="w-full bg-sunken border border-cream-300 rounded-xl px-4 py-2 text-sm text-ink-700"
            />
            <select
              value={credRole}
              onChange={(e) => setCredRole(e.target.value as any)}
              className="bg-sunken border border-cream-300 rounded-xl px-4 py-2 text-sm text-ink-700"
            >
              <option value="admin">Admin da clínica</option>
              <option value="atendente">Atendente</option>
              <option value="medico">Médico</option>
            </select>
            <button
              onClick={() => void send()}
              className="bg-cream-200 hover:bg-gray-700 text-ink-900 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              Enviar credencial
            </button>
            {credStatus && (
              <div className={cn('text-xs', credStatus.toLowerCase().includes('falha') ? 'text-red-400' : 'text-ink-500')}>
                {credStatus}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

