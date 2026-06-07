-- ══════════════════════════════════════════════════════
-- MIGRATION 6 — Sécurité app_config (CORRIGÉE)
-- ══════════════════════════════════════════════════════

-- Supprimer la policy publique (anon ne doit pas lire)
DROP POLICY IF EXISTS "Anyone can read app config" ON public.app_config;

-- Révoquer anon uniquement — garder authenticated pour le frontend
REVOKE SELECT ON public.app_config FROM anon;

-- Créer une policy restrictive : authenticated peut lire
CREATE POLICY "Authenticated can read app config"
ON public.app_config
FOR SELECT TO authenticated
USING (true);

-- service_role garde tous les droits
GRANT ALL ON public.app_config TO service_role;