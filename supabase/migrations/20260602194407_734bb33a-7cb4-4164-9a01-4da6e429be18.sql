-- ══════════════════════════════════════════════════════
-- MIGRATION 2 — Sécurité fonctions (CORRIGÉE)
-- ══════════════════════════════════════════════════════

-- Mettre à jour set_updated_at avec search_path sécurisé
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$;

-- has_role : révoquer anon et public uniquement
-- GARDER les droits pour authenticated et service_role
-- car les policies RLS en ont besoin
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;