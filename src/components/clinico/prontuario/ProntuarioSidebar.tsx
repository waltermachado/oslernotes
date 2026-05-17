import { useEffect, useState } from 'react'
import type { PatientRecordLimited, PatientRecordFull } from './prontuarioTypes'
import { asRemedios, asStringArray } from './prontuarioFormat'
import { apiFetch } from '../../../lib/apiFetch'

export default function ProntuarioSidebar(props: {
  patient: PatientRecordLimited | PatientRecordFull
  token: string
  patientId: string
  role: 'admin' | 'medico' | 'atendente' | 'unknown'
}) {
  const p = props.patient as unknown as {
    alergias?: unknown
    doencas?: unknown
    medicamentos_em_uso?: unknown
    remedios?: unknown
  }

  const alergias = asStringArray(p.alergias)
  const doencas = asStringArray(p.doencas)

  const meds = (() => {
    const m1 = asRemedios(p.medicamentos_em_uso)
    const m2 = asRemedios(p.remedios)
    const merged = [...m1, ...m2]
    const seen = new Set<string>()
    return merged.filter((m) => {
      const key = `${m.nome}|${m.dosagem}|${m.frequencia}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  })()

  const [audit, setAudit] = useState<
    Array<{
      id: string
      action: string
      created_at: string
      actor_user_id: string | null
      actor?: { nome: string | null; email: string | null } | null
      metadata?: unknown
    }>
  >([])
  const [auditError, setAuditError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!props.token || !props.patientId) return
      if (props.role === 'atendente') return
      try {
        const res = await apiFetch(`/api/patients/${props.patientId}/audit`, {
          headers: { Authorization: `Bearer ${props.token}` },
        })
        const body = await res.json()
        if (!res.ok) throw new Error(body.error || 'Falha ao carregar auditoria')
        if (!cancelled) setAudit(body.items ?? [])
      } catch (e) {
        if (!cancelled) setAuditError(e instanceof Error ? e.message : 'Erro ao carregar auditoria')
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [props.patientId, props.role, props.token])

  function labelForAction(action: string) {
    if (action === 'patient.created') return 'Paciente criado'
    if (action === 'patient.updated') return 'Paciente atualizado'
    if (action === 'patient.photo_uploaded') return 'Foto enviada'
    if (action === 'queue.enqueued') return 'Enfileirado'
    if (action === 'queue.accepted') return 'Consulta aceita'
    if (action === 'queue.called') return 'Paciente chamado'
    if (action === 'queue.finished') return 'Atendimento finalizado'
    return action
  }

  return (
    <aside className="lg:col-span-4 space-y-6">
      <div className="bg-dark-card border border-gray-800 rounded-2xl p-6">
        <div className="text-sm font-semibold text-white">Alergias & Alertas</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {alergias.length ? (
            alergias.map((a) => (
              <span key={a} className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-300 border border-red-500/20">
                {a}
              </span>
            ))
          ) : (
            <div className="text-sm text-gray-400">Sem alertas registrados.</div>
          )}
        </div>
      </div>

      <div className="bg-dark-card border border-gray-800 rounded-2xl p-6">
        <div className="text-sm font-semibold text-white">Condições</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {doencas.length ? (
            doencas.map((d) => (
              <span key={d} className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-200 border border-amber-500/20">
                {d}
              </span>
            ))
          ) : (
            <div className="text-sm text-gray-400">Sem condições cadastradas.</div>
          )}
        </div>
      </div>

      <div className="bg-dark-card border border-gray-800 rounded-2xl p-6">
        <div className="text-sm font-semibold text-white">Medicações em Uso</div>
        <div className="mt-3 space-y-3">
          {meds.length ? (
            meds.map((m, idx) => (
              <div key={idx} className="border-l-2 border-brand-blue/40 pl-3">
                <div className="text-white text-sm font-semibold">{m.nome}</div>
                <div className="text-xs text-gray-400">{m.dosagem} • {m.frequencia}</div>
              </div>
            ))
          ) : (
            <div className="text-sm text-gray-400">Sem medicações registradas.</div>
          )}
        </div>
      </div>

      <div className="bg-dark-card border border-gray-800 rounded-2xl p-6">
        <div className="text-sm font-semibold text-white">Sinais Vitais</div>
        <div className="mt-3 text-sm text-gray-400">Sem registros no momento.</div>
      </div>

      {props.role !== 'atendente' ? (
        <div className="bg-dark-card border border-gray-800 rounded-2xl p-6">
          <div className="text-sm font-semibold text-white">Auditoria</div>
          {auditError ? <div className="mt-3 text-sm text-red-400">{auditError}</div> : null}
          <div className="mt-3 space-y-3">
            {audit.length ? (
              audit.slice(0, 6).map((a) => (
                <div key={a.id} className="text-sm">
                  <div className="text-white">{labelForAction(a.action)}</div>
                  <div className="text-xs text-gray-400">
                    {new Date(a.created_at).toLocaleString('pt-BR')} • {a.actor?.nome ?? a.actor?.email ?? a.actor_user_id ?? '—'}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-400">Sem registros.</div>
            )}
          </div>
        </div>
      ) : null}
    </aside>
  )
}
