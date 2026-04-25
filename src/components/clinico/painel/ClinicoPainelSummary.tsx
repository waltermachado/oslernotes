import { ArrowDownRight, ArrowUpRight, CalendarCheck2, CircleDollarSign, ShieldAlert, UserCheck2 } from 'lucide-react'
import { useMemo, useState } from 'react'

import { cn } from '../../../lib/utils'
import { formatMaskedMoney, formatSignedPercent } from '../../../utils/clinicoDashboard'

type SummaryMetric = {
  key: string
  title: string
  value: string
  delta: number
  tone: 'blue' | 'green' | 'amber'
  icon: React.ComponentType<{ className?: string }>
  isMasked?: boolean
}

export default function ClinicoPainelSummary() {
  const [revealRevenue, setRevealRevenue] = useState(false)

  const metrics = useMemo<SummaryMetric[]>(
    () => [
      {
        key: 'consultas-dia',
        title: 'Consultas do Dia',
        value: '12',
        delta: 8,
        tone: 'blue',
        icon: CalendarCheck2,
      },
      {
        key: 'atendidos-mes',
        title: 'Atendidos (Mês)',
        value: '148',
        delta: -2,
        tone: 'green',
        icon: UserCheck2,
      },
      {
        key: 'faltas',
        title: 'Taxa de Faltas',
        value: '5%',
        delta: -1,
        tone: 'amber',
        icon: ShieldAlert,
      },
      {
        key: 'receita',
        title: 'Receita Mensal',
        value: formatMaskedMoney(32450.9, revealRevenue),
        delta: 3,
        tone: 'green',
        icon: CircleDollarSign,
        isMasked: true,
      },
    ],
    [revealRevenue],
  )

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metrics.map((m) => (
        <MetricCard
          key={m.key}
          metric={m}
          onToggleMask={
            m.isMasked
              ? () => {
                  setRevealRevenue((v) => !v)
                }
              : undefined
          }
          maskOn={!revealRevenue}
        />
      ))}
    </div>
  )
}

function MetricCard(props: {
  metric: SummaryMetric
  onToggleMask?: () => void
  maskOn: boolean
}) {
  const Icon = props.metric.icon
  const delta = formatSignedPercent(props.metric.delta)
  const up = props.metric.delta >= 0
  const DeltaIcon = up ? ArrowUpRight : ArrowDownRight

  const iconTone =
    props.metric.tone === 'blue'
      ? 'bg-brand-blue/10 text-brand-blue'
      : props.metric.tone === 'green'
        ? 'bg-brand-green/10 text-brand-green'
        : 'bg-amber-500/10 text-amber-500'

  return (
    <div className="bg-dark-card border border-gray-800 rounded-2xl p-6 hover:border-brand-blue/40 transition-colors">
      <div className="flex items-start justify-between">
        <div className={cn('p-3 rounded-xl', iconTone)}>
          <Icon className="w-5 h-5" />
        </div>

        <div className={cn('inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full', up ? 'bg-brand-green/10 text-brand-green' : 'bg-red-500/10 text-red-400')}>
          {delta}
          <DeltaIcon className="w-4 h-4" />
        </div>
      </div>

      <div className="mt-4 text-sm text-gray-400">{props.metric.title}</div>
      <div className="mt-1 flex items-center justify-between gap-3">
        <div className="text-2xl font-semibold tracking-tight">{props.metric.value}</div>
        {props.onToggleMask ? (
          <button
            type="button"
            onClick={props.onToggleMask}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-gray-800/40 text-gray-300 hover:bg-gray-800/70 transition-colors"
            aria-label={props.maskOn ? 'Mostrar valor' : 'Ocultar valor'}
          >
            {props.maskOn ? 'Mostrar' : 'Ocultar'}
          </button>
        ) : null}
      </div>
    </div>
  )
}

