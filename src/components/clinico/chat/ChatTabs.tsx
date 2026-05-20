import { cn } from '../../../lib/utils'
import type { ChatDepartment } from '../../../utils/clinicoChat'

export default function ChatTabs(props: { value: ChatDepartment; onChange: (v: ChatDepartment) => void }) {
  return (
    <div className="flex items-center gap-6 px-4">
      <Tab active={props.value === 'medicos'} onClick={() => props.onChange('medicos')}>
        MÉDICOS
      </Tab>
      <Tab active={props.value === 'recepcao'} onClick={() => props.onChange('recepcao')}>
        RECEPÇÃO/BALCÃO
      </Tab>
    </div>
  )
}

function Tab(props: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={cn(
        'relative py-3 text-[11px] tracking-[0.18em] font-semibold uppercase transition-colors',
        props.active ? 'text-navy-500' : 'text-ink-500 hover:text-ink-700',
      )}
    >
      {props.children}
      <span
        className={cn(
          'absolute left-0 right-0 -bottom-px h-0.5 rounded-full transition-opacity',
          props.active ? 'bg-navy-500 opacity-100' : 'bg-navy-500 opacity-0',
        )}
      />
    </button>
  )
}

