-- ============================================================
-- Migration: RLS policies for atendimentos
-- The table exists in production but has no INSERT/UPDATE/DELETE
-- policies for clinic users, causing "violates row-level security"
-- errors when atendentes/admins try to enqueue patients.
-- ============================================================

-- Ensure RLS is enabled
ALTER TABLE public.atendimentos ENABLE ROW LEVEL SECURITY;

-- Grant base permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.atendimentos TO authenticated;

-- SELECT: any clinic member can read their clinic's atendimentos
DROP POLICY IF EXISTS "atendimentos_select_clinic" ON public.atendimentos;
CREATE POLICY "atendimentos_select_clinic" ON public.atendimentos
  FOR SELECT
  USING (clinica_id = public.get_user_clinica_id());

-- INSERT: admin, atendente, medico can create atendimentos for their clinic
DROP POLICY IF EXISTS "atendimentos_insert_clinic" ON public.atendimentos;
CREATE POLICY "atendimentos_insert_clinic" ON public.atendimentos
  FOR INSERT
  WITH CHECK (
    clinica_id = public.get_user_clinica_id()
    AND (public.is_admin() OR public.is_atendente() OR public.is_medico())
  );

-- UPDATE: admin, atendente, medico can update their clinic's atendimentos
DROP POLICY IF EXISTS "atendimentos_update_clinic" ON public.atendimentos;
CREATE POLICY "atendimentos_update_clinic" ON public.atendimentos
  FOR UPDATE
  USING (clinica_id = public.get_user_clinica_id())
  WITH CHECK (clinica_id = public.get_user_clinica_id());

-- DELETE: only admin can delete
DROP POLICY IF EXISTS "atendimentos_delete_admin" ON public.atendimentos;
CREATE POLICY "atendimentos_delete_admin" ON public.atendimentos
  FOR DELETE
  USING (
    clinica_id = public.get_user_clinica_id()
    AND public.is_admin()
  );

-- service_role bypass (Edge Functions)
DROP POLICY IF EXISTS "service_role_all_atendimentos" ON public.atendimentos;
CREATE POLICY "service_role_all_atendimentos" ON public.atendimentos
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
