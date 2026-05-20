import { useEffect, useMemo, useState } from 'react'

import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import ClinicoPainelSummary from '../../components/clinico/painel/ClinicoPainelSummary'
import ClinicoPainelUpcoming from '../../components/clinico/painel/ClinicoPainelUpcoming'

type ClinicLite = {
  id: string
  nome: string
}

export default function ClinicoPainelPage() {
  const { user } = useAuth()
  const clinicId = user?.clinica_id ?? null

  const [clinic, setClinic] = useState<ClinicLite | null>(null)
  const [clinicLoading, setClinicLoading] = useState(false)

  useEffect(() => {
    let active = true
    async function run() {
      if (!clinicId) {
        setClinic(null)
        return
      }
      setClinicLoading(true)
      const { data, error } = await supabase
        .from('clinicas')
        .select('id,nome')
        .eq('id', clinicId)
        .maybeSingle()
      if (!active) return
      if (error || !data) {
        setClinic(null)
      } else {
        setClinic({ id: data.id, nome: data.nome })
      }
      setClinicLoading(false)
    }
    run()
    return () => {
      active = false
    }
  }, [clinicId])

  const greetingName = useMemo(() => user?.nome ?? user?.email ?? 'Profissional', [user?.email, user?.nome])

  const subtitle = useMemo(() => {
    if (clinicLoading) return 'Carregando clínica…'
    if (!clinicId) return 'Sem clínica associada'
    return clinic?.nome ?? 'Clínica'
  }, [clinic?.nome, clinicId, clinicLoading])

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div>
          <h1 className="font-normal text-ink-900 text-5xl">Bem-vindo(a), {greetingName}</h1>
          <p className="text-ink-500 text-sm mt-1">{subtitle}</p>
        </div>

        <div className="mt-8">
          <ClinicoPainelSummary />
        </div>

        <div className="mt-8">
          <ClinicoPainelUpcoming />
        </div>
      </div>
    </div>
  )
}
