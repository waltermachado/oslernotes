import { useEffect, useState } from 'react'
import { Plus, X, Save, Trash2 } from 'lucide-react'

import { apiFetch } from '../../../lib/apiFetch'
import type { Receita, Medicamento } from './prontuarioTypes'

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

const emptyMed = (): Medicamento => ({
  nome: '',
  dosagem: '',
  frequencia: '',
  quantidade: '',
  instrucoes: '',
})

const TIPOS_RECEITA = ['Simples', 'Especial', 'Antimicrobiano', 'Controle Especial'] as const

const statusLabels: Record<string, string> = {
  rascunho: 'Rascunho',
  emitida: 'Emitida',
  cancelada: 'Cancelada',
}

const statusColors: Record<string, string> = {
  rascunho: 'text-yellow-400 border-yellow-500/30 bg-clay-50',
  emitida: 'text-green-400 border-green-500/30 bg-sage-50',
  cancelada: 'text-red-400 border-red-500/30 bg-rose-50',
}

export default function ProntuarioReceitas({ patientId, token, role }: Props) {
  const canCreate = role === 'medico'

  const [items, setItems] = useState<Receita[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // form state — maps to receitas columns
  const [tipo, setTipo] = useState('Simples')
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([emptyMed()])
  const [instrucoes, setInstrucoes] = useState('')
  const [status, setStatus] = useState<'rascunho' | 'emitida'>('emitida')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await apiFetch(`/api/patients/${patientId}/receitas`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const body = (await res.json()) as { items?: Receita[]; error?: string }
        if (!res.ok) throw new Error(body.error ?? 'Falha ao carregar receitas')
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

  function updateMed(idx: number, field: keyof Medicamento, value: string) {
    setMedicamentos((prev) => prev.map((m, i) => (i === idx ? { ...m, [field]: value } : m)))
  }

  function addMed() {
    setMedicamentos((prev) => [...prev, emptyMed()])
  }

  function removeMed(idx: number) {
    setMedicamentos((prev) => prev.filter((_, i) => i !== idx))
  }

  function resetForm() {
    setTipo('Simples')
    setMedicamentos([emptyMed()])
    setInstrucoes('')
    setStatus('emitida')
    setFormError(null)
    setShowForm(false)
  }

  async function onSave() {
    const meds = medicamentos.filter((m) => m.nome.trim() && m.dosagem.trim() && m.frequencia.trim())
    if (meds.length === 0) {
      setFormError('Adicione pelo menos um medicamento com nome, dosagem e frequência.')
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      const res = await apiFetch(`/api/patients/${patientId}/receitas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tipo: tipo || null,
          medicamentos: meds,
          instrucoes: instrucoes.trim() || null,
          status,
        }),
      })
      const body = (await res.json()) as { item?: Receita; error?: string }
      if (!res.ok) throw new Error(body.error ?? 'Falha ao salvar')
      if (body.item) setItems((prev) => [body.item!, ...prev])
      resetForm()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  /** Resolve display text: instrucoes is the real column; observacoes is a legacy alias */
  function getInstrucoes(item: Receita): string | null {
    return item.instrucoes ?? item.observacoes ?? null
  }

  return (
    <section className="space-y-6">
      {/* header */}
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold tracking-[0.2em] uppercase text-ink-500">Receitas</div>
        {canCreate && !showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-navy-500 hover:bg-navy-600 text-cream-50 text-sm"
          >
            <Plus className="w-4 h-4" />
            Nova Receita
          </button>
        )}
      </div>

      {/* inline form */}
      {showForm && (
        <div className="bg-surface border border-cream-300 rounded-2xl p-5 space-y-5">
          <div className="text-sm font-medium text-ink-700">Nova Receita</div>

          {formError && (
            <div className="bg-rose-50 border border-red-500/40 text-red-400 p-3 rounded-xl text-sm">
              {formError}
            </div>
          )}

          {/* tipo + status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-ink-500 block mb-1">Tipo de receita</label>
              <select
                className="w-full bg-sunken border border-cream-300 rounded-xl px-3 py-2 text-sm text-ink-900"
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
              >
                {TIPOS_RECEITA.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-ink-500 block mb-1">Status</label>
              <select
                className="w-full bg-sunken border border-cream-300 rounded-xl px-3 py-2 text-sm text-ink-900"
                value={status}
                onChange={(e) => setStatus(e.target.value as 'rascunho' | 'emitida')}
              >
                <option value="emitida">Emitida</option>
                <option value="rascunho">Rascunho</option>
              </select>
            </div>
          </div>

          {/* medicamentos */}
          <div className="space-y-3">
            {medicamentos.map((med, idx) => (
              <div key={idx} className="bg-[#0d1520] border border-cream-300 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-ink-500">Medicamento {idx + 1}</span>
                  {medicamentos.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMed(idx)}
                      className="text-red-400 hover:text-red-300"
                      aria-label="Remover medicamento"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-ink-500 block mb-1">Nome *</label>
                    <input
                      type="text"
                      className="w-full bg-sunken border border-cream-300 rounded-xl px-3 py-2 text-sm text-ink-900"
                      placeholder="Ex: Amoxicilina"
                      value={med.nome}
                      onChange={(e) => updateMed(idx, 'nome', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-ink-500 block mb-1">Dosagem *</label>
                    <input
                      type="text"
                      className="w-full bg-sunken border border-cream-300 rounded-xl px-3 py-2 text-sm text-ink-900"
                      placeholder="Ex: 500mg"
                      value={med.dosagem}
                      onChange={(e) => updateMed(idx, 'dosagem', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-ink-500 block mb-1">Frequência *</label>
                    <input
                      type="text"
                      className="w-full bg-sunken border border-cream-300 rounded-xl px-3 py-2 text-sm text-ink-900"
                      placeholder="Ex: 8 em 8 horas"
                      value={med.frequencia}
                      onChange={(e) => updateMed(idx, 'frequencia', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-ink-500 block mb-1">Quantidade</label>
                    <input
                      type="text"
                      className="w-full bg-sunken border border-cream-300 rounded-xl px-3 py-2 text-sm text-ink-900"
                      placeholder="Ex: 21 comprimidos"
                      value={med.quantidade ?? ''}
                      onChange={(e) => updateMed(idx, 'quantidade', e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs text-ink-500 block mb-1">Instruções de uso</label>
                    <input
                      type="text"
                      className="w-full bg-sunken border border-cream-300 rounded-xl px-3 py-2 text-sm text-ink-900"
                      placeholder="Ex: Tomar após as refeições"
                      value={med.instrucoes ?? ''}
                      onChange={(e) => updateMed(idx, 'instrucoes', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addMed}
              className="inline-flex items-center gap-1 text-sm text-navy-500 hover:text-blue-400"
            >
              <Plus className="w-4 h-4" />
              Adicionar medicamento
            </button>
          </div>

          <div>
            <label className="text-xs text-ink-500 block mb-1">Instruções gerais (opcional)</label>
            <textarea
              rows={2}
              className="w-full bg-sunken border border-cream-300 rounded-xl px-3 py-2 text-sm text-ink-900 resize-none"
              placeholder="Orientações gerais ao paciente..."
              value={instrucoes}
              onChange={(e) => setInstrucoes(e.target.value)}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={resetForm}
              disabled={saving}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-900/40 border border-cream-300 text-ink-700 hover:bg-gray-900/60 text-sm"
            >
              <X className="w-4 h-4" />
              Cancelar
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-navy-500 hover:bg-navy-600 text-cream-50 disabled:opacity-60 text-sm"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Salvando...' : 'Salvar Receita'}
            </button>
          </div>
        </div>
      )}

      {/* list */}
      {loading ? (
        <div className="text-ink-500 text-sm">Carregando receitas...</div>
      ) : error ? (
        <div className="bg-rose-50 border border-red-500/40 text-red-400 p-3 rounded-xl text-sm">{error}</div>
      ) : items.length === 0 ? (
        <div className="bg-surface border border-cream-300 rounded-2xl p-6 text-center text-ink-500 text-sm">
          Nenhuma receita registrada ainda.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const statusKey = item.status ?? 'rascunho'
            return (
              <div key={item.id} className="bg-surface border border-cream-300 rounded-2xl p-5 space-y-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="space-y-0.5">
                    <div className="text-xs text-ink-500">{formatDate(item.created_at)}</div>
                    {item.tipo && (
                      <div className="text-xs text-ink-500">Tipo: {item.tipo}</div>
                    )}
                  </div>
                  <span className={`shrink-0 text-xs border rounded-lg px-2 py-0.5 ${statusColors[statusKey] ?? ''}`}>
                    {statusLabels[statusKey] ?? statusKey}
                  </span>
                </div>

                <div className="space-y-2">
                  {(item.medicamentos ?? []).map((med, idx) => (
                    <div key={idx} className="border-l-2 border-brand-blue pl-3">
                      <div className="text-ink-900 font-medium text-sm">{med.nome}</div>
                      <div className="text-ink-500 text-xs">
                        {med.dosagem} • {med.frequencia}
                        {med.quantidade ? ` • ${med.quantidade}` : ''}
                      </div>
                      {med.instrucoes && (
                        <div className="text-ink-500 text-xs mt-0.5">{med.instrucoes}</div>
                      )}
                    </div>
                  ))}
                </div>

                {getInstrucoes(item) && (
                  <div className="text-xs text-ink-500 border-t border-cream-300 pt-3">
                    Instruções: {getInstrucoes(item)}
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
