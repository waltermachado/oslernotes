import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import AgendaDayView from '../../components/clinico/AgendaDayView'
import type { Appointment } from '../../components/clinico/AppointmentCard'
import { cn } from '../../lib/utils'

type ViewMode = 'day' | 'week' | 'month'

export default function ClinicoAgendaPage() {
  const [mode, setMode] = useState<ViewMode>('day')
  const [date, setDate] = useState(() => new Date(2024, 9, 24, 10, 45))
  const now = useMemo(() => new Date(date), [date])

  const subtitle = useMemo(() => {
    const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(date)
    const day = date.getDate()
    const month = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(date)
    const year = date.getFullYear()
    return `${capitalize(weekday)}, ${day} de ${capitalize(month)} de ${year}`
  }, [date])

  const appointments = useMemo<Appointment[]>(
    () => [
      {
        id: 'a1',
        patientName: 'Ricardo Alencar',
        patientInitials: 'RA',
        description: 'Consulta de Rotina - Cardiologia',
        status: 'CONFIRMADO',
        startMinutes: 9 * 60,
        durationMinutes: 30,
      },
      {
        id: 'a2',
        patientName: 'Maria Silvia Santos',
        patientInitials: 'MS',
        description: 'Eletrocardiograma (ECG)',
        status: 'AGUARDANDO',
        startMinutes: 10 * 60,
        durationMinutes: 45,
      },
      {
        id: 'a3',
        patientName: 'João de Oliveira',
        patientInitials: 'JO',
        description: 'Retorno Pós-Cirúrgico',
        status: 'AGENDADO',
        startMinutes: 11 * 60,
        durationMinutes: 60,
      },
      {
        id: 'a3b',
        patientName: 'Amanda Ferreira',
        patientInitials: 'AF',
        description: 'Avaliação de Pressão Arterial',
        status: 'AGENDADO',
        startMinutes: 11 * 60 + 15,
        durationMinutes: 30,
      },
      {
        id: 'a4',
        patientName: 'Fernanda Lima',
        patientInitials: 'FL',
        description: 'Teste Ergométrico',
        status: 'CANCELADO',
        startMinutes: 14 * 60,
        durationMinutes: 45,
      },
      {
        id: 'a5',
        patientName: 'Carlos Henrique Pereira',
        patientInitials: 'CH',
        description: 'Consulta - Revisão de Exames e Ajuste de Medicação',
        status: 'AGUARDANDO',
        startMinutes: 10 * 60 + 30,
        durationMinutes: 30,
      },
    ],
    [],
  )

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Agenda Médica</h1>
            <p className="text-gray-400 text-sm mt-1">{subtitle}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 justify-start lg:justify-end">
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
          {mode === 'day' ? (
            <AgendaDayView date={date} now={now} appointments={appointments} />
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
