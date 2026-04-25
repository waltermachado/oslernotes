import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { useAuth } from '../../context/AuthContext'
import { allowedProntuarioTabs, type ProntuarioTabKey, prontuarioVisibilityLevel } from '../../utils/prontuarioAccess'
import ProntuarioPatientHeader from '../../components/clinico/prontuario/ProntuarioPatientHeader'
import ProntuarioTabs from '../../components/clinico/prontuario/ProntuarioTabs'
import ProntuarioSidebar from '../../components/clinico/prontuario/ProntuarioSidebar'
import ProntuarioFichaClinica from '../../components/clinico/prontuario/ProntuarioFichaClinica'
import type { RecordResponse } from '../../components/clinico/prontuario/prontuarioTypes'

export default function ClinicoProntuarioPacientePage() {
  const { patientId } = useParams()
  const { session, user } = useAuth()
  const token = session?.access_token

  const role = user?.papel === 'admin' || user?.papel === 'medico' || user?.papel === 'atendente' ? user.papel : 'unknown'
  const visibility = prontuarioVisibilityLevel(role)
  const tabs = allowedProntuarioTabs(role)
  const [active, setActive] = useState<ProntuarioTabKey>('ficha')

  const [data, setData] = useState<RecordResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!tabs.includes(active) && tabs.length) setActive(tabs[0])
  }, [active, tabs])

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!token || !patientId) return
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/patients/${patientId}/record`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const body = (await res.json()) as RecordResponse & { error?: string }
        if (!res.ok) throw new Error(body.error || 'Falha ao carregar prontuário')
        if (!cancelled) setData(body)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erro ao carregar prontuário')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [token, patientId])

  const patient = data?.patient

  if (loading) return <div className="text-gray-400">Carregando prontuário...</div>
  if (error) return <div className="bg-red-500/10 border border-red-500/40 text-red-400 p-4 rounded-2xl">{error}</div>
  if (!patient || visibility === 'none') return <div className="text-gray-400">Prontuário indisponível.</div>

  return (
    <div className="space-y-6">
      <ProntuarioPatientHeader patient={patient} onExport={() => window.print()} />
      <ProntuarioTabs tabs={tabs} active={active} onChange={setActive} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          {active === 'ficha' ? (
            <ProntuarioFichaClinica
              visibility={visibility}
              patient={patient}
              token={token ?? ''}
              patientId={patientId ?? ''}
              onPatientUpdated={(next) => setData((prev) => (prev ? { ...prev, patient: next } : prev))}
            />
          ) : (
            <div className="bg-dark-card border border-gray-800 rounded-2xl p-6 text-gray-400">Em breve.</div>
          )}
        </div>
        <ProntuarioSidebar patient={patient} token={token ?? ''} patientId={patientId ?? ''} role={role} />
      </div>
    </div>
  )
}
