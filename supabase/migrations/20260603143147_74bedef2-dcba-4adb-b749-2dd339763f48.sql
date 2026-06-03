DROP POLICY IF EXISTS "Anyone can read app config" ON public.app_config;

REVOKE SELECT ON public.app_config FROM anon, authenticated;
-- service_role retains full access (granted previously) for the bootstrap routine