DO $$ BEGIN
  CREATE TYPE chat_conversation_type AS ENUM ('direct', 'group');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE chat_message_type AS ENUM ('text', 'image', 'file');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id uuid NOT NULL,
  type chat_conversation_type NOT NULL DEFAULT 'direct',
  titulo text,
  created_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_clinica_created
  ON public.chat_conversations (clinica_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.chat_conversation_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id uuid NOT NULL,
  conversation_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  archived_at timestamptz,
  last_read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_members_conversation
  ON public.chat_conversation_members (clinica_id, conversation_id);

CREATE INDEX IF NOT EXISTS idx_chat_members_user
  ON public.chat_conversation_members (clinica_id, user_id);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id uuid NOT NULL,
  conversation_id uuid NOT NULL,
  sender_user_id uuid NOT NULL,
  type chat_message_type NOT NULL DEFAULT 'text',
  body text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conv
  ON public.chat_messages (clinica_id, conversation_id, created_at);

CREATE TABLE IF NOT EXISTS public.chat_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id uuid NOT NULL,
  message_id uuid NOT NULL,
  file_name text NOT NULL,
  object_path text NOT NULL,
  mime_type text,
  size_bytes int,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_attachments_message
  ON public.chat_attachments (clinica_id, message_id);

CREATE TABLE IF NOT EXISTS public.chat_message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id uuid NOT NULL,
  message_id uuid NOT NULL,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_chat_reactions_message
  ON public.chat_message_reactions (clinica_id, message_id);

ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_message_reactions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.chat_is_member(p_conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_conversation_members m
    WHERE m.conversation_id = p_conversation_id
      AND m.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.chat_is_admin_member(p_conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_conversation_members m
    WHERE m.conversation_id = p_conversation_id
      AND m.user_id = auth.uid()
      AND m.role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.chat_conversation_is_archived(p_conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_conversations c
    WHERE c.id = p_conversation_id
      AND c.status = 'archived'
  );
$$;

CREATE OR REPLACE FUNCTION public.chat_is_message_visible(p_message_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_messages m
    WHERE m.id = p_message_id
      AND public.chat_is_member(m.conversation_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.chat_is_message_sender(p_message_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_messages m
    WHERE m.id = p_message_id
      AND m.sender_user_id = auth.uid()
  );
$$;

REVOKE ALL ON public.chat_conversations FROM anon;
REVOKE ALL ON public.chat_conversation_members FROM anon;
REVOKE ALL ON public.chat_messages FROM anon;
REVOKE ALL ON public.chat_attachments FROM anon;
REVOKE ALL ON public.chat_message_reactions FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_conversation_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_attachments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_message_reactions TO authenticated;

GRANT ALL PRIVILEGES ON public.chat_conversations TO service_role;
GRANT ALL PRIVILEGES ON public.chat_conversation_members TO service_role;
GRANT ALL PRIVILEGES ON public.chat_messages TO service_role;
GRANT ALL PRIVILEGES ON public.chat_attachments TO service_role;
GRANT ALL PRIVILEGES ON public.chat_message_reactions TO service_role;

CREATE POLICY "chat_conv_select" ON public.chat_conversations
FOR SELECT TO authenticated
USING (
  clinica_id = public.get_user_clinica_id()
  AND public.chat_is_member(id)
);

CREATE POLICY "chat_conv_insert" ON public.chat_conversations
FOR INSERT TO authenticated
WITH CHECK (
  clinica_id = public.get_user_clinica_id()
  AND created_by = auth.uid()
);

CREATE POLICY "chat_conv_update" ON public.chat_conversations
FOR UPDATE TO authenticated
USING (clinica_id = public.get_user_clinica_id())
WITH CHECK (clinica_id = public.get_user_clinica_id());

CREATE POLICY "chat_members_select" ON public.chat_conversation_members
FOR SELECT TO authenticated
USING (
  clinica_id = public.get_user_clinica_id()
  AND public.chat_is_member(conversation_id)
);

CREATE POLICY "chat_members_insert_admin" ON public.chat_conversation_members
FOR INSERT TO authenticated
WITH CHECK (
  clinica_id = public.get_user_clinica_id()
  AND public.chat_is_admin_member(conversation_id)
);

CREATE POLICY "chat_members_update_admin" ON public.chat_conversation_members
FOR UPDATE TO authenticated
USING (
  clinica_id = public.get_user_clinica_id()
  AND public.chat_is_admin_member(conversation_id)
)
WITH CHECK (clinica_id = public.get_user_clinica_id());

CREATE POLICY "chat_members_update_self" ON public.chat_conversation_members
FOR UPDATE TO authenticated
USING (clinica_id = public.get_user_clinica_id() AND user_id = auth.uid())
WITH CHECK (clinica_id = public.get_user_clinica_id() AND user_id = auth.uid());

CREATE POLICY "chat_messages_select" ON public.chat_messages
FOR SELECT TO authenticated
USING (
  clinica_id = public.get_user_clinica_id()
  AND public.chat_is_member(conversation_id)
);

CREATE POLICY "chat_messages_insert" ON public.chat_messages
FOR INSERT TO authenticated
WITH CHECK (
  clinica_id = public.get_user_clinica_id()
  AND sender_user_id = auth.uid()
  AND public.chat_is_member(conversation_id)
  AND NOT public.chat_conversation_is_archived(conversation_id)
);

CREATE POLICY "chat_attachments_select" ON public.chat_attachments
FOR SELECT TO authenticated
USING (
  clinica_id = public.get_user_clinica_id()
  AND public.chat_is_message_visible(message_id)
);

CREATE POLICY "chat_attachments_insert" ON public.chat_attachments
FOR INSERT TO authenticated
WITH CHECK (
  clinica_id = public.get_user_clinica_id()
  AND public.chat_is_message_sender(message_id)
);

CREATE POLICY "chat_reactions_select" ON public.chat_message_reactions
FOR SELECT TO authenticated
USING (
  clinica_id = public.get_user_clinica_id()
  AND public.chat_is_message_visible(message_id)
);

CREATE POLICY "chat_reactions_insert" ON public.chat_message_reactions
FOR INSERT TO authenticated
WITH CHECK (
  clinica_id = public.get_user_clinica_id()
  AND user_id = auth.uid()
  AND public.chat_is_message_visible(message_id)
);

CREATE POLICY "chat_reactions_delete" ON public.chat_message_reactions
FOR DELETE TO authenticated
USING (clinica_id = public.get_user_clinica_id() AND user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.chat_create_direct_conversation(other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cid uuid;
  existing_id uuid;
  new_id uuid;
BEGIN
  cid := public.get_user_clinica_id();
  IF cid IS NULL THEN
    RAISE EXCEPTION 'user_has_no_clinica';
  END IF;

  IF other_user_id IS NULL OR other_user_id = auth.uid() THEN
    RAISE EXCEPTION 'invalid_other_user';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.usuarios u
    WHERE u.id = other_user_id
      AND u.clinica_id = cid
      AND u.ativo = true
  ) THEN
    RAISE EXCEPTION 'other_user_not_in_same_clinica';
  END IF;

  SELECT c.id
  INTO existing_id
  FROM public.chat_conversations c
  WHERE c.clinica_id = cid
    AND c.type = 'direct'
    AND EXISTS (
      SELECT 1 FROM public.chat_conversation_members m
      WHERE m.conversation_id = c.id
        AND m.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.chat_conversation_members m
      WHERE m.conversation_id = c.id
        AND m.user_id = other_user_id
    )
    AND (
      SELECT count(*) FROM public.chat_conversation_members m
      WHERE m.conversation_id = c.id
    ) = 2
  LIMIT 1;

  IF existing_id IS NOT NULL THEN
    RETURN existing_id;
  END IF;

  INSERT INTO public.chat_conversations (clinica_id, type, titulo, created_by)
  VALUES (cid, 'direct', NULL, auth.uid())
  RETURNING id INTO new_id;

  INSERT INTO public.chat_conversation_members (clinica_id, conversation_id, user_id, role)
  VALUES
    (cid, new_id, auth.uid(), 'admin'),
    (cid, new_id, other_user_id, 'member');

  RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.chat_create_direct_conversation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.chat_create_direct_conversation(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.chat_create_direct_conversation(uuid) FROM anon;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversations;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversation_members;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_message_reactions;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_attachments;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', false)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  CREATE POLICY "storage_chat_attachments_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'chat-attachments'
    AND split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND (split_part(name, '/', 1))::uuid = public.get_user_clinica_id()
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "storage_chat_attachments_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat-attachments'
    AND split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND (split_part(name, '/', 1))::uuid = public.get_user_clinica_id()
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
