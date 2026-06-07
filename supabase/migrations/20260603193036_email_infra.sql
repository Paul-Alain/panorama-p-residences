-- ══════════════════════════════════════════════════════
-- MIGRATION 11 — Infrastructure email (CORRIGÉE)
-- ══════════════════════════════════════════════════════

-- [Garder tout le contenu original INTACT]
-- [Ajouter uniquement cette policy supplémentaire à la fin]

-- Permettre au staff de lire le journal des emails
-- (pour l'onglet Messages de l'admin)
DO $$ BEGIN
  CREATE POLICY "Staff can read send log"
    ON public.email_send_log FOR SELECT
    TO authenticated
    USING (
      has_role(auth.uid(), 'admin'::app_role) OR
      has_role(auth.uid(), 'proprietaire'::app_role) OR
      has_role(auth.uid(), 'gestionnaire'::app_role)
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;