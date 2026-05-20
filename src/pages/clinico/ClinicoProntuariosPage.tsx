import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'

import { useAuth } from '../../context/AuthContext'
import { apiFetch } from '../../lib/apiFetch'

type PatientListItem = {
  id: string
  nome_completo: string
  cpf: string | null
  data_nascimento: string
  foto_url: string | null
  updated_at: string | null
}

type PatientsListResponse = {
  items: PatientListItem[]
}

export default function ClinicoProntuariosPage() {
  const { session } = useAuth()
  const token = session?.access_token
  const navigate = useNavigate()

  const [query, setQuery] = useState('')
  const [items, setItems] = useState<PatientListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!token) return
      setLoading(true)
      setError(null)
      try {
        const res = await apiFetch(`/api/patients?page=1&pageSize=50`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = (await res.json()) as PatientsListResponse & { error?: string }
        if (!res.ok) throw new Error(data.error || 'Falha ao carregar prontuários')
        if (!cancelled) setItems(data.items)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erro ao carregar prontuários')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [token])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((p) => p.nome_completo.toLowerCase().includes(q) || (p.cpf ?? '').includes(q))
  }, [items, query])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Prontuários</h1>
        <p className="text-ink-500 text-sm">Selecione um paciente para abrir</p>
      </div>

      {error && <div className="bg-rose-50 border border-red-500/40 text-red-400 p-3 rounded-xl">{error}</div>}

      <div className="bg-surface border border-cream-300/50 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-cream-300/50">
          <div className="relative">
            <Search className="w-4 h-4 text-ink-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              className="w-full pl-9 pr-3 py-2 bg-sunken border border-cream-300 rounded-xl text-sm text-ink-900 focus:ring-2 focus:ring-navy-400/40 focus:border-navy-400"
              placeholder="Pesquisar por nome ou CPF..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="divide-y divide-cream-300/50">
          {loading ? (
            <div className="p-6 text-ink-500">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-ink-500">Nenhum paciente encontrado.</div>
          ) : (
            filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => navigate(`/clinico/prontuarios/${p.id}`)}
                className="w-full text-left p-4 flex items-center gap-4 hover:bg-gray-900/30"
              >
                <div className="w-10 h-10 rounded-full bg-navy-500/20 flex items-center justify-center overflow-hidden">
                  {p.foto_url ? <img src={p.foto_url} className="w-full h-full object-cover" /> : <span className="text-navy-500 font-bold">{p.nome_completo.slice(0, 1).toUpperCase()}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-ink-900 font-semibold truncate">{p.nome_completo}</div>
                  <div className="text-xs text-ink-500 truncate">{p.cpf ? `CPF: ${p.cpf}` : 'CPF não informado'}</div>
                </div>
                <div className="text-xs text-ink-500">{p.updated_at ? new Date(p.updated_at).toLocaleDateString('pt-BR') : ''}</div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
