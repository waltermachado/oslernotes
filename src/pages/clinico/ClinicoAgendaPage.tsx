import { ChevronLeft, ChevronRight, RefreshCcw } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import AgendaDayView from '../../components/clinico/AgendaDayView'
import type { Appointment, AppointmentStatus } from '../../components/clinico/AppointmentCard'
import { useAuth } from '../../context/AuthContext'
import { apiFetch } from '../../lib/apiFetch'
import { cn } from '../../lib/utils'

type ViewMode = 'day' | 'week' | 'month'

type QueueItem = {
  id: string
  paciente_id: string
  status: 'aguardando' | 'agendado' | 'em_atendimento' | 'finalizado'
  prioridade: number | null
  scheduled_time: string | null
  pacientes?: {
    id: string
    nome_completo: string
  } | null
}

function toAppointmentStatus(s: QueueItem['status']): AppointmentStatus {
  if (s === 'em_atendimento') return 'CONFIRMADO'
  if (s === 'aguardando') return 'AGUARDANDO'
  if (s === 'finalizado') return 'CANCELADO'
  return 'AGENDADO'
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

export default function ClinicoAgendaPage() {
  const { session } = useAuth()
  const token = session?.access_token

  const [mode, setMode] = useState<ViewMode>('day')
  const [date, setDate] = useState(() => new Date())
  const [now, setNow] = useState(() => new Date())
  const [items, setItems] = useState<QueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Atualiza o marcador de hora atual a cada minuto
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => {
    intervalRef.current = setInterval(() => setNow(new Date()), 60_000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch('/api/queue?status=agendado,aguardando,em_atendimento', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const body = await res.json() as { items?: QueueItem[]; error?: string }
      if (!res.ok) throw new Error(body.error || 'Falha ao carregar agenda')
      setItems(body.items ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar agenda')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { load() }, [load])

  const subtitle = useMemo(() => {
    const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(date)
    const day = date.getDate()
    const month = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(date)
    const year = date.getFullYear()
    return `${capitalize(weekday)}, ${day} de ${capitalize(month)} de ${year}`
  }, [date])

  const appointments = useMemo<Appointment[]>(() => {
    return items
      .filter((item) => item.scheduled_time && isSameDay(new Date(item.scheduled_time), date))
      .map((item) => {
        const dt = new Date(item.scheduled_time!)
        const startMinutes = dt.getHours() * 60 + dt.getMinutes()
        const name = item.pacientes?.nome_completo ?? 'Paciente'
        return {
          id: item.id,
          patientName: name,
          patientInitials: initials(name),
          description: 'Consulta agendada',
          status: toAppointmentStatus(item.status),
          startMinutes,
          durationMinutes: 30,
        }
      })
      .sort((a, b) => a.startMinutes - b.startMinutes)
  }, [items, date])

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Agenda Médica</h1>
            <p className="text-gray-400 text-sm mt-1">{subtitle}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 justify-start lg:justify-end">
            <button
              type="button"
              aria-label="Atualizar agenda"
              onClick={load}
              className="p-2.5 rounded-xl bg-dark-card border border-gray-800 text-gray-400 hover:text-white hover:bg-gray-800/40 transition-colors"
            >
              <RefreshCcw className={cn('w-4 h-4', loading && 'animate-spin')} />
            </button>

            <div className="flex items-center bg-dark-card border border-gray-800 rounded-xl overflow-hidden">
              <SegmentButton active={mode === 'day'} onClick={() => setMode('day')}>
                Dia
              </SegmentButton>
              <SegmentButton active={mode === 'week'} onClick={() => setMode('week')}>
                Semana
              </SegmentButton>
              <SegmentButton active={mode === 'month'} onClick={() => setMode('month')}>
                Mês
              </SegmentButton>
            </div>

            <div className="flex items-center bg-dark-card border border-gray-800 rounded-xl overflow-hidden">
              <IconButton ariaLabel="Anterior" onClick={() => setDate((d) => addDays(d, -1))}>
                <ChevronLeft className="w-4 h-4" />
              </IconButton>
              <button
                className="px-4 py-2.5 text-sm font-medium text-gray-200 hover:bg-gray-800/40 transition-colors"
                onClick={() => setDate(new Date())}
              >
                Hoje
              </button>
              <IconButton ariaLabel="Próximo" onClick={() => setDate((d) => addDays(d, 1))}>
                <ChevronRight className="w-4 h-4" />
              </IconButton>
            </div>
          </div>
        </div>

        <div className="mt-6">
          {error && (
            <div className="mb-4 bg-red-500/10 border border-red-500/40 text-red-400 px-4 py-3 rounded-2xl text-sm">
              {error}
            </div>
          )}
          {mode === 'day' ? (
            loading && appointments.length === 0 ? (
              <div className="bg-dark-card border border-gray-800 rounded-2xl p-10 text-center text-gray-400 text-sm">
                Carregando agenda...
              </div>
            ) : (
              <AgendaDayView date={date} now={now} appointments={appointments} />
            )
          ) : (
            <div className="bg-dark-card border border-gray-800 rounded-2xl p-10 text-center text-gray-300">
              Visualização {mode === 'week' ? 'Semanal' : 'Mensal'} em breve.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SegmentButton(props: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={cn(
        'px-4 py-2 text-sm font-medium transition-colors',
        props.active ? 'bg-gray-800/60 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800/40',
      )}
    >
      {props.children}
    </button>
  )
}

function IconButton(props: { ariaLabel: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={props.ariaLabel}
      onClick={props.onClick}
      className="px-3 py-2.5 text-gray-300 hover:bg-gray-800/40 hover:text-white transition-colors"
    >
      {props.children}
    </button>
  )
}

function addDays(date: Date, deltaDays: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + deltaDays)
  return d
}

function capitalize(value: string) {
  if (!value) return value
  return value[0].toUpperCase() + value.slice(1)
}
