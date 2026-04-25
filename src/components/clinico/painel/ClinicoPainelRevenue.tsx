import { cn } from '../../../lib/utils'

type MonthBar = {
  key: string
  label: string
  height: number
  highlight?: boolean
}

export default function ClinicoPainelRevenue() {
  const bars: MonthBar[] = [
    { key: 'jan', label: 'Jan', height: 40 },
    { key: 'fev', label: 'Fev', height: 55 },
    { key: 'mar', label: 'Mar', height: 45 },
    { key: 'abr', label: 'Abr', height: 70 },
    { key: 'mai', label: 'Mai', height: 85 },
    { key: 'jun', label: 'Jun', height: 95, highlight: true },
  ]

  return (
    <section className="bg-dark-card border border-gray-800 rounded-2xl p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="text-lg font-semibold tracking-tight">Análise de Receita Mensal</div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1 text-xs font-semibold bg-gray-800/40 rounded-lg text-gray-200">Mês</button>
          <button className="px-3 py-1 text-xs font-semibold hover:bg-gray-800/40 rounded-lg text-gray-300 transition-colors">
            Ano
          </button>
        </div>
      </div>

      <div className="mt-6 h-64 w-full flex items-end justify-between gap-2 px-2 pt-4">
        {bars.map((b) => (
          <div key={b.key} className="flex flex-col items-center gap-2 flex-1">
            <div
              className={cn(
                'w-full rounded-t-lg bg-brand-blue/15 relative overflow-hidden',
                b.highlight ? 'ring-2 ring-brand-blue/30' : null,
              )}
              style={{ height: `${b.height}%` }}
            >
              <div
                className={cn('absolute bottom-0 left-0 right-0 bg-brand-blue rounded-t-lg transition-colors', b.highlight ? 'opacity-100' : 'opacity-80')}
                style={{ height: b.highlight ? '100%' : '60%' }}
              />
            </div>
            <div className={cn('text-[10px] uppercase tracking-[0.2em] font-semibold', b.highlight ? 'text-brand-blue' : 'text-gray-500')}>
              {b.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

