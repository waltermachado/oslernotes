DO $$ BEGIN
  CREATE TYPE public.plan_tier AS ENUM ('bronze', 'prata', 'ouro');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.subscription_plan_catalog (
  tier public.plan_tier PRIMARY KEY,
  monthly_price_cents int NOT NULL,
  max_concurrent_total int NOT NULL,
  max_concurrent_admin int,
  max_concurrent_atendente int,
  max_concurrent_medico int,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.subscription_plan_catalog (tier, monthly_price_cents, max_concurrent_total, max_concurrent_admin, max_concurrent_atendente, max_concurrent_medico)
VALUES
  ('bronze', 34990, 3, 1, 1, 1),
  ('prata', 54990, 10, null, null, null),
  ('ouro', 74990, 50, null, null, null)
ON CONFLICT (tier) DO UPDATE SET
  monthly_price_cents = EXCLUDED.monthly_price_cents,
  max_concurrent_total = EXCLUDED.max_concurrent_total,
  max_concurrent_admin = EXCLUDED.max_concurrent_admin,
  max_concurrent_atendente = EXCLUDED.max_concurrent_atendente,
  max_concurrent_medico = EXCLUDED.max_concurrent_medico,
  updated_at = now();

CREATE TABLE IF NOT EXISTS public.clinica_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id uuid NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  papel public.user_role NOT NULL,
  session_key text NOT NULL,
  user_agent text,
  ip text,
  last_seen timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (clinica_id, session_key)
);

CREATE INDEX IF NOT EXISTS clinica_sessions_idx_clinica_last_seen
  ON public.clinica_sessions (clinica_id, last_seen DESC);

CREATE INDEX IF NOT EXISTS clinica_sessions_idx_user_last_seen
  ON public.clinica_sessions (user_id, last_seen DESC);

CREATE TABLE IF NOT EXISTS public.super_admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_type text NOT NULL CHECK (scope_type IN ('all_clinics','single_clinic')),
  scope_clinica_id uuid NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  kind text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS super_admin_notifications_idx_scope
  ON public.super_admin_notifications (scope_type, scope_clinica_id);

CREATE INDEX IF NOT EXISTS super_admin_notifications_idx_status_created_at
  ON public.super_admin_notifications (status, created_at DESC);

ALTER TABLE public.subscription_plan_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinica_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.super_admin_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_plan_catalog" ON public.subscription_plan_catalog;
CREATE POLICY "service_role_all_plan_catalog" ON public.subscription_plan_catalog
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "service_role_all_clinica_sessions" ON public.clinica_sessions;
CREATE POLICY "service_role_all_clinica_sessions" ON public.clinica_sessions
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "service_role_all_super_admin_notifications" ON public.super_admin_notifications;
CREATE POLICY "service_role_all_super_admin_notifications" ON public.super_admin_notifications
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

GRANT SELECT ON public.subscription_plan_catalog TO authenticated;

