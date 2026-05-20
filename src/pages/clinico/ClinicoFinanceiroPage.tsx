import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { DollarSign, FileText, TrendingUp, Clock } from 'lucide-react'

import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Periodo = 'hoje' | 'semana' | 'mes' | 'ano'

type AtendimentoRow = {
  id: string
  scheduled_time: string | null
  data_hora_fim: string | null
  valor_consulta: number | null
  forma_pagamento: string | null
  status: string
  paciente_id: string | null
  medico_id: string | null
  paciente_nome?: string
  medico_nome?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function nowLocal(): Date {
  return new Date()
}

function periodoRange(p: Periodo): { inicio: Date; fim: Date } {
  const now = nowLocal()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

  if (p === 'hoje') {
    return { inicio: startOfDay, fim: endOfDay }
  }
  if (p === 'semana') {
    const dow = now.getDay() // 0=dom
    const diffToMon = (dow === 0 ? -6 : 1 - dow)
    const seg = new Date(startOfDay)
    seg.setDate(seg.getDate() + diffToMon)
    return { inicio: seg, fim: endOfDay }
  }
  if (p === 'mes') {
    return {
      inicio: new Date(now.getFullYear(), now.getMonth(), 1),
      fim: endOfDay,
    }
  }
  // ano
  return {
    inicio: new Date(now.getFullYear(), 0, 1),
    fim: endOfDay,
  }
}

function toISO(d: Date): string {
  return d.toISOString()
}

function fmtBRL(v: number | null | undefined): string {
  if (v == null) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function fmtData(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const FORMAS_PAGAMENTO: { value: string; label: string }[] = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'cartao_credito', label: 'Cartão de Crédito' },
  { value: 'cartao_debito', label: 'Cartão de Débito' },
  { value: 'pix', label: 'Pix' },
  { value: 'convenio', label: 'Convênio' },
  { value: 'particular', label: 'Particular' },
]

function formaPgtoLabel(v: string | null): string {
  if (!v) return '—'
  return FORMAS_PAGAMENTO.find((f) => f.value === v)?.label ?? v
}

// ---------------------------------------------------------------------------
// Chart helpers
// ---------------------------------------------------------------------------

type BarDatum = { label: string; value: number }

function buildChartData(rows: AtendimentoRow[], periodo: Periodo): BarDatum[] {
  const finalizados = rows.filter((r) => r.status === 'finalizado' && (r.valor_consulta ?? 0) > 0)

  if (periodo === 'hoje') {
    // Group by hour (0-23)
    const hours: Record<number, number> = {}
    finalizados.forEach((r) => {
      const d = new Date(r.scheduled_time ?? r.data_hora_fim ?? '')
      if (isNaN(d.getTime())) return
      const h = d.getHours()
      hours[h] = (hours[h] ?? 0) + (r.valor_consulta ?? 0)
    })
    return Array.from({ length: 24 }, (_, i) => ({
      label: `${String(i).padStart(2, '0')}h`,
      value: hours[i] ?? 0,
    })).filter((_, i) => {
      // show only hours 7-22 to reduce clutter
      return i >= 7 && i <= 22
    })
  }

  if (periodo === 'semana') {
    // Group by weekday Mon-Sun
    const labels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
    const buckets = Array(7).fill(0) as number[]
    finalizados.forEach((r) => {
      const d = new Date(r.scheduled_time ?? r.data_hora_fim ?? '')
      if (isNaN(d.getTime())) return
      const dow = d.getDay() // 0=Sun
      const idx = dow === 0 ? 6 : dow - 1
      buckets[idx] += r.valor_consulta ?? 0
    })
    return labels.map((label, i) => ({ label, value: buckets[i] }))
  }

  if (periodo === 'mes') {
    // Group by day of month
    const now = nowLocal()
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const buckets: Record<number, number> = {}
    finalizados.forEach((r) => {
      const d = new Date(r.scheduled_time ?? r.data_hora_fim ?? '')
      if (isNaN(d.getTime())) return
      const day = d.getDate()
      buckets[day] = (buckets[day] ?? 0) + (r.valor_consulta ?? 0)
    })
    return Array.from({ length: daysInMonth }, (_, i) => ({
      label: String(i + 1),
      value: buckets[i + 1] ?? 0,
    }))
  }

  // ano — group by month
  const monthLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  const buckets = Array(12).fill(0) as number[]
  finalizados.forEach((r) => {
    const d = new Date(r.scheduled_time ?? r.data_hora_fim ?? '')
    if (isNaN(d.getTime())) return
    buckets[d.getMonth()] += r.valor_consulta ?? 0
  })
  return monthLabels.map((label, i) => ({ label, value: buckets[i] }))
}

// ---------------------------------------------------------------------------
// Bar Chart (pure SVG)
// ---------------------------------------------------------------------------

function BarChart({ data }: { data: BarDatum[] }) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string; value: number } | null>(null)

  const W = 700
  const H = 200
  const PAD_LEFT = 60
  const PAD_RIGHT = 16
  const PAD_TOP = 16
  const PAD_BOTTOM = 40
  const innerW = W - PAD_LEFT - PAD_RIGHT
  const innerH = H - PAD_TOP - PAD_BOTTOM

  const maxVal = Math.max(...data.map((d) => d.value), 1)

  const barWidth = innerW / data.length
  const barPad = barWidth * 0.25

  // Y-axis ticks
  const yTicks = 4
  const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) =>
    Math.round((maxVal / yTicks) * i)
  )

  return (
    <div className="relative w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ minWidth: Math.max(data.length * 28, 300) }}
        onMouseLeave={() => setTooltip(null)}
      >
        {/* Y gridlines & labels */}
        {yTickValues.map((tick) => {
          const y = PAD_TOP + innerH - (tick / maxVal) * innerH
          return (
            <g key={tick}>
              <line
                x1={PAD_LEFT}
                y1={y}
                x2={W - PAD_RIGHT}
                y2={y}
                stroke="#1f2937"
                strokeWidth={1}
              />
              <text
                x={PAD_LEFT - 6}
                y={y + 4}
                textAnchor="end"
                fontSize={10}
                fill="#6b7280"
              >
                {tick >= 1000 ? `${(tick / 1000).toFixed(1)}k` : tick}
              </text>
            </g>
          )
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const barH = Math.max((d.value / maxVal) * innerH, d.value > 0 ? 2 : 0)
          const x = PAD_LEFT + i * barWidth + barPad / 2
          const y = PAD_TOP + innerH - barH
          const bw = barWidth - barPad

          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={bw}
                height={barH}
                rx={3}
                fill={d.value > 0 ? '#3b82f6' : '#1f2937'}
                opacity={d.value > 0 ? 1 : 0.5}
                className="cursor-pointer transition-opacity hover:opacity-80"
                onMouseEnter={(e) => {
                  const rect = (e.currentTarget as SVGRectElement).getBoundingClientRect()
                  setTooltip({ x: i, y: 0, label: d.label, value: d.value })
                }}
              />
              {/* X label */}
              <text
                x={x + bw / 2}
                y={PAD_TOP + innerH + 16}
                textAnchor="middle"
                fontSize={data.length > 20 ? 8 : 10}
                fill="#6b7280"
              >
                {d.label}
              </text>
            </g>
          )
        })}

        {/* Tooltip */}
        {tooltip !== null && (() => {
          const d = data[tooltip.x]
          if (!d) return null
          const i = tooltip.x
          const barH = Math.max((d.value / maxVal) * innerH, d.value > 0 ? 2 : 0)
          const bw = barWidth - barPad
          const bx = PAD_LEFT + i * barWidth + barPad / 2 + bw / 2
          const by = PAD_TOP + innerH - barH - 8

          const tooltipW = 100
          const tooltipH = 36
          const tx = Math.min(Math.max(bx - tooltipW / 2, PAD_LEFT), W - PAD_RIGHT - tooltipW)
          const ty = Math.max(by - tooltipH, PAD_TOP)

          return (
            <g pointerEvents="none">
              <rect x={tx} y={ty} width={tooltipW} height={tooltipH} rx={4} fill="#1e293b" stroke="#334155" strokeWidth={1} />
              <text x={tx + tooltipW / 2} y={ty + 13} textAnchor="middle" fontSize={10} fill="#94a3b8">
                {d.label}
              </text>
              <text x={tx + tooltipW / 2} y={ty + 27} textAnchor="middle" fontSize={11} fontWeight="600" fill="#f1f5f9">
                {fmtBRL(d.value)}
              </text>
            </g>
          )
        })()}
      </svg>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Inline payment form
// ---------------------------------------------------------------------------

function InlinePagamentoForm({
  atendimentoId,
  onSaved,
  onCancel,
}: {
  atendimentoId: string
  onSaved: () => void
  onCancel: () => void
}) {
  const [valor, setValor] = useState('')
  const [forma, setForma] = useState('particular')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function handleSave() {
    const num = parseFloat(valor.replace(',', '.'))
    if (isNaN(num) || num <= 0) {
      setErr('Informe um valor válido.')
      return
    }
    setSaving(true)
    setErr(null)
    const { error } = await supabase
      .from('atendimentos')
      .update({ valor_consulta: num, forma_pagamento: forma })
      .eq('id', atendimentoId)
    setSaving(false)
    if (error) {
      setErr('Erro ao salvar. Tente novamente.')
    } else {
      onSaved()
    }
  }

  return (
    <td colSpan={5} className="px-4 py-3 bg-[#0d1520]">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-ink-500">Valor (R$)</label>
          <input
            type="text"
            inputMode="decimal"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="0,00"
            className="w-28 bg-[#111926] border border-cream-300 rounded-lg px-3 py-1.5 text-sm text-ink-900 placeholder-gray-600 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-ink-500">Forma de pagamento</label>
          <select
            value={forma}
            onChange={(e) => setForma(e.target.value)}
            className="bg-[#111926] border border-cream-300 rounded-lg px-3 py-1.5 text-sm text-ink-900 focus:outline-none focus:border-blue-500"
          >
            {FORMAS_PAGAMENTO.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
        {err && <p className="text-xs text-red-400 self-end mb-1">{err}</p>}
        <div className="flex items-end gap-2 self-end mb-0.5">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-ink-900 text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded-lg border border-cream-300 text-ink-500 hover:text-ink-800 text-sm transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </td>
  )
}

// ---------------------------------------------------------------------------
// Summary cards
// ---------------------------------------------------------------------------

type SummaryCardProps = {
  title: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  tone: 'blue' | 'green' | 'amber' | 'purple'
  loading: boolean
}

function SummaryCard({ title, value, icon: Icon, tone, loading }: SummaryCardProps) {
  const iconCls =
    tone === 'blue'
      ? 'bg-blue-500/10 text-blue-400'
      : tone === 'green'
        ? 'bg-sage-50 text-green-400'
        : tone === 'amber'
          ? 'bg-amber-500/10 text-amber-400'
          : 'bg-purple-500/10 text-purple-400'

  return (
    <div className="bg-[#111926] border border-cream-300 rounded-2xl p-6 hover:border-blue-500/40 transition-colors">
      <div className={`inline-flex p-3 rounded-xl ${iconCls}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="mt-4 text-sm text-ink-500">{title}</div>
      <div className="mt-1">
        {loading ? (
          <div className="h-8 w-24 rounded-lg bg-cream-200/60 animate-pulse" />
        ) : (
          <div className="text-2xl font-semibold tracking-tight text-ink-900">{value}</div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function ClinicoFinanceiroPage() {
  const { user } = useAuth()
  const clinicaId = user?.clinica_id ?? null
  const isMedico = user?.papel === 'medico'

  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const [rows, setRows] = useState<AtendimentoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [openFormId, setOpenFormId] = useState<string | null>(null)

  // -------------------------------------------------------------------------
  // Load atendimentos for the selected period
  // -------------------------------------------------------------------------
  const load = useCallback(async () => {
    if (!clinicaId) return
    setLoading(true)

    const { inicio, fim } = periodoRange(periodo)

    // Fetch finalizados in period + pending (no date filter) for "pendentes" count
    // We do two queries to keep it simple
    const baseFinalizados = supabase
      .from('atendimentos')
      .select('id,scheduled_time,data_hora_fim,valor_consulta,forma_pagamento,status,paciente_id,medico_id')
      .eq('clinica_id', clinicaId)
      .eq('status', 'finalizado')
      .gte('scheduled_time', toISO(inicio))
      .lte('scheduled_time', toISO(fim))
      .order('scheduled_time', { ascending: false })
      .limit(200)

    const basePendentes = supabase
      .from('atendimentos')
      .select('id,scheduled_time,data_hora_fim,valor_consulta,forma_pagamento,status,paciente_id,medico_id', { count: 'exact', head: true })
      .eq('clinica_id', clinicaId)
      .in('status', ['aguardando', 'agendado'])

    let qFin = baseFinalizados
    let qPend = basePendentes

    if (isMedico && user?.id) {
      qFin = qFin.eq('medico_id', user.id)
      qPend = qPend.eq('medico_id', user.id)
    }

    const [resFin, resPend] = await Promise.all([qFin, qPend])

    const finRows: AtendimentoRow[] = (resFin.data ?? []).map((r: any) => ({
      id: r.id,
      scheduled_time: r.scheduled_time,
      data_hora_fim: r.data_hora_fim,
      valor_consulta: r.valor_consulta,
      forma_pagamento: r.forma_pagamento,
      status: r.status,
      paciente_id: r.paciente_id,
      medico_id: r.medico_id,
    }))

    const pendentesCount = resPend.count ?? 0

    // Enrich with names (batch fetch unique ids)
    const pacienteIds = [...new Set(finRows.map((r) => r.paciente_id).filter(Boolean))] as string[]
    const medicoIds = [...new Set(finRows.map((r) => r.medico_id).filter(Boolean))] as string[]

    const [resPacientes, resMedicos] = await Promise.all([
      pacienteIds.length > 0
        ? supabase.from('pacientes').select('id,nome').in('id', pacienteIds)
        : Promise.resolve({ data: [], error: null }),
      medicoIds.length > 0
        ? supabase.from('usuarios').select('id,nome').in('id', medicoIds)
        : Promise.resolve({ data: [], error: null }),
    ])

    const pacMap: Record<string, string> = {}
    ;(resPacientes.data ?? []).forEach((p: any) => { pacMap[p.id] = p.nome })
    const medMap: Record<string, string> = {}
    ;(resMedicos.data ?? []).forEach((m: any) => { medMap[m.id] = m.nome })

    const enriched = finRows.map((r) => ({
      ...r,
      paciente_nome: r.paciente_id ? (pacMap[r.paciente_id] ?? '—') : '—',
      medico_nome: r.medico_id ? (medMap[r.medico_id] ?? '—') : '—',
    }))

    // Attach pendentes count as a "virtual" field via state
    setPendentesCount(pendentesCount)
    setRows(enriched)
    setLoading(false)
  }, [clinicaId, isMedico, periodo, user?.id])

  const [pendentesCount, setPendentesCount] = useState(0)

  useEffect(() => {
    let active = true
    setRows([])
    setLoading(true)

    load().catch(() => setLoading(false))

    return () => { active = false }
  }, [load])

  // -------------------------------------------------------------------------
  // Derived metrics
  // -------------------------------------------------------------------------
  const { receita, consultasRealizadas, ticketMedio } = useMemo(() => {
    const faturadas = rows.filter((r) => r.valor_consulta != null)
    const receita = faturadas.reduce((acc, r) => acc + (r.valor_consulta ?? 0), 0)
    const consultasRealizadas = rows.length
    const ticketMedio = faturadas.length > 0 ? receita / faturadas.length : 0
    return { receita, consultasRealizadas, ticketMedio }
  }, [rows])

  const chartData = useMemo(() => buildChartData(rows, periodo), [rows, periodo])

  // -------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const periodoLabels: { key: Periodo; label: string }[] = [
    { key: 'hoje', label: 'Hoje' },
    { key: 'semana', label: 'Esta Semana' },
    { key: 'mes', label: 'Este Mês' },
    { key: 'ano', label: 'Este Ano' },
  ]

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-ink-900">Financeiro</h1>
            <p className="text-ink-500 text-sm mt-1">Receitas e cobranças da clínica</p>
          </div>

          {/* Period filter */}
          <div className="flex rounded-xl bg-[#111926] border border-cream-300 p-1 gap-1">
            {periodoLabels.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriodo(p.key)}
                className={[
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  periodo === p.key
                    ? 'bg-blue-600 text-ink-900'
                    : 'text-ink-500 hover:text-ink-800',
                ].join(' ')}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Summary cards */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <SummaryCard
            title="Receita do Período"
            value={fmtBRL(receita)}
            icon={DollarSign}
            tone="green"
            loading={loading}
          />
          <SummaryCard
            title="Consultas Realizadas"
            value={loading ? '—' : String(consultasRealizadas)}
            icon={FileText}
            tone="blue"
            loading={loading}
          />
          <SummaryCard
            title="Ticket Médio"
            value={fmtBRL(ticketMedio)}
            icon={TrendingUp}
            tone="amber"
            loading={loading}
          />
          <SummaryCard
            title="Pendentes"
            value={loading ? '—' : String(pendentesCount)}
            icon={Clock}
            tone="purple"
            loading={loading}
          />
        </div>

        {/* Chart */}
        <div className="mt-8 bg-[#111926] border border-cream-300 rounded-2xl p-6">
          <h2 className="text-base font-semibold text-ink-900 mb-4">Receita por período</h2>
          {loading ? (
            <div className="h-48 rounded-xl bg-cream-200/60 animate-pulse" />
          ) : rows.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-ink-500 text-sm">
              Nenhuma consulta registrada no período
            </div>
          ) : (
            <BarChart data={chartData} />
          )}
        </div>

        {/* Table */}
        <div className="mt-8 bg-[#111926] border border-cream-300 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-cream-300">
            <h2 className="text-base font-semibold text-ink-900">Consultas Recentes</h2>
          </div>

          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 rounded-lg bg-cream-200/60 animate-pulse" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="px-6 py-12 text-center text-ink-500 text-sm">
              Nenhuma consulta registrada no período
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-ink-500 text-xs border-b border-cream-300 uppercase tracking-wide">
                    <th className="px-6 py-3 text-left font-medium">Data</th>
                    <th className="px-6 py-3 text-left font-medium">Paciente</th>
                    <th className="px-6 py-3 text-left font-medium">Médico</th>
                    <th className="px-6 py-3 text-left font-medium">Forma Pgto</th>
                    <th className="px-6 py-3 text-left font-medium">Valor</th>
                    <th className="px-6 py-3 text-left font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 20).map((row) => (
                    <Fragment key={row.id}>
                      <tr
                        className="border-b border-cream-300/60 hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="px-6 py-3 text-ink-700 whitespace-nowrap">
                          {fmtData(row.scheduled_time)}
                        </td>
                        <td className="px-6 py-3 text-ink-900">{row.paciente_nome ?? '—'}</td>
                        <td className="px-6 py-3 text-ink-700">{row.medico_nome ?? '—'}</td>
                        <td className="px-6 py-3 text-ink-700">{formaPgtoLabel(row.forma_pagamento)}</td>
                        <td className="px-6 py-3 font-medium text-ink-900 whitespace-nowrap">
                          {row.valor_consulta != null ? fmtBRL(row.valor_consulta) : (
                            <span className="text-ink-500">—</span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-right">
                          {row.valor_consulta == null && openFormId !== row.id && (
                            <button
                              onClick={() => setOpenFormId(row.id)}
                              className="text-xs px-3 py-1.5 rounded-lg border border-blue-700 text-blue-400 hover:bg-navy-600 hover:text-ink-800 hover:border-blue-600 transition-colors"
                            >
                              Registrar pagamento
                            </button>
                          )}
                        </td>
                      </tr>
                      {openFormId === row.id && (
                        <tr className="border-b border-cream-300/60">
                          <InlinePagamentoForm
                            atendimentoId={row.id}
                            onSaved={() => {
                              setOpenFormId(null)
                              load()
                            }}
                            onCancel={() => setOpenFormId(null)}
                          />
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
