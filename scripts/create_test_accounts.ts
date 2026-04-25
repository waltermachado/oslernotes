import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
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

    const existing = listData.users.find((u) => u.email === email);
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
  telefone?: string;
  cpf?: string;
  crm?: string;
}) {
  const { id, clinicaId, nome, email, papel, telefone, cpf, crm } = params;

  const senhaHashPlaceholder = crypto.createHash('sha256').update(`${id}:${email}`).digest('hex');

  const { error } = await supabaseAdmin.from('usuarios').upsert(
    {
      id,
      clinica_id: clinicaId,
      nome,
      email,
      papel,
      ativo: true,
      senha_hash: senhaHashPlaceholder,
      telefone: telefone ?? null,
      cpf: cpf ?? null,
      crm: crm ?? null,
    },
    { onConflict: 'id' },
  );

  if (error) throw error;
}

async function main() {
  const clinic = {
    nome: 'Clínica Teste Osler',
    cnpj: '00000000000191',
    telefone: '(11) 99999-0000',
    email: 'contato@clinicateste.oslernotes.com',
    endereco: {
      cep: '01001-000',
      logradouro: 'Praça da Sé',
      numero: '100',
      bairro: 'Sé',
      cidade: 'São Paulo',
      estado: 'SP',
    },
  };

  const { data: existingClinic } = await supabaseAdmin
    .from('clinicas')
    .select('id')
    .eq('cnpj', clinic.cnpj)
    .maybeSingle();

  let clinicaId = existingClinic?.id;
  if (!clinicaId) {
    const { data: createdClinic, error: createClinicError } = await supabaseAdmin
      .from('clinicas')
      .insert({
        ...clinic,
        plano_assinatura: 'bronze',
        ativa: true,
        nome_responsavel: 'Responsável Teste',
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

  const password = 'Osler1411@';

  const users: SeedUser[] = [
    {
      email: 'admin@clinicateste.oslernotes.com',
      role: 'admin' as const,
      fullName: 'Admin Clínica Teste',
      nome: 'Admin Clínica Teste',
    },
    {
      email: 'medico@clinicateste.oslernotes.com',
      role: 'medico' as const,
      fullName: 'Dr(a). Teste',
      nome: 'Dr(a). Teste',
      crm: 'CRM-SP 123456',
    },
    {
      email: 'atendente@clinicateste.oslernotes.com',
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

  console.log('=== CONTAS DE TESTE CRIADAS/ATUALIZADAS ===');
  console.log(`Clínica: ${clinic.nome}`);
  console.log(`CNPJ: ${clinic.cnpj}`);
  console.log(`Senha (para todos): ${password}`);
  console.log('Admin:', users[0].email);
  console.log('Médico:', users[1].email);
  console.log('Atendente:', users[2].email);
}

main().catch((err) => {
  console.error('Failed to create test accounts:', err);
  process.exit(1);
});
