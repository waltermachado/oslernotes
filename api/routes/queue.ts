import express from 'express'
import { supabaseAdmin } from '../supabaseClient.js'
import { requireClinicoAuth, requireClinicoRole } from '../middleware/requireClinicoAuth.js'
import type { ClinicoAuthedRequest } from '../types/clinicoAuth.js'
import { writeAuditLog } from '../services/auditLog.js'

const router = express.Router()

router.use(requireClinicoAuth())

function isMissingAtendimentosColumn(errorMessage: string, column: string) {
  const msg = (errorMessage || '').toLowerCase()
  const patterns = [
    `column atendimentos.${column.toLowerCase()} does not exist`,
    `column "${column.toLowerCase()}" of relation "atendimentos" does not exist`,
    `atendimentos.${column.toLowerCase()} does not exist`,
  ]
  return patterns.some((p) => msg.includes(p))
}

router.get('/', requireClinicoRole(['admin', 'medico', 'atendente']), async (req: ClinicoAuthedRequest, res) => {
  const clinicaId = req.clinico?.clinicaId
  const role = req.clinico?.role
  const userId = req.clinico?.userId
  if (!clinicaId || !role || !userId) return res.status(403).json({ error: 'Forbidden' })

  const status = String(req.query.status ?? 'aguardando')
  const mine = String(req.query.mine ?? '') === '1'

  async function runQuery(useNewColumns: boolean) {
    const selectNew =
      'id, paciente_id, medico_id, status, prioridade, scheduled_time, order_index, data_hora_inicio, data_hora_fim, created_at, pacientes:pacientes(id,nome_completo,cpf,sexo,data_nascimento,foto_path)'
    const selectOld =
      'id, paciente_id, medico_id, status, prioridade, data_hora_inicio, data_hora_fim, created_at, pacientes:pacientes(id,nome_completo,cpf,sexo,data_nascimento,foto_path)'

    let q = supabaseAdmin
      .from('atendimentos')
      .select(useNewColumns ? selectNew : selectOld)
      .eq('clinica_id', clinicaId)

    if (useNewColumns) {
      q = q
        .order('order_index', { ascending: true })
        .order('scheduled_time', { ascending: true, nullsFirst: true })
        .order('prioridade', { ascending: false })
        .order('created_at', { ascending: true })
    } else {
      q = q.order('prioridade', { ascending: false }).order('created_at', { ascending: true })
    }

    if (status) {
      if (status.includes(',')) q = q.in('status', status.split(','))
      else q = q.eq('status', status)
    }

    if (mine && role === 'medico') q = q.eq('medico_id', userId)

    return await q
  }

  const first = await runQuery(true)
  if (first.error) {
    const msg = first.error.message || ''
    if (isMissingAtendimentosColumn(msg, 'scheduled_time') || isMissingAtendimentosColumn(msg, 'order_index')) {
      const fallback = await runQuery(false)
      if (fallback.error) return res.status(500).json({ error: fallback.error.message })
      return res.status(200).json({ items: fallback.data ?? [], schema: 'legacy' })
    }
    return res.status(500).json({ error: msg })
  }

  return res.status(200).json({ items: first.data ?? [], schema: 'v2' })
})

router.post('/', requireClinicoRole(['admin', 'atendente']), async (req: ClinicoAuthedRequest, res) => {
  const clinicaId = req.clinico?.clinicaId
  const actorUserId = req.clinico?.userId
  if (!clinicaId) return res.status(403).json({ error: 'Forbidden: Missing clinica_id' })
  if (!actorUserId) return res.status(403).json({ error: 'Forbidden: Missing user' })

  const pacienteId = String(req.body?.paciente_id ?? '')
  const prioridade = req.body?.prioridade != null ? Number(req.body.prioridade) : 0
  const medicoId = req.body?.medico_id || null
  const scheduledTime = req.body?.scheduled_time || null
  const status = scheduledTime ? 'agendado' : 'aguardando'

  if (!pacienteId) return res.status(400).json({ error: 'paciente_id é obrigatório' })
  if (!Number.isFinite(prioridade)) return res.status(400).json({ error: 'prioridade inválida' })

  const insertBase: Record<string, any> = {
    clinica_id: clinicaId,
    paciente_id: pacienteId,
    medico_id: medicoId,
    status,
    prioridade,
  }

  let insert: Record<string, any> = insertBase
  if (scheduledTime != null) insert = { ...insert, scheduled_time: scheduledTime }
  insert = { ...insert, order_index: 0 }

  let { data: atendimento, error } = await supabaseAdmin
    .from('atendimentos')
    .insert(insert)
    .select('id, paciente_id, medico_id, status, prioridade, scheduled_time, created_at')
    .single()

  if (error && (isMissingAtendimentosColumn(error.message, 'scheduled_time') || isMissingAtendimentosColumn(error.message, 'order_index'))) {
    if (scheduledTime != null) {
      return res.status(409).json({ error: 'Banco ainda não migrado para agendamento. Aplique a migração de atendimentos (scheduled_time).' })
    }
    const legacy = await supabaseAdmin
      .from('atendimentos')
      .insert(insertBase)
      .select('id, paciente_id, medico_id, status, prioridade, created_at')
      .single()
    atendimento = legacy.data as any
    error = legacy.error as any
  }

  if (error) return res.status(400).json({ error: error.message })

  await writeAuditLog({
    clinica_id: clinicaId,
    actor_user_id: actorUserId,
    entity_type: 'atendimento',
    entity_id: atendimento.id,
    action: 'queue.enqueued',
    metadata: { paciente_id: pacienteId, prioridade, scheduled_time: scheduledTime, medico_id: medicoId, status },
  })
  return res.status(201).json({ atendimento })
})

router.patch('/:atendimentoId', requireClinicoRole(['admin', 'atendente', 'medico']), async (req: ClinicoAuthedRequest, res) => {
  const clinicaId = req.clinico?.clinicaId
  const userId = req.clinico?.userId
  if (!clinicaId || !userId) return res.status(403).json({ error: 'Forbidden' })

  const { atendimentoId } = req.params
  
  const updates: Record<string, any> = {}
  if (req.body.medico_id !== undefined) updates.medico_id = req.body.medico_id
  if (req.body.status !== undefined) updates.status = req.body.status
  if (req.body.prioridade !== undefined) updates.prioridade = Number(req.body.prioridade)
  if (req.body.scheduled_time !== undefined) updates.scheduled_time = req.body.scheduled_time
  if (req.body.order_index !== undefined) updates.order_index = Number(req.body.order_index)

  if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'Nenhum campo para atualizar' })

  const { data: updated, error } = await supabaseAdmin
    .from('atendimentos')
    .update(updates)
    .eq('clinica_id', clinicaId)
    .eq('id', atendimentoId)
    .select('id, paciente_id, medico_id, status, prioridade, scheduled_time, order_index, version')
    .single()

  if (
    error &&
    (isMissingAtendimentosColumn(error.message, 'scheduled_time') ||
      isMissingAtendimentosColumn(error.message, 'order_index') ||
      isMissingAtendimentosColumn(error.message, 'version'))
  ) {
    return res.status(409).json({ error: 'Banco ainda não migrado para edição avançada da fila. Aplique a migração de atendimentos.' })
  }
  if (error) return res.status(400).json({ error: error.message })

  await writeAuditLog({
    clinica_id: clinicaId,
    actor_user_id: userId,
    entity_type: 'atendimento',
    entity_id: atendimentoId,
    action: 'queue.updated',
    metadata: updates,
  })
  
  return res.status(200).json({ atendimento: updated })
})

router.post('/:atendimentoId/accept', requireClinicoRole(['medico']), async (req: ClinicoAuthedRequest, res) => {
  const clinicaId = req.clinico?.clinicaId
  const userId = req.clinico?.userId
  if (!clinicaId || !userId) return res.status(403).json({ error: 'Forbidden' })

  const { atendimentoId } = req.params

  const { data: updated, error } = await supabaseAdmin
    .from('atendimentos')
    .update({ medico_id: userId })
    .eq('clinica_id', clinicaId)
    .eq('id', atendimentoId)
    .eq('status', 'aguardando')
    .is('medico_id', null)
    .select('id, paciente_id, medico_id, status')
    .maybeSingle()

  if (error) return res.status(400).json({ error: error.message })
  if (!updated) return res.status(409).json({ error: 'Atendimento já aceito ou não está aguardando' })

  await writeAuditLog({
    clinica_id: clinicaId,
    actor_user_id: userId,
    entity_type: 'atendimento',
    entity_id: atendimentoId,
    action: 'queue.accepted',
    metadata: { paciente_id: updated.paciente_id },
  })
  return res.status(200).json({ atendimento: updated })
})

router.post('/:atendimentoId/call', requireClinicoRole(['medico']), async (req: ClinicoAuthedRequest, res) => {
  const clinicaId = req.clinico?.clinicaId
  const userId = req.clinico?.userId
  if (!clinicaId || !userId) return res.status(403).json({ error: 'Forbidden' })

  const { atendimentoId } = req.params

  const { data: updated, error } = await supabaseAdmin
    .from('atendimentos')
    .update({ status: 'em_atendimento', data_hora_inicio: new Date().toISOString() })
    .eq('clinica_id', clinicaId)
    .eq('id', atendimentoId)
    .eq('medico_id', userId)
    .in('status', ['aguardando', 'em_atendimento'])
    .select('id, paciente_id, medico_id, status, data_hora_inicio')
    .single()

  if (error) return res.status(400).json({ error: error.message })

  await writeAuditLog({
    clinica_id: clinicaId,
    actor_user_id: userId,
    entity_type: 'atendimento',
    entity_id: atendimentoId,
    action: 'queue.called',
    metadata: { paciente_id: updated.paciente_id, data_hora_inicio: updated.data_hora_inicio },
  })
  return res.status(200).json({ atendimento: updated })
})

router.post('/:atendimentoId/finish', requireClinicoRole(['medico']), async (req: ClinicoAuthedRequest, res) => {
  const clinicaId = req.clinico?.clinicaId
  const userId = req.clinico?.userId
  if (!clinicaId || !userId) return res.status(403).json({ error: 'Forbidden' })

  const { atendimentoId } = req.params

  const { data: updated, error } = await supabaseAdmin
    .from('atendimentos')
    .update({ status: 'finalizado', data_hora_fim: new Date().toISOString() })
    .eq('clinica_id', clinicaId)
    .eq('id', atendimentoId)
    .eq('medico_id', userId)
    .eq('status', 'em_atendimento')
    .select('id, paciente_id, medico_id, status, data_hora_fim')
    .single()

  if (error) return res.status(400).json({ error: error.message })

  await writeAuditLog({
    clinica_id: clinicaId,
    actor_user_id: userId,
    entity_type: 'atendimento',
    entity_id: atendimentoId,
    action: 'queue.finished',
    metadata: { paciente_id: updated.paciente_id, data_hora_fim: updated.data_hora_fim },
  })
  return res.status(200).json({ atendimento: updated })
})

export default router
