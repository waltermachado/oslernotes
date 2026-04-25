import React, { useEffect, useMemo, useState } from 'react'

import { useAuth } from '../../context/AuthContext'
import { cn } from '../../lib/utils'

type Plan = {
  tier: 'bronze' | 'prata' | 'ouro'
  monthly_price_cents: number
  max_concurrent_total: number
  max_concurrent_admin: number | null
  max_concurrent_atendente: number | null
  max_concurrent_medico: number | null
}

export default function BackofficePlanosPage() {
  const { session } = useAuth()
  const token = session?.access_token

  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Plan | null>(null)
  const [saving, setSaving] = useState(false)

  const label = useMemo(() => {
    return (tier: string) => (tier === 'prata' ? 'Prata' : tier === 'ouro' ? 'Ouro' : 'Bronze')
  }, [])

  async function load() {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/plans', { headers: { Authorization: `Bearer ${token}` } })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Falha ao carregar planos')
      setPlans(body.plans ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function save() {
    if (!editing || !token) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/plans/${editing.tier}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(editing),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Falha ao salvar')
      setEditing(null)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-1">Planos & Limites</h2>
        <p className="text-gray-400 text-sm">Configuração de preços e limites de acessos simultâneos.</p>
      </div>

      {error && <div className="mb-6 bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-4 rounded-xl">{error}</div>}

      {loading ? (
        <div className="bg-dark-card border border-gray-800 rounded-2xl p-8">Carregando...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((p) => (
            <div key={p.tier} className="bg-dark-card border border-gray-800 rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div className="text-lg font-semibold">{label(p.tier)}</div>
                <span
                  className={cn(
                    'text-xs px-2 py-1 rounded-md border',
                    p.tier === 'ouro'
                      ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                      : p.tier === 'prata'
                        ? 'bg-brand-blue/10 text-brand-blue border-blue-500/20'
                        : 'bg-gray-500/10 text-gray-300 border-gray-500/20',
                  )}
                >
                  {p.max_concurrent_total} acessos
                </span>
              </div>
              <div className="mt-3 text-2xl font-bold">
                {(p.monthly_price_cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                <span className="text-sm text-gray-500 font-medium">/mês</span>
              </div>

              <div className="mt-4 text-sm text-gray-300 space-y-1">
                <div>Limite total: {p.max_concurrent_total}</div>
                {p.max_concurrent_admin != null && <div>Admin: {p.max_concurrent_admin}</div>}
                {p.max_concurrent_medico != null && <div>Médico: {p.max_concurrent_medico}</div>}
                {p.max_concurrent_atendente != null && <div>Atendente: {p.max_concurrent_atendente}</div>}
              </div>

              <button
                onClick={() => setEditing({ ...p })}
                className="mt-5 w-full bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                Editar
              </button>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-dark-card w-full max-w-lg rounded-2xl shadow-2xl border border-gray-800 p-6">
            <div className="text-lg font-semibold">Editar plano {label(editing.tier)}</div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Preço mensal (centavos)">
                <input
                  value={editing.monthly_price_cents}
                  onChange={(e) => setEditing({ ...editing, monthly_price_cents: Number(e.target.value) })}
                  className="w-full bg-dark-input border border-gray-800 rounded-xl px-4 py-2 text-sm text-gray-200"
                />
              </Field>
              <Field label="Limite total">
                <input
                  value={editing.max_concurrent_total}
                  onChange={(e) => setEditing({ ...editing, max_concurrent_total: Number(e.target.value) })}
                  className="w-full bg-dark-input border border-gray-800 rounded-xl px-4 py-2 text-sm text-gray-200"
                />
              </Field>
              <Field label="Limite Admin (opcional)">
                <input
                  value={editing.max_concurrent_admin ?? ''}
                  onChange={(e) => setEditing({ ...editing, max_concurrent_admin: e.target.value ? Number(e.target.value) : null })}
                  className="w-full bg-dark-input border border-gray-800 rounded-xl px-4 py-2 text-sm text-gray-200"
                />
              </Field>
              <Field label="Limite Atendente (opcional)">
                <input
                  value={editing.max_concurrent_atendente ?? ''}
                  onChange={(e) => setEditing({ ...editing, max_concurrent_atendente: e.target.value ? Number(e.target.value) : null })}
                  className="w-full bg-dark-input border border-gray-800 rounded-xl px-4 py-2 text-sm text-gray-200"
                />
              </Field>
              <Field label="Limite Médico (opcional)">
                <input
                  value={editing.max_concurrent_medico ?? ''}
                  onChange={(e) => setEditing({ ...editing, max_concurrent_medico: e.target.value ? Number(e.target.value) : null })}
                  className="w-full bg-dark-input border border-gray-800 rounded-xl px-4 py-2 text-sm text-gray-200"
                />
              </Field>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                onClick={() => setEditing(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-gray-200 hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                disabled={saving}
                onClick={() => void save()}
                className="bg-brand-blue hover:bg-blue-600 disabled:opacity-60 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Field(props: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs text-gray-500 mb-1">{props.label}</div>
      {props.children}
    </label>
  )
}

