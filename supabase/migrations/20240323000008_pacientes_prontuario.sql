DO $$ BEGIN
  CREATE TYPE public.paciente_sexo AS ENUM ('Masculino', 'Feminino');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE public.pacientes
  ADD COLUMN IF NOT EXISTS sexo public.paciente_sexo,
  ADD COLUMN IF NOT EXISTS sexualidade text,
  ADD COLUMN IF NOT EXISTS historico_breve_doencas text,
  ADD COLUMN IF NOT EXISTS queixa_principal text,
  ADD COLUMN IF NOT EXISTS doencas jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS remedios jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS futuras_anotacoes text,
  ADD COLUMN IF NOT EXISTS foto_path text;

ALTER TABLE public.pacientes
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET NOT NULL,
  ALTER COLUMN updated_at SET DEFAULT now();

ALTER TABLE public.pacientes
  ALTER COLUMN cpf DROP NOT NULL;

ALTER TABLE public.pacientes
  DROP CONSTRAINT IF EXISTS pacientes_cpf_key;

CREATE UNIQUE INDEX IF NOT EXISTS pacientes_uq_clinica_cpf
  ON public.pacientes (clinica_id, cpf)
  WHERE cpf IS NOT NULL;

ALTER TABLE public.pacientes
  ADD CONSTRAINT pacientes_nome_completo_len_chk
    CHECK (char_length(nome_completo) <= 150);

ALTER TABLE public.pacientes
  ADD CONSTRAINT pacientes_historico_min_chk
    CHECK (historico_breve_doencas IS NULL OR char_length(trim(historico_breve_doencas)) >= 10);

ALTER TABLE public.pacientes
  ADD CONSTRAINT pacientes_sexualidade_len_chk
    CHECK (sexualidade IS NULL OR char_length(trim(sexualidade)) <= 120);

ALTER TABLE public.pacientes
  ADD CONSTRAINT pacientes_foto_path_chk
    CHECK (foto_path IS NULL OR foto_path ~ '^[0-9a-fA-F\-]{36}/[0-9a-fA-F\-]{36}/');

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pacientes_set_updated_at ON public.pacientes;
CREATE TRIGGER pacientes_set_updated_at
  BEFORE UPDATE ON public.pacientes
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE OR REPLACE FUNCTION public.is_medico()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT papel = 'medico' FROM public.usuarios WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_atendente()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT papel = 'atendente' FROM public.usuarios WHERE id = auth.uid() LIMIT 1;
$$;

DROP POLICY IF EXISTS "Pacientes read by clinic" ON public.pacientes;
CREATE POLICY "Pacientes read by clinic" ON public.pacientes
  FOR SELECT
  USING (clinica_id = public.get_user_clinica_id());

DROP POLICY IF EXISTS "Pacientes insert by roles" ON public.pacientes;
CREATE POLICY "Pacientes insert by roles" ON public.pacientes
  FOR INSERT
  WITH CHECK (
    clinica_id = public.get_user_clinica_id()
    AND (public.is_medico() OR public.is_atendente() OR public.is_admin())
  );

DROP POLICY IF EXISTS "Pacientes update by roles" ON public.pacientes;
CREATE POLICY "Pacientes update by roles" ON public.pacientes
  FOR UPDATE
  USING (
    clinica_id = public.get_user_clinica_id()
    AND (public.is_medico() OR public.is_atendente() OR public.is_admin())
  )
  WITH CHECK (
    clinica_id = public.get_user_clinica_id()
    AND (public.is_medico() OR public.is_atendente() OR public.is_admin())
  );

DROP POLICY IF EXISTS "Pacientes delete by admin or atendente" ON public.pacientes;
CREATE POLICY "Pacientes delete by admin or atendente" ON public.pacientes
  FOR DELETE
  USING (
    clinica_id = public.get_user_clinica_id()
    AND (public.is_atendente() OR public.is_admin())
  );

INSERT INTO storage.buckets (id, name, public)
VALUES ('patient-photos', 'patient-photos', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "patient_photos_read" ON storage.objects;
CREATE POLICY "patient_photos_read" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'patient-photos'
    AND (split_part(name, '/', 1))::uuid = public.get_user_clinica_id()
  );

DROP POLICY IF EXISTS "patient_photos_write" ON storage.objects;
CREATE POLICY "patient_photos_write" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'patient-photos'
    AND (split_part(name, '/', 1))::uuid = public.get_user_clinica_id()
    AND (public.is_medico() OR public.is_atendente() OR public.is_admin())
  );

