import React, { useEffect, useState } from 'react'
import { useParams, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { apiFetch } from '../../lib/apiFetch'

type Patient = {
  id: string
  nome_completo: string
  data_nascimento: string
  sexo: 'Masculino' | 'Feminino' | null
  historico_breve_doencas: string | null
  queixa_principal: string | null
  doencas: string[] | null
  remedios: Array<{ nome: string; dosagem: string; frequencia: string }> | null
  futuras_anotacoes: string | null
  foto_url: string | null
}

function calcAge(dateIso: string) {
  const d = new Date(dateIso)
  const now = new Date()
  let age = now.getFullYear() - d.getFullYear()
  const m = now.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--
  return Math.max(0, age)
}

export default function ClinicoPacienteMockViewPage() {
  const { patientId } = useParams()
  const { session } = useAuth()
  const token = session?.access_token
  const location = useLocation()
  const basePath = location.pathname.startsWith('/medico') ? '/medico' : '/clinico'

  const [patient, setPatient] = useState<Patient | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!patientId || !token) return
      setLoading(true)
      setError(null)
      try {
        const res = await apiFetch(`/api/patients/${patientId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const body = await res.json()
        if (!res.ok) throw new Error(body.error || 'Falha ao carregar paciente')
        if (!cancelled) setPatient(body.patient)
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

  if (loading) return <div className="text-gray-400">Carregando...</div>
  if (error) return <div className="text-red-400">{error}</div>
  if (!patient) return <div className="text-gray-400">Paciente não encontrado.</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Visualização do Paciente (Mock)</h1>
          <p className="text-gray-400 text-sm">Prévia futura de acesso do paciente</p>
        </div>
        <Link className="text-brand-blue hover:underline" to={`${basePath}/pacientes`}>
          Voltar
        </Link>
      </div>

      <div className="bg-dark-card border border-gray-800/50 rounded-2xl p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-brand-blue/20 overflow-hidden flex items-center justify-center">
          {patient.foto_url ? (
            <img src={patient.foto_url} className="w-full h-full object-cover" />
          ) : (
            <span className="text-brand-blue font-bold text-xl">{patient.nome_completo.slice(0, 1).toUpperCase()}</span>
          )}
        </div>
        <div className="min-w-0">
          <div className="text-white font-semibold truncate">{patient.nome_completo}</div>
          <div className="text-gray-400 text-sm">
            {calcAge(patient.data_nascimento)} anos{patient.sexo ? `, ${patient.sexo}` : ''}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-dark-card border border-gray-800/50 rounded-2xl p-5">
            <div className="text-xs text-gray-400 mb-2">HISTÓRICO</div>
            <div className="text-white whitespace-pre-wrap">{patient.historico_breve_doencas ?? '-'}</div>
          </div>
          <div className="bg-dark-card border border-gray-800/50 rounded-2xl p-5">
            <div className="text-xs text-gray-400 mb-2">FUTURAS ANOTAÇÕES</div>
            <div className="text-white whitespace-pre-wrap">{patient.futuras_anotacoes ?? '-'}</div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-4">
          <div className="bg-dark-card border border-gray-800/50 rounded-2xl p-5">
            <div className="text-xs text-gray-400 mb-3">DOENÇAS</div>
            <div className="space-y-2">
              {(patient.doencas ?? []).length ? (
                (patient.doencas ?? []).map((d) => (
                  <div key={d} className="px-3 py-2 rounded-xl bg-gray-900/40 text-white text-sm">
                    {d}
                  </div>
                ))
              ) : (
                <div className="text-gray-400 text-sm">-</div>
              )}
            </div>
          </div>

          <div className="bg-dark-card border border-gray-800/50 rounded-2xl p-5">
            <div className="text-xs text-gray-400 mb-3">REMÉDIOS</div>
            <div className="space-y-3">
              {(patient.remedios ?? []).length ? (
                (patient.remedios ?? []).map((r, idx) => (
                  <div key={idx} className="border-l-2 border-brand-blue pl-3">
                    <div className="text-white font-semibold text-sm">{r.nome}</div>
                    <div className="text-gray-400 text-xs">{r.dosagem} • {r.frequencia}</div>
                  </div>
                ))
              ) : (
                <div className="text-gray-400 text-sm">-</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
