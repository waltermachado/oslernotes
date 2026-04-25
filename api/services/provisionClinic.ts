import crypto from 'crypto';
import { supabaseAdmin } from '../supabaseClient.js';
import { computeBackoffMs } from '../lib/retry.js';

type ProvisionParams = {
  orderId: string;
  plan: string;
  clinicPayload: {
    nome: string;
    cnpj: string;
    telefone?: string;
    email: string;
    endereco?: unknown;
    nome_responsavel: string;
    especialidade_principal?: string;
    horario_funcionamento?: string;
  };
};

export async function ensureProvisioningJob(orderId: string) {
  const { data, error } = await supabaseAdmin
    .from('provisioning_jobs')
    .upsert(
      {
        order_id: orderId,
        status: 'pending',
      },
      { onConflict: 'order_id' },
    )
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function provisionClinicFromOrder(params: ProvisionParams) {
  const { orderId, plan, clinicPayload } = params;

  const { data: job } = await supabaseAdmin
    .from('provisioning_jobs')
    .select('*')
    .eq('order_id', orderId)
    .maybeSingle();

  if (job?.status === 'succeeded') {
    return { status: 'already_succeeded' as const, clinica_id: job.clinica_id };
  }

  const adminPassword = crypto.randomBytes(10).toString('base64url') + 'Aa1!';
  const adminEmail = clinicPayload.email;

  const { data: clinic, error: clinicError } = await supabaseAdmin
    .from('clinicas')
    .upsert(
      {
        nome: clinicPayload.nome,
        cnpj: clinicPayload.cnpj,
        telefone: clinicPayload.telefone ?? null,
        email: clinicPayload.email,
        endereco: clinicPayload.endereco ?? {},
        plano_assinatura: plan,
        ativa: true,
        nome_responsavel: clinicPayload.nome_responsavel,
        especialidade_principal: clinicPayload.especialidade_principal ?? null,
        horario_funcionamento: clinicPayload.horario_funcionamento ?? null,
      },
      { onConflict: 'cnpj' },
    )
    .select('*')
    .single();

  if (clinicError) throw clinicError;

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
    user_metadata: {
      role: 'admin',
      full_name: clinicPayload.nome_responsavel,
      clinica_id: clinic.id,
    },
  });

  let adminUserId = authData?.user?.id;
  const authErrCode = readStringProp(authError, 'code');
  if (authError && authErrCode === 'email_exists') {
    const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) throw listError;
    const users = readArrayProp(listData, 'users');
    const existing = users
      .map((u) => ({ id: readStringProp(u, 'id'), email: readStringProp(u, 'email') }))
      .find((u) => u.id && u.email === adminEmail);
    if (!existing) throw authError;
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existing.id, {
      password: adminPassword,
      user_metadata: {
        role: 'admin',
        full_name: clinicPayload.nome_responsavel,
        clinica_id: clinic.id,
      },
    });
    if (updateError) throw updateError;
    adminUserId = existing.id;
  } else if (authError) {
    throw authError;
  }

  if (!adminUserId) {
    throw new Error('Failed to resolve admin user id');
  }

  const { error: upsertUserError } = await supabaseAdmin.from('usuarios').upsert(
    {
      id: adminUserId,
      clinica_id: clinic.id,
      nome: clinicPayload.nome_responsavel,
      email: adminEmail,
      papel: 'admin',
      ativo: true,
      senha_hash: 'auth_managed',
    },
    { onConflict: 'id' },
  );

  if (upsertUserError) throw upsertUserError;

  const { error: jobUpdateError } = await supabaseAdmin
    .from('provisioning_jobs')
    .upsert(
      {
        order_id: orderId,
        status: 'succeeded',
        clinica_id: clinic.id,
        retry_count: 0,
        next_retry_at: null,
        last_error: null,
      },
      { onConflict: 'order_id' },
    );

  if (jobUpdateError) throw jobUpdateError;

  return {
    status: 'succeeded' as const,
    clinica_id: clinic.id,
    admin_email: adminEmail,
    admin_password: adminPassword,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readStringProp(value: unknown, key: string) {
  if (!isRecord(value)) return null;
  const v = value[key];
  return typeof v === 'string' ? v : null;
}

function readArrayProp(value: unknown, key: string) {
  if (!isRecord(value)) return [];
  const v = value[key];
  return Array.isArray(v) ? v : [];
}

export async function markProvisioningFailed(orderId: string, errorMessage: string) {
  const { data: job } = await supabaseAdmin
    .from('provisioning_jobs')
    .select('*')
    .eq('order_id', orderId)
    .maybeSingle();

  const retryCount = (job?.retry_count ?? 0) + 1;
  const delayMs = computeBackoffMs(retryCount);
  const nextRetryAt = new Date(Date.now() + delayMs).toISOString();

  const { error } = await supabaseAdmin
    .from('provisioning_jobs')
    .upsert(
      {
        order_id: orderId,
        status: 'failed',
        retry_count: retryCount,
        next_retry_at: nextRetryAt,
        last_error: errorMessage,
      },
      { onConflict: 'order_id' },
    );

  if (error) throw error;
}

export async function processDueProvisioningRetries(limit = 10) {
  const nowIso = new Date().toISOString();
  const { data: jobs, error } = await supabaseAdmin
    .from('provisioning_jobs')
    .select('order_id')
    .eq('status', 'failed')
    .lte('next_retry_at', nowIso)
    .limit(limit);

  if (error) throw error;
  return jobs ?? [];
}
