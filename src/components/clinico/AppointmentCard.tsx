import { cn } from '../../lib/utils'

export type AppointmentStatus = 'CONFIRMADO' | 'AGUARDANDO' | 'AGENDADO' | 'CANCELADO'

export type Appointment = {
  id: string
  patientName: string
  patientInitials: string
  description: string
  status: AppointmentStatus
  startMinutes: number
  durationMinutes: number
}

export default function AppointmentCard(props: { appt: Appointment; top: number; height: number }) {
  const { appt } = props
  const compact = props.height < 72
  const style = { top: props.top, height: props.height }

  const accent = statusAccent(appt.status)
  const muted = appt.status === 'CANCELADO'

  return (
    <div
      className={cn(
        'absolute left-0 right-0 rounded-2xl border border-gray-800/70 overflow-hidden',
        'bg-dark-input/55',
        muted ? 'opacity-55' : null,
      )}
      style={style}
    >
      <div className={cn('h-full flex', accent.border)}>
        <div className="w-1.5" />
        <div
          className={cn(
            'flex-1 min-w-0 flex gap-3 sm:gap-4',
            compact ? 'px-3 py-2 items-center' : 'p-4 items-start',
          )}
        >
          <div
            className={cn(
              'rounded-full bg-gray-700/60 flex items-center justify-center font-semibold text-gray-100 shrink-0',
              compact ? 'w-9 h-9 text-[11px]' : 'w-10 h-10 text-xs',
            )}
          >
            {appt.patientInitials}
          </div>
          <div className={cn('min-w-0 flex-1', compact ? 'flex items-center gap-2 min-h-0' : null)}>
            <div className={cn('min-w-0', compact ? 'flex-1' : null)}>
              <div className={cn('font-semibold text-white truncate', compact ? 'text-sm leading-tight' : 'text-sm leading-snug')}>
                {appt.patientName}
              </div>
              {!compact ? (
                <div className="text-xs text-gray-400 truncate mt-0.5 leading-snug">{appt.description}</div>
              ) : null}
            </div>
            <div className={cn('flex items-center gap-2', compact ? 'flex-wrap justify-end' : 'mt-3 flex-wrap')}>
              <span
                className={cn(
                  'inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide border leading-none',
                  accent.pill,
                )}
              >
                {appt.status}
              </span>
              {!compact && appt.durationMinutes ? (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium border border-gray-700 text-gray-300 bg-gray-800/40">
                  {formatDuration(appt.durationMinutes)}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function formatDuration(mins: number) {
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

function statusAccent(status: AppointmentStatus) {
  if (status === 'CONFIRMADO') {
    return {
      border: 'border-l-green-500',
      pill: 'bg-green-500/10 text-brand-green border-green-500/20',
    }
  }
  if (status === 'AGUARDANDO') {
    return {
      border: 'border-l-yellow-500',
      pill: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20',
    }
  }
  if (status === 'AGENDADO') {
    return {
      border: 'border-l-blue-500',
      pill: 'bg-brand-blue/10 text-brand-blue border-brand-blue/20',
    }
  }
  return {
    border: 'border-l-red-500',
    pill: 'bg-red-500/10 text-red-400 border-red-500/20',
  }
}
