CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id uuid NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  actor_user_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE SET NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  action text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_idx_clinica_created_at
  ON public.audit_logs (clinica_id, created_at DESC);

CREATE INDEX IF NOT EXISTS audit_logs_idx_entity
  ON public.audit_logs (entity_type, entity_id);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON public.audit_logs TO authenticated;

DROP POLICY IF EXISTS "audit_logs_select_by_clinic" ON public.audit_logs;
CREATE POLICY "audit_logs_select_by_clinic" ON public.audit_logs
  FOR SELECT
  USING (clinica_id = public.get_user_clinica_id());

DROP POLICY IF EXISTS "audit_logs_insert_by_clinic" ON public.audit_logs;
CREATE POLICY "audit_logs_insert_by_clinic" ON public.audit_logs
  FOR INSERT
  WITH CHECK (clinica_id = public.get_user_clinica_id());

