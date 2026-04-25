-- Drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Users can view members of their clinica" ON usuarios;
DROP POLICY IF EXISTS "Admins can manage members of their clinica" ON usuarios;

-- For users, we need to check their clinica_id without querying the same table.
-- Best approach: use auth.jwt() metadata if possible, or a separate function/view.
-- Since we might not have clinica_id in JWT, we can use a subquery on auth.users if we store it there,
-- but the easiest way to break recursion is to use a SECURITY DEFINER function or check the current user's clinica_id directly.

CREATE OR REPLACE FUNCTION get_user_clinica_id()
RETURNS uuid AS $$
  SELECT clinica_id FROM usuarios WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT papel = 'admin' FROM usuarios WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Re-create policies using the SECURITY DEFINER functions to bypass RLS internally
CREATE POLICY "Users can view members of their clinica" ON usuarios
    FOR SELECT
    USING (
        clinica_id = get_user_clinica_id()
        OR id = auth.uid()
    );

CREATE POLICY "Admins can manage members of their clinica" ON usuarios
    FOR ALL
    USING (
        clinica_id = get_user_clinica_id() AND is_admin()
    )
    WITH CHECK (
        clinica_id = get_user_clinica_id() AND is_admin()
    );
