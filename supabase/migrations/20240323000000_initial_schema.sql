-- Create enum for user roles
CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'medico', 'atendente');

-- Create clinicas table
CREATE TABLE IF NOT EXISTS clinicas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    cnpj TEXT UNIQUE NOT NULL,
    endereco JSONB,
    telefone TEXT,
    email TEXT,
    plano_assinatura TEXT DEFAULT 'bronze',
    ativa BOOLEAN DEFAULT true,
    nome_responsavel TEXT NOT NULL,
    especialidade_principal TEXT,
    horario_funcionamento TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create usuarios table
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    clinica_id UUID REFERENCES clinicas(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    email TEXT NOT NULL,
    papel user_role NOT NULL,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE clinicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON clinicas TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON usuarios TO anon, authenticated;

-- Policies for clinicas
-- Super admins can do everything
CREATE POLICY "Super admins can manage all clinicas" ON clinicas
    FOR ALL
    USING (
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
    )
    WITH CHECK (
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
    );

-- Admins can view and update their own clinica
CREATE POLICY "Admins can manage their own clinica" ON clinicas
    FOR SELECT
    USING (
        id = (SELECT clinica_id FROM usuarios WHERE id = auth.uid())
    );

-- Users can view their own clinica
CREATE POLICY "Users can view their own clinica" ON clinicas
    FOR SELECT
    USING (
        id = (SELECT clinica_id FROM usuarios WHERE id = auth.uid())
    );


-- Policies for usuarios
-- Super admins can do everything
CREATE POLICY "Super admins can manage all usuarios" ON usuarios
    FOR ALL
    USING (
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
    )
    WITH CHECK (
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
    );

-- Users can view other users in their own clinica
CREATE POLICY "Users can view members of their clinica" ON usuarios
    FOR SELECT
    USING (
        clinica_id = (SELECT clinica_id FROM usuarios WHERE id = auth.uid())
        OR id = auth.uid()
    );

-- Admins can manage users in their own clinica
CREATE POLICY "Admins can manage members of their clinica" ON usuarios
    FOR ALL
    USING (
        clinica_id = (SELECT clinica_id FROM usuarios WHERE id = auth.uid() AND papel = 'admin')
    )
    WITH CHECK (
        clinica_id = (SELECT clinica_id FROM usuarios WHERE id = auth.uid() AND papel = 'admin')
    );

-- Function to handle new user registration from Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.usuarios (id, email, nome, papel, clinica_id)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'atendente'::user_role),
    (new.raw_user_meta_data->>'clinica_id')::uuid
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();