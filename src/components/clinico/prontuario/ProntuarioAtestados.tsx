import { useEffect, useState } from 'react'
import { Plus, X, Save } from 'lucide-react'

import { apiFetch } from '../../../lib/apiFetch'
import type { Atestado } from './prontuarioTypes'

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

function formatDateOnly(iso: string | null | undefined) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/** Resolve display content: prefer `texto` (new column), fall back to `observacoes` */
function getConteudo(item: Atestado): string {
  return item.texto ?? item.observacoes ?? ''
}

export default function ProntuarioAtestados({ patientId, token, role }: Props) {
  const canCreate = role === 'medico'

  const [items, setItems] = useState<Atestado[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // form state — maps to atestados columns
  const [texto, setTexto] = useState('')
  const [cid, setCid] = useState('')
  const [diasAfastamento, setDiasAfastamento] = useState(0)
  const [dataRetorno, setDataRetorno] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await apiFetch(`/api/patients/${patientId}/atestados`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const body = (await res.json()) as { items?: Atestado[]; error?: string }
        if (!res.ok) throw new Error(body.error ?? 'Falha ao carregar atestados')
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
    setTexto('')
    setCid('')
    setDiasAfastamento(0)
    setDataRetorno('')
    setFormError(null)
    setShowForm(false)
  }

  async function onSave() {
    const textoTrimmed = texto.trim()
    if (!textoTrimmed) {
      setFormError('O texto do atestado é obrigatório.')
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      const res = await apiFetch(`/api/patients/${patientId}/atestados`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          texto: textoTrimmed,
          cid: cid.trim() || null,
          dias_afastamento: diasAfastamento,
          data_retorno: dataRetorno.trim() || null,
        }),
      })
      const body = (await res.json()) as { item?: Atestado; error?: string }
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
        <div className="text-xs font-semibold tracking-[0.2em] uppercase text-gray-400">Atestados</div>
        {canCreate && !showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-brand-blue hover:bg-blue-600 text-white text-sm"
          >
            <Plus className="w-4 h-4" />
            Novo Atestado
          </button>
        )}
      </div>

      {/* inline form */}
      {showForm && (
        <div className="bg-dark-card border border-gray-800 rounded-2xl p-5 space-y-4">
          <div className="text-sm font-medium text-gray-200">Novo Atestado</div>

          {formError && (
            <div className="bg-red-500/10 border border-red-500/40 text-red-400 p-3 rounded-xl text-sm">
              {formError}
            </div>
          )}

          <div>
            <label className="text-xs text-gray-400 block mb-1">Texto do atestado *</label>
            <textarea
              rows={6}
              className="w-full bg-dark-input border border-gray-800 rounded-xl px-3 py-2 text-sm text-white resize-y"
              placeholder="Atesto que o(a) paciente encontra-se em acompanhamento médico..."
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1">CID (opcional)</label>
              <input
                type="text"
                maxLength={10}
                className="w-full bg-dark-input border border-gray-800 rounded-xl px-3 py-2 text-sm text-white"
                placeholder="Ex: F32.0"
                value={cid}
                onChange={(e) => setCid(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Dias de afastamento</label>
              <input
                type="number"
                min={0}
                className="w-full bg-dark-input border border-gray-800 rounded-xl px-3 py-2 text-sm text-white"
                value={diasAfastamento}
                onChange={(e) => setDiasAfastamento(Math.max(0, Number(e.target.value)))}
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Data de retorno</label>
              <input
                type="date"
                className="w-full bg-dark-input border border-gray-800 rounded-xl px-3 py-2 text-sm text-white"
                value={dataRetorno}
                onChange={(e) => setDataRetorno(e.target.value)}
              />
            </div>
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
              {saving ? 'Salvando...' : 'Salvar Atestado'}
            </button>
          </div>
        </div>
      )}

      {/* list */}
      {loading ? (
        <div className="text-gray-400 text-sm">Carregando atestados...</div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/40 text-red-400 p-3 rounded-xl text-sm">{error}</div>
      ) : items.length === 0 ? (
        <div className="bg-dark-card border border-gray-800 rounded-2xl p-6 text-center text-gray-500 text-sm">
          Nenhum atestado registrado ainda.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="bg-dark-card border border-gray-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="space-y-0.5">
                  <div className="text-xs text-gray-400">{formatDate(item.created_at)}</div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {item.cid && (
                    <span className="text-xs bg-brand-blue/20 text-blue-300 border border-brand-blue/30 rounded-lg px-2 py-0.5">
                      CID {item.cid}
                    </span>
                  )}
                  {item.dias_afastamento > 0 && (
                    <span className="text-xs bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded-lg px-2 py-0.5">
                      {item.dias_afastamento} {item.dias_afastamento === 1 ? 'dia' : 'dias'} de afastamento
                    </span>
                  )}
                  {item.data_retorno && (
                    <span className="text-xs bg-green-500/10 text-green-300 border border-green-500/30 rounded-lg px-2 py-0.5">
                      Retorno: {formatDateOnly(item.data_retorno)}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-sm text-white whitespace-pre-wrap leading-relaxed">
                {getConteudo(item) || <span className="text-gray-500 italic">Sem conteúdo.</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
