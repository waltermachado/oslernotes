-- ============================================================
-- Migration: Financeiro clínico
-- Adiciona colunas de cobrança em atendimentos e cria tabela
-- de configuração financeira por clínica.
-- ============================================================

-- 1. Colunas de faturamento na tabela de atendimentos
ALTER TABLE public.atendimentos
  ADD COLUMN IF NOT EXISTS valor_consulta  numeric(10,2),
  ADD COLUMN IF NOT EXISTS forma_pagamento varchar(30);

-- forma_pagamento aceita: 'dinheiro', 'cartao_credito', 'cartao_debito',
--                         'pix', 'convenio', 'particular'

-- 2. Configuração financeira da clínica
CREATE TABLE IF NOT EXISTS public.clinica_config_financeiro (
  clinica_id               uuid        PRIMARY KEY
                                        REFERENCES public.clinicas(id)
                                        ON DELETE CASCADE,
  valor_consulta_padrao    numeric(10,2) NOT NULL DEFAULT 150.00,
  moeda                    varchar(3)   NOT NULL DEFAULT 'BRL',
  updated_at               timestamptz  NOT NULL DEFAULT now()
);

ALTER TABLE public.clinica_config_financeiro ENABLE ROW LEVEL SECURITY;

-- Apenas service_role pode gerenciar — acesso via Edge Functions
CREATE POLICY "service_role_all_config_financeiro"
  ON public.clinica_config_financeiro
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
