import express from 'express'
import crypto from 'crypto'
import multer from 'multer'
import { supabaseAdmin } from '../supabaseClient.js'
import { requireClinicoAuth, requireClinicoRole } from '../middleware/requireClinicoAuth.js'
import type { ClinicoAuthedRequest } from '../types/clinicoAuth.js'
import {
  buildHistoricoComQueixa,
  estimateBirthDateFromAge,
  validateCreatePatient,
} from '../services/patients/validation.js'
import { writeAuditLog } from '../services/auditLog.js'

const router = express.Router()

type PacienteRow = {
  id: string
  clinica_id: string
  nome_completo: string
  cpf: string | null
  data_nascimento: string
  sexo: 'Masculino' | 'Feminino' | null
  foto_path: string | null
  created_at: string | null
  updated_at: string | null
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ['image/jpeg', 'image/png'].includes(file.mimetype)
    if (!ok) return cb(new Error('Invalid image type'))
    return cb(null, true)
  },
})

async function signedPhotoUrl(path: string | null) {
  if (!path) return null
  const { data, error } = await supabaseAdmin.storage.from('patient-photos').createSignedUrl(path, 60 * 10)
  if (error) return null
  return data.signedUrl
}

router.use(requireClinicoAuth())

router.get('/', requireClinicoRole(['admin', 'medico', 'atendente']), async (req: ClinicoAuthedRequest, res) => {
  const clinicaId = req.clinico?.clinicaId
  if (!clinicaId) return res.status(403).json({ error: 'Forbidden: Missing clinica_id' })

  const query = String(req.query.query ?? '').trim()
  const page = Math.max(1, Number(req.query.page ?? 1) || 1)
  const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize ?? 20) || 20))
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let q = supabaseAdmin
    .from('pacientes')
    .select('id, nome_completo, cpf, data_nascimento, sexo, created_at, updated_at, foto_path', { count: 'exact' })
    .eq('clinica_id', clinicaId)
    .order('updated_at', { ascending: false })
    .range(from, to)

  if (query) {
    const qDigits = query.replace(/\D/g, '')
    const filters = [`nome_completo.ilike.%${query}%`]
    if (qDigits.length >= 3) filters.push(`cpf.ilike.%${qDigits}%`)
    q = q.or(filters.join(','))
  }

  const { data, error, count } = await q
  if (error) return res.status(500).json({ error: error.message })

  const items = await Promise.all(
    (data as PacienteRow[] | null | undefined ?? []).map(async (p) => ({
      ...p,
      cpf: p.cpf ? String(p.cpf).replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : null,
      foto_url: await signedPhotoUrl(p.foto_path ?? null),
    })),
  )

  return res.status(200).json({ items, page, pageSize, total: count ?? 0 })
})

router.post('/', requireClinicoRole(['medico', 'atendente']), async (req: ClinicoAuthedRequest, res) => {
  const clinicaId = req.clinico?.clinicaId
  const actorUserId = req.clinico?.userId
  if (!clinicaId) return res.status(403).json({ error: 'Forbidden: Missing clinica_id' })
  if (!actorUserId) return res.status(403).json({ error: 'Forbidden: Missing user' })

  const validated = validateCreatePatient(req.body)
  if ('errors' in validated) {
    return res.status(400).json({ error: 'Validation error', fields: validated.errors })
  }

  const input = validated.data
  const dataNascimento = estimateBirthDateFromAge(input.idade)
  const historicoConsolidado = buildHistoricoComQueixa(input.historico_breve_doencas, input.queixa_principal)

  const { data, error } = await supabaseAdmin
    .from('pacientes')
    .insert({
      clinica_id: clinicaId,
      nome_completo: input.nome_completo,
      cpf: input.cpf ?? null,
      data_nascimento: dataNascimento,
      sexo: input.sexo,
      sexualidade: input.sexualidade ?? null,
      historico_breve_doencas: historicoConsolidado,
      queixa_principal: input.queixa_principal,
      doencas: input.doencas ?? [],
      remedios: input.remedios ?? [],
      medicamentos_em_uso: input.remedios ?? [],
      futuras_anotacoes: input.futuras_anotacoes ?? null,
      telefone: input.telefone ?? 'N/A',
      endereco: input.endereco ?? {},
      email: input.email ?? null,
      convenio: input.convenio ?? null,
      numero_carteirinha: input.numero_carteirinha ?? null,
      nome_mae: input.nome_mae ?? null,
    })
    .select('*')
    .single()

  if (error) {
    const isDupCpf = (error as { code?: string }).code === '23505'
    return res.status(400).json({ error: isDupCpf ? 'CPF já cadastrado para esta clínica' : error.message })
  }

  await writeAuditLog({
    clinica_id: clinicaId,
    actor_user_id: actorUserId,
    entity_type: 'paciente',
    entity_id: data.id,
    action: 'patient.created',
    metadata: { fields: Object.keys(input) },
  })

  return res.status(201).json({
    patient: {
      ...data,
      foto_url: await signedPhotoUrl(data.foto_path ?? null),
    },
  })
})

router.get('/:patientId', requireClinicoRole(['admin', 'medico', 'atendente']), async (req: ClinicoAuthedRequest, res) => {
  const clinicaId = req.clinico?.clinicaId
  if (!clinicaId) return res.status(403).json({ error: 'Forbidden: Missing clinica_id' })

  const { patientId } = req.params

  const { data, error } = await supabaseAdmin
    .from('pacientes')
    .select('*')
    .eq('clinica_id', clinicaId)
    .eq('id', patientId)
    .single()

  if (error) return res.status(404).json({ error: 'Patient not found' })

  return res.status(200).json({
    patient: {
      ...data,
      foto_url: await signedPhotoUrl(data.foto_path ?? null),
    },
  })
})

router.get(
  '/:patientId/record',
  requireClinicoRole(['admin', 'medico', 'atendente']),
  async (req: ClinicoAuthedRequest, res) => {
    const clinicaId = req.clinico?.clinicaId
    const role = req.clinico?.role
    if (!clinicaId) return res.status(403).json({ error: 'Forbidden: Missing clinica_id' })

    const { patientId } = req.params

    const { data, error } = await supabaseAdmin
      .from('pacientes')
      .select(
        [
          'id',
          'clinica_id',
          'nome_completo',
          'cpf',
          'data_nascimento',
          'sexo',
          'email',
          'telefone',
          'convenio',
          'numero_carteirinha',
          'nome_mae',
          'endereco',
          'alergias',
          'doencas',
          'medicamentos_em_uso',
          'remedios',
          'historico_breve_doencas',
          'queixa_principal',
          'futuras_anotacoes',
          'foto_path',
          'created_at',
          'updated_at',
        ].join(', '),
      )
      .eq('clinica_id', clinicaId)
      .eq('id', patientId)
      .single()

    if (error || !data) return res.status(404).json({ error: 'Patient not found' })

    type PatientRecordRow = {
      id: string
      nome_completo: string
      cpf: string | null
      data_nascimento: string
      sexo: 'Masculino' | 'Feminino' | null
      email: string | null
      telefone: string | null
      endereco: unknown
      convenio: string | null
      numero_carteirinha: string | null
      nome_mae: string | null
      alergias: unknown
      doencas: unknown
      medicamentos_em_uso: unknown
      remedios: unknown
      historico_breve_doencas: string | null
      queixa_principal: string | null
      futuras_anotacoes: string | null
      foto_path: string | null
      updated_at: string | null
    }

    const row = data as unknown as PatientRecordRow
    const photoUrl = await signedPhotoUrl(row.foto_path)

    const base = {
      id: row.id,
      nome_completo: row.nome_completo,
      cpf: row.cpf,
      data_nascimento: row.data_nascimento,
      sexo: row.sexo,
      convenio: row.convenio,
      foto_url: photoUrl,
      updated_at: row.updated_at,
    }

    if (role === 'atendente') {
      return res.status(200).json({
        patient: {
          ...base,
          alergias: row.alergias ?? [],
          doencas: row.doencas ?? [],
          medicamentos_em_uso: row.medicamentos_em_uso ?? [],
        },
        visibility: { level: 'limited' },
      })
    }

    return res.status(200).json({
      patient: {
        ...base,
        email: row.email,
        telefone: row.telefone,
        endereco: row.endereco ?? {},
        numero_carteirinha: row.numero_carteirinha,
        nome_mae: row.nome_mae,
        alergias: row.alergias ?? [],
        doencas: row.doencas ?? [],
        medicamentos_em_uso: row.medicamentos_em_uso ?? [],
        remedios: row.remedios ?? [],
        historico_breve_doencas: row.historico_breve_doencas,
        queixa_principal: row.queixa_principal,
        futuras_anotacoes: row.futuras_anotacoes,
      },
      visibility: { level: 'full' },
    })
  },
)

router.patch('/:patientId', requireClinicoRole(['admin', 'medico', 'atendente']), async (req: ClinicoAuthedRequest, res) => {
  const clinicaId = req.clinico?.clinicaId
  if (!clinicaId) return res.status(403).json({ error: 'Forbidden: Missing clinica_id' })
  const actorUserId = req.clinico?.userId
  if (!actorUserId) return res.status(403).json({ error: 'Forbidden: Missing user' })
  const role = req.clinico?.role

  const { patientId } = req.params
  const patch: Record<string, unknown> = {}

  if (role === 'atendente') {
    const forbidden = ['historico_breve_doencas', 'queixa_principal', 'futuras_anotacoes', 'remedios', 'doencas']
    const attempted = forbidden.filter((k) => (req.body ?? {})[k] != null)
    if (attempted.length) {
      return res.status(403).json({ error: 'Forbidden: Atendente não pode editar campos clínicos narrativos' })
    }
  }

  if (req.body?.nome_completo != null) {
    const nome = String(req.body.nome_completo).trim()
    if (!nome) return res.status(400).json({ error: 'nome_completo é obrigatório' })
    if (nome.length > 150) return res.status(400).json({ error: 'nome_completo máximo 150 caracteres' })
    patch.nome_completo = nome
  }

  if (req.body?.sexo != null) {
    if (req.body.sexo !== 'Masculino' && req.body.sexo !== 'Feminino') return res.status(400).json({ error: 'sexo inválido' })
    patch.sexo = req.body.sexo
  }

  if (req.body?.sexualidade != null) {
    const v = String(req.body.sexualidade).trim()
    if (v.length > 120) return res.status(400).json({ error: 'sexualidade máximo 120 caracteres' })
    patch.sexualidade = v || null
  }

  const historico = req.body?.historico_breve_doencas != null ? String(req.body.historico_breve_doencas).trim() : null
  const queixa = req.body?.queixa_principal != null ? String(req.body.queixa_principal).trim() : null
  if (historico != null) {
    if (historico.length < 10) return res.status(400).json({ error: 'historico_breve_doencas mínimo 10 caracteres' })
  }
  if (queixa != null) {
    if (!queixa) return res.status(400).json({ error: 'queixa_principal é obrigatória' })
  }

  if (req.body?.doencas != null) {
    if (!Array.isArray(req.body.doencas)) return res.status(400).json({ error: 'doencas deve ser lista' })
    patch.doencas = req.body.doencas.map((d: unknown) => String(d).trim()).filter(Boolean)
  }

  if (req.body?.remedios != null) {
    if (!Array.isArray(req.body.remedios)) return res.status(400).json({ error: 'remedios deve ser lista' })
    patch.remedios = req.body.remedios
      .map((r: unknown) => {
        const rr = (r ?? {}) as Record<string, unknown>
        return {
          nome: String(rr.nome ?? '').trim(),
          dosagem: String(rr.dosagem ?? '').trim(),
          frequencia: String(rr.frequencia ?? '').trim(),
        }
      })
      .filter((r: { nome: string; dosagem: string; frequencia: string }) => r.nome && r.dosagem && r.frequencia)
    patch.medicamentos_em_uso = patch.remedios
  }

  if (req.body?.futuras_anotacoes != null) {
    patch.futuras_anotacoes = String(req.body.futuras_anotacoes).trim() || null
  }

  if (req.body?.cpf != null) {
    const cpf = String(req.body.cpf).replace(/\D/g, '')
    if (cpf && cpf.length !== 11) return res.status(400).json({ error: 'cpf inválido' })
    patch.cpf = cpf || null
  }

  if (req.body?.telefone != null) patch.telefone = String(req.body.telefone).trim() || 'N/A'
  if (req.body?.email != null) patch.email = String(req.body.email).trim() || null
  if (req.body?.endereco != null) patch.endereco = req.body.endereco

  if (historico != null || queixa != null) {
    const { data: current } = await supabaseAdmin
      .from('pacientes')
      .select('historico_breve_doencas, queixa_principal')
      .eq('clinica_id', clinicaId)
      .eq('id', patientId)
      .maybeSingle()

    const currentRow = current as { historico_breve_doencas?: string | null; queixa_principal?: string | null } | null
    const nextQueixa = queixa ?? currentRow?.queixa_principal
    const nextHistorico = historico ?? currentRow?.historico_breve_doencas
    if (!nextQueixa || !nextHistorico) {
      return res.status(400).json({ error: 'historico_breve_doencas e queixa_principal são obrigatórios' })
    }
    patch.queixa_principal = nextQueixa
    patch.historico_breve_doencas = buildHistoricoComQueixa(nextHistorico, nextQueixa)
  }

  const { data, error } = await supabaseAdmin
    .from('pacientes')
    .update(patch)
    .eq('clinica_id', clinicaId)
    .eq('id', patientId)
    .select('*')
    .single()

  if (error) return res.status(400).json({ error: error.message })

  await writeAuditLog({
    clinica_id: clinicaId,
    actor_user_id: actorUserId,
    entity_type: 'paciente',
    entity_id: patientId,
    action: 'patient.updated',
    metadata: { changed_fields: Object.keys(patch) },
  })

  return res.status(200).json({
    patient: {
      ...data,
      foto_url: await signedPhotoUrl(data.foto_path ?? null),
    },
  })
})

router.delete('/:patientId', requireClinicoRole(['admin', 'atendente']), async (req: ClinicoAuthedRequest, res) => {
  const clinicaId = req.clinico?.clinicaId
  if (!clinicaId) return res.status(403).json({ error: 'Forbidden: Missing clinica_id' })

  const { patientId } = req.params
  const { error } = await supabaseAdmin.from('pacientes').delete().eq('clinica_id', clinicaId).eq('id', patientId)
  if (error) return res.status(400).json({ error: error.message })
  return res.status(204).send()
})

router.post(
  '/:patientId/photo',
  requireClinicoRole(['medico', 'atendente']),
  upload.single('photo'),
  async (req: ClinicoAuthedRequest, res) => {
    const clinicaId = req.clinico?.clinicaId
    if (!clinicaId) return res.status(403).json({ error: 'Forbidden: Missing clinica_id' })
    const actorUserId = req.clinico?.userId
    if (!actorUserId) return res.status(403).json({ error: 'Forbidden: Missing user' })

    const { patientId } = req.params
    if (!req.file) return res.status(400).json({ error: 'Missing photo file' })

    const ext = req.file.mimetype === 'image/png' ? 'png' : 'jpg'
    const objectPath = `${clinicaId}/${patientId}/${crypto.randomUUID()}.${ext}`

    const { error: uploadError } = await supabaseAdmin.storage.from('patient-photos').upload(objectPath, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: true,
    })
    if (uploadError) return res.status(500).json({ error: uploadError.message })

    const { data, error } = await supabaseAdmin
      .from('pacientes')
      .update({ foto_path: objectPath })
      .eq('clinica_id', clinicaId)
      .eq('id', patientId)
      .select('*')
      .single()

    if (error) return res.status(400).json({ error: error.message })

    await writeAuditLog({
      clinica_id: clinicaId,
      actor_user_id: actorUserId,
      entity_type: 'paciente',
      entity_id: patientId,
      action: 'patient.photo_uploaded',
      metadata: { object_path: objectPath, mime_type: req.file.mimetype, size_bytes: req.file.size },
    })

    return res.status(200).json({
      patient: {
        ...data,
        foto_url: await signedPhotoUrl(objectPath),
      },
    })
  },
)

router.get('/:patientId/audit', requireClinicoRole(['admin', 'medico']), async (req: ClinicoAuthedRequest, res) => {
  const clinicaId = req.clinico?.clinicaId
  if (!clinicaId) return res.status(403).json({ error: 'Forbidden: Missing clinica_id' })
  const { patientId } = req.params

  const { data, error } = await supabaseAdmin
    .from('audit_logs')
    .select('id, actor_user_id, entity_type, entity_id, action, metadata, created_at, actor:usuarios(nome,email)')
    .eq('clinica_id', clinicaId)
    .eq('entity_type', 'paciente')
    .eq('entity_id', patientId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json({ items: data ?? [] })
})

export default router
