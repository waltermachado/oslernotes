import { Search } from 'lucide-react'

import { cn } from '../../../lib/utils'
import type { ChatContact } from '../../../utils/clinicoChat'
import ChatTabs from './ChatTabs'
import type { ChatDepartment } from '../../../utils/clinicoChat'

export default function ConversationList(props: {
  title: string
  department: ChatDepartment
  onDepartmentChange: (v: ChatDepartment) => void
  query: string
  onQueryChange: (v: string) => void
  contacts: ChatContact[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  return (
    <section className="h-full flex flex-col border-r border-cream-300 bg-[#1a1513]/40">
      <div className="px-5 pt-5 pb-4">
        <div className="text-lg font-semibold tracking-tight">{props.title}</div>
        <div className="mt-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-500" />
          <input
            value={props.query}
            onChange={(e) => props.onQueryChange(e.target.value)}
            placeholder="Pesquisar contatos..."
            className="w-full bg-[#201a17]/70 border border-cream-300 rounded-xl pl-9 pr-3 py-2.5 text-sm text-ink-900 placeholder-ink-500 focus:outline-none focus:ring-2 focus:ring-navy-400/40 focus:border-navy-400/60 transition-all"
          />
        </div>
      </div>

      <div className="border-b border-cream-300">
        <ChatTabs value={props.department} onChange={props.onDepartmentChange} />
      </div>

      <div className="flex-1 overflow-y-auto">
        {props.contacts.length ? (
          <div className="py-2">
            {props.contacts.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => props.onSelect(c.id)}
                className={cn(
                  'w-full text-left px-4 py-3 flex items-center gap-3 transition-colors',
                  c.id === props.selectedId ? 'bg-navy-500/10' : 'hover:bg-white/5',
                )}
              >
                <div
                  className={cn(
                    'w-10 h-10 rounded-full bg-gray-700/50 flex items-center justify-center text-xs font-semibold text-ink-900 shrink-0',
                    c.id === props.selectedId ? 'ring-1 ring-brand-blue/40' : null,
                  )}
                >
                  {initials(c.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex items-center gap-2">
                      <div className="font-semibold text-sm text-ink-900 truncate">{c.name}</div>
                      <span
                        className={cn(
                          'w-2 h-2 rounded-full',
                          c.online ? 'bg-navy-500' : 'bg-gray-600',
                        )}
                        aria-label={c.online ? 'Online' : 'Offline'}
                      />
                    </div>
                    <div className="text-xs text-ink-500 shrink-0">{c.time}</div>
                  </div>
                  <div className="text-xs text-ink-500 truncate mt-0.5">{c.preview}</div>
                </div>
                <div className={cn('w-1.5 h-10 rounded-full', c.id === props.selectedId ? 'bg-navy-500' : 'bg-transparent')} />
              </button>
            ))}
          </div>
        ) : (
          <div className="px-5 py-10 text-sm text-ink-500">Nenhum contato encontrado.</div>
        )}
      </div>
    </section>
  )
}

function initials(value: string) {
  const cleaned = String(value ?? '').trim()
  if (!cleaned) return 'U'
  const parts = cleaned.split(/\s+/g).filter(Boolean)
  const first = parts[0]?.[0] ?? 'U'
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : ''
  return (first + last).toUpperCase()
}

