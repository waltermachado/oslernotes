import { cn } from '../../../lib/utils'
import type { ProntuarioTabKey } from '../../../utils/prontuarioAccess'

const TAB_LABEL: Record<ProntuarioTabKey, string> = {
  ficha: 'Ficha Clínica',
  evolucoes: 'Evoluções',
  receitas: 'Receitas',
  exames: 'Exames',
  atestados: 'Atestados',
}

export default function ProntuarioTabs(props: {
  tabs: ProntuarioTabKey[]
  active: ProntuarioTabKey
  onChange: (k: ProntuarioTabKey) => void
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {props.tabs.map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => props.onChange(k)}
          className={cn(
            'px-3 py-2 rounded-xl text-sm font-medium border transition-colors',
            props.active === k
              ? 'bg-navy-500/15 border-brand-blue/30 text-ink-900'
              : 'bg-gray-900/30 border-cream-300 text-ink-700 hover:bg-gray-900/50',
          )}
        >
          {TAB_LABEL[k]}
        </button>
      ))}
    </div>
  )
}

