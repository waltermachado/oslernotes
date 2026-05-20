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
        'absolute left-0 right-0 rounded-2xl border border-cream-300/70 overflow-hidden',
        'bg-sunken/55',
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
              'rounded-full bg-navy-100 flex items-center justify-center font-semibold text-ink-900 shrink-0',
              compact ? 'w-9 h-9 text-[11px]' : 'w-10 h-10 text-xs',
            )}
          >
            {appt.patientInitials}
          </div>
          <div className={cn('min-w-0 flex-1', compact ? 'flex items-center gap-2 min-h-0' : null)}>
            <div className={cn('min-w-0', compact ? 'flex-1' : null)}>
              <div className={cn('font-semibold text-ink-900 truncate', compact ? 'text-sm leading-tight' : 'text-sm leading-snug')}>
                {appt.patientName}
              </div>
              {!compact ? (
                <div className="text-xs text-ink-500 truncate mt-0.5 leading-snug">{appt.description}</div>
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
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium border border-cream-300 text-ink-700 bg-cream-200/60">
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
      pill: 'bg-sage-50 text-sage-400 border-sage-100',
    }
  }
  if (status === 'AGUARDANDO') {
    return {
      border: 'border-l-yellow-500',
      pill: 'bg-clay-50 text-clay-400 border-yellow-500/20',
    }
  }
  if (status === 'AGENDADO') {
    return {
      border: 'border-l-blue-500',
      pill: 'bg-navy-500/10 text-navy-500 border-brand-blue/20',
    }
  }
  return {
    border: 'border-l-red-500',
    pill: 'bg-rose-50 text-red-400 border-rose-100',
  }
}
