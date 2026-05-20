import { Bell, CalendarClock, CheckCircle2, CircleAlert } from 'lucide-react'
import { Link } from 'react-router-dom'

import { cn } from '../../../lib/utils'

type AlertItem = {
  id: string
  tone: 'danger' | 'warn' | 'info'
  title: string
  message: string
}

export default function ClinicoPainelAlerts() {
  const alerts: AlertItem[] = [
    { id: 'a1', tone: 'danger', title: 'Exame Pendente', message: 'Revisar ECG do paciente Ricardo Alencar antes do atendimento.' },
    { id: 'a2', tone: 'warn', title: 'Renovação', message: 'Assinatura do software expira em 5 dias.' },
    { id: 'a3', tone: 'info', title: 'Mensagem', message: 'Novo contato de Maria Santos via chat.' },
  ]

  return (
    <div className="space-y-6">
      <section className="bg-surface border border-cream-300 rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-cream-300 flex items-center gap-2 text-red-400">
          <CircleAlert className="w-5 h-5" />
          <div className="text-lg font-semibold tracking-tight text-ink-900">Alertas Importantes</div>
        </div>

        <div className="p-4 space-y-4">
          {alerts.map((a) => (
            <div key={a.id} className={cn('p-4 rounded-xl border-l-4', alertClass(a.tone))}>
              <div className={cn('text-xs font-semibold uppercase tracking-[0.18em] mb-1', alertTitleClass(a.tone))}>{a.title}</div>
              <div className="text-sm text-ink-700">{a.message}</div>
            </div>
          ))}
        </div>

        <div className="p-4 bg-black/20">
          <button
            type="button"
            className="w-full py-2.5 bg-cream-200/60 text-ink-700 text-sm font-semibold rounded-xl hover:bg-cream-200/70 transition-colors"
          >
            Ver Todos Alertas
          </button>
        </div>
      </section>

      <section className="bg-gradient-to-br from-brand-blue to-blue-700 rounded-2xl p-6 border border-blue-500/20 shadow-xl">
        <div className="text-lg font-semibold tracking-tight">Próxima Reunião</div>
        <div className="mt-2 flex items-center gap-2 text-ink-900/80">
          <CalendarClock className="w-4 h-4" />
          <div className="text-sm">Hoje, 14:30 - 15:30</div>
        </div>
        <div className="mt-4 text-sm text-ink-900/75 leading-relaxed">
          Reunião clínica semanal: Novas diretrizes para tratamento de hipertensão.
        </div>
        <button
          type="button"
          className="mt-6 w-full py-3 bg-white/15 hover:bg-white/20 rounded-xl font-semibold transition-colors text-sm border border-white/20"
        >
          Confirmar Presença
        </button>
      </section>

      <section className="bg-surface border border-cream-300 rounded-2xl p-6">
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 bg-brand-green rounded-full animate-pulse" />
          <div className="text-sm font-semibold">Sincronização Ativa</div>
        </div>
        <div className="mt-1 text-xs text-ink-500">Última atualização: 2 minutos atrás</div>

        <div className="mt-4 flex items-center gap-2">
          <Link
            to="/clinico/chat"
            className="flex-1 inline-flex items-center justify-center gap-2 bg-cream-200/60 hover:bg-cream-200/70 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors"
          >
            <Bell className="w-4 h-4" />
            Abrir Chat
          </Link>
          <Link
            to="/clinico/agenda"
            className="flex-1 inline-flex items-center justify-center gap-2 bg-cream-200/60 hover:bg-cream-200/70 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            Agenda
          </Link>
        </div>
      </section>
    </div>
  )
}

function alertClass(tone: AlertItem['tone']) {
  if (tone === 'danger') return 'bg-rose-50 border-red-500'
  if (tone === 'warn') return 'bg-amber-500/10 border-amber-500'
  return 'bg-navy-500/10 border-brand-blue'
}

function alertTitleClass(tone: AlertItem['tone']) {
  if (tone === 'danger') return 'text-red-400'
  if (tone === 'warn') return 'text-amber-500'
  return 'text-navy-500'
}

