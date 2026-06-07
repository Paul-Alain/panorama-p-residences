-- ══════════════════════════════════════════════════════
-- MIGRATION 19 — Sécurité avancée (CORRIGÉE)
-- ══════════════════════════════════════════════════════

-- 1. Realtime : staff ET clients connectés peuvent recevoir les mises à jour
DROP POLICY IF EXISTS "Staff can receive realtime messages" ON realtime.messages;
CREATE POLICY "Staff and users can receive realtime messages"
ON realtime.messages
FOR SELECT TO authenticated
USING (
  public.is_staff(auth.uid()) OR
  auth.uid() IS NOT NULL
);

-- 2. activity_log : user_id lié à l'utilisateur actif
DROP POLICY IF EXISTS "Staff insert activity" ON public.activity_log;
CREATE POLICY "Staff insert activity"
ON public.activity_log
FOR INSERT TO authenticated
WITH CHECK (
  is_staff(auth.uid()) AND
  (user_id = auth.uid() OR user_id IS NULL)
);

-- 3. Fonctions email avec search_path sécurisé
CREATE OR REPLACE FUNCTION public.delete_email(queue_name text, message_id bigint)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pgmq', 'public'
AS $$
BEGIN
  RETURN pgmq.delete(queue_name, message_id);
EXCEPTION WHEN undefined_table THEN
  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.read_email_batch(queue_name text, batch_size integer, vt integer)
RETURNS TABLE(msg_id bigint, read_ct integer, message jsonb)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pgmq', 'public'
AS $$
BEGIN
  RETURN QUERY SELECT r.msg_id, r.read_ct, r.message
  FROM pgmq.read(queue_name, vt, batch_size) r;
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN;
END;
$$;

CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name text, payload jsonb)
RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pgmq', 'public'
AS $$
BEGIN
  RETURN pgmq.send(queue_name, payload);
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN pgmq.send(queue_name, payload);
END;
$$;

CREATE OR REPLACE FUNCTION public.move_to_dlq(
  source_queue text, dlq_name text, message_id bigint, payload jsonb
)
RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pgmq', 'public'
AS $$
DECLARE new_id BIGINT;
BEGIN
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  PERFORM pgmq.delete(source_queue, message_id);
  RETURN new_id;
EXCEPTION WHEN undefined_table THEN
  BEGIN
    PERFORM pgmq.create(dlq_name);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  BEGIN
    PERFORM pgmq.delete(source_queue, message_id);
  EXCEPTION WHEN undefined_table THEN NULL;
  END;
  RETURN new_id;
END;
$$;

-- 4. Droits sur les fonctions
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated, service_role;

-- bootstrap_admin : service_role uniquement (jamais les utilisateurs directement)
REVOKE EXECUTE ON FUNCTION public.bootstrap_admin(uuid) FROM anon, public, authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_admin(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.delete_email(text, bigint) TO service_role;

REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) TO service_role;

REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) TO service_role;

REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) TO service_role;