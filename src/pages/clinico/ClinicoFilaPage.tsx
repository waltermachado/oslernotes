import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Check, PhoneCall, RefreshCcw } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

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
  const { session, user } = useAuth()
  const token = session?.access_token
  const role = user?.papel
  const navigate = useNavigate()
  const location = useLocation()

  const [status, setStatus] = useState<FilaItem['status']>('aguardando')
  const [items, setItems] = useState<FilaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const mine = role === 'medico'

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const url = new URL('/api/queue', window.location.origin)
      url.searchParams.set('status', status)
      if (mine) url.searchParams.set('mine', '0')

      const res = await fetch(url.pathname + url.search, { headers: { Authorization: `Bearer ${token}` } })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Falha ao carregar fila')
      setItems(body.items ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar fila')
    } finally {
      setLoading(false)
    }
  }, [mine, status, token])

  useEffect(() => {
    load()
  }, [load])

  async function accept(id: string) {
    if (!token) return
    const res = await fetch(`/api/queue/${id}/accept`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(body.error || 'Falha ao aceitar')
      return
    }
    await load()
  }

  async function call(id: string, patientId: string) {
    if (!token) return
    const res = await fetch(`/api/queue/${id}/call`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(body.error || 'Falha ao chamar')
      return
    }
    const base = location.pathname.startsWith('/medico') ? '/medico' : '/clinico'
    navigate(`${base}/prontuarios/${patientId}`)
  }

  const header = useMemo(() => {
    return (
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Fila</h1>
          <p className="text-gray-400 text-sm">Atendimentos por ordem de chegada</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className={
              status === 'aguardando'
                ? 'px-3 py-2 rounded-xl text-sm bg-brand-blue/20 text-white border border-brand-blue/30'
                : 'px-3 py-2 rounded-xl text-sm bg-dark-card border border-gray-800 text-gray-300 hover:bg-gray-800/40'
            }
            onClick={() => setStatus('aguardando')}
            type="button"
          >
            Aguardando
          </button>
          <button
            className={
              status === 'em_atendimento'
                ? 'px-3 py-2 rounded-xl text-sm bg-brand-blue/20 text-white border border-brand-blue/30'
                : 'px-3 py-2 rounded-xl text-sm bg-dark-card border border-gray-800 text-gray-300 hover:bg-gray-800/40'
            }
            onClick={() => setStatus('em_atendimento')}
            type="button"
          >
            Em atendimento
          </button>
          <button
            className={
              status === 'finalizado'
                ? 'px-3 py-2 rounded-xl text-sm bg-brand-blue/20 text-white border border-brand-blue/30'
                : 'px-3 py-2 rounded-xl text-sm bg-dark-card border border-gray-800 text-gray-300 hover:bg-gray-800/40'
            }
            onClick={() => setStatus('finalizado')}
            type="button"
          >
            Finalizados
          </button>
          <button
            className="p-2 rounded-xl bg-dark-card border border-gray-800 text-gray-300 hover:bg-gray-800/40"
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
      {error && <div className="bg-red-500/10 border border-red-500/40 text-red-400 p-3 rounded-xl">{error}</div>}

      <div className="bg-dark-card border border-gray-800/50 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-6 text-gray-400">Carregando...</div>
        ) : items.length === 0 ? (
          <div className="p-6 text-gray-400">Nenhum atendimento.</div>
        ) : (
          <div className="divide-y divide-gray-800/50">
            {items.map((it) => {
              const p = it.pacientes
              return (
                <div key={it.id} className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-brand-blue/20 flex items-center justify-center overflow-hidden">
                    <span className="text-brand-blue font-bold">{p?.nome_completo?.slice(0, 1).toUpperCase() ?? '?'}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-white font-semibold truncate">{p?.nome_completo ?? it.paciente_id}</div>
                    <div className="text-xs text-gray-400 truncate">
                      {p?.data_nascimento ? `${calcAge(p.data_nascimento)} anos` : ''}{p?.sexo ? `, ${p.sexo}` : ''}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">prio {it.prioridade ?? 0}</div>

                  {role === 'medico' && status === 'aguardando' ? (
                    <div className="flex items-center gap-2">
                      {it.medico_id ? (
                        <button
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-brand-blue/20 border border-brand-blue/30 text-white"
                          onClick={() => call(it.id, it.paciente_id)}
                          type="button"
                        >
                          <PhoneCall className="w-4 h-4" />
                          Chamar
                        </button>
                      ) : (
                        <button
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-900/40 border border-gray-800 text-gray-200 hover:bg-gray-900/60"
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
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-brand-blue/20 border border-brand-blue/30 text-white"
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
