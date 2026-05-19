import { useEffect, useState } from 'react'
import { Plus, X, Save, AlertTriangle, CheckCircle2, Clock, FlaskConical, FileCheck, Paperclip } from 'lucide-react'

import { apiFetch } from '../../../lib/apiFetch'
import type { PedidoExame, ExameStatus } from './prontuarioTypes'

// Keep the legacy alias working
type PedidoExameStatus = ExameStatus

type Props = {
  patientId: string
  token: string
  role: 'admin' | 'medico' | 'atendente' | 'unknown'
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const statusLabels: Record<PedidoExameStatus, string> = {
  solicitado: 'Solicitado',
  coletado: 'Coletado',
  resultado_disponivel: 'Resultado disponível',
  finalizado: 'Finalizado',
}

const statusColors: Record<PedidoExameStatus, string> = {
  solicitado: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
  coletado: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
  resultado_disponivel: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
  finalizado: 'text-green-400 border-green-500/30 bg-green-500/10',
}

const statusIcons: Record<PedidoExameStatus, React.ComponentType<{ className?: string }>> = {
  solicitado: Clock,
  coletado: FlaskConical,
  resultado_disponivel: FileCheck,
  finalizado: CheckCircle2,
}

export default function ProntuarioPedidosExame({ patientId, token, role }: Props) {
  const canCreate = role === 'medico'
  const canUpdateStatus = role === 'medico'

  const [items, setItems] = useState<PedidoExame[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // per-item update state
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [expandedResult, setExpandedResult] = useState<string | null>(null)

  // form state — maps to exames columns
  const [tipo, setTipo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [urgente, setUrgente] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await apiFetch(`/api/patients/${patientId}/exames`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const body = (await res.json()) as { items?: PedidoExame[]; error?: string }
        if (!res.ok) throw new Error(body.error ?? 'Falha ao carregar exames')
        if (!cancelled) setItems(body.items ?? [])
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erro ao carregar')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [patientId, token])

  function resetForm() {
    setTipo('')
    setDescricao('')
    setUrgente(false)
    setFormError(null)
    setShowForm(false)
  }

  async function onSave() {
    const tipoTrimmed = tipo.trim()
    if (!tipoTrimmed) {
      setFormError('O tipo do exame é obrigatório.')
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      const res = await apiFetch(`/api/patients/${patientId}/exames`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tipo: tipoTrimmed, descricao: descricao.trim() || null, urgente }),
      })
      const body = (await res.json()) as { item?: PedidoExame; error?: string }
      if (!res.ok) throw new Error(body.error ?? 'Falha ao salvar')
      if (body.item) setItems((prev) => [body.item!, ...prev])
      resetForm()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  async function updateStatus(id: string, status: PedidoExameStatus, resultado?: string) {
    setUpdatingId(id)
    setUpdateError(null)
    try {
      const payload: Record<string, unknown> = { status }
      if (resultado !== undefined) payload.resultado = resultado
      const res = await apiFetch(`/api/patients/${patientId}/exames/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })
      const body = (await res.json()) as { item?: PedidoExame; error?: string }
      if (!res.ok) throw new Error(body.error ?? 'Falha ao atualizar')
      if (body.item) {
        setItems((prev) => prev.map((x) => (x.id === id ? body.item! : x)))
      }
      setExpandedResult(null)
    } catch (e) {
      setUpdateError(e instanceof Error ? e.message : 'Erro ao atualizar')
    } finally {
      setUpdatingId(null)
    }
  }

  const [resultadoInput, setResultadoInput] = useState<Record<string, string>>({})

  return (
    <section className="space-y-6">
      {/* header */}
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold tracking-[0.2em] uppercase text-gray-400">Pedidos de Exame</div>
        {canCreate && !showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-brand-blue hover:bg-blue-600 text-white text-sm"
          >
            <Plus className="w-4 h-4" />
            Novo Pedido
          </button>
        )}
      </div>

      {/* inline form */}
      {showForm && (
        <div className="bg-dark-card border border-gray-800 rounded-2xl p-5 space-y-4">
          <div className="text-sm font-medium text-gray-200">Novo Pedido de Exame</div>

          {formError && (
            <div className="bg-red-500/10 border border-red-500/40 text-red-400 p-3 rounded-xl text-sm">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Tipo do exame *</label>
              <input
                type="text"
                className="w-full bg-dark-input border border-gray-800 rounded-xl px-3 py-2 text-sm text-white"
                placeholder="Ex: Hemograma, Raio-X, Glicemia"
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
              />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <div
                  onClick={() => setUrgente((v) => !v)}
                  className={`w-10 h-6 rounded-full transition-colors cursor-pointer ${urgente ? 'bg-red-500' : 'bg-gray-700'} relative`}
                >
                  <span
                    className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${urgente ? 'translate-x-4' : ''}`}
                  />
                </div>
                <span className={`text-sm ${urgente ? 'text-red-400' : 'text-gray-400'}`}>
                  {urgente ? (
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Urgente
                    </span>
                  ) : (
                    'Urgente'
                  )}
                </span>
              </label>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">Descrição / indicação clínica</label>
            <textarea
              rows={3}
              className="w-full bg-dark-input border border-gray-800 rounded-xl px-3 py-2 text-sm text-white resize-none"
              placeholder="Indicação clínica, hipótese diagnóstica..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={resetForm}
              disabled={saving}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-900/40 border border-gray-800 text-gray-200 hover:bg-gray-900/60 text-sm"
            >
              <X className="w-4 h-4" />
              Cancelar
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-brand-blue hover:bg-blue-600 text-white disabled:opacity-60 text-sm"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Salvando...' : 'Salvar Pedido'}
            </button>
          </div>
        </div>
      )}

      {updateError && (
        <div className="bg-red-500/10 border border-red-500/40 text-red-400 p-3 rounded-xl text-sm">{updateError}</div>
      )}

      {/* list */}
      {loading ? (
        <div className="text-gray-400 text-sm">Carregando exames...</div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/40 text-red-400 p-3 rounded-xl text-sm">{error}</div>
      ) : items.length === 0 ? (
        <div className="bg-dark-card border border-gray-800 rounded-2xl p-6 text-center text-gray-500 text-sm">
          Nenhum pedido de exame registrado ainda.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const StatusIcon = statusIcons[item.status]
            const isUpdating = updatingId === item.id
            const isExpandingResult = expandedResult === item.id
            const nextStatus: PedidoExameStatus | null =
              item.status === 'solicitado' ? 'coletado'
              : item.status === 'coletado' ? 'resultado_disponivel'
              : item.status === 'resultado_disponivel' ? 'finalizado'
              : null

            return (
              <div key={item.id} className="bg-dark-card border border-gray-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium text-sm">{item.tipo ?? '—'}</span>
                      {item.urgente && (
                        <span className="inline-flex items-center gap-1 text-xs text-red-400 border border-red-500/30 bg-red-500/10 rounded-lg px-2 py-0.5">
                          <AlertTriangle className="w-3 h-3" /> Urgente
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400">
                      Solicitado em: {formatDate(item.data_solicitacao ?? item.created_at)}
                    </div>
                    {item.data_resultado && (
                      <div className="text-xs text-gray-400">
                        Resultado em: {formatDate(item.data_resultado)}
                      </div>
                    )}
                  </div>
                  <span className={`shrink-0 inline-flex items-center gap-1.5 text-xs border rounded-lg px-2 py-1 ${statusColors[item.status]}`}>
                    <StatusIcon className="w-3.5 h-3.5" />
                    {statusLabels[item.status]}
                  </span>
                </div>

                {item.descricao && (
                  <div className="text-xs text-gray-400">{item.descricao}</div>
                )}

                {/* arquivo anexo */}
                {item.arquivo_url && (
                  <div className="flex items-center gap-2">
                    <Paperclip className="w-3.5 h-3.5 text-gray-500" />
                    <a
                      href={item.arquivo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-brand-blue hover:text-blue-400 underline underline-offset-2"
                    >
                      Ver arquivo anexo
                    </a>
                  </div>
                )}

                {item.resultado && !isExpandingResult && (
                  <div className="bg-[#0d1520] border border-gray-700 rounded-xl p-3">
                    <div className="text-xs text-gray-400 mb-1">Resultado</div>
                    <div className="text-sm text-white whitespace-pre-wrap">{item.resultado}</div>
                  </div>
                )}

                {/* status advancement + resultado input */}
                {canUpdateStatus && item.status !== 'finalizado' && (
                  <div className="border-t border-gray-800 pt-3 space-y-2">
                    {isExpandingResult ? (
                      <div className="space-y-2">
                        <label className="text-xs text-gray-400 block">Resultado / laudo</label>
                        <textarea
                          rows={4}
                          className="w-full bg-dark-input border border-gray-800 rounded-xl px-3 py-2 text-sm text-white resize-none"
                          placeholder="Descreva o resultado do exame..."
                          value={resultadoInput[item.id] ?? item.resultado ?? ''}
                          onChange={(e) => setResultadoInput((prev) => ({ ...prev, [item.id]: e.target.value }))}
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setExpandedResult(null)}
                            className="text-xs text-gray-400 hover:text-gray-200"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => updateStatus(item.id, 'resultado_disponivel', resultadoInput[item.id] ?? '')}
                            className="inline-flex items-center gap-1 text-xs text-brand-blue hover:text-blue-400 disabled:opacity-50"
                          >
                            {isUpdating ? 'Salvando...' : 'Salvar resultado'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {nextStatus && nextStatus !== 'resultado_disponivel' && (
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => updateStatus(item.id, nextStatus)}
                            className="inline-flex items-center gap-1 text-xs text-gray-300 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg px-3 py-1.5 disabled:opacity-50"
                          >
                            Marcar como: {statusLabels[nextStatus]}
                          </button>
                        )}
                        {(item.status === 'coletado' || item.status === 'solicitado') && (
                          <button
                            type="button"
                            onClick={() => setExpandedResult(item.id)}
                            className="inline-flex items-center gap-1 text-xs text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-lg px-3 py-1.5"
                          >
                            <FileCheck className="w-3.5 h-3.5" /> Inserir resultado
                          </button>
                        )}
                        {item.status === 'resultado_disponivel' && (
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => updateStatus(item.id, 'finalizado')}
                            className="inline-flex items-center gap-1 text-xs text-green-400 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 rounded-lg px-3 py-1.5 disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Finalizar
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
