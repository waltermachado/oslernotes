import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

type UserRole = 'admin' | 'medico' | 'atendente';

type SeedUser = {
  email: string;
  role: UserRole;
  fullName: string;
  nome: string;
  crm?: string;
};

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

async function upsertAuthUser(params: {
  email: string;
  password: string;
  role: UserRole;
  fullName: string;
  clinicaId: string;
}) {
  const { email, password, role, fullName, clinicaId } = params;

  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      role,
      full_name: fullName,
      clinica_id: clinicaId,
    },
  });

  if (!createError && created.user) {
    return created.user.id;
  }

  const errCode = readStringProp(createError, 'code');
  if (createError && errCode === 'email_exists') {
    const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) throw listError;

    const users = readArrayProp(listData, 'users');
    const existing = users
      .map((u) => ({ id: readStringProp(u, 'id'), email: readStringProp(u, 'email') }))
      .find((u) => u.id && u.email === email);
    if (!existing) throw createError;

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existing.id, {
      password,
      user_metadata: {
        role,
        full_name: fullName,
        clinica_id: clinicaId,
      },
    });
    if (updateError) throw updateError;

    return existing.id;
  }

  throw createError;
}

async function upsertPublicUsuario(params: {
  id: string;
  clinicaId: string;
  nome: string;
  email: string;
  papel: UserRole;
  crm?: string;
}) {
  const { id, clinicaId, nome, email, papel, crm } = params;

  const { error } = await supabaseAdmin.from('usuarios').upsert(
    {
      id,
      clinica_id: clinicaId,
      nome,
      email,
      papel,
      ativo: true,
      senha_hash: 'auth_managed',
      crm: crm ?? null,
    },
    { onConflict: 'id' },
  );

  if (error) throw error;
}

async function main() {
  const clinicName = 'Clina teste 123';
  const clinicCnpj = '00000000000353';
  const clinicEmail = 'clinicateste123@oslernotes.com';
  const password = 'Osler1411@';

  const { data: existingClinic } = await supabaseAdmin
    .from('clinicas')
    .select('id')
    .eq('cnpj', clinicCnpj)
    .maybeSingle();

  let clinicaId = existingClinic?.id as string | undefined;

  if (!clinicaId) {
    const { data: createdClinic, error: createClinicError } = await supabaseAdmin
      .from('clinicas')
      .insert({
        nome: clinicName,
        cnpj: clinicCnpj,
        endereco: {},
        telefone: '(11) 99999-0000',
        email: clinicEmail,
        plano_assinatura: 'bronze',
        ativa: true,
        nome_responsavel: 'Admin Clínica Teste',
        especialidade_principal: 'Clínica Geral',
        horario_funcionamento: 'Seg-Sex 08:00-18:00',
      })
      .select('id')
      .single();

    if (createClinicError || !createdClinic?.id) {
      throw createClinicError ?? new Error('Failed to create clinic');
    }

    clinicaId = createdClinic.id;
  }

  const users: SeedUser[] = [
    {
      email: 'adminclinica@oslernotes.com',
      role: 'admin' as const,
      fullName: 'Admin Clínica',
      nome: 'Admin Clínica',
    },
    {
      email: 'medicoteste@oslernotes.com',
      role: 'medico' as const,
      fullName: 'Médico Teste',
      nome: 'Médico Teste',
      crm: 'CRM-SP 000001',
    },
    {
      email: 'atendenteteste@oslernotes.com',
      role: 'atendente' as const,
      fullName: 'Atendente Teste',
      nome: 'Atendente Teste',
    },
  ];

  for (const u of users) {
    const authUserId = await upsertAuthUser({
      email: u.email,
      password,
      role: u.role,
      fullName: u.fullName,
      clinicaId,
    });

    await upsertPublicUsuario({
      id: authUserId,
      clinicaId,
      nome: u.nome,
      email: u.email,
      papel: u.role,
      crm: u.crm,
    });
  }

  const fingerprint = crypto.createHash('sha1').update(clinicaId).digest('hex').slice(0, 8);

  console.log('=== CONTAS FIXAS DE TESTE (CRIADAS/ATUALIZADAS) ===');
  console.log(`Clínica: ${clinicName}`);
  console.log(`CNPJ: ${clinicCnpj}`);
  console.log(`Clinic ID: ${clinicaId} (${fingerprint})`);
  console.log(`Senha (para todos): ${password}`);
  console.log('Admin:', users[0].email);
  console.log('Médico:', users[1].email);
  console.log('Atendente:', users[2].email);
}

main().catch((err) => {
  console.error('Failed to create fixed test accounts:', err);
  process.exit(1);
});
