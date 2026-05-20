import { Mail, PhoneCall, ShieldAlert } from 'lucide-react'

import { cn } from '../../../lib/utils'
import type { ChatContact } from '../../../utils/clinicoChat'

export default function ChatInfoPanel(props: { contact: ChatContact | null }) {
  if (!props.contact) {
    return (
      <aside className="h-full border-l border-cream-300 bg-[#1a1513]/40">
        <div className="h-full flex items-center justify-center px-8">
          <div className="text-center">
            <div className="text-sm font-semibold">Informações</div>
            <div className="text-ink-500 text-sm mt-2">Selecione uma conversa para ver os detalhes.</div>
          </div>
        </div>
      </aside>
    )
  }

  return (
    <aside className="h-full border-l border-cream-300 bg-[#1a1513]/40">
      <div className="p-6">
        <div className="flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-navy-100 flex items-center justify-center text-lg font-semibold text-ink-900">
            {initials(props.contact.name)}
          </div>
          <div className="mt-4 text-lg font-semibold text-ink-900">{props.contact.name}</div>
          <div className="text-sm text-navy-500 mt-0.5">{props.contact.roleLabel}</div>
        </div>

        <div className="mt-8">
          <div className="text-[10px] tracking-[0.2em] text-ink-500 uppercase">Informações de Contato</div>
          <div className="mt-3 space-y-2">
            <InfoRow icon={<Mail className="w-4 h-4" />} text={props.contact.email} />
            <InfoRow icon={<PhoneCall className="w-4 h-4" />} text={props.contact.ext} />
          </div>
        </div>

        <div className="mt-8">
          <div className="text-[10px] tracking-[0.2em] text-ink-500 uppercase">Arquivos Compartilhados</div>
          <div className="mt-3 space-y-2">
            {props.contact.sharedFiles.length ? (
              props.contact.sharedFiles.map((f) => (
                <div key={f.id} className="rounded-xl bg-black/20 border border-cream-300 p-3">
                  <div className="text-sm text-ink-900 truncate">{f.name}</div>
                  <div className="text-xs text-ink-500 mt-1">{f.meta}</div>
                </div>
              ))
            ) : (
              <div className="text-sm text-ink-500">Nenhum arquivo compartilhado.</div>
            )}
          </div>

          <button type="button" className="mt-3 text-sm text-navy-500 hover:text-blue-400 transition-colors">
            Ver todos os arquivos
          </button>
        </div>

        <button
          type="button"
          className={cn(
            'mt-10 w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold',
            'bg-rose-50 text-red-400 border border-rose-100 hover:bg-red-500/15 transition-colors',
          )}
        >
          <ShieldAlert className="w-4 h-4" />
          Bloquear Usuário
        </button>
      </div>
    </aside>
  )
}

function InfoRow(props: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 text-ink-700">
      <div className="text-ink-500">{props.icon}</div>
      <div className="text-sm truncate">{props.text}</div>
    </div>
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

