-- Migration 5 — Bootstrap admin (CORRECTE — aucune modification)
-- Conserver telle quelle



-- Singleton config row that permanently records whether admin bootstrap was consumed
CREATE TABLE public.app_config (
  id boolean PRIMARY KEY DEFAULT true,
  admin_bootstrapped boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_config_singleton CHECK (id)
);

GRANT SELECT ON public.app_config TO anon, authenticated;
GRANT ALL ON public.app_config TO service_role;

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read app config"
ON public.app_config
FOR SELECT
TO anon, authenticated
USING (true);

INSERT INTO public.app_config (id, admin_bootstrapped) VALUES (true, false);

-- Atomic, one-time admin bootstrap. Serialized via row lock to prevent races.
CREATE OR REPLACE FUNCTION public.bootstrap_admin(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _consumed boolean;
BEGIN
  -- Lock the singleton config row to serialize concurrent calls
  SELECT admin_bootstrapped INTO _consumed
  FROM public.app_config
  WHERE id = true
  FOR UPDATE;

  -- Already bootstrapped: never grant admin again (permanent guard)
  IF _consumed IS TRUE THEN
    RETURN false;
  END IF;

  -- Extra guard: if an admin already exists, mark consumed and refuse
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    UPDATE public.app_config SET admin_bootstrapped = true, updated_at = now() WHERE id = true;
    RETURN false;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  UPDATE public.app_config SET admin_bootstrapped = true, updated_at = now() WHERE id = true;
  RETURN true;
END;
$$;

-- Only the trusted server (service_role) may call this; never signed-in users directly
REVOKE ALL ON FUNCTION public.bootstrap_admin(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_admin(uuid) TO service_role;