ALTER TABLE public.atendimentos
  ADD COLUMN IF NOT EXISTS scheduled_time timestamptz,
  ADD COLUMN IF NOT EXISTS order_index double precision DEFAULT 0,
  ADD COLUMN IF NOT EXISTS version integer DEFAULT 1;

-- Update existing rows to have order_index if null
UPDATE public.atendimentos SET order_index = 0 WHERE order_index IS NULL;
UPDATE public.atendimentos SET version = 1 WHERE version IS NULL;

-- Create a function to automatically increment version for optimistic locking
CREATE OR REPLACE FUNCTION public.increment_atendimento_version()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS atendimentos_increment_version ON public.atendimentos;
CREATE TRIGGER atendimentos_increment_version
  BEFORE UPDATE ON public.atendimentos
  FOR EACH ROW EXECUTE PROCEDURE public.increment_atendimento_version();
