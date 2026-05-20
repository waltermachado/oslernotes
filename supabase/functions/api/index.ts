import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { corsResponse } from '../_shared/cors.ts'
import { adminClient, requireClinicoAuth, requireRole, requireSuperAdminAuth } from '../_shared/auth.ts'

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

function normalizePlanTier(value: unknown) {
  if (value === 'bronze') return 'bronze'
  if (value === 'prata' || value === 'silver') return 'prata'
  if (value === 'ouro' || value === 'gold' || value === 'platinum') return 'ouro'
  return 'bronze'
}

function computeRoleCounts(rows: Array<{ papel: string }>) {
  const counts = { total: 0, admin: 0, medico: 0, atendente: 0 }
  for (const r of rows) {
    counts.total += 1
    if (r.papel === 'admin') counts.admin += 1
    if (r.papel === 'medico') counts.medico += 1
    if (r.papel === 'atendente') counts.atendente += 1
  }
  return counts
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

      if (parts.length === 2 && req.method === 'PATCH') {
        const roleCheckPatch = requireRole(auth.ctx, ['admin', 'medico', 'atendente'])
        if (!roleCheckPatch.ok) return json(req, roleCheckPatch.status, { error: roleCheckPatch.error })

        const body = (await readJson(req)) as Record<string, unknown> | null
        if (!body) return json(req, 400, { error: 'Corpo da requisição inválido' })

        // Campos que podem ser atualizados via ficha clínica
        const allowed = [
          'queixa_principal', 'historico_breve_doencas', 'futuras_anotacoes',
          'doencas', 'remedios', 'medicamentos_em_uso',
          'nome_completo', 'cpf', 'data_nascimento', 'sexo', 'sexualidade',
          'telefone', 'email', 'endereco', 'convenio', 'numero_carteirinha', 'nome_mae',
        ]
        const updates: Record<string, unknown> = {}
        for (const key of allowed) {
          if (Object.prototype.hasOwnProperty.call(body, key)) {
            updates[key] = body[key]
          }
        }
        if (Object.keys(updates).length === 0) return json(req, 400, { error: 'Nenhum campo para atualizar' })

        // Sync remedios → medicamentos_em_uso
        if (updates.remedios && !updates.medicamentos_em_uso) {
          updates.medicamentos_em_uso = updates.remedios
        }

        const { data, error } = await admin
          .from('pacientes')
          .update(updates)
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
          action: 'patient.updated',
          metadata: { fields: Object.keys(updates) },
        })

        return json(req, 200, {
          patient: {
            ...data,
            cpf: data.cpf ? String(data.cpf).replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : null,
            foto_url: await signedPhotoUrl(admin, data.foto_path ?? null),
          },
        })
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

      // ------------------------------------------------------------------
      // evolucoes → tabela: prontuarios
      // ------------------------------------------------------------------
      if (parts.length === 3 && parts[2] === 'evolucoes') {
        const roleCheckEv = requireRole(auth.ctx, ['admin', 'medico'])
        if (!roleCheckEv.ok) return json(req, roleCheckEv.status, { error: roleCheckEv.error })

        if (req.method === 'GET') {
          const { data, error } = await admin
            .from('prontuarios')
            .select('id, anamnese, diagnostico, observacoes, templates_utilizados, created_at, updated_at, atendimento_id, medico_id')
            .eq('clinica_id', auth.ctx.clinicaId)
            .eq('paciente_id', patientId)
            .order('created_at', { ascending: false })
            .limit(100)
          if (error) return json(req, 500, { error: error.message })
          return json(req, 200, { items: data ?? [] })
        }

        if (req.method === 'POST') {
          const roleCheckWrite = requireRole(auth.ctx, ['medico'])
          if (!roleCheckWrite.ok) return json(req, roleCheckWrite.status, { error: roleCheckWrite.error })

          const body = (await readJson(req)) as Record<string, unknown> | null
          const anamnese = String(body?.anamnese ?? '').trim() || null
          const diagnostico = String(body?.diagnostico ?? '').trim() || null
          const observacoes = String(body?.observacoes ?? '').trim() || null
          if (!anamnese && !diagnostico && !observacoes) {
            return json(req, 400, { error: 'Pelo menos um campo (anamnese, diagnostico ou observacoes) é obrigatório' })
          }

          const insert = {
            clinica_id: auth.ctx.clinicaId,
            paciente_id: patientId,
            medico_id: auth.ctx.userId,
            atendimento_id: body?.atendimento_id ?? null,
            anamnese,
            diagnostico,
            observacoes,
            templates_utilizados: Array.isArray(body?.templates_utilizados) ? body.templates_utilizados : [],
          }

          const { data, error } = await admin
            .from('prontuarios')
            .insert(insert)
            .select('id, anamnese, diagnostico, observacoes, templates_utilizados, created_at, updated_at, atendimento_id, medico_id')
            .single()
          if (error) return json(req, 400, { error: error.message })

          await writeAuditLog(admin, {
            clinica_id: auth.ctx.clinicaId,
            actor_user_id: auth.ctx.userId,
            entity_type: 'prontuario',
            entity_id: (data as Record<string, unknown>).id as string,
            action: 'prontuario.created',
            metadata: { paciente_id: patientId },
          })

          return json(req, 201, { item: data })
        }
      }

      // ------------------------------------------------------------------
      // receitas → tabela: receitas
      // Real columns: tipo, medicamentos (jsonb), instrucoes, status
      // ------------------------------------------------------------------
      if (parts.length === 3 && parts[2] === 'receitas') {
        const roleCheckRec = requireRole(auth.ctx, ['admin', 'medico'])
        if (!roleCheckRec.ok) return json(req, roleCheckRec.status, { error: roleCheckRec.error })

        if (req.method === 'GET') {
          const { data, error } = await admin
            .from('receitas')
            .select('id, tipo, medicamentos, instrucoes, status, atendimento_id, created_at, medico_id')
            .eq('clinica_id', auth.ctx.clinicaId)
            .eq('paciente_id', patientId)
            .order('created_at', { ascending: false })
            .limit(100)
          if (error) return json(req, 500, { error: error.message })
          return json(req, 200, { items: data ?? [] })
        }

        if (req.method === 'POST') {
          const roleCheckWrite = requireRole(auth.ctx, ['medico'])
          if (!roleCheckWrite.ok) return json(req, roleCheckWrite.status, { error: roleCheckWrite.error })

          const body = (await readJson(req)) as Record<string, unknown> | null
          if (!Array.isArray(body?.medicamentos) || (body?.medicamentos as unknown[]).length === 0) {
            return json(req, 400, { error: 'medicamentos é obrigatório e deve ser um array não-vazio' })
          }

          const insert = {
            clinica_id: auth.ctx.clinicaId,
            paciente_id: patientId,
            medico_id: auth.ctx.userId,
            atendimento_id: body?.atendimento_id ?? null,
            tipo: body?.tipo ? String(body.tipo).trim() || null : null,
            medicamentos: body.medicamentos,
            instrucoes: body?.instrucoes ? String(body.instrucoes).trim() || null : null,
            status: body?.status ? String(body.status) : 'rascunho',
          }

          const { data, error } = await admin
            .from('receitas')
            .insert(insert)
            .select('id, tipo, medicamentos, instrucoes, status, atendimento_id, created_at, medico_id')
            .single()
          if (error) return json(req, 400, { error: error.message })

          await writeAuditLog(admin, {
            clinica_id: auth.ctx.clinicaId,
            actor_user_id: auth.ctx.userId,
            entity_type: 'receita',
            entity_id: (data as Record<string, unknown>).id as string,
            action: 'receita.created',
            metadata: { paciente_id: patientId },
          })

          return json(req, 201, { item: data })
        }
      }

      // ------------------------------------------------------------------
      // exames → tabela: exames
      // Real columns: tipo, descricao, arquivo_url, resultado,
      //   data_solicitacao, data_resultado + urgente/status (added)
      // ------------------------------------------------------------------
      if (parts.length === 3 && parts[2] === 'exames') {
        const roleCheckEx = requireRole(auth.ctx, ['admin', 'medico'])
        if (!roleCheckEx.ok) return json(req, roleCheckEx.status, { error: roleCheckEx.error })

        if (req.method === 'GET') {
          const { data, error } = await admin
            .from('exames')
            .select('id, tipo, descricao, urgente, resultado, arquivo_url, data_solicitacao, data_resultado, status, atendimento_id, created_at, medico_id')
            .eq('clinica_id', auth.ctx.clinicaId)
            .eq('paciente_id', patientId)
            .order('created_at', { ascending: false })
            .limit(100)
          if (error) return json(req, 500, { error: error.message })
          return json(req, 200, { items: data ?? [] })
        }

        if (req.method === 'POST') {
          const roleCheckWrite = requireRole(auth.ctx, ['medico'])
          if (!roleCheckWrite.ok) return json(req, roleCheckWrite.status, { error: roleCheckWrite.error })

          const body = (await readJson(req)) as Record<string, unknown> | null
          const tipo = String(body?.tipo ?? '').trim()
          if (!tipo) return json(req, 400, { error: 'tipo é obrigatório' })

          const insert = {
            clinica_id: auth.ctx.clinicaId,
            paciente_id: patientId,
            medico_id: auth.ctx.userId,
            atendimento_id: body?.atendimento_id ?? null,
            tipo,
            descricao: body?.descricao ? String(body.descricao).trim() || null : null,
            urgente: body?.urgente === true,
            status: 'solicitado',
            data_solicitacao: new Date().toISOString(),
          }

          const { data, error } = await admin
            .from('exames')
            .insert(insert)
            .select('id, tipo, descricao, urgente, resultado, arquivo_url, data_solicitacao, data_resultado, status, atendimento_id, created_at, medico_id')
            .single()
          if (error) return json(req, 400, { error: error.message })

          await writeAuditLog(admin, {
            clinica_id: auth.ctx.clinicaId,
            actor_user_id: auth.ctx.userId,
            entity_type: 'exame',
            entity_id: (data as Record<string, unknown>).id as string,
            action: 'exame.created',
            metadata: { paciente_id: patientId, tipo },
          })

          return json(req, 201, { item: data })
        }
      }

      if (parts.length === 4 && parts[2] === 'exames' && req.method === 'PATCH') {
        const roleCheckEx = requireRole(auth.ctx, ['medico'])
        if (!roleCheckEx.ok) return json(req, roleCheckEx.status, { error: roleCheckEx.error })

        const exameId = parts[3]
        const body = (await readJson(req)) as Record<string, unknown> | null

        const validStatuses = ['solicitado', 'coletado', 'resultado_disponivel', 'finalizado']
        const updates: Record<string, unknown> = {}
        if (body?.status != null) {
          if (!validStatuses.includes(String(body.status))) return json(req, 400, { error: 'status inválido' })
          updates.status = String(body.status)
          if (updates.status === 'resultado_disponivel' || updates.status === 'finalizado') {
            updates.data_resultado = new Date().toISOString()
          }
        }
        if (body?.resultado != null) updates.resultado = String(body.resultado).trim() || null
        if (body?.arquivo_url != null) updates.arquivo_url = String(body.arquivo_url).trim() || null
        if (Object.keys(updates).length === 0) return json(req, 400, { error: 'Nenhum campo para atualizar' })

        const { data, error } = await admin
          .from('exames')
          .update(updates)
          .eq('clinica_id', auth.ctx.clinicaId)
          .eq('paciente_id', patientId)
          .eq('id', exameId)
          .select('id, tipo, descricao, urgente, resultado, arquivo_url, data_solicitacao, data_resultado, status, atendimento_id, created_at, medico_id')
          .single()
        if (error) return json(req, 400, { error: error.message })

        return json(req, 200, { item: data })
      }

      // ------------------------------------------------------------------
      // /patients/:id/record → retorna dados do paciente com nível de visibilidade
      // ------------------------------------------------------------------
      if (parts.length === 3 && parts[2] === 'record' && req.method === 'GET') {
        const { data: patient, error: pErr } = await admin
          .from('pacientes')
          .select('*')
          .eq('clinica_id', auth.ctx.clinicaId)
          .eq('id', patientId)
          .single()
        if (pErr || !patient) return json(req, 404, { error: 'Patient not found' })

        const fotoUrl = await signedPhotoUrl(admin, patient.foto_path ?? null)

        const isMedico = auth.ctx.role === 'medico'
        if (isMedico) {
          return json(req, 200, {
            patient: {
              id: patient.id,
              nome_completo: patient.nome_completo,
              cpf: patient.cpf ? String(patient.cpf).replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : null,
              data_nascimento: patient.data_nascimento,
              sexo: patient.sexo ?? null,
              convenio: patient.convenio ?? null,
              foto_url: fotoUrl,
              updated_at: patient.updated_at ?? null,
              email: patient.email ?? null,
              telefone: patient.telefone ?? null,
              endereco: patient.endereco ?? {},
              numero_carteirinha: patient.numero_carteirinha ?? null,
              nome_mae: patient.nome_mae ?? null,
              alergias: patient.alergias ?? [],
              doencas: Array.isArray(patient.doencas) ? patient.doencas : [],
              medicamentos_em_uso: patient.medicamentos_em_uso ?? [],
              remedios: Array.isArray(patient.remedios) ? patient.remedios : [],
              historico_breve_doencas: patient.historico_breve_doencas ?? null,
              queixa_principal: patient.queixa_principal ?? null,
              futuras_anotacoes: patient.futuras_anotacoes ?? null,
            },
            visibility: { level: 'full' },
          })
        }

        // admin / atendente → visibilidade limitada
        return json(req, 200, {
          patient: {
            id: patient.id,
            nome_completo: patient.nome_completo,
            cpf: patient.cpf ? String(patient.cpf).replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : null,
            data_nascimento: patient.data_nascimento,
            sexo: patient.sexo ?? null,
            convenio: patient.convenio ?? null,
            foto_url: fotoUrl,
            updated_at: patient.updated_at ?? null,
            alergias: patient.alergias ?? [],
            doencas: Array.isArray(patient.doencas) ? patient.doencas : [],
            medicamentos_em_uso: patient.medicamentos_em_uso ?? [],
          },
          visibility: { level: 'limited' },
        })
      }

      // ------------------------------------------------------------------
      // atestados → tabela: atestados
      // Real columns: dias_afastamento, cid, data_retorno, observacoes,
      //   texto (added via migration — nullable)
      // ------------------------------------------------------------------
      if (parts.length === 3 && parts[2] === 'atestados') {
        const roleCheckAt = requireRole(auth.ctx, ['admin', 'medico'])
        if (!roleCheckAt.ok) return json(req, roleCheckAt.status, { error: roleCheckAt.error })

        if (req.method === 'GET') {
          const { data, error } = await admin
            .from('atestados')
            .select('id, texto, observacoes, cid, dias_afastamento, data_retorno, atendimento_id, created_at, medico_id')
            .eq('clinica_id', auth.ctx.clinicaId)
            .eq('paciente_id', patientId)
            .order('created_at', { ascending: false })
            .limit(100)
          if (error) return json(req, 500, { error: error.message })
          return json(req, 200, { items: data ?? [] })
        }

        if (req.method === 'POST') {
          const roleCheckWrite = requireRole(auth.ctx, ['medico'])
          if (!roleCheckWrite.ok) return json(req, roleCheckWrite.status, { error: roleCheckWrite.error })

          const body = (await readJson(req)) as Record<string, unknown> | null
          // Accept `texto` (new) or `observacoes` (existing column) as content
          const textoRaw = String(body?.texto ?? body?.observacoes ?? '').trim()
          if (!textoRaw) return json(req, 400, { error: 'texto ou observacoes é obrigatório' })

          const insert = {
            clinica_id: auth.ctx.clinicaId,
            paciente_id: patientId,
            medico_id: auth.ctx.userId,
            atendimento_id: body?.atendimento_id ?? null,
            texto: textoRaw,
            observacoes: textoRaw,
            cid: body?.cid ? String(body.cid).trim() || null : null,
            dias_afastamento: body?.dias_afastamento != null ? Number(body.dias_afastamento) : 0,
            data_retorno: body?.data_retorno ? String(body.data_retorno) : null,
          }

          const { data, error } = await admin
            .from('atestados')
            .insert(insert)
            .select('id, texto, observacoes, cid, dias_afastamento, data_retorno, atendimento_id, created_at, medico_id')
            .single()
          if (error) return json(req, 400, { error: error.message })

          await writeAuditLog(admin, {
            clinica_id: auth.ctx.clinicaId,
            actor_user_id: auth.ctx.userId,
            entity_type: 'atestado',
            entity_id: (data as Record<string, unknown>).id as string,
            action: 'atestado.created',
            metadata: { paciente_id: patientId },
          })

          return json(req, 201, { item: data })
        }
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

  if (path.startsWith('/admin')) {
    const auth = await requireSuperAdminAuth(req)
    if (!auth.ok) return json(req, auth.status, { error: auth.error })

    const parts = path.split('/').filter(Boolean)

    if (parts.length === 2 && parts[1] === 'clinics' && req.method === 'GET') {
      const search = String(url.searchParams.get('q') ?? '').trim()
      const status = String(url.searchParams.get('status') ?? '').trim()
      const plan = String(url.searchParams.get('plan') ?? '').trim()

      let q = admin
        .from('clinicas')
        .select('id,nome,cnpj,email,telefone,nome_responsavel,plano_assinatura,ativa,created_at,updated_at')
        .order('created_at', { ascending: false })

      if (search) q = q.ilike('nome', `%${search}%`)
      if (status === 'ativa') q = q.eq('ativa', true)
      if (status === 'inativa') q = q.eq('ativa', false)
      if (plan) q = q.eq('plano_assinatura', plan)

      const { data, error } = await q
      if (error) return json(req, 500, { error: error.message })

      const clinics = data ?? []
      const clinicIds = clinics.map((c: any) => c.id)

      const { data: planCatalog } = await admin
        .from('subscription_plan_catalog')
        .select('tier,monthly_price_cents,max_concurrent_total,max_concurrent_admin,max_concurrent_atendente,max_concurrent_medico')

      const planMap = new Map<string, any>()
      for (const p of planCatalog ?? []) planMap.set(String((p as any).tier), p)

      const { data: users } = clinicIds.length
        ? await admin.from('usuarios').select('clinica_id,papel,ativo').in('clinica_id', clinicIds)
        : { data: [] as any[] }

      const sinceIso = new Date(Date.now() - 10 * 60 * 1000).toISOString()
      const { data: sessions } = clinicIds.length
        ? await admin
            .from('clinica_sessions')
            .select('clinica_id,papel,last_seen')
            .in('clinica_id', clinicIds)
            .gte('last_seen', sinceIso)
        : { data: [] as any[] }

      const userAgg = new Map<string, { total: number; admin: number; medico: number; atendente: number }>()
      for (const u of users ?? []) {
        const k = String((u as any).clinica_id)
        const cur = userAgg.get(k) ?? { total: 0, admin: 0, medico: 0, atendente: 0 }
        cur.total += 1
        if ((u as any).papel === 'admin') cur.admin += 1
        if ((u as any).papel === 'medico') cur.medico += 1
        if ((u as any).papel === 'atendente') cur.atendente += 1
        userAgg.set(k, cur)
      }

      const sessionAgg = new Map<string, { total: number; admin: number; medico: number; atendente: number }>()
      for (const s of sessions ?? []) {
        const k = String((s as any).clinica_id)
        const cur = sessionAgg.get(k) ?? { total: 0, admin: 0, medico: 0, atendente: 0 }
        cur.total += 1
        if ((s as any).papel === 'admin') cur.admin += 1
        if ((s as any).papel === 'medico') cur.medico += 1
        if ((s as any).papel === 'atendente') cur.atendente += 1
        sessionAgg.set(k, cur)
      }

      const enriched = clinics.map((c: any) => {
        const tier = normalizePlanTier(c.plano_assinatura)
        const limits = planMap.get(tier) ?? null
        return {
          ...c,
          plan_tier: tier,
          limits,
          users: userAgg.get(String(c.id)) ?? { total: 0, admin: 0, medico: 0, atendente: 0 },
          active_sessions: sessionAgg.get(String(c.id)) ?? { total: 0, admin: 0, medico: 0, atendente: 0 },
        }
      })

      return json(req, 200, enriched)
    }

    if (parts.length === 3 && parts[1] === 'clinics' && req.method === 'GET') {
      const clinicId = String(parts[2])

      const { data: clinic, error: clinicError } = await admin.from('clinicas').select('*').eq('id', clinicId).maybeSingle()
      if (clinicError || !clinic) return json(req, 404, { error: 'Clínica não encontrada' })

      const tier = normalizePlanTier((clinic as any).plano_assinatura)
      const { data: planRow } = await admin
        .from('subscription_plan_catalog')
        .select('tier,monthly_price_cents,max_concurrent_total,max_concurrent_admin,max_concurrent_atendente,max_concurrent_medico')
        .eq('tier', tier)
        .maybeSingle()

      const { data: users } = await admin
        .from('usuarios')
        .select('id,nome,email,papel,ativo,created_at')
        .eq('clinica_id', clinicId)
        .order('created_at', { ascending: true })

      const { data: subscription } = await admin
        .from('subscriptions')
        .select('*')
        .eq('clinica_id', clinicId)
        .order('current_period_end', { ascending: false })
        .limit(1)
        .maybeSingle()

      const { data: invoices } = (subscription as any)?.id
        ? await admin
            .from('subscription_invoices')
            .select('*')
            .eq('subscription_id', (subscription as any).id)
            .order('created_at', { ascending: false })
            .limit(50)
        : { data: [] as any[] }

      const { data: audit } = await admin
        .from('audit_logs')
        .select('*')
        .eq('clinica_id', clinicId)
        .order('created_at', { ascending: false })
        .limit(50)

      const sinceIso = new Date(Date.now() - 10 * 60 * 1000).toISOString()
      const { data: sessions } = await admin
        .from('clinica_sessions')
        .select('papel,last_seen')
        .eq('clinica_id', clinicId)
        .gte('last_seen', sinceIso)

      const sessionCounts = computeRoleCounts(sessions ?? [])

      return json(req, 200, {
        clinic,
        plan: planRow ?? null,
        users: users ?? [],
        subscription: subscription ?? null,
        invoices: invoices ?? [],
        audit_logs: audit ?? [],
        active_sessions: sessionCounts,
      })
    }

    if (parts.length === 4 && parts[1] === 'clinics' && parts[3] === 'assign-plan' && req.method === 'POST') {
      const clinicId = String(parts[2])
      const body = (await readJson(req)) as any
      const tier = String(body?.tier ?? '')
      if (tier !== 'bronze' && tier !== 'prata' && tier !== 'ouro') return json(req, 400, { error: 'tier inválido' })

      const { data: clinic, error: findErr } = await admin.from('clinicas').select('id,plano_assinatura').eq('id', clinicId).maybeSingle()
      if (findErr || !clinic) return json(req, 404, { error: 'Clínica não encontrada' })

      const previous = (clinic as any).plano_assinatura
      const { data: updated, error } = await admin
        .from('clinicas')
        .update({ plano_assinatura: tier, updated_at: new Date().toISOString() })
        .eq('id', clinicId)
        .select('*')
        .single()
      if (error) return json(req, 400, { error: error.message })

      await writeAuditLog(admin, {
        clinica_id: clinicId,
        actor_user_id: auth.userId,
        entity_type: 'clinica',
        entity_id: clinicId,
        action: 'clinic.plan.assign',
        metadata: { from: previous, to: tier },
      })

      return json(req, 200, { clinic: updated })
    }

    if (parts.length === 4 && parts[1] === 'clinics' && parts[3] === 'send-credentials' && req.method === 'POST') {
      const clinicId = String(parts[2])
      const body = (await readJson(req)) as any
      const email = String(body?.email ?? '').trim()
      const role = String(body?.role ?? 'admin')
      const fullName = String(body?.full_name ?? '').trim()
      if (!email) return json(req, 400, { error: 'email é obrigatório' })
      if (role !== 'admin' && role !== 'medico' && role !== 'atendente') return json(req, 400, { error: 'role inválida' })

      const { data: clinic } = await admin.from('clinicas').select('id,nome').eq('id', clinicId).maybeSingle()
      if (!clinic) return json(req, 404, { error: 'Clínica não encontrada' })

      const created = await (admin as any).auth.admin.inviteUserByEmail(email, {
        data: { role, full_name: fullName || email, clinica_id: clinicId },
      })
      if ((created as any).error) return json(req, 400, { error: (created as any).error.message })

      await admin.from('usuarios').upsert(
        {
          id: (created as any).data.user.id,
          clinica_id: clinicId,
          nome: fullName || email,
          email,
          papel: role,
          ativo: true,
          senha_hash: 'auth_managed',
        },
        { onConflict: 'id' },
      )

      await writeAuditLog(admin, {
        clinica_id: clinicId,
        actor_user_id: auth.userId,
        entity_type: 'usuario',
        entity_id: (created as any).data.user.id,
        action: 'credentials.send',
        metadata: { email, role, user_id: (created as any).data.user.id },
      })

      return json(req, 200, { ok: true, user_id: (created as any).data.user.id })
    }

    if (parts.length === 2 && parts[1] === 'audit-logs' && req.method === 'GET') {
      const clinicId = String(url.searchParams.get('clinica_id') ?? '').trim()
      const action = String(url.searchParams.get('action') ?? '').trim()
      const from = String(url.searchParams.get('from') ?? '').trim()
      const to = String(url.searchParams.get('to') ?? '').trim()
      const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit') ?? 50)))

      let q = admin
        .from('audit_logs')
        .select('id,clinica_id,actor_user_id,entity_type,entity_id,action,metadata,created_at')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (clinicId) q = q.eq('clinica_id', clinicId)
      if (action) q = q.eq('action', action)
      if (from) q = q.gte('created_at', from)
      if (to) q = q.lte('created_at', to)

      const { data, error } = await q
      if (error) return json(req, 500, { error: error.message })
      return json(req, 200, { logs: data ?? [] })
    }

    return json(req, 404, { error: 'Not found' })
  }

  return json(req, 404, { error: 'Not found' })
})
