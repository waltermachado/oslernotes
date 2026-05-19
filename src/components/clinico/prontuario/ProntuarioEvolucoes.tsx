import { useEffect, useState } from 'react'
import { Plus, X, Save, ChevronDown, ChevronUp } from 'lucide-react'

import { apiFetch } from '../../../lib/apiFetch'
import type { Evolucao } from './prontuarioTypes'

type Props = {
  patientId: string
  token: string
  role: 'admin' | 'medico' | 'atendente' | 'unknown'
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Returns the main display text for a prontuario entry */
function getDisplayText(item: Evolucao): string {
  const parts: string[] = []
  if (item.anamnese) parts.push(`Anamnese: ${item.anamnese}`)
  if (item.diagnostico) parts.push(`Diagnóstico: ${item.diagnostico}`)
  if (item.observacoes) parts.push(`Observações: ${item.observacoes}`)
  return parts.join('\n\n') || '—'
}

export default function ProntuarioEvolucoes({ patientId, token, role }: Props) {
  const canCreate = role === 'medico'

  const [items, setItems] = useState<Evolucao[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  // form state — maps to prontuarios columns
  const [anamnese, setAnamnese] = useState('')
  const [diagnostico, setDiagnostico] = useState('')
  const [observacoes, setObservacoes] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await apiFetch(`/api/patients/${patientId}/evolucoes`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const body = (await res.json()) as { items?: Evolucao[]; error?: string }
        if (!res.ok) throw new Error(body.error ?? 'Falha ao carregar evoluções')
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

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function resetForm() {
    setAnamnese('')
    setDiagnostico('')
    setObservacoes('')
    setFormError(null)
    setShowForm(false)
  }

  async function onSave() {
    const anamneseTrimmed = anamnese.trim()
    const diagnosticoTrimmed = diagnostico.trim()
    const observacoesTrimmed = observacoes.trim()
    if (!anamneseTrimmed && !diagnosticoTrimmed && !observacoesTrimmed) {
      setFormError('Preencha pelo menos um campo (Anamnese, Diagnóstico ou Observações).')
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      const res = await apiFetch(`/api/patients/${patientId}/evolucoes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          anamnese: anamneseTrimmed || null,
          diagnostico: diagnosticoTrimmed || null,
          observacoes: observacoesTrimmed || null,
        }),
      })
      const body = (await res.json()) as { item?: Evolucao; error?: string }
      if (!res.ok) throw new Error(body.error ?? 'Falha ao salvar')
      if (body.item) setItems((prev) => [body.item!, ...prev])
      resetForm()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-6">
      {/* header */}
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold tracking-[0.2em] uppercase text-gray-400">Evoluções Clínicas</div>
        {canCreate && !showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-brand-blue hover:bg-blue-600 text-white text-sm"
          >
            <Plus className="w-4 h-4" />
            Nova Evolução
          </button>
        )}
      </div>

      {/* inline form */}
      {showForm && (
        <div className="bg-dark-card border border-gray-800 rounded-2xl p-5 space-y-4">
          <div className="text-sm font-medium text-gray-200">Nova Evolução</div>

          {formError && (
            <div className="bg-red-500/10 border border-red-500/40 text-red-400 p-3 rounded-xl text-sm">
              {formError}
            </div>
          )}

          <div>
            <label className="text-xs text-gray-400 block mb-1">Anamnese</label>
            <textarea
              rows={4}
              className="w-full bg-dark-input border border-gray-800 rounded-xl px-3 py-2 text-sm text-white resize-y"
              placeholder="Queixa principal, história da doença atual, antecedentes..."
              value={anamnese}
              onChange={(e) => setAnamnese(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">Diagnóstico</label>
            <textarea
              rows={3}
              className="w-full bg-dark-input border border-gray-800 rounded-xl px-3 py-2 text-sm text-white resize-y"
              placeholder="Hipótese diagnóstica ou diagnóstico definitivo..."
              value={diagnostico}
              onChange={(e) => setDiagnostico(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">Observações / Conduta</label>
            <textarea
              rows={3}
              className="w-full bg-dark-input border border-gray-800 rounded-xl px-3 py-2 text-sm text-white resize-y"
              placeholder="Conduta, plano terapêutico, observações adicionais..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
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
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      )}

      {/* list */}
      {loading ? (
        <div className="text-gray-400 text-sm">Carregando evoluções...</div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/40 text-red-400 p-3 rounded-xl text-sm">{error}</div>
      ) : items.length === 0 ? (
        <div className="bg-dark-card border border-gray-800 rounded-2xl p-6 text-center text-gray-500 text-sm">
          Nenhuma evolução registrada ainda.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const isExpanded = expanded.has(item.id)
            const fullText = getDisplayText(item)
            const isLong = fullText.length > 400
            const displayText = isLong && !isExpanded ? `${fullText.slice(0, 400)}...` : fullText
            return (
              <div key={item.id} className="bg-dark-card border border-gray-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-0.5">
                    <div className="text-xs text-gray-400">{formatDate(item.created_at)}</div>
                  </div>
                </div>

                <div className="space-y-3">
                  {item.anamnese && (
                    <div>
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Anamnese</div>
                      <div className="text-sm text-white whitespace-pre-wrap leading-relaxed">
                        {isLong && !isExpanded && item.anamnese.length > 400
                          ? `${item.anamnese.slice(0, 400)}...`
                          : item.anamnese}
                      </div>
                    </div>
                  )}
                  {item.diagnostico && (
                    <div>
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Diagnóstico</div>
                      <div className="text-sm text-white whitespace-pre-wrap leading-relaxed">{item.diagnostico}</div>
                    </div>
                  )}
                  {item.observacoes && (
                    <div>
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Observações</div>
                      <div className="text-sm text-white whitespace-pre-wrap leading-relaxed">{item.observacoes}</div>
                    </div>
                  )}
                  {!item.anamnese && !item.diagnostico && !item.observacoes && (
                    <div className="text-sm text-white whitespace-pre-wrap leading-relaxed">{displayText}</div>
                  )}
                </div>

                {isLong && (
                  <button
                    type="button"
                    onClick={() => toggleExpand(item.id)}
                    className="inline-flex items-center gap-1 text-xs text-brand-blue hover:text-blue-400"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="w-3 h-3" /> Ver menos
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3 h-3" /> Ver mais
                      </>
                    )}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
