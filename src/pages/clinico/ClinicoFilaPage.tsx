import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Check, PhoneCall, RefreshCcw } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

type FilaItem = {
  id: string
  paciente_id: string
  medico_id: string | null
  status: 'aguardando' | 'em_atendimento' | 'finalizado'
  prioridade: number | null
  created_at: string | null
  pacientes?: {
    id: string
    nome_completo: string
    cpf: string | null
    data_nascimento: string
    sexo: 'Masculino' | 'Feminino' | null
    foto_path: string | null
  } | null
}

function calcAge(dateIso: string) {
  const d = new Date(dateIso)
  const now = new Date()
  let age = now.getFullYear() - d.getFullYear()
  const m = now.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--
  return Math.max(0, age)
}

export default function ClinicoFilaPage() {
  const { user } = useAuth()
  const role = user?.papel
  const navigate = useNavigate()
  const location = useLocation()

  const [status, setStatus] = useState<FilaItem['status']>('aguardando')
  const [items, setItems] = useState<FilaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const mine = role === 'medico'

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      let q = supabase
        .from('atendimentos')
        .select('id, paciente_id, medico_id, status, prioridade, created_at, pacientes:pacientes(id,nome_completo,cpf,data_nascimento,sexo,foto_path)')
        .eq('status', status)
        .order('prioridade', { ascending: false })
        .order('created_at', { ascending: true })

      if (mine && user.id) {
        q = q.eq('medico_id', user.id)
      }

      const { data, error: qError } = await q
      if (qError) throw new Error(qError.message || 'Falha ao carregar fila')
      setItems((data ?? []) as unknown as FilaItem[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar fila')
    } finally {
      setLoading(false)
    }
  }, [mine, status, user])

  useEffect(() => {
    load()
  }, [load])

  async function accept(id: string) {
    if (!user) return
    const { error: acceptError } = await supabase
      .from('atendimentos')
      .update({ medico_id: user.id })
      .eq('id', id)
      .eq('status', 'aguardando')
      .is('medico_id', null)
    if (acceptError) {
      setError(acceptError.message || 'Falha ao aceitar')
      return
    }
    await load()
  }

  async function call(id: string, patientId: string) {
    if (!user) return
    const { error: callError } = await supabase
      .from('atendimentos')
      .update({ status: 'em_atendimento', data_hora_inicio: new Date().toISOString() })
      .eq('id', id)
      .eq('medico_id', user.id)
      .in('status', ['aguardando', 'em_atendimento'])
    if (callError) {
      setError(callError.message || 'Falha ao chamar')
      return
    }
    const base = location.pathname.startsWith('/medico') ? '/medico' : '/clinico'
    navigate(`${base}/prontuarios/${patientId}`)
  }

  const header = useMemo(() => {
    return (
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Fila</h1>
          <p className="text-ink-500 text-sm">Atendimentos por ordem de chegada</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className={
              status === 'aguardando'
                ? 'px-3 py-2 rounded-xl text-sm bg-navy-500/20 text-ink-900 border border-brand-blue/30'
                : 'px-3 py-2 rounded-xl text-sm bg-surface border border-cream-300 text-ink-700 hover:bg-cream-200/60'
            }
            onClick={() => setStatus('aguardando')}
            type="button"
          >
            Aguardando
          </button>
          <button
            className={
              status === 'em_atendimento'
                ? 'px-3 py-2 rounded-xl text-sm bg-navy-500/20 text-ink-900 border border-brand-blue/30'
                : 'px-3 py-2 rounded-xl text-sm bg-surface border border-cream-300 text-ink-700 hover:bg-cream-200/60'
            }
            onClick={() => setStatus('em_atendimento')}
            type="button"
          >
            Em atendimento
          </button>
          <button
            className={
              status === 'finalizado'
                ? 'px-3 py-2 rounded-xl text-sm bg-navy-500/20 text-ink-900 border border-brand-blue/30'
                : 'px-3 py-2 rounded-xl text-sm bg-surface border border-cream-300 text-ink-700 hover:bg-cream-200/60'
            }
            onClick={() => setStatus('finalizado')}
            type="button"
          >
            Finalizados
          </button>
          <button
            className="p-2 rounded-xl bg-surface border border-cream-300 text-ink-700 hover:bg-cream-200/60"
            onClick={load}
            type="button"
            aria-label="Atualizar"
          >
            <RefreshCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }, [load, status])

  return (
    <div className="space-y-6">
      {header}
      {error && <div className="bg-rose-50 border border-red-500/40 text-red-400 p-3 rounded-xl">{error}</div>}

      <div className="bg-surface border border-cream-300/50 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-6 text-ink-500">Carregando...</div>
        ) : items.length === 0 ? (
          <div className="p-6 text-ink-500">Nenhum atendimento.</div>
        ) : (
          <div className="divide-y divide-cream-300/50">
            {items.map((it) => {
              const p = it.pacientes
              return (
                <div key={it.id} className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-navy-500/20 flex items-center justify-center overflow-hidden">
                    <span className="text-navy-500 font-bold">{p?.nome_completo?.slice(0, 1).toUpperCase() ?? '?'}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-ink-900 font-semibold truncate">{p?.nome_completo ?? it.paciente_id}</div>
                    <div className="text-xs text-ink-500 truncate">
                      {p?.data_nascimento ? `${calcAge(p.data_nascimento)} anos` : ''}{p?.sexo ? `, ${p.sexo}` : ''}
                    </div>
                  </div>
                  <div className="text-xs text-ink-500">prio {it.prioridade ?? 0}</div>

                  {role === 'medico' && status === 'aguardando' ? (
                    <div className="flex items-center gap-2">
                      {it.medico_id ? (
                        <button
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-navy-500/20 border border-brand-blue/30 text-ink-900"
                          onClick={() => call(it.id, it.paciente_id)}
                          type="button"
                        >
                          <PhoneCall className="w-4 h-4" />
                          Chamar
                        </button>
                      ) : (
                        <button
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-900/40 border border-cream-300 text-ink-700 hover:bg-gray-900/60"
                          onClick={() => accept(it.id)}
                          type="button"
                        >
                          <Check className="w-4 h-4" />
                          Aceitar
                        </button>
                      )}
                    </div>
                  ) : role === 'medico' && status === 'em_atendimento' ? (
                    <button
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-navy-500/20 border border-brand-blue/30 text-ink-900"
                      onClick={() => {
                        const base = location.pathname.startsWith('/medico') ? '/medico' : '/clinico'
                        navigate(`${base}/prontuarios/${it.paciente_id}`)
                      }}
                      type="button"
                    >
                      Abrir prontuário
                    </button>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
