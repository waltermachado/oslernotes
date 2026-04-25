import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { corsResponse } from '../_shared/cors.ts'
import { adminClient, requireClinicoAuth, requireRole } from '../_shared/auth.ts'

function json(req: Request, status: number, payload: unknown) {
  return corsResponse(req, JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}

async function readJson(req: Request) {
  try {
    return await req.json()
  } catch {
    return null
  }
}

async function signedPhotoUrl(admin: ReturnType<typeof adminClient>, path: string | null) {
  if (!path) return null
  const { data, error } = await admin.storage.from('patient-photos').createSignedUrl(path, 60 * 10)
  if (error) return null
  return data.signedUrl
}

async function writeAuditLog(admin: ReturnType<typeof adminClient>, params: Record<string, unknown>) {
  await admin.from('audit_logs').insert(params)
}

function stripFunctionPrefix(pathname: string) {
  const marker = '/functions/v1/api'
  const idx = pathname.indexOf(marker)
  if (idx >= 0) {
    const rest = pathname.slice(idx + marker.length)
    return rest || '/'
  }
  return pathname
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse(req, null, { status: 204 })

  const url = new URL(req.url)
  let path = stripFunctionPrefix(url.pathname)

  if (path.startsWith('/api/')) path = path.slice('/api'.length)
  if (path === '/api') path = '/'

  const admin = adminClient()

  if (path === '/health') return json(req, 200, { ok: true })

  if (path.startsWith('/patients')) {
    const auth = await requireClinicoAuth(req)
    if (!auth.ok) return json(req, auth.status, { error: auth.error })

    const roleCheck = requireRole(auth.ctx, ['admin', 'medico', 'atendente'])
    if (!roleCheck.ok) return json(req, roleCheck.status, { error: roleCheck.error })

    const parts = path.split('/').filter(Boolean)
    if (parts.length === 1 && req.method === 'GET') {
      const clinicaId = auth.ctx.clinicaId
      const query = String(url.searchParams.get('query') ?? '').trim()
      const page = Math.max(1, Number(url.searchParams.get('page') ?? 1) || 1)
      const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get('pageSize') ?? 20) || 20))
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      let q = admin
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
      if (error) return json(req, 500, { error: error.message })

      const items = await Promise.all(
        (data ?? []).map(async (p: any) => ({
          ...p,
          cpf: p.cpf ? String(p.cpf).replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : null,
          foto_url: await signedPhotoUrl(admin, p.foto_path ?? null),
        })),
      )

      return json(req, 200, { items, page, pageSize, total: count ?? 0 })
    }

    if (parts.length === 1 && req.method === 'POST') {
      const body = (await readJson(req)) as any
      const nome = String(body?.nome_completo ?? '').trim()
      if (!nome) return json(req, 400, { error: 'nome_completo é obrigatório' })

      const clinicaId = auth.ctx.clinicaId
      const actorUserId = auth.ctx.userId

      const idade = body?.idade != null ? Number(body.idade) : null
      const now = new Date()
      const birth = Number.isFinite(idade) && idade != null ? new Date(now.getFullYear() - idade, now.getMonth(), now.getDate()) : null
      const dataNascimento = birth ? birth.toISOString().slice(0, 10) : String(body?.data_nascimento ?? '').trim()
      if (!dataNascimento) return json(req, 400, { error: 'data_nascimento é obrigatória' })

      const queixa = String(body?.queixa_principal ?? '').trim() || null
      const historico = String(body?.historico_breve_doencas ?? '').trim() || null
      const historicoConsolidado = historico && queixa ? `${historico}\n\nQueixa principal: ${queixa}` : historico

      const cpf = body?.cpf != null ? String(body.cpf).replace(/\D/g, '') || null : null

      const insert = {
        clinica_id: clinicaId,
        nome_completo: nome,
        cpf,
        data_nascimento: dataNascimento,
        sexo: body?.sexo ?? null,
        sexualidade: body?.sexualidade ?? null,
        historico_breve_doencas: historicoConsolidado,
        queixa_principal: queixa,
        doencas: Array.isArray(body?.doencas) ? body.doencas : [],
        remedios: Array.isArray(body?.remedios) ? body.remedios : [],
        medicamentos_em_uso: Array.isArray(body?.remedios) ? body.remedios : [],
        futuras_anotacoes: body?.futuras_anotacoes ?? null,
        telefone: body?.telefone ?? 'N/A',
        endereco: body?.endereco ?? {},
        email: body?.email ?? null,
        convenio: body?.convenio ?? null,
        numero_carteirinha: body?.numero_carteirinha ?? null,
        nome_mae: body?.nome_mae ?? null,
      }

      const { data, error } = await admin.from('pacientes').insert(insert).select('*').single()
      if (error) return json(req, 400, { error: error.message })

      await writeAuditLog(admin, {
        clinica_id: clinicaId,
        actor_user_id: actorUserId,
        entity_type: 'paciente',
        entity_id: data.id,
        action: 'patient.created',
        metadata: { fields: Object.keys(insert) },
      })

      return json(req, 201, { patient: { ...data, foto_url: await signedPhotoUrl(admin, data.foto_path ?? null) } })
    }

    if (parts.length >= 2) {
      const patientId = parts[1]

      if (parts.length === 2 && req.method === 'GET') {
        const { data, error } = await admin
          .from('pacientes')
          .select('*')
          .eq('clinica_id', auth.ctx.clinicaId)
          .eq('id', patientId)
          .single()
        if (error) return json(req, 404, { error: 'Patient not found' })
        return json(req, 200, { patient: { ...data, foto_url: await signedPhotoUrl(admin, data.foto_path ?? null) } })
      }

      if (parts.length === 3 && parts[2] === 'audit' && req.method === 'GET') {
        const roleCheck2 = requireRole(auth.ctx, ['admin', 'medico'])
        if (!roleCheck2.ok) return json(req, roleCheck2.status, { error: roleCheck2.error })

        const { data, error } = await admin
          .from('audit_logs')
          .select('id, actor_user_id, entity_type, entity_id, action, metadata, created_at, actor:usuarios(nome,email)')
          .eq('clinica_id', auth.ctx.clinicaId)
          .eq('entity_type', 'paciente')
          .eq('entity_id', patientId)
          .order('created_at', { ascending: false })
          .limit(100)
        if (error) return json(req, 500, { error: error.message })
        return json(req, 200, { items: data ?? [] })
      }

      if (parts.length === 3 && parts[2] === 'photo' && req.method === 'POST') {
        const roleCheck2 = requireRole(auth.ctx, ['medico', 'atendente'])
        if (!roleCheck2.ok) return json(req, roleCheck2.status, { error: roleCheck2.error })

        const form = await req.formData()
        const file = form.get('photo')
        if (!(file instanceof File)) return json(req, 400, { error: 'Missing photo file' })
        if (file.type !== 'image/jpeg' && file.type !== 'image/png') return json(req, 400, { error: 'Invalid image type' })

        const ext = file.type === 'image/png' ? 'png' : 'jpg'
        const objectPath = `${auth.ctx.clinicaId}/${patientId}/${crypto.randomUUID()}.${ext}`
        const buf = await file.arrayBuffer()
        const blob = new Blob([buf], { type: file.type })

        const { error: uploadError } = await admin.storage.from('patient-photos').upload(objectPath, blob, {
          contentType: file.type,
          upsert: true,
        })
        if (uploadError) return json(req, 500, { error: uploadError.message })

        const { data, error } = await admin
          .from('pacientes')
          .update({ foto_path: objectPath })
          .eq('clinica_id', auth.ctx.clinicaId)
          .eq('id', patientId)
          .select('*')
          .single()
        if (error) return json(req, 400, { error: error.message })

        await writeAuditLog(admin, {
          clinica_id: auth.ctx.clinicaId,
          actor_user_id: auth.ctx.userId,
          entity_type: 'paciente',
          entity_id: patientId,
          action: 'patient.photo_uploaded',
          metadata: { object_path: objectPath, mime_type: file.type, size_bytes: file.size },
        })

        return json(req, 200, { patient: { ...data, foto_url: await signedPhotoUrl(admin, objectPath) } })
      }
    }

    return json(req, 404, { error: 'Not found' })
  }

  if (path.startsWith('/queue')) {
    const auth = await requireClinicoAuth(req)
    if (!auth.ok) return json(req, auth.status, { error: auth.error })

    const parts = path.split('/').filter(Boolean)

    if (parts.length === 1 && req.method === 'GET') {
      const roleCheck = requireRole(auth.ctx, ['admin', 'medico', 'atendente'])
      if (!roleCheck.ok) return json(req, roleCheck.status, { error: roleCheck.error })

      const status = String(url.searchParams.get('status') ?? 'aguardando')
      const mine = String(url.searchParams.get('mine') ?? '') === '1'

      let q = admin
        .from('atendimentos')
        .select(
          'id, paciente_id, medico_id, status, prioridade, scheduled_time, order_index, data_hora_inicio, data_hora_fim, created_at, pacientes:pacientes(id,nome_completo,cpf,sexo,data_nascimento,foto_path)',
        )
        .eq('clinica_id', auth.ctx.clinicaId)
        .order('order_index', { ascending: true })
        .order('scheduled_time', { ascending: true, nullsFirst: true })
        .order('prioridade', { ascending: false })
        .order('created_at', { ascending: true })

      if (status) {
        if (status.includes(',')) q = q.in('status', status.split(','))
        else q = q.eq('status', status)
      }
      if (mine && auth.ctx.role === 'medico') q = q.eq('medico_id', auth.ctx.userId)

      const { data, error } = await q
      if (error) return json(req, 500, { error: error.message })
      return json(req, 200, { items: data ?? [], schema: 'v2' })
    }

    if (parts.length === 1 && req.method === 'POST') {
      const roleCheck = requireRole(auth.ctx, ['admin', 'atendente'])
      if (!roleCheck.ok) return json(req, roleCheck.status, { error: roleCheck.error })

      const body = (await readJson(req)) as any
      const pacienteId = String(body?.paciente_id ?? '')
      const prioridade = body?.prioridade != null ? Number(body.prioridade) : 0
      const medicoId = body?.medico_id || null
      const scheduledTime = body?.scheduled_time || null
      const status = scheduledTime ? 'agendado' : 'aguardando'
      if (!pacienteId) return json(req, 400, { error: 'paciente_id é obrigatório' })
      if (!Number.isFinite(prioridade)) return json(req, 400, { error: 'prioridade inválida' })

      const insert = {
        clinica_id: auth.ctx.clinicaId,
        paciente_id: pacienteId,
        medico_id: medicoId,
        status,
        prioridade,
        scheduled_time: scheduledTime,
        order_index: 0,
      }

      const { data: atendimento, error } = await admin
        .from('atendimentos')
        .insert(insert)
        .select('id, paciente_id, medico_id, status, prioridade, scheduled_time, created_at')
        .single()
      if (error) return json(req, 400, { error: error.message })

      await writeAuditLog(admin, {
        clinica_id: auth.ctx.clinicaId,
        actor_user_id: auth.ctx.userId,
        entity_type: 'atendimento',
        entity_id: atendimento.id,
        action: 'queue.enqueued',
        metadata: { paciente_id: pacienteId, prioridade, scheduled_time: scheduledTime, medico_id: medicoId, status },
      })

      return json(req, 201, { atendimento })
    }

    if (parts.length >= 2) {
      const atendimentoId = parts[1]

      if (parts.length === 3 && parts[2] === 'accept' && req.method === 'POST') {
        const roleCheck = requireRole(auth.ctx, ['medico'])
        if (!roleCheck.ok) return json(req, roleCheck.status, { error: roleCheck.error })

        const { data: updated, error } = await admin
          .from('atendimentos')
          .update({ medico_id: auth.ctx.userId })
          .eq('clinica_id', auth.ctx.clinicaId)
          .eq('id', atendimentoId)
          .eq('status', 'aguardando')
          .is('medico_id', null)
          .select('id, paciente_id, medico_id, status')
          .maybeSingle()
        if (error) return json(req, 400, { error: error.message })
        if (!updated) return json(req, 409, { error: 'Atendimento já aceito ou não está aguardando' })

        await writeAuditLog(admin, {
          clinica_id: auth.ctx.clinicaId,
          actor_user_id: auth.ctx.userId,
          entity_type: 'atendimento',
          entity_id: atendimentoId,
          action: 'queue.accepted',
          metadata: { paciente_id: (updated as any).paciente_id },
        })

        return json(req, 200, { atendimento: updated })
      }

      if (parts.length === 3 && parts[2] === 'call' && req.method === 'POST') {
        const roleCheck = requireRole(auth.ctx, ['medico'])
        if (!roleCheck.ok) return json(req, roleCheck.status, { error: roleCheck.error })

        const { data: updated, error } = await admin
          .from('atendimentos')
          .update({ status: 'em_atendimento', data_hora_inicio: new Date().toISOString() })
          .eq('clinica_id', auth.ctx.clinicaId)
          .eq('id', atendimentoId)
          .eq('medico_id', auth.ctx.userId)
          .in('status', ['aguardando', 'em_atendimento'])
          .select('id, paciente_id, medico_id, status, data_hora_inicio')
          .single()
        if (error) return json(req, 400, { error: error.message })

        await writeAuditLog(admin, {
          clinica_id: auth.ctx.clinicaId,
          actor_user_id: auth.ctx.userId,
          entity_type: 'atendimento',
          entity_id: atendimentoId,
          action: 'queue.called',
          metadata: { paciente_id: (updated as any).paciente_id, data_hora_inicio: (updated as any).data_hora_inicio },
        })

        return json(req, 200, { atendimento: updated })
      }

      if (parts.length === 3 && parts[2] === 'finish' && req.method === 'POST') {
        const roleCheck = requireRole(auth.ctx, ['medico'])
        if (!roleCheck.ok) return json(req, roleCheck.status, { error: roleCheck.error })

        const { data: updated, error } = await admin
          .from('atendimentos')
          .update({ status: 'finalizado', data_hora_fim: new Date().toISOString() })
          .eq('clinica_id', auth.ctx.clinicaId)
          .eq('id', atendimentoId)
          .eq('medico_id', auth.ctx.userId)
          .eq('status', 'em_atendimento')
          .select('id, paciente_id, medico_id, status, data_hora_fim')
          .single()
        if (error) return json(req, 400, { error: error.message })

        await writeAuditLog(admin, {
          clinica_id: auth.ctx.clinicaId,
          actor_user_id: auth.ctx.userId,
          entity_type: 'atendimento',
          entity_id: atendimentoId,
          action: 'queue.finished',
          metadata: { paciente_id: (updated as any).paciente_id, data_hora_fim: (updated as any).data_hora_fim },
        })

        return json(req, 200, { atendimento: updated })
      }
    }

    return json(req, 404, { error: 'Not found' })
  }

  return json(req, 404, { error: 'Not found' })
})
