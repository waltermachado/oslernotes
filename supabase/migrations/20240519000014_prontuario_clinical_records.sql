-- ============================================================
-- Migration: prontuario clinical records
-- Strategy: ALTER TABLE ADD COLUMN IF NOT EXISTS only.
--   Tables already exist in production with their base schema.
--   We add clinica_id / paciente_id / medico_id for multi-tenancy
--   plus domain-specific columns that were missing.
-- RLS: service_role bypass (auth handled by Edge Functions)
-- ============================================================

-- ------------------------------------------------------------
-- prontuarios  (= evoluções clínicas)
-- Existing columns: id, atendimento_id, anamnese, diagnostico,
--   observacoes, templates_utilizados (jsonb), created_at, updated_at
-- ------------------------------------------------------------
ALTER TABLE public.prontuarios ADD COLUMN IF NOT EXISTS clinica_id uuid;
ALTER TABLE public.prontuarios ADD COLUMN IF NOT EXISTS paciente_id uuid;
ALTER TABLE public.prontuarios ADD COLUMN IF NOT EXISTS medico_id uuid;

CREATE INDEX IF NOT EXISTS prontuarios_idx_clinica_paciente
  ON public.prontuarios (clinica_id, paciente_id);

ALTER TABLE public.prontuarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_prontuarios" ON public.prontuarios;
CREATE POLICY "service_role_all_prontuarios" ON public.prontuarios
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ------------------------------------------------------------
-- receitas
-- Existing columns: id, atendimento_id, tipo, medicamentos (jsonb),
--   instrucoes, status, created_at
-- ------------------------------------------------------------
ALTER TABLE public.receitas ADD COLUMN IF NOT EXISTS clinica_id uuid;
ALTER TABLE public.receitas ADD COLUMN IF NOT EXISTS paciente_id uuid;
ALTER TABLE public.receitas ADD COLUMN IF NOT EXISTS medico_id uuid;

CREATE INDEX IF NOT EXISTS receitas_idx_clinica_paciente
  ON public.receitas (clinica_id, paciente_id);

ALTER TABLE public.receitas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_receitas" ON public.receitas;
CREATE POLICY "service_role_all_receitas" ON public.receitas
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ------------------------------------------------------------
-- exames
-- Existing columns: id, atendimento_id, tipo, descricao,
--   arquivo_url, resultado, data_solicitacao, data_resultado
-- ------------------------------------------------------------
ALTER TABLE public.exames ADD COLUMN IF NOT EXISTS clinica_id uuid;
ALTER TABLE public.exames ADD COLUMN IF NOT EXISTS paciente_id uuid;
ALTER TABLE public.exames ADD COLUMN IF NOT EXISTS medico_id uuid;
ALTER TABLE public.exames ADD COLUMN IF NOT EXISTS urgente boolean NOT NULL DEFAULT false;
ALTER TABLE public.exames ADD COLUMN IF NOT EXISTS status varchar(30) NOT NULL DEFAULT 'solicitado';

CREATE INDEX IF NOT EXISTS exames_idx_clinica_paciente
  ON public.exames (clinica_id, paciente_id);

ALTER TABLE public.exames ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_exames" ON public.exames;
CREATE POLICY "service_role_all_exames" ON public.exames
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ------------------------------------------------------------
-- atestados
-- Existing columns: id, atendimento_id, dias_afastamento, cid,
--   data_retorno, observacoes, created_at
-- ------------------------------------------------------------
ALTER TABLE public.atestados ADD COLUMN IF NOT EXISTS clinica_id uuid;
ALTER TABLE public.atestados ADD COLUMN IF NOT EXISTS paciente_id uuid;
ALTER TABLE public.atestados ADD COLUMN IF NOT EXISTS medico_id uuid;
ALTER TABLE public.atestados ADD COLUMN IF NOT EXISTS texto text;

CREATE INDEX IF NOT EXISTS atestados_idx_clinica_paciente
  ON public.atestados (clinica_id, paciente_id);

ALTER TABLE public.atestados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_atestados" ON public.atestados;
CREATE POLICY "service_role_all_atestados" ON public.atestados
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
