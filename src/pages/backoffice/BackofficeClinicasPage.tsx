import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Plus, Search } from 'lucide-react'

import AddClinicModal from '../../components/AddClinicModal'
import { useAuth } from '../../context/AuthContext'
import { cn } from '../../lib/utils'

type ClinicListItem = {
  id: string
  nome: string
  cnpj: string
  nome_responsavel: string
  email: string
  telefone?: string | null
  ativa: boolean
  plano_assinatura: string
  plan_tier?: string
  limits?: {
    tier: string
    monthly_price_cents: number
    max_concurrent_total: number
    max_concurrent_admin: number | null
    max_concurrent_atendente: number | null
    max_concurrent_medico: number | null
  } | null
  users?: { total: number; admin: number; medico: number; atendente: number }
  active_sessions?: { total: number; admin: number; medico: number; atendente: number }
  created_at: string
}

export default function BackofficeClinicasPage() {
  const { session } = useAuth()
  const token = session?.access_token
  const navigate = useNavigate()

  const [q, setQ] = useState('')
  const [status, setStatus] = useState<'all' | 'ativa' | 'inativa'>('all')
  const [plan, setPlan] = useState<'all' | 'bronze' | 'prata' | 'ouro'>('all')

  const [clinics, setClinics] = useState<ClinicListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)

  async function fetchClinics() {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const url = new URL('/api/admin/clinics', window.location.origin)
      if (q.trim()) url.searchParams.set('q', q.trim())
      if (status !== 'all') url.searchParams.set('status', status)
      if (plan !== 'all') url.searchParams.set('plan', plan)

      const res = await fetch(url.pathname + url.search, { headers: { Authorization: `Bearer ${token}` } })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Falha ao buscar clínicas')
      setClinics(body)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao buscar clínicas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchClinics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const planLabel = useMemo(() => {
    return (value: string) => {
      if (value === 'prata' || value === 'silver') return 'Prata'
      if (value === 'ouro' || value === 'gold' || value === 'platinum') return 'Ouro'
      return 'Bronze'
    }
  }, [])

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold mb-1">Clínicas</h2>
          <p className="text-gray-400 text-sm">Gerencie clínicas, planos, acessos e credenciais.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar clínica..."
              className="bg-dark-input border border-gray-800 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue w-full sm:w-64 transition-all"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            className="bg-dark-input border border-gray-800 rounded-xl px-3 py-2 text-sm text-gray-200"
          >
            <option value="all">Status</option>
            <option value="ativa">Ativa</option>
            <option value="inativa">Inativa</option>
          </select>
          <select
            value={plan}
            onChange={(e) => setPlan(e.target.value as any)}
            className="bg-dark-input border border-gray-800 rounded-xl px-3 py-2 text-sm text-gray-200"
          >
            <option value="all">Plano</option>
            <option value="bronze">Bronze</option>
            <option value="prata">Prata</option>
            <option value="ouro">Ouro</option>
          </select>
          <button
            onClick={() => void fetchClinics()}
            className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            Filtrar
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-brand-blue hover:bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Nova Clínica
          </button>
        </div>
      </div>

      {error && <div className="mb-6 bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-4 rounded-xl">{error}</div>}

      <div className="bg-dark-card border border-gray-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-dark-input/50 text-gray-400">
              <tr>
                <th className="px-6 py-4 font-medium">Clínica</th>
                <th className="px-6 py-4 font-medium">Plano</th>
                <th className="px-6 py-4 font-medium">Usuários</th>
                <th className="px-6 py-4 font-medium">Acessos ativos</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-8 h-8 border-4 border-brand-blue/30 border-t-brand-blue rounded-full animate-spin mb-4" />
                      Carregando clínicas...
                    </div>
                  </td>
                </tr>
              ) : clinics.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <Building2 className="w-12 h-12 text-gray-700 mb-3" />
                      <p>Nenhuma clínica encontrada.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                clinics.map((clinic) => {
                  const tier = clinic.plan_tier || clinic.plano_assinatura
                  const users = clinic.users ?? { total: 0, admin: 0, medico: 0, atendente: 0 }
                  const sessions = clinic.active_sessions ?? { total: 0, admin: 0, medico: 0, atendente: 0 }
                  const limit = clinic.limits?.max_concurrent_total ?? null

                  return (
                    <tr key={clinic.id} className="hover:bg-gray-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-white">{clinic.nome}</div>
                        <div className="text-xs text-gray-500">{clinic.cnpj}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn('inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border',
                          tier === 'ouro' ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' : tier === 'prata' ? 'bg-brand-blue/10 text-brand-blue border-blue-500/20' : 'bg-gray-500/10 text-gray-300 border-gray-500/20'
                        )}>
                          {planLabel(tier)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-300">
                        <div className="text-sm">{users.total} total</div>
                        <div className="text-xs text-gray-500">A:{users.admin} M:{users.medico} At:{users.atendente}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-300">
                        <div className="text-sm">
                          {sessions.total}{limit != null ? ` / ${limit}` : ''}
                        </div>
                        <div className="text-xs text-gray-500">A:{sessions.admin} M:{sessions.medico} At:{sessions.atendente}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={cn(
                            'inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border',
                            clinic.ativa
                              ? 'bg-green-500/10 text-brand-green border-green-500/20'
                              : 'bg-red-500/10 text-red-500 border-red-500/20',
                          )}
                        >
                          {clinic.ativa ? 'Ativa' : 'Inativa'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => navigate(`/backoffice/clinicas/${clinic.id}`)}
                          className="text-brand-blue hover:text-blue-400 text-sm font-medium transition-colors"
                        >
                          Ver mais
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddClinicModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false)
          void fetchClinics()
        }}
      />
    </div>
  )
}

