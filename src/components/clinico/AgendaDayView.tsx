import { cn } from '../../lib/utils'
import AppointmentCard, { type Appointment } from './AppointmentCard'

export default function AgendaDayView(props: {
  date: Date
  now: Date
  appointments: Appointment[]
}) {
  const startHour = 8
  const endHour = 15
  const rowHeight = 108

  const hours = [] as number[]
  for (let h = startHour; h < endHour; h++) hours.push(h)

  const totalHeight = (endHour - startHour) * rowHeight
  const todayLabel = formatDayHeader(props.date)

  const nowMinutes = props.now.getHours() * 60 + props.now.getMinutes()
  const markerTop = clamp(((nowMinutes - startHour * 60) / 60) * rowHeight, 0, totalHeight)
  const markerLabel = formatTime(props.now)

  return (
    <div className="bg-surface border border-cream-300 rounded-2xl overflow-hidden">
      <div className="grid grid-cols-[56px_1fr] sm:grid-cols-[72px_1fr]">
        <div className="h-14 border-b border-cream-300 bg-surface/30" />
        <div className="h-14 border-b border-cream-300 bg-surface/30 flex items-center px-6">
          <div className="flex items-baseline gap-2">
            <div className="text-lg font-semibold tracking-tight text-ink-900">{todayLabel.day}</div>
            <div className="text-xs text-ink-500 uppercase tracking-[0.18em]">{todayLabel.weekday}</div>
          </div>
        </div>

        <div className="relative" style={{ height: totalHeight }}>
          {hours.map((h) => (
            <div
              key={h}
              className="absolute left-0 right-0 border-b border-cream-300/70"
              style={{ top: (h - startHour) * rowHeight, height: rowHeight }}
            >
              <div className="h-full flex items-start justify-end pr-3 pt-3 text-xs text-ink-500 tabular-nums">
                {formatHour(h)}
              </div>
            </div>
          ))}
        </div>

        <div className="relative" style={{ height: totalHeight }}>
          {hours.map((h) => (
            <div
              key={h}
              className="absolute left-0 right-0 border-b border-cream-300/70"
              style={{ top: (h - startHour) * rowHeight, height: rowHeight }}
            />
          ))}

          <div className="absolute left-3 right-3 sm:left-6 sm:right-6" style={{ top: 0, bottom: 0 }}>
            <div className="relative w-full h-full">
              <div
                className="absolute left-0 right-0 border-t border-brand-blue/60 pointer-events-none z-0"
                style={{ top: markerTop }}
              >
                <span className="absolute -left-12 sm:-left-16 -top-3 bg-navy-500 text-ink-900 text-[10px] font-semibold px-2 py-1 rounded-md tabular-nums shadow-sm z-20">
                  {markerLabel}
                </span>
              </div>

              <div
                className="absolute left-0 right-0 flex items-center justify-center"
                style={{ top: ((12 * 60 - startHour * 60) / 60) * rowHeight + 28 }}
              >
                <span className="text-[10px] uppercase tracking-[0.25em] text-gray-600">INTERVALO DE ALMOÇO</span>
              </div>

              {props.appointments.map((appt) => {
                const top = ((appt.startMinutes - startHour * 60) / 60) * rowHeight
                const height = (appt.durationMinutes / 60) * rowHeight
                return <AppointmentCard key={appt.id} appt={appt} top={top} height={height} />
              })}
            </div>
          </div>

          <div
            className={cn('absolute left-0 right-0', 'border-t border-cream-300/70')}
            style={{ top: 0 }}
          />
        </div>
      </div>
    </div>
  )
}

function formatHour(h: number) {
  return `${String(h).padStart(2, '0')}:00`
}

function formatTime(d: Date) {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(d)
}

function formatDayHeader(d: Date) {
  const day = d.getDate()
  const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(d)
  return {
    day: String(day),
    weekday: weekday.toUpperCase(),
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}
