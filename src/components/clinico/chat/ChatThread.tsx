import { MoreHorizontal, Phone, Search, Video, Paperclip, Smile, Mic, Send } from 'lucide-react'
import { useMemo, useState } from 'react'

import { cn } from '../../../lib/utils'
import type { ChatContact, ChatMessage } from '../../../utils/clinicoChat'

export default function ChatThread(props: { contact: ChatContact | null }) {
  const [text, setText] = useState('')

  const header = useMemo(() => {
    if (!props.contact) return null
    return {
      title: `${props.contact.name} - ${props.contact.roleLabel}`,
      subtitle: props.contact.online ? 'Online agora' : 'Offline',
    }
  }, [props.contact])

  if (!props.contact) {
    return (
      <section className="h-full flex flex-col bg-[#141010]/40">
        <div className="flex-1 flex items-center justify-center px-8">
          <div className="max-w-md text-center">
            <div className="text-xl font-semibold">Mensagens Internas</div>
            <div className="text-ink-500 text-sm mt-2">Selecione um contato para abrir a conversa.</div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="h-full flex flex-col bg-[#141010]/40">
      <div className="h-16 px-5 flex items-center justify-between border-b border-cream-300">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-gray-700/50 flex items-center justify-center text-xs font-semibold text-ink-900">
            {initials(props.contact.name)}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{header?.title}</div>
            <div className={cn('text-xs', props.contact.online ? 'text-sage-400' : 'text-ink-500')}>{header?.subtitle}</div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <IconButton label="Ligar">
            <Phone className="w-4 h-4" />
          </IconButton>
          <IconButton label="Vídeo">
            <Video className="w-4 h-4" />
          </IconButton>
          <IconButton label="Pesquisar">
            <Search className="w-4 h-4" />
          </IconButton>
          <IconButton label="Mais">
            <MoreHorizontal className="w-4 h-4" />
          </IconButton>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        <DayDivider label="HOJE, 24 DE MAIO" />

        <div className="space-y-4">
          {props.contact.messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}
        </div>

        <div className="mt-6 flex items-center justify-center">
          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-black/30 border border-cream-300 text-ink-500 text-[11px]">
            Esta conversa é criptografada e segura dentro do sistema Osler.
          </div>
        </div>
      </div>

      <div className="p-5 border-t border-cream-300">
        <div className="flex items-center gap-3 bg-[#201a17]/70 border border-cream-300 rounded-2xl px-4 py-3">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escreva sua mensagem aqui..."
            className="flex-1 bg-transparent text-sm text-ink-900 placeholder-ink-500 focus:outline-none"
          />
          <button className="p-2 rounded-xl text-ink-500 hover:text-ink-800 hover:bg-white/5 transition-colors" aria-label="Emoji">
            <Smile className="w-4 h-4" />
          </button>
          <button className="p-2 rounded-xl text-ink-500 hover:text-ink-800 hover:bg-white/5 transition-colors" aria-label="Anexar">
            <Paperclip className="w-4 h-4" />
          </button>
          <button className="p-2 rounded-xl text-ink-500 hover:text-ink-800 hover:bg-white/5 transition-colors" aria-label="Áudio">
            <Mic className="w-4 h-4" />
          </button>
          <button
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center transition-colors',
              text.trim() ? 'bg-navy-500 hover:bg-navy-600 text-ink-900' : 'bg-gray-700/40 text-ink-500',
            )}
            aria-label="Enviar"
            type="button"
            disabled={!text.trim()}
            onClick={() => setText('')}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  )
}

function IconButton(props: { label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={props.label}
      className="p-2 rounded-xl text-ink-500 hover:text-ink-800 hover:bg-white/5 transition-colors"
    >
      {props.children}
    </button>
  )
}

function DayDivider(props: { label: string }) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <div className="h-px flex-1 bg-cream-200" />
      <div className="text-[10px] tracking-[0.2em] text-ink-500 uppercase">{props.label}</div>
      <div className="h-px flex-1 bg-cream-200" />
    </div>
  )
}

function MessageBubble(props: { message: ChatMessage }) {
  const isOut = props.message.direction === 'out'
  return (
    <div className={cn('flex items-end gap-2', isOut ? 'justify-end' : 'justify-start')}>
      {!isOut ? (
        <div className="w-7 h-7 rounded-full bg-gray-700/50 flex items-center justify-center text-[10px] font-semibold text-ink-900 shrink-0">
          A
        </div>
      ) : null}

      <div className={cn('max-w-[520px]')}
      >
        <div
          className={cn(
            'rounded-2xl px-4 py-3 text-sm leading-relaxed',
            isOut
              ? 'bg-navy-500 text-ink-900 rounded-br-md'
              : 'bg-[#2a221f]/70 text-ink-900 border border-cream-300 rounded-bl-md',
          )}
        >
          {props.message.text}
        </div>
        <div className={cn('text-[10px] text-ink-500 mt-1', isOut ? 'text-right pr-1' : 'pl-1')}>
          {props.message.time}
        </div>
      </div>

      {isOut ? (
        <div className="w-7 h-7 rounded-full bg-gray-700/50 flex items-center justify-center text-[10px] font-semibold text-ink-900 shrink-0">
          EU
        </div>
      ) : null}
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

