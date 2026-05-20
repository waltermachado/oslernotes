import { Bell, CircleUserRound } from 'lucide-react'
import { Outlet } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'

import { useAuth } from '../../context/AuthContext'
import ClinicoSidebar from '../../components/clinico/ClinicoSidebar'
import { supabase } from '../../lib/supabase'
import { cn } from '../../lib/utils'
import type { ClinicoRole, ClinicSummary } from '../../utils/clinicoNav'

export default function ClinicoLayout(props: { basePath?: string }) {
  const { user } = useAuth()
  const role = (user?.papel ?? 'unknown') as ClinicoRole

  const [clinic, setClinic] = useState<ClinicSummary | null>(null)
  const [clinicLoading, setClinicLoading] = useState(false)

  const clinicId = user?.clinica_id ?? null

  useEffect(() => {
    let isActive = true
    async function run() {
      if (!clinicId) {
        setClinic(null)
        return
      }
      setClinicLoading(true)
      const { data, error } = await supabase
        .from('clinicas')
        .select('id,nome,ativa')
        .eq('id', clinicId)
        .single()

      if (!isActive) return
      if (error || !data) {
        setClinic(null)
      } else {
        setClinic({ id: data.id, nome: data.nome, ativa: data.ativa })
      }
      setClinicLoading(false)
    }
    run()
    return () => {
      isActive = false
    }
  }, [clinicId])

  const clinicPill = useMemo(() => {
    if (clinicLoading) {
      return {
        text: 'Carregando…',
        className: 'bg-ink-400/10 text-ink-700 border border-gray-500/20',
      }
    }
    if (!clinicId) {
      return {
        text: 'Sem Clínica',
        className: 'bg-ink-400/10 text-ink-700 border border-gray-500/20',
      }
    }
    if (!clinic) {
      return {
        text: 'Clínica Desconhecida',
        className: 'bg-ink-400/10 text-ink-700 border border-gray-500/20',
      }
    }
    if (clinic.ativa) {
      return {
        text: 'Clínica Ativa',
        className: 'bg-sage-50 text-sage-400 border border-sage-100',
      }
    }
    return {
      text: 'Clínica Inativa',
      className: 'bg-rose-50 text-rose-400 border border-rose-100',
    }
  }, [clinic, clinicId, clinicLoading])

  return (
    <div className="min-h-screen bg-canvas text-ink-900">
      <div className="flex min-h-screen">
        <ClinicoSidebar
          role={role}
          basePath={props.basePath ?? '/clinico'}
          userName={user?.nome ?? user?.email ?? 'Usuário'}
          userSubtitle={roleLabel(role)}
        />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 border-b border-cream-300 bg-surface/30 backdrop-blur supports-[backdrop-filter]:bg-surface/20">
            <div className="h-full px-6 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Pesquisar pacientes, prontuários ou horários…"
                    className="w-full max-w-2xl bg-sunken border border-cream-300 rounded-xl px-4 py-2.5 text-sm text-ink-900 placeholder-ink-500 focus:outline-none focus:ring-2 focus:ring-navy-400/40 focus:border-navy-400/60 transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button className="p-2 rounded-xl text-ink-500 hover:text-ink-800 hover:bg-cream-200/60 transition-colors" aria-label="Notificações">
                  <Bell className="w-5 h-5" />
                </button>
                <button className="p-2 rounded-xl text-ink-500 hover:text-ink-800 hover:bg-cream-200/60 transition-colors" aria-label="Conta">
                  <CircleUserRound className="w-5 h-5" />
                </button>
              </div>

              <span className={cn('inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap', clinicPill.className)}>
                {clinicPill.text}
              </span>

              <button
                type="button"
                className={cn(
                  'bg-navy-500 hover:bg-navy-600 text-ink-900 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap',
                  clinic && !clinic.ativa ? 'opacity-60 cursor-not-allowed hover:bg-navy-500' : null,
                )}
                disabled={!!clinic && !clinic.ativa}
              >
                + Novo Agendamento
              </button>
            </div>
          </header>

          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}

function roleLabel(role: ClinicoRole) {
  if (role === 'admin') return 'Administrador'
  if (role === 'medico') return 'Médico'
  if (role === 'atendente') return 'Atendente'
  return 'Usuário'
}
