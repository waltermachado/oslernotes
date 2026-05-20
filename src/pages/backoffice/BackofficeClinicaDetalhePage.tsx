import React, { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'

import { useAuth } from '../../context/AuthContext'
import ClinicDetailAuditTable from '../../components/backoffice/ClinicDetailAuditTable'
import ClinicDetailHeader from '../../components/backoffice/ClinicDetailHeader'
import ClinicDetailPaymentsTable from '../../components/backoffice/ClinicDetailPaymentsTable'
import ClinicDetailSummaryCards, { type ClinicDetailPlan } from '../../components/backoffice/ClinicDetailSummaryCards'
import ClinicDetailUsersTable from '../../components/backoffice/ClinicDetailUsersTable'
import { apiFetch } from '../../lib/apiFetch'

type Clinic = {
  id: string
  nome: string
  cnpj: string
  email: string
  telefone: string | null
  nome_responsavel: string
  plano_assinatura: string
  ativa: boolean
  created_at: string
}

type UserRow = {
  id: string
  nome: string
  email: string
  papel: 'admin' | 'medico' | 'atendente' | 'super_admin'
  ativo: boolean
  created_at: string
}

type InvoiceRow = {
  id: string
  status: string
  amount_cents: number | null
  currency: string
  created_at: string
}

type AuditRow = {
  id: string
  action: string
  entity_type: string
  created_at: string
}

export default function BackofficeClinicaDetalhePage() {
  const { clinicId } = useParams()
  const { session } = useAuth()
  const token = session?.access_token

  const [clinic, setClinic] = useState<Clinic | null>(null)
  const [plan, setPlan] = useState<ClinicDetailPlan>(null)
  const [users, setUsers] = useState<UserRow[]>([])
  const [invoices, setInvoices] = useState<InvoiceRow[]>([])
  const [audit, setAudit] = useState<AuditRow[]>([])
  const [activeSessions, setActiveSessions] = useState<{ total: number; admin: number; medico: number; atendente: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [assignTier, setAssignTier] = useState<'bronze' | 'prata' | 'ouro'>('bronze')

  const usersByRole = useMemo(() => {
    return {
      admin: users.filter((u) => u.papel === 'admin'),
      medico: users.filter((u) => u.papel === 'medico'),
      atendente: users.filter((u) => u.papel === 'atendente'),
    }
  }, [users])

  const planLabel = useMemo(() => {
    return (value: string) => {
      if (value === 'prata' || value === 'silver') return 'Prata'
      if (value === 'ouro' || value === 'gold' || value === 'platinum') return 'Ouro'
      return 'Bronze'
    }
  }, [])

  async function load() {
    if (!clinicId || !token) return
    setLoading(true)
    setError('')
    try {
      const res = await apiFetch(`/api/admin/clinics/${clinicId}`, { headers: { Authorization: `Bearer ${token}` } })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Falha ao carregar clínica')
      setClinic(body.clinic)
      setPlan(body.plan)
      setUsers(body.users ?? [])
      setInvoices(body.invoices ?? [])
      setAudit(body.audit_logs ?? [])
      setActiveSessions(body.active_sessions ?? null)
      const currentTier = String(body.clinic?.plano_assinatura ?? 'bronze')
      setAssignTier(currentTier === 'prata' || currentTier === 'silver' ? 'prata' : currentTier === 'ouro' || currentTier === 'gold' || currentTier === 'platinum' ? 'ouro' : 'bronze')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicId, token])

  async function assignPlan() {
    if (!clinicId || !token) return
    const res = await apiFetch(`/api/admin/clinics/${clinicId}/assign-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ tier: assignTier }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(body.error || 'Falha ao alterar plano')
      return
    }
    await load()
  }

  const [credEmail, setCredEmail] = useState('')
  void credEmail

  if (loading) {
    return (
      <div className="bg-surface border border-cream-300 rounded-2xl p-8">
        <div className="w-8 h-8 border-4 border-brand-blue/30 border-t-brand-blue rounded-full animate-spin" />
      </div>
    )
  }

  if (!clinic) {
    return (
      <div className="bg-surface border border-cream-300 rounded-2xl p-8">
        <div className="text-ink-700">Clínica não encontrada.</div>
        {error && <div className="text-sm text-red-400 mt-2">{error}</div>}
      </div>
    )
  }

  const tier = String(clinic.plano_assinatura || 'bronze')

  return (
    <div className="space-y-6">
      <ClinicDetailHeader
        clinicId={clinic.id}
        nome={clinic.nome}
        cnpj={clinic.cnpj}
        ativa={clinic.ativa}
        planoAssinatura={clinic.plano_assinatura}
        planLabel={planLabel}
      />

      {error && <div className="bg-rose-50 border border-rose-100 text-rose-400 text-sm p-4 rounded-xl">{error}</div>}

      <ClinicDetailSummaryCards
        tier={tier}
        plan={plan}
        planLabel={planLabel}
        usersCount={{ admin: usersByRole.admin.length, medico: usersByRole.medico.length, atendente: usersByRole.atendente.length }}
        activeSessions={activeSessions}
        assignTier={assignTier}
        onAssignTierChange={setAssignTier}
        onAssignPlan={() => void assignPlan()}
        onSendCredentials={async ({ email, role, full_name }) => {
          if (!clinicId || !token) throw new Error('Sem sessão')
          const res = await apiFetch(`/api/admin/clinics/${clinicId}/send-credentials`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ email, role, full_name }),
          })
          const body = await res.json().catch(() => ({}))
          if (!res.ok) throw new Error(body.error || 'Falha ao enviar credencial')
          await load()
        }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ClinicDetailUsersTable users={users} />
        <ClinicDetailPaymentsTable invoices={invoices} />
      </div>

      <ClinicDetailAuditTable audit={audit} />
    </div>
  )
}
