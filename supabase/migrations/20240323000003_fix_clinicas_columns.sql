ALTER TABLE public.clinicas
  ADD COLUMN IF NOT EXISTS nome_responsavel text,
  ADD COLUMN IF NOT EXISTS especialidade_principal text,
  ADD COLUMN IF NOT EXISTS horario_funcionamento text;

ALTER TABLE public.clinicas
  ALTER COLUMN plano_assinatura SET DEFAULT 'bronze';

UPDATE public.clinicas
SET plano_assinatura = 'bronze'
WHERE plano_assinatura IS NULL OR plano_assinatura = 'basico';

