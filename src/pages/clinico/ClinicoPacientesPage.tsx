import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { Plus, Search, Upload, X } from 'lucide-react'
import { useFieldArray, useForm } from 'react-hook-form'

type PatientSexo = 'Masculino' | 'Feminino'

type PatientListItem = {
  id: string
  nome_completo: string
  cpf: string | null
  data_nascimento: string
  sexo: PatientSexo | null
  foto_url: string | null
  updated_at: string | null
}

type PatientsListResponse = {
  items: PatientListItem[]
  page: number
  pageSize: number
  total: number
}

type RemedioInput = { nome: string; dosagem: string; frequencia: string }

type CreatePatientForm = {
  nome_completo: string
  idade: number
  sexo: PatientSexo
  sexualidade?: string
  historico_breve_doencas: string
  queixa_principal: string
  doencas: Array<{ value: string }>
  remedios: RemedioInput[]
  futuras_anotacoes?: string
  cpf?: string
  telefone?: string
  email?: string
}

function maskCpf(v: string) {
  const digits = v.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

export default function ClinicoPacientesPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [query, setQuery] = useState('')
  const [items, setItems] = useState<PatientListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const canCreate = user?.papel === 'medico' || user?.papel === 'atendente'
  const canEnqueue = user?.papel === 'admin' || user?.papel === 'atendente'
  const basePath = window.location.pathname.startsWith('/medico') ? '/medico' : '/clinico'

  const form = useForm<CreatePatientForm>({
    defaultValues: {
      nome_completo: '',
      idade: 0,
      sexo: 'Masculino',
      sexualidade: '',
      historico_breve_doencas: '',
      queixa_principal: '',
      doencas: [{ value: '' }],
      remedios: [{ nome: '', dosagem: '', frequencia: '' }],
      futuras_anotacoes: '',
      cpf: '',
      telefone: '',
      email: '',
    },
  })

  const doencasArray = useFieldArray({ control: form.control, name: 'doencas' })
  const remediosArray = useFieldArray({ control: form.control, name: 'remedios' })

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((p) => p.nome_completo.toLowerCase().includes(q) || (p.cpf ?? '').includes(q))
  }, [items, query])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const { data, error: qError } = await supabase
          .from('pacientes')
          .select('id, nome_completo, cpf, data_nascimento, sexo, foto_path, updated_at')
          .order('updated_at', { ascending: false })
          .limit(50)

        if (qError) throw new Error(qError.message || 'Falha ao carregar pacientes')
        if (!cancelled) {
          const mapped: PatientListItem[] = (data ?? []).map((p: any) => ({
            id: p.id,
            nome_completo: p.nome_completo,
            cpf: p.cpf ? String(p.cpf).replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : null,
            data_nascimento: p.data_nascimento,
            sexo: p.sexo,
            foto_url: null,
            updated_at: p.updated_at,
          }))
          setItems(mapped)
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erro ao carregar pacientes')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  async function onCreate(values: CreatePatientForm) {
    setSubmitting(true)
    setError(null)

    try {
      const cpf = values.cpf ? values.cpf.replace(/\D/g, '') : null
      const doencas = values.doencas.map((d) => d.value).filter(Boolean)
      const remedios = values.remedios.filter((r) => r.nome && r.dosagem && r.frequencia)

      // Estimar data de nascimento a partir da idade (mesmo mês/dia atual, ano calculado)
      const now = new Date()
      const birthYear = now.getFullYear() - Math.max(0, values.idade)
      const dataNascimento = new Date(birthYear, now.getMonth(), now.getDate()).toISOString().split('T')[0]

      const { data: created, error: insertError } = await supabase
        .from('pacientes')
        .insert({
          nome_completo: values.nome_completo,
          cpf: cpf || null,
          data_nascimento: dataNascimento,
          sexo: values.sexo,
          sexualidade: values.sexualidade || null,
          historico_breve_doencas: values.historico_breve_doencas,
          queixa_principal: values.queixa_principal,
          doencas,
          remedios,
          medicamentos_em_uso: remedios,
          futuras_anotacoes: values.futuras_anotacoes || null,
          telefone: values.telefone || 'N/A',
          email: values.email || null,
          endereco: {},
        })
        .select('id, nome_completo, cpf, data_nascimento, sexo, foto_path, updated_at')
        .single()

      if (insertError) {
        const isDupCpf = (insertError as { code?: string }).code === '23505'
        throw new Error(isDupCpf ? 'CPF já cadastrado para esta clínica' : insertError.message)
      }

      if (photoFile && created) {
        const ext = photoFile.type === 'image/png' ? 'png' : 'jpg'
        const objectPath = `${created.id}/${crypto.randomUUID()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('patient-photos')
          .upload(objectPath, photoFile, { contentType: photoFile.type, upsert: true })
        if (!uploadError) {
          await supabase.from('pacientes').update({ foto_path: objectPath }).eq('id', created.id)
        }
      }

      setShowNew(false)
      setPhotoFile(null)
      form.reset()

      // Recarrega a lista
      const { data: refreshData } = await supabase
        .from('pacientes')
        .select('id, nome_completo, cpf, data_nascimento, sexo, foto_path, updated_at')
        .order('updated_at', { ascending: false })
        .limit(50)

      if (refreshData) {
        const mapped: PatientListItem[] = refreshData.map((p: any) => ({
          id: p.id,
          nome_completo: p.nome_completo,
          cpf: p.cpf ? String(p.cpf).replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : null,
          data_nascimento: p.data_nascimento,
          sexo: p.sexo,
          foto_url: null,
          updated_at: p.updated_at,
        }))
        setItems(mapped)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao criar paciente')
    } finally {
      setSubmitting(false)
    }
  }

  async function enqueue(patientId: string) {
    setError(null)
    try {
      const { error: insertError } = await supabase
        .from('atendimentos')
        .insert({
          paciente_id: patientId,
          status: 'aguardando',
          prioridade: 0,
          order_index: 0,
        })
      if (insertError) throw new Error(insertError.message || 'Falha ao adicionar à fila')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao adicionar à fila')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Pacientes</h1>
          <p className="text-gray-400 text-sm">Cadastro e prontuário</p>
        </div>
        <button
          className="inline-flex items-center gap-2 bg-brand-blue hover:bg-blue-600 text-white px-4 py-2 rounded-xl disabled:opacity-60"
          onClick={() => setShowNew(true)}
          disabled={!canCreate}
        >
          <Plus className="w-4 h-4" />
          Novo paciente
        </button>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/40 text-red-400 p-3 rounded-xl">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-dark-card border border-gray-800/50 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-gray-800/50">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                className="w-full pl-9 pr-3 py-2 bg-dark-input border border-gray-800 rounded-xl text-sm text-white focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue"
                placeholder="Pesquisar por nome ou CPF..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="divide-y divide-gray-800/50">
            {loading ? (
              <div className="p-6 text-gray-400">Carregando...</div>
            ) : filteredItems.length === 0 ? (
              <div className="p-6 text-gray-400">Nenhum paciente encontrado.</div>
            ) : (
              filteredItems.map((p) => (
                <div key={p.id} className="p-4 flex items-center gap-4 hover:bg-gray-900/30">
                  <div className="w-10 h-10 rounded-full bg-brand-blue/20 flex items-center justify-center overflow-hidden">
                    {p.foto_url ? <img src={p.foto_url} className="w-full h-full object-cover" /> : <span className="text-brand-blue font-bold">{p.nome_completo.slice(0, 1).toUpperCase()}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-semibold truncate">{p.nome_completo}</div>
                    <div className="text-xs text-gray-400 truncate">{p.cpf ? `CPF: ${p.cpf}` : 'CPF não informado'}</div>
                  </div>
                  <div className="text-xs text-gray-500">{p.updated_at ? new Date(p.updated_at).toLocaleDateString('pt-BR') : ''}</div>
                  <button
                    className="text-xs px-3 py-2 rounded-xl bg-gray-900/40 text-gray-200 hover:bg-gray-900/60"
                    onClick={() => navigate(`${basePath}/prontuarios/${p.id}`)}
                    type="button"
                  >
                    Prontuário
                  </button>
                  {canEnqueue ? (
                    <button
                      className="text-xs px-3 py-2 rounded-xl bg-brand-blue/20 border border-brand-blue/30 text-white hover:bg-brand-blue/25"
                      onClick={() => enqueue(p.id)}
                      type="button"
                    >
                      Fila
                    </button>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-4">
          {!showNew ? (
            <div className="bg-dark-card border border-gray-800/50 rounded-2xl p-6 text-gray-400">
              Selecione um paciente na lista ou clique em “Novo paciente”.
            </div>
          ) : (
            <div className="bg-dark-card border border-gray-800/50 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-gray-800/50 flex items-center justify-between">
                <div className="text-white font-semibold">Novo paciente</div>
                <button
                  className="p-2 rounded-lg hover:bg-gray-900/40 text-gray-300"
                  onClick={() => {
                    setShowNew(false)
                    setPhotoFile(null)
                    form.reset()
                  }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form className="p-4 space-y-4" onSubmit={form.handleSubmit(onCreate)}>
                <div>
                  <label className="text-xs text-gray-400">Nome completo *</label>
                  <input
                    className="mt-1 w-full px-3 py-2 bg-dark-input border border-gray-800 rounded-xl text-sm text-white"
                    {...form.register('nome_completo', { required: true, maxLength: 150 })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400">Idade *</label>
                    <input
                      type="number"
                      className="mt-1 w-full px-3 py-2 bg-dark-input border border-gray-800 rounded-xl text-sm text-white"
                      {...form.register('idade', { required: true, valueAsNumber: true, min: 0, max: 115 })}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Sexo *</label>
                    <select
                      className="mt-1 w-full px-3 py-2 bg-dark-input border border-gray-800 rounded-xl text-sm text-white"
                      {...form.register('sexo', { required: true })}
                    >
                      <option value="Masculino">Masculino</option>
                      <option value="Feminino">Feminino</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-400">Sexualidade (opcional)</label>
                  <input
                    className="mt-1 w-full px-3 py-2 bg-dark-input border border-gray-800 rounded-xl text-sm text-white"
                    {...form.register('sexualidade')}
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400">Histórico breve de doenças *</label>
                  <textarea
                    rows={3}
                    className="mt-1 w-full px-3 py-2 bg-dark-input border border-gray-800 rounded-xl text-sm text-white"
                    {...form.register('historico_breve_doencas', { required: true, minLength: 10 })}
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400">Queixa principal *</label>
                  <input
                    className="mt-1 w-full px-3 py-2 bg-dark-input border border-gray-800 rounded-xl text-sm text-white"
                    {...form.register('queixa_principal', { required: true })}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-gray-400">Doenças que tem</label>
                    <button
                      type="button"
                      className="text-xs text-brand-blue hover:underline"
                      onClick={() => doencasArray.append({ value: '' })}
                    >
                      Adicionar
                    </button>
                  </div>
                  <div className="mt-2 space-y-2">
                    {doencasArray.fields.map((f, idx) => (
                      <div key={f.id} className="flex gap-2">
                        <input
                          className="flex-1 px-3 py-2 bg-dark-input border border-gray-800 rounded-xl text-sm text-white"
                          {...form.register(`doencas.${idx}.value` as const)}
                        />
                        <button
                          type="button"
                          className="px-3 py-2 rounded-xl bg-gray-900/40 text-gray-300"
                          onClick={() => doencasArray.remove(idx)}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-gray-400">Remédios que toma</label>
                    <button
                      type="button"
                      className="text-xs text-brand-blue hover:underline"
                      onClick={() => remediosArray.append({ nome: '', dosagem: '', frequencia: '' })}
                    >
                      Adicionar
                    </button>
                  </div>
                  <div className="mt-2 space-y-2">
                    {remediosArray.fields.map((f, idx) => (
                      <div key={f.id} className="grid grid-cols-3 gap-2">
                        <input
                          placeholder="Nome"
                          className="px-3 py-2 bg-dark-input border border-gray-800 rounded-xl text-sm text-white"
                          {...form.register(`remedios.${idx}.nome` as const)}
                        />
                        <input
                          placeholder="Dosagem"
                          className="px-3 py-2 bg-dark-input border border-gray-800 rounded-xl text-sm text-white"
                          {...form.register(`remedios.${idx}.dosagem` as const)}
                        />
                        <div className="flex gap-2">
                          <input
                            placeholder="Frequência"
                            className="flex-1 px-3 py-2 bg-dark-input border border-gray-800 rounded-xl text-sm text-white"
                            {...form.register(`remedios.${idx}.frequencia` as const)}
                          />
                          <button
                            type="button"
                            className="px-3 py-2 rounded-xl bg-gray-900/40 text-gray-300"
                            onClick={() => remediosArray.remove(idx)}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-400">Futuras anotações médicas</label>
                  <textarea
                    rows={3}
                    className="mt-1 w-full px-3 py-2 bg-dark-input border border-gray-800 rounded-xl text-sm text-white"
                    {...form.register('futuras_anotacoes')}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400">CPF (opcional)</label>
                    <input
                      className="mt-1 w-full px-3 py-2 bg-dark-input border border-gray-800 rounded-xl text-sm text-white"
                      value={maskCpf(form.watch('cpf') ?? '')}
                      onChange={(e) => form.setValue('cpf', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Telefone (opcional)</label>
                    <input
                      className="mt-1 w-full px-3 py-2 bg-dark-input border border-gray-800 rounded-xl text-sm text-white"
                      {...form.register('telefone')}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-400">Foto (opcional)</label>
                  <label className="mt-1 flex items-center gap-2 px-3 py-2 bg-dark-input border border-gray-800 rounded-xl text-sm text-white cursor-pointer">
                    <Upload className="w-4 h-4" />
                    <span className="flex-1 truncate">{photoFile ? photoFile.name : 'Enviar foto (JPG/PNG até 10MB)'}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      className="hidden"
                      onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-brand-blue hover:bg-blue-600 text-white font-semibold py-2 rounded-xl disabled:opacity-60"
                >
                  {submitting ? 'Salvando...' : 'Salvar paciente'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
