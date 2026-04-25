import { ShieldAlert, Save, Pencil, X } from 'lucide-react'
import { useMemo, useState } from 'react'

import type { PatientRecordFull, PatientRecordLimited } from './prontuarioTypes'

export default function ProntuarioFichaClinica(props: {
  visibility: 'limited' | 'full'
  patient: PatientRecordLimited | PatientRecordFull
  token: string
  patientId: string
  onPatientUpdated: (next: PatientRecordFull) => void
}) {
  const canEdit = props.visibility === 'full'

  const fullPatient = props.patient as PatientRecordFull

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [queixa, setQueixa] = useState(fullPatient.queixa_principal ?? '')
  const [historico, setHistorico] = useState(fullPatient.historico_breve_doencas ?? '')
  const [futuras, setFuturas] = useState(fullPatient.futuras_anotacoes ?? '')
  const [doencasText, setDoencasText] = useState((fullPatient.doencas ?? []).join(', '))

  const remediosText = useMemo(() => {
    const list = fullPatient.remedios ?? []
    return list.map((r) => `${r.nome} | ${r.dosagem} | ${r.frequencia}`).join('\n')
  }, [fullPatient.remedios])

  const [remediosRaw, setRemediosRaw] = useState(remediosText)

  async function onSave() {
    setSaving(true)
    setError(null)
    try {
      const doencas = doencasText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)

      const remedios = remediosRaw
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [nome, dosagem, frequencia] = line.split('|').map((p) => (p ?? '').trim())
          return { nome, dosagem, frequencia }
        })
        .filter((r) => r.nome && r.dosagem && r.frequencia)

      const res = await fetch(`/api/patients/${props.patientId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${props.token}`,
        },
        body: JSON.stringify({
          queixa_principal: queixa,
          historico_breve_doencas: historico,
          futuras_anotacoes: futuras,
          doencas,
          remedios,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Falha ao salvar prontuário')

      props.onPatientUpdated(body.patient)
      setEditing(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  function onCancel() {
    setEditing(false)
    setError(null)
    setQueixa(fullPatient.queixa_principal ?? '')
    setHistorico(fullPatient.historico_breve_doencas ?? '')
    setFuturas(fullPatient.futuras_anotacoes ?? '')
    setDoencasText((fullPatient.doencas ?? []).join(', '))
    setRemediosRaw(remediosText)
  }

  return (
    <section className="space-y-6">
      {props.visibility === 'limited' ? (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-200 rounded-2xl p-4 flex gap-3">
          <ShieldAlert className="w-5 h-5 mt-0.5" />
          <div className="text-sm">Conteúdo clínico narrativo (histórico/queixa/anotações) é visível apenas para médicos.</div>
        </div>
      ) : null}

      {canEdit ? (
        <div className="flex items-center justify-end gap-2">
          {!editing ? (
            <button
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-900/40 border border-gray-800 text-gray-200 hover:bg-gray-900/60"
              onClick={() => setEditing(true)}
              type="button"
            >
              <Pencil className="w-4 h-4" />
              Editar
            </button>
          ) : (
            <>
              <button
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-900/40 border border-gray-800 text-gray-200 hover:bg-gray-900/60"
                onClick={onCancel}
                type="button"
                disabled={saving}
              >
                <X className="w-4 h-4" />
                Cancelar
              </button>
              <button
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-brand-blue hover:bg-blue-600 text-white disabled:opacity-60"
                onClick={onSave}
                type="button"
                disabled={saving}
              >
                <Save className="w-4 h-4" />
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </>
          )}
        </div>
      ) : null}

      {error ? <div className="bg-red-500/10 border border-red-500/40 text-red-400 p-3 rounded-xl">{error}</div> : null}

      <div className="bg-dark-card border border-gray-800 rounded-2xl p-6">
        <div className="text-xs font-semibold tracking-[0.2em] uppercase text-gray-400">Atendimento Atual</div>
        <div className="mt-4 grid grid-cols-1 gap-4">
          <div>
            <div className="text-sm text-gray-400">Queixa principal</div>
            <div className="mt-1 text-white">
              {props.visibility === 'full' ? (
                editing ? (
                  <input
                    className="w-full bg-dark-input border border-gray-800 rounded-xl px-3 py-2 text-sm text-white"
                    value={queixa}
                    onChange={(e) => setQueixa(e.target.value)}
                  />
                ) : (
                  fullPatient.queixa_principal ?? '-'
                )
              ) : (
                '—'
              )}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-400">Histórico / HDA</div>
            <div className="mt-1 text-white whitespace-pre-wrap">
              {props.visibility === 'full' ? (
                editing ? (
                  <textarea
                    rows={6}
                    className="w-full bg-dark-input border border-gray-800 rounded-xl px-3 py-2 text-sm text-white"
                    value={historico}
                    onChange={(e) => setHistorico(e.target.value)}
                  />
                ) : (
                  fullPatient.historico_breve_doencas ?? '-'
                )
              ) : (
                '—'
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-dark-card border border-gray-800 rounded-2xl p-6">
        <div className="text-xs font-semibold tracking-[0.2em] uppercase text-gray-400">Doenças e Remédios</div>
        <div className="mt-4 grid grid-cols-1 gap-4">
          <div>
            <div className="text-sm text-gray-400">Doenças (separe por vírgula)</div>
            <div className="mt-1 text-white whitespace-pre-wrap">
              {props.visibility === 'full' ? (
                editing ? (
                  <input
                    className="w-full bg-dark-input border border-gray-800 rounded-xl px-3 py-2 text-sm text-white"
                    value={doencasText}
                    onChange={(e) => setDoencasText(e.target.value)}
                  />
                ) : (
                  ((fullPatient.doencas ?? []) as string[]).join(', ') || '-'
                )
              ) : (
                '—'
              )}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-400">Remédios (1 por linha: Nome | Dosagem | Frequência)</div>
            <div className="mt-1 text-white whitespace-pre-wrap">
              {props.visibility === 'full' ? (
                editing ? (
                  <textarea
                    rows={6}
                    className="w-full bg-dark-input border border-gray-800 rounded-xl px-3 py-2 text-sm text-white"
                    value={remediosRaw}
                    onChange={(e) => setRemediosRaw(e.target.value)}
                  />
                ) : (
                  (fullPatient.remedios ?? []).length ? (
                    <div className="space-y-2">
                      {(fullPatient.remedios ?? []).map((r, idx) => (
                        <div key={idx} className="border-l-2 border-brand-blue pl-3">
                          <div className="text-white font-semibold text-sm">{r.nome}</div>
                          <div className="text-gray-400 text-xs">
                            {r.dosagem} • {r.frequencia}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    '-'
                  )
                )
              ) : (
                '—'
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-dark-card border border-gray-800 rounded-2xl p-6">
        <div className="text-xs font-semibold tracking-[0.2em] uppercase text-gray-400">Futuras Anotações</div>
        <div className="mt-3 text-white whitespace-pre-wrap">
          {props.visibility === 'full' ? (
            editing ? (
              <textarea
                rows={5}
                className="w-full bg-dark-input border border-gray-800 rounded-xl px-3 py-2 text-sm text-white"
                value={futuras}
                onChange={(e) => setFuturas(e.target.value)}
              />
            ) : (
              fullPatient.futuras_anotacoes ?? '-'
            )
          ) : (
            '—'
          )}
        </div>
      </div>
    </section>
  )
}
