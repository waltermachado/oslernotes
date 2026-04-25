DO $$ BEGIN
  CREATE TYPE billing_interval AS ENUM ('monthly', 'quarterly', 'yearly');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE subscription_state AS ENUM ('active', 'past_due', 'canceled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE invoice_status AS ENUM ('pending', 'paid', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE public.subscription_orders
  ADD COLUMN IF NOT EXISTS interval billing_interval NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS is_initial boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  clinica_id uuid REFERENCES public.clinicas(id) ON DELETE SET NULL,
  plano_assinatura text NOT NULL DEFAULT 'bronze',
  interval billing_interval NOT NULL,
  status subscription_state NOT NULL DEFAULT 'active',
  provider text NOT NULL DEFAULT 'nexano',
  provider_subscription_id text,
  current_period_start timestamptz NOT NULL,
  current_period_end timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_subscription_id)
);

CREATE TABLE IF NOT EXISTS public.subscription_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.subscription_orders(id) ON DELETE SET NULL,
  status invoice_status NOT NULL DEFAULT 'pending',
  provider text NOT NULL DEFAULT 'nexano',
  provider_invoice_id text,
  provider_payment_id text,
  amount_cents int,
  currency text NOT NULL DEFAULT 'BRL',
  due_at timestamptz,
  paid_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_invoice_id),
  UNIQUE (provider, provider_payment_id)
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_subscriptions" ON public.subscriptions
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "service_role_all_invoices" ON public.subscription_invoices
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

