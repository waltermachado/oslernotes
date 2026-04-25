CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.password_reset_rate_limit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  count integer NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS password_reset_rate_limit_key_uidx
  ON public.password_reset_rate_limit (key);

CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL,
  email text NOT NULL,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz NULL,
  created_ip text NULL,
  created_user_agent text NULL,
  used_ip text NULL,
  used_user_agent text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS password_reset_tokens_token_hash_uidx
  ON public.password_reset_tokens (token_hash);

CREATE INDEX IF NOT EXISTS password_reset_tokens_expires_at_idx
  ON public.password_reset_tokens (expires_at);

CREATE TABLE IF NOT EXISTS public.password_reset_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL,
  email text NOT NULL,
  ip text NULL,
  user_agent text NULL,
  action text NOT NULL,
  result text NOT NULL,
  error_code text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS password_reset_audit_created_at_idx
  ON public.password_reset_audit (created_at DESC);

CREATE INDEX IF NOT EXISTS password_reset_audit_email_idx
  ON public.password_reset_audit (email);

ALTER TABLE public.password_reset_rate_limit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deny_all_password_reset_rate_limit ON public.password_reset_rate_limit;
CREATE POLICY deny_all_password_reset_rate_limit ON public.password_reset_rate_limit
  FOR ALL
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS deny_all_password_reset_tokens ON public.password_reset_tokens;
CREATE POLICY deny_all_password_reset_tokens ON public.password_reset_tokens
  FOR ALL
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS deny_all_password_reset_audit ON public.password_reset_audit;
CREATE POLICY deny_all_password_reset_audit ON public.password_reset_audit
  FOR ALL
  USING (false)
  WITH CHECK (false);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.password_reset_rate_limit TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.password_reset_tokens TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.password_reset_audit TO anon, authenticated;

GRANT ALL PRIVILEGES ON public.password_reset_rate_limit TO service_role;
GRANT ALL PRIVILEGES ON public.password_reset_tokens TO service_role;
GRANT ALL PRIVILEGES ON public.password_reset_audit TO service_role;
