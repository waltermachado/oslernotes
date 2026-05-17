import React, { useEffect, useState } from 'react'

import { supabase } from '../../lib/supabase'

type NotificationRow = {
  id: string
  scope_type: 'all_clinics' | 'single_clinic'
  scope_clinica_id: string | null
  kind: string
  title: string
  message: string
  status: 'draft' | 'published' | 'archived'
  created_at: string
  published_at: string | null
}

export default function BackofficeNotificacoesPage() {

  const [items, setItems] = useState<NotificationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [scopeType, setScopeType] = useState<'all_clinics' | 'single_clinic'>('all_clinics')
  const [scopeClinicId, setScopeClinicId] = useState('')
  const [creating, setCreating] = useState(false)

  async function load() {
    setLoading(true)
    setError('')
    try {
      const { data, error: qError } = await supabase
        .from('super_admin_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)
      if (qError) throw new Error(qError.message || 'Falha ao carregar notificações')
      setItems((data ?? []) as NotificationRow[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function create(status: 'draft' | 'published') {
    setCreating(true)
    setError('')
    try {
      const trimTitle = title.trim()
      const trimMessage = message.trim()
      if (!trimTitle || !trimMessage) throw new Error('Título e mensagem são obrigatórios')

      const { error: insertError } = await supabase
        .from('super_admin_notifications')
        .insert({
          scope_type: scopeType,
          scope_clinica_id: scopeType === 'single_clinic' ? scopeClinicId.trim() : null,
          kind: 'manual',
          title: trimTitle,
          message: trimMessage,
          status,
          published_at: status === 'published' ? new Date().toISOString() : null,
        })
      if (insertError) throw new Error(insertError.message || 'Falha ao criar notificação')
      setTitle('')
      setMessage('')
      setScopeClinicId('')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao criar')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-1">Notificações</h2>
        <p className="text-gray-400 text-sm">Crie e publique avisos para todas as clínicas ou uma clínica específica.</p>
      </div>

      {error && <div className="mb-6 bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-4 rounded-xl">{error}</div>}

      <div className="bg-dark-card border border-gray-800 rounded-2xl p-6 mb-6">
        <div className="text-sm font-semibold mb-4">Nova notificação</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título"
            className="bg-dark-input border border-gray-800 rounded-xl px-4 py-2 text-sm text-gray-200 md:col-span-1"
          />
          <select
            value={scopeType}
            onChange={(e) => setScopeType(e.target.value as any)}
            className="bg-dark-input border border-gray-800 rounded-xl px-4 py-2 text-sm text-gray-200"
          >
            <option value="all_clinics">Todas as clínicas</option>
            <option value="single_clinic">Clínica específica</option>
          </select>
          <input
            value={scopeClinicId}
            onChange={(e) => setScopeClinicId(e.target.value)}
            placeholder="scope_clinica_id"
            disabled={scopeType !== 'single_clinic'}
            className="bg-dark-input border border-gray-800 rounded-xl px-4 py-2 text-sm text-gray-200 disabled:opacity-50"
          />
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Mensagem"
            className="bg-dark-input border border-gray-800 rounded-xl px-4 py-2 text-sm text-gray-200 md:col-span-3 min-h-[96px]"
          />
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            disabled={creating}
            onClick={() => void create('draft')}
            className="px-4 py-2 rounded-xl text-sm font-medium text-gray-200 hover:bg-white/5 disabled:opacity-60"
          >
            Salvar rascunho
          </button>
          <button
            disabled={creating}
            onClick={() => void create('published')}
            className="bg-brand-blue hover:bg-blue-600 disabled:opacity-60 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            Publicar
          </button>
        </div>
      </div>

      <div className="bg-dark-card border border-gray-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800">
          <div className="text-sm font-semibold">Histórico</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-black/20 text-gray-500">
              <tr>
                <th className="px-6 py-3 font-medium">Data</th>
                <th className="px-6 py-3 font-medium">Título</th>
                <th className="px-6 py-3 font-medium">Escopo</th>
                <th className="px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-6 text-gray-500">Carregando...</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-6 text-gray-500">Sem notificações.</td>
                </tr>
              ) : (
                items.map((n) => (
                  <tr key={n.id} className="hover:bg-white/5">
                    <td className="px-6 py-3 text-gray-300">{new Date(n.created_at).toLocaleString('pt-BR')}</td>
                    <td className="px-6 py-3 text-gray-100 font-medium">{n.title}</td>
                    <td className="px-6 py-3 text-gray-400">
                      {n.scope_type === 'all_clinics' ? 'Todas' : `Clínica ${n.scope_clinica_id}`}
                    </td>
                    <td className="px-6 py-3 text-gray-300">{n.status}</td>
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
