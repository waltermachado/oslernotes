import { CalendarCheck2, CheckCircle2, Clock, UserCheck2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase'
import { cn } from '../../../lib/utils'

type SummaryMetric = {
  key: string
  title: string
  value: string
  tone: 'blue' | 'green' | 'amber'
  icon: React.ComponentType<{ className?: string }>
}

type MetricsData = {
  consultasDia: number | null
  atendidos: number | null
  aguardando: number | null
}

function todayISODate(): string {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export default function ClinicoPainelSummary() {
  const { user } = useAuth()
  const clinicaId = user?.clinica_id ?? null
  const isMedico = user?.papel === 'medico'

  const [data, setData] = useState<MetricsData>({ consultasDia: null, atendidos: null, aguardando: null })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let active = true

    async function load() {
      if (!clinicaId) return

      setLoading(true)
      try {
        const today = todayISODate()
        const startOfDay = `${today}T00:00:00`
        const endOfDay = `${today}T23:59:59`

        // Build base query filters shared across counts
        const applyBaseFilters = (q: ReturnType<typeof supabase.from>) => {
          let filtered = (q as unknown as ReturnType<typeof supabase.from<'atendimentos', unknown>>)
          filtered = filtered.eq('clinica_id', clinicaId)
          if (isMedico && user?.id) {
            filtered = filtered.eq('medico_id', user.id)
          }
          return filtered
        }

        // Consultas do Dia: scheduled_time in today range, status != cancelado
        let qDia = supabase
          .from('atendimentos')
          .select('id', { count: 'exact', head: true })
          .eq('clinica_id', clinicaId)
          .neq('status', 'cancelado')
          .gte('scheduled_time', startOfDay)
          .lte('scheduled_time', endOfDay)

        if (isMedico && user?.id) {
          qDia = qDia.eq('medico_id', user.id)
        }

        // Atendidos: status = finalizado, scheduled_time in today
        let qAtendidos = supabase
          .from('atendimentos')
          .select('id', { count: 'exact', head: true })
          .eq('clinica_id', clinicaId)
          .eq('status', 'finalizado')
          .gte('scheduled_time', startOfDay)
          .lte('scheduled_time', endOfDay)

        if (isMedico && user?.id) {
          qAtendidos = qAtendidos.eq('medico_id', user.id)
        }

        // Aguardando: status in (aguardando, agendado) — sem filtro de data, fila ativa
        let qAguardando = supabase
          .from('atendimentos')
          .select('id', { count: 'exact', head: true })
          .eq('clinica_id', clinicaId)
          .in('status', ['aguardando', 'agendado'])

        if (isMedico && user?.id) {
          qAguardando = qAguardando.eq('medico_id', user.id)
        }

        const [resDia, resAtendidos, resAguardando] = await Promise.all([qDia, qAtendidos, qAguardando])

        if (!active) return

        setData({
          consultasDia: resDia.error ? null : (resDia.count ?? 0),
          atendidos: resAtendidos.error ? null : (resAtendidos.count ?? 0),
          aguardando: resAguardando.error ? null : (resAguardando.count ?? 0),
        })
      } catch {
        // silently ignore — values stay null (will show "—")
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    return () => {
      active = false
    }
  }, [clinicaId, isMedico, user?.id])

  const fmt = (v: number | null): string => (v === null ? '—' : String(v))

  const taxaConclusao = (): string => {
    if (data.consultasDia === null || data.atendidos === null) return '—'
    if (data.consultasDia === 0) return '—'
    const pct = Math.round((data.atendidos / data.consultasDia) * 100)
    return `${pct}%`
  }

  const metrics: SummaryMetric[] = [
    {
      key: 'consultas-dia',
      title: 'Consultas do Dia',
      value: fmt(data.consultasDia),
      tone: 'blue',
      icon: CalendarCheck2,
    },
    {
      key: 'atendidos',
      title: 'Atendidos Hoje',
      value: fmt(data.atendidos),
      tone: 'green',
      icon: UserCheck2,
    },
    {
      key: 'taxa-conclusao',
      title: 'Taxa de Conclusão',
      value: taxaConclusao(),
      tone: 'amber',
      icon: CheckCircle2,
    },
    {
      key: 'em-fila',
      title: 'Em Fila',
      value: fmt(data.aguardando),
      tone: 'blue',
      icon: Clock,
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metrics.map((m) => (
        <MetricCard key={m.key} metric={m} loading={loading} />
      ))}
    </div>
  )
}

function MetricCard({ metric, loading }: { metric: SummaryMetric; loading: boolean }) {
  const Icon = metric.icon

  const iconTone =
    metric.tone === 'blue'
      ? 'bg-brand-blue/10 text-brand-blue'
      : metric.tone === 'green'
        ? 'bg-brand-green/10 text-brand-green'
        : 'bg-amber-500/10 text-amber-500'

  return (
    <div className="bg-dark-card border border-gray-800 rounded-2xl p-6 hover:border-brand-blue/40 transition-colors">
      <div className="flex items-start justify-between">
        <div className={cn('p-3 rounded-xl', iconTone)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="mt-4 text-sm text-gray-400">{metric.title}</div>
      <div className="mt-1">
        {loading ? (
          <div className="h-8 w-16 rounded-lg bg-gray-800/60 animate-pulse" />
        ) : (
          <div className="text-2xl font-semibold tracking-tight">{metric.value}</div>
        )}
      </div>
    </div>
  )
}
