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
        className: 'bg-gray-500/10 text-gray-300 border border-gray-500/20',
      }
    }
    if (!clinicId) {
      return {
        text: 'Sem Clínica',
        className: 'bg-gray-500/10 text-gray-300 border border-gray-500/20',
      }
    }
    if (!clinic) {
      return {
        text: 'Clínica Desconhecida',
        className: 'bg-gray-500/10 text-gray-300 border border-gray-500/20',
      }
    }
    if (clinic.ativa) {
      return {
        text: 'Clínica Ativa',
        className: 'bg-green-500/10 text-brand-green border border-green-500/20',
      }
    }
    return {
      text: 'Clínica Inativa',
      className: 'bg-red-500/10 text-red-500 border border-red-500/20',
    }
  }, [clinic, clinicId, clinicLoading])

  return (
    <div className="min-h-screen bg-dark-bg text-white">
      <div className="flex min-h-screen">
        <ClinicoSidebar
          role={role}
          basePath={props.basePath ?? '/clinico'}
          userName={user?.nome ?? user?.email ?? 'Usuário'}
          userSubtitle={roleLabel(role)}
        />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 border-b border-gray-800 bg-dark-card/30 backdrop-blur supports-[backdrop-filter]:bg-dark-card/20">
            <div className="h-full px-6 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Pesquisar pacientes, prontuários ou horários…"
                    className="w-full max-w-2xl bg-dark-input border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-blue/40 focus:border-brand-blue/60 transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800/40 transition-colors" aria-label="Notificações">
                  <Bell className="w-5 h-5" />
                </button>
                <button className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800/40 transition-colors" aria-label="Conta">
                  <CircleUserRound className="w-5 h-5" />
                </button>
              </div>

              <span className={cn('inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap', clinicPill.className)}>
                {clinicPill.text}
              </span>

              <button
                type="button"
                className={cn(
                  'bg-brand-blue hover:bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap',
                  clinic && !clinic.ativa ? 'opacity-60 cursor-not-allowed hover:bg-brand-blue' : null,
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
