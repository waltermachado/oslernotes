import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { cn } from '../../../lib/utils'
import { useAuth } from '../../../context/AuthContext'

type BadgeStatus = 'PRESENTE' | 'AGENDADO' | 'ATRASADO'

type PatientRef = {
  id: string
  nome_completo: string
  cpf: string | null
  sexo: string | null
  data_nascimento: string | null
  foto_path: string | null
}

type QueueItem = {
  id: string
  paciente_id: string
  medico_id: string | null
  status: string
  prioridade: number
  scheduled_time: string | null
  data_hora_inicio: string | null
  data_hora_fim: string | null
  created_at: string
  pacientes?: PatientRef | null
}

export default function ClinicoPainelUpcoming() {
  const { session, user } = useAuth()
  const token = session?.access_token
  const navigate = useNavigate()

  const [items, setItems] = useState<QueueItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isMedico = user?.papel === 'medico'
  const basePath = isMedico ? '/medico' : '/clinico'

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const url = new URL('/api/queue', window.location.origin)
      url.searchParams.set('status', 'aguardando,agendado')
      if (isMedico) {
        url.searchParams.set('mine', '1')
      }

      const res = await fetch(url.pathname + url.search, { headers: { Authorization: `Bearer ${token}` } })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Falha ao carregar próximos pacientes')

      let fetchedItems = body.items ?? []

      fetchedItems = fetchedItems.slice(0, 5)

      setItems(fetchedItems)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar')
    } finally {
      setLoading(false)
    }
  }, [token, isMedico])

  useEffect(() => {
    load()
  }, [load])

  async function handleCall(item: QueueItem) {
    if (!token) return

    if (item.status === 'aguardando' && item.medico_id === null && isMedico) {
      await fetch(`/api/queue/${item.id}/accept`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
    }

    const res = await fetch(`/api/queue/${item.id}/call`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(body.error || 'Falha ao chamar paciente')
      return
    }
    navigate(`${basePath}/prontuarios/${item.paciente_id}`)
  }

  return (
    <section className="bg-dark-card border border-gray-800 rounded-2xl overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-800 flex items-center justify-between gap-4">
        <div className="text-lg font-semibold tracking-tight">Próximos Pacientes</div>
        <Link to={`${basePath}/agenda`} className="text-sm font-semibold text-brand-blue hover:text-blue-400 transition-colors">
          Ver agenda completa
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[11px] uppercase tracking-[0.18em] text-gray-500 bg-black/20">
              <th className="px-6 py-4 font-semibold">Horário</th>
              <th className="px-6 py-4 font-semibold">Paciente</th>
              <th className="px-6 py-4 font-semibold">Status</th>
              <th className="px-6 py-4 font-semibold">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {!loading && error && items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-amber-400 text-sm">
                  {error}
                </td>
              </tr>
            )}
            {loading && items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-gray-400 text-sm">
                  Carregando...
                </td>
              </tr>
            )}
            {!loading && !error && items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-gray-500 text-sm">
                  Nenhum paciente agendado ou aguardando.
                </td>
              </tr>
            )}
            {items.map((r) => {
              const scheduledDate = r.scheduled_time ? new Date(r.scheduled_time) : new Date(r.created_at)

              const timeStr = formatHHmm(scheduledDate)

              let statusLabel = 'PRESENTE'
              let sClass: BadgeStatus = 'PRESENTE'

              if (r.status === 'aguardando') {
                statusLabel = 'PRESENTE'
                sClass = 'PRESENTE'
              } else if (r.status === 'agendado') {
                if (r.scheduled_time && isPastLocal(scheduledDate) && isTodayLocal(scheduledDate)) {
                  statusLabel = 'ATRASADO'
                  sClass = 'ATRASADO'
                } else {
                  statusLabel = 'AGENDADO'
                  sClass = 'AGENDADO'
                }
              }

              const patientName = r.pacientes?.nome_completo || 'Paciente'
              const initials = getInitials(patientName)

              return (
                <tr key={r.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 text-sm font-semibold text-brand-blue w-[110px]">{timeStr}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-gray-700/50 flex items-center justify-center text-xs font-semibold text-gray-100">
                        {initials}
                      </div>
                      <div className="text-sm text-gray-100 font-medium truncate max-w-[220px]">{patientName}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 w-[140px]">
                    <span className={cn('px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase', badgeClass(sClass))}>
                      {statusLabel}
                    </span>
                  </td>
                  <td className="px-6 py-4 w-[140px]">
                    {sClass === 'PRESENTE' && isMedico ? (
                      <button
                        onClick={() => handleCall(r)}
                        className="inline-flex items-center justify-center px-3 py-1.5 bg-brand-blue text-white text-xs font-semibold rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        Atender
                      </button>
                    ) : (
                      <Link
                        to={`${basePath}/prontuarios/${r.paciente_id}`}
                        className="inline-flex items-center justify-center px-3 py-1.5 border border-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-800/40 transition-colors text-gray-300"
                      >
                        Prontuário
                      </Link>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function badgeClass(status: BadgeStatus) {
  if (status === 'PRESENTE') return 'bg-brand-green/10 text-brand-green'
  if (status === 'ATRASADO') return 'bg-amber-500/10 text-amber-500'
  return 'bg-brand-blue/10 text-brand-blue'
}

function isTodayLocal(date: Date) {
  const now = new Date()
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  )
}

function isPastLocal(date: Date) {
  return date.getTime() < Date.now()
}

function formatHHmm(date: Date) {
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

function getInitials(name: string) {
  const words = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (words.length === 0) return '--'
  const first = words[0]?.[0] ?? ''
  const last = words.length > 1 ? words[words.length - 1]?.[0] ?? '' : words[0]?.[1] ?? ''
  return `${first}${last}`.toUpperCase()
}
