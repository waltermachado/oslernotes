import React, { useEffect, useState } from 'react'

import { useAuth } from '../../context/AuthContext'
import { apiFetch } from '../../lib/apiFetch'

type AuditRow = {
  id: string
  clinica_id: string
  actor_user_id: string | null
  entity_type: string
  entity_id: string | null
  action: string
  created_at: string
  metadata: any
}

export default function BackofficeAuditoriaPage() {
  const { session } = useAuth()
  const token = session?.access_token

  const [clinicId, setClinicId] = useState('')
  const [action, setAction] = useState('')
  const [logs, setLogs] = useState<AuditRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (clinicId.trim()) params.set('clinica_id', clinicId.trim())
      if (action.trim()) params.set('action', action.trim())
      const path = params.toString() ? `/api/admin/audit-logs?${params.toString()}` : '/api/admin/audit-logs'

      const res = await apiFetch(path, { headers: { Authorization: `Bearer ${token}` } })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Falha ao carregar auditoria')
      setLogs(body.logs ?? [])
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

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-1">Auditoria</h2>
        <p className="text-gray-400 text-sm">Eventos administrativos e bloqueios por limite.</p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <input
          value={clinicId}
          onChange={(e) => setClinicId(e.target.value)}
          placeholder="clinica_id (opcional)"
          className="bg-dark-input border border-gray-800 rounded-xl px-4 py-2 text-sm text-gray-200 w-full sm:w-80"
        />
        <input
          value={action}
          onChange={(e) => setAction(e.target.value)}
          placeholder="action (opcional)"
          className="bg-dark-input border border-gray-800 rounded-xl px-4 py-2 text-sm text-gray-200 w-full sm:w-64"
        />
        <button
          onClick={() => void load()}
          className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
        >
          Filtrar
        </button>
      </div>

      {error && <div className="mb-6 bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-4 rounded-xl">{error}</div>}

      <div className="bg-dark-card border border-gray-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-black/20 text-gray-500">
              <tr>
                <th className="px-6 py-3 font-medium">Quando</th>
                <th className="px-6 py-3 font-medium">Clínica</th>
                <th className="px-6 py-3 font-medium">Ação</th>
                <th className="px-6 py-3 font-medium">Entidade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-6 text-gray-500">Carregando...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-6 text-gray-500">Sem eventos.</td>
                </tr>
              ) : (
                logs.map((l) => (
                  <tr key={l.id} className="hover:bg-white/5">
                    <td className="px-6 py-3 text-gray-300">{new Date(l.created_at).toLocaleString('pt-BR')}</td>
                    <td className="px-6 py-3 text-gray-400 font-mono text-xs">{l.clinica_id}</td>
                    <td className="px-6 py-3 text-gray-200 font-medium">{l.action}</td>
                    <td className="px-6 py-3 text-gray-400">{l.entity_type}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
