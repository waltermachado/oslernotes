import express from 'express';
import { supabase, supabaseAdmin } from '../supabaseClient.js';
import { writeAuditLog } from '../services/auditLog.js';
import { normalizePlanTier, type PlanTier } from '../services/accessLimits.js';

const router = express.Router();

// Middleware to verify super_admin role
const verifySuperAdmin = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    const { data: userData, error: userError } = await supabaseAdmin
      .from('usuarios')
      .select('papel')
      .eq('id', user.id)
      .single();

    if (userError || !userData || userData.papel !== 'super_admin') {
      return res.status(403).json({ error: 'Forbidden: Requires super_admin role' });
    }

    // Attach user to request for downstream use if needed
    (req as express.Request & { user?: unknown }).user = user;
    next();
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
};

router.use(verifySuperAdmin);

// GET /api/admin/clinics - List all clinics
router.get('/clinics', async (req, res) => {
  try {
    const search = String(req.query.q ?? '').trim();
    const status = String(req.query.status ?? '').trim();
    const plan = String(req.query.plan ?? '').trim();

    let q = supabaseAdmin
      .from('clinicas')
      .select('id,nome,cnpj,email,telefone,nome_responsavel,plano_assinatura,ativa,created_at,updated_at')
      .order('created_at', { ascending: false });

    if (search) q = q.ilike('nome', `%${search}%`);
    if (status === 'ativa') q = q.eq('ativa', true);
    if (status === 'inativa') q = q.eq('ativa', false);
    if (plan) q = q.eq('plano_assinatura', plan);

    const { data, error } = await q;

    if (error) throw error;

    const clinics = data ?? [];
    const clinicIds = clinics.map((c) => c.id);

    const { data: planCatalog } = await supabaseAdmin
      .from('subscription_plan_catalog')
      .select('tier,monthly_price_cents,max_concurrent_total,max_concurrent_admin,max_concurrent_atendente,max_concurrent_medico');

    const planMap = new Map<string, any>();
    for (const p of planCatalog ?? []) {
      planMap.set(String(p.tier), p);
    }

    const { data: users } = clinicIds.length
      ? await supabaseAdmin.from('usuarios').select('clinica_id,papel,ativo').in('clinica_id', clinicIds)
      : { data: [] as any[] };

    const sinceIso = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: sessions } = clinicIds.length
      ? await supabaseAdmin
          .from('clinica_sessions')
          .select('clinica_id,papel,last_seen')
          .in('clinica_id', clinicIds)
          .gte('last_seen', sinceIso)
      : { data: [] as any[] };

    const userAgg = new Map<string, { total: number; admin: number; medico: number; atendente: number }>();
    for (const u of users ?? []) {
      const k = String(u.clinica_id);
      const cur = userAgg.get(k) ?? { total: 0, admin: 0, medico: 0, atendente: 0 };
      cur.total += 1;
      if (u.papel === 'admin') cur.admin += 1;
      if (u.papel === 'medico') cur.medico += 1;
      if (u.papel === 'atendente') cur.atendente += 1;
      userAgg.set(k, cur);
    }

    const sessionAgg = new Map<string, { total: number; admin: number; medico: number; atendente: number }>();
    for (const s of sessions ?? []) {
      const k = String(s.clinica_id);
      const cur = sessionAgg.get(k) ?? { total: 0, admin: 0, medico: 0, atendente: 0 };
      cur.total += 1;
      if (s.papel === 'admin') cur.admin += 1;
      if (s.papel === 'medico') cur.medico += 1;
      if (s.papel === 'atendente') cur.atendente += 1;
      sessionAgg.set(k, cur);
    }

    const enriched = clinics.map((c) => {
      const tier = normalizePlanTier(c.plano_assinatura) as PlanTier;
      const limits = planMap.get(tier) ?? null;
      return {
        ...c,
        plan_tier: tier,
        limits,
        users: userAgg.get(String(c.id)) ?? { total: 0, admin: 0, medico: 0, atendente: 0 },
        active_sessions: sessionAgg.get(String(c.id)) ?? { total: 0, admin: 0, medico: 0, atendente: 0 },
      };
    });

    res.status(200).json(enriched);
  } catch (error) {
    console.error('Error fetching clinics:', error);
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to fetch clinics' });
    }
  }
});

router.get('/plans', async (_req, res) => {
  const { data, error } = await supabaseAdmin
    .from('subscription_plan_catalog')
    .select('tier,monthly_price_cents,max_concurrent_total,max_concurrent_admin,max_concurrent_atendente,max_concurrent_medico')
    .order('monthly_price_cents', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ plans: data ?? [] });
});

router.patch('/plans/:tier', async (req, res) => {
  const tier = String(req.params.tier);
  if (tier !== 'bronze' && tier !== 'prata' && tier !== 'ouro') return res.status(400).json({ error: 'tier inválido' });

  const body = req.body ?? {};
  const monthly_price_cents = body.monthly_price_cents != null ? Number(body.monthly_price_cents) : null;
  const max_concurrent_total = body.max_concurrent_total != null ? Number(body.max_concurrent_total) : null;
  const max_concurrent_admin = body.max_concurrent_admin != null ? Number(body.max_concurrent_admin) : null;
  const max_concurrent_atendente = body.max_concurrent_atendente != null ? Number(body.max_concurrent_atendente) : null;
  const max_concurrent_medico = body.max_concurrent_medico != null ? Number(body.max_concurrent_medico) : null;

  const updates: any = { updated_at: new Date().toISOString() };
  if (Number.isFinite(monthly_price_cents)) updates.monthly_price_cents = monthly_price_cents;
  if (Number.isFinite(max_concurrent_total)) updates.max_concurrent_total = max_concurrent_total;
  if (Number.isFinite(max_concurrent_admin)) updates.max_concurrent_admin = max_concurrent_admin;
  if (Number.isFinite(max_concurrent_atendente)) updates.max_concurrent_atendente = max_concurrent_atendente;
  if (Number.isFinite(max_concurrent_medico)) updates.max_concurrent_medico = max_concurrent_medico;

  const { data, error } = await supabaseAdmin
    .from('subscription_plan_catalog')
    .update(updates)
    .eq('tier', tier)
    .select('tier,monthly_price_cents,max_concurrent_total,max_concurrent_admin,max_concurrent_atendente,max_concurrent_medico')
    .single();

  if (error) return res.status(400).json({ error: error.message });
  return res.status(200).json({ plan: data });
});

router.get('/clinics/:clinicId', async (req, res) => {
  const clinicId = String(req.params.clinicId);

  const { data: clinic, error: clinicError } = await supabaseAdmin
    .from('clinicas')
    .select('*')
    .eq('id', clinicId)
    .maybeSingle();
  if (clinicError || !clinic) return res.status(404).json({ error: 'Clínica não encontrada' });

  const tier = normalizePlanTier(clinic.plano_assinatura) as PlanTier;
  const { data: planRow } = await supabaseAdmin
    .from('subscription_plan_catalog')
    .select('tier,monthly_price_cents,max_concurrent_total,max_concurrent_admin,max_concurrent_atendente,max_concurrent_medico')
    .eq('tier', tier)
    .maybeSingle();

  const { data: users } = await supabaseAdmin
    .from('usuarios')
    .select('id,nome,email,papel,ativo,created_at')
    .eq('clinica_id', clinicId)
    .order('created_at', { ascending: true });

  const { data: subscription } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('clinica_id', clinicId)
    .order('current_period_end', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: invoices } = subscription?.id
    ? await supabaseAdmin
        .from('subscription_invoices')
        .select('*')
        .eq('subscription_id', subscription.id)
        .order('created_at', { ascending: false })
        .limit(50)
    : { data: [] as any[] };

  const { data: audit } = await supabaseAdmin
    .from('audit_logs')
    .select('*')
    .eq('clinica_id', clinicId)
    .order('created_at', { ascending: false })
    .limit(50);

  const sinceIso = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: sessions } = await supabaseAdmin
    .from('clinica_sessions')
    .select('papel,last_seen')
    .eq('clinica_id', clinicId)
    .gte('last_seen', sinceIso);

  const sessionCounts = { total: 0, admin: 0, medico: 0, atendente: 0 };
  for (const s of sessions ?? []) {
    sessionCounts.total += 1;
    if (s.papel === 'admin') sessionCounts.admin += 1;
    if (s.papel === 'medico') sessionCounts.medico += 1;
    if (s.papel === 'atendente') sessionCounts.atendente += 1;
  }

  return res.status(200).json({
    clinic,
    plan: planRow ?? null,
    users: users ?? [],
    subscription: subscription ?? null,
    invoices: invoices ?? [],
    audit_logs: audit ?? [],
    active_sessions: sessionCounts,
  });
});

router.post('/clinics/:clinicId/assign-plan', async (req, res) => {
  const clinicId = String(req.params.clinicId);
  const tier = String(req.body?.tier ?? '');
  if (tier !== 'bronze' && tier !== 'prata' && tier !== 'ouro') return res.status(400).json({ error: 'tier inválido' });

  const { data: clinic, error: findErr } = await supabaseAdmin
    .from('clinicas')
    .select('id,plano_assinatura')
    .eq('id', clinicId)
    .maybeSingle();
  if (findErr || !clinic) return res.status(404).json({ error: 'Clínica não encontrada' });

  const previous = clinic.plano_assinatura;

  const { data: updated, error } = await supabaseAdmin
    .from('clinicas')
    .update({ plano_assinatura: tier, updated_at: new Date().toISOString() })
    .eq('id', clinicId)
    .select('*')
    .single();
  if (error) return res.status(400).json({ error: error.message });

  const actor = (req as express.Request & { user?: any }).user;
  await writeAuditLog({
    clinica_id: clinicId,
    actor_user_id: actor?.id ?? null,
    entity_type: 'clinica',
    entity_id: clinicId,
    action: 'clinic.plan.assign',
    metadata: { from: previous, to: tier },
  });

  return res.status(200).json({ clinic: updated });
});

router.get('/audit-logs', async (req, res) => {
  const clinicId = String(req.query.clinica_id ?? '').trim();
  const action = String(req.query.action ?? '').trim();
  const from = String(req.query.from ?? '').trim();
  const to = String(req.query.to ?? '').trim();
  const limit = Math.min(200, Math.max(1, Number(req.query.limit ?? 50)));

  let q = supabaseAdmin
    .from('audit_logs')
    .select('id,clinica_id,actor_user_id,entity_type,entity_id,action,metadata,created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (clinicId) q = q.eq('clinica_id', clinicId);
  if (action) q = q.eq('action', action);
  if (from) q = q.gte('created_at', from);
  if (to) q = q.lte('created_at', to);

  const { data, error } = await q;
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ logs: data ?? [] });
});

router.get('/notifications', async (req, res) => {
  const status = String(req.query.status ?? '').trim();
  let q = supabaseAdmin
    .from('super_admin_notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ notifications: data ?? [] });
});

router.post('/notifications', async (req, res) => {
  const scope_type = String(req.body?.scope_type ?? 'all_clinics');
  const scope_clinica_id = req.body?.scope_clinica_id ?? null;
  const kind = String(req.body?.kind ?? 'manual');
  const title = String(req.body?.title ?? '').trim();
  const message = String(req.body?.message ?? '').trim();
  const status = String(req.body?.status ?? 'draft');
  if (!title || !message) return res.status(400).json({ error: 'title e message são obrigatórios' });
  if (scope_type !== 'all_clinics' && scope_type !== 'single_clinic') return res.status(400).json({ error: 'scope_type inválido' });
  if (status !== 'draft' && status !== 'published') return res.status(400).json({ error: 'status inválido' });

  const { data, error } = await supabaseAdmin
    .from('super_admin_notifications')
    .insert({
      scope_type,
      scope_clinica_id: scope_type === 'single_clinic' ? scope_clinica_id : null,
      kind,
      title,
      message,
      status,
      published_at: status === 'published' ? new Date().toISOString() : null,
    })
    .select('*')
    .single();
  if (error) return res.status(400).json({ error: error.message });
  return res.status(201).json({ notification: data });
});

router.patch('/notifications/:id/publish', async (req, res) => {
  const id = String(req.params.id);
  const { data, error } = await supabaseAdmin
    .from('super_admin_notifications')
    .update({ status: 'published', published_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
  if (error) return res.status(400).json({ error: error.message });
  return res.status(200).json({ notification: data });
});

// POST /api/admin/clinics - Create a new clinic
router.post('/clinics', async (req, res) => {
  const {
    nome,
    cnpj,
    telefone,
    email,
    endereco,
    nome_responsavel,
    especialidade_principal,
    horario_funcionamento,
  } = req.body;

  if (!nome || !cnpj || !nome_responsavel || !email) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const cleanCnpj = String(cnpj).replace(/\D/g, '')
  if (cleanCnpj.length !== 14) {
    return res.status(400).json({ error: 'CNPJ inválido' })
  }

  try {
    // 1. Check for duplicate CNPJ
    const { data: existingClinic, error: existingClinicError } = await supabaseAdmin
      .from('clinicas')
      .select('id')
      .eq('cnpj', cleanCnpj)
      .maybeSingle();

    if (existingClinicError) {
      return res.status(400).json({ error: existingClinicError.message })
    }

    if (existingClinic) {
      return res.status(400).json({ error: 'Clinic with this CNPJ already exists' });
    }

    // 2. Create the clinic
    const { data: clinic, error: clinicError } = await supabaseAdmin
      .from('clinicas')
      .insert({
        nome,
        cnpj: cleanCnpj,
        telefone,
        email,
        endereco,
        nome_responsavel,
        especialidade_principal,
        horario_funcionamento,
      })
      .select()
      .single();

    if (clinicError) throw clinicError;

    // 3. Invite the admin user for the clinic in Supabase Auth (sends email if SMTP is configured)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        role: 'admin',
        full_name: nome_responsavel,
        clinica_id: clinic.id,
      },
    });

    if (authError) {
      await supabaseAdmin.from('clinicas').delete().eq('id', clinic.id)
      return res.status(400).json({ error: authError.message })
    }

    const { error: upsertUserError } = await supabaseAdmin.from('usuarios').upsert(
      {
        id: authData.user.id,
        clinica_id: clinic.id,
        nome: nome_responsavel,
        email,
        papel: 'admin',
        ativo: true,
        senha_hash: 'auth_managed',
      },
      { onConflict: 'id' },
    );

    if (upsertUserError) {
      console.error('Error upserting public.usuarios:', upsertUserError);
      throw upsertUserError;
    }

    const actor = (req as express.Request & { user?: any }).user;
    await writeAuditLog({
      clinica_id: clinic.id,
      actor_user_id: actor?.id ?? null,
      entity_type: 'clinica',
      entity_id: clinic.id,
      action: 'clinic.create',
      metadata: { nome, cnpj: cleanCnpj, email },
    });

    res.status(201).json({
      message: 'Clinic and admin user created successfully',
      clinic,
      admin_user_id: authData.user.id,
    });

  } catch (error) {
    console.error('Error creating clinic:', error);
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to create clinic' });
    }
  }
});

router.post('/clinics/:clinicId/send-credentials', async (req, res) => {
  const clinicId = String(req.params.clinicId);
  const email = String(req.body?.email ?? '').trim();
  const role = String(req.body?.role ?? 'admin');
  const full_name = String(req.body?.full_name ?? '').trim();
  if (!email) return res.status(400).json({ error: 'email é obrigatório' });
  if (role !== 'admin' && role !== 'medico' && role !== 'atendente') return res.status(400).json({ error: 'role inválida' });

  const { data: clinic } = await supabaseAdmin.from('clinicas').select('id,nome').eq('id', clinicId).maybeSingle();
  if (!clinic) return res.status(404).json({ error: 'Clínica não encontrada' });

  const actor = (req as express.Request & { user?: any }).user;

  const created = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    data: {
      role,
      full_name: full_name || email,
      clinica_id: clinicId,
    },
  });

  if (created.error) return res.status(400).json({ error: created.error.message });

  await supabaseAdmin.from('usuarios').upsert(
    {
      id: created.data.user.id,
      clinica_id: clinicId,
      nome: full_name || email,
      email,
      papel: role,
      ativo: true,
      senha_hash: 'auth_managed',
    },
    { onConflict: 'id' },
  );

  await writeAuditLog({
    clinica_id: clinicId,
    actor_user_id: actor?.id ?? null,
    entity_type: 'usuario',
    entity_id: created.data.user.id,
    action: 'credentials.send',
    metadata: { email, role, user_id: created.data.user.id },
  });

  return res.status(200).json({ ok: true, user_id: created.data.user.id });
});

export default router;
