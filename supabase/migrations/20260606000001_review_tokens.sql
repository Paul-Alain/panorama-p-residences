-- ══════════════════════════════════════════════════════
-- MIGRATION 22 — Correction policies review_tokens (CORRIGÉE)
-- ══════════════════════════════════════════════════════

-- Table déjà créée en Migration 20 — juste les index et corrections

CREATE INDEX IF NOT EXISTS review_tokens_token_idx 
  ON public.review_tokens(token);
CREATE INDEX IF NOT EXISTS review_tokens_reservation_idx 
  ON public.review_tokens(reservation_id);

-- Corriger les policies trop permissives de Migration 20
DROP POLICY IF EXISTS "public_read_token" ON public.review_tokens;
DROP POLICY IF EXISTS "staff_insert_token" ON public.review_tokens;
DROP POLICY IF EXISTS "staff_update_token" ON public.review_tokens;
DROP POLICY IF EXISTS "Anyone can read review tokens" ON public.review_tokens;
DROP POLICY IF EXISTS "Service role updates tokens" ON public.review_tokens;
DROP POLICY IF EXISTS "Staff manage review tokens" ON public.review_tokens;

-- Recréer des policies correctes
-- Lecture publique (page de notation client)
CREATE POLICY "public_read_token" ON public.review_tokens
  FOR SELECT TO anon, authenticated USING (true);

-- Seul le staff peut créer des tokens
CREATE POLICY "staff_insert_token" ON public.review_tokens
  FOR INSERT TO authenticated
  WITH CHECK (is_staff(auth.uid()));

-- Seul le staff ou service_role peut modifier les tokens
CREATE POLICY "staff_update_token" ON public.review_tokens
  FOR UPDATE TO authenticated
  USING (is_staff(auth.uid()))
  WITH CHECK (is_staff(auth.uid()));

-- Seul le staff peut supprimer les tokens
CREATE POLICY "staff_delete_token" ON public.review_tokens
  FOR DELETE TO authenticated
  USING (is_staff(auth.uid()));

-- Colonnes reviews (idempotent)
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS review_token_id uuid REFERENCES public.review_tokens(id);
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS reservation_id uuid REFERENCES public.reservations(id);
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS published boolean NOT NULL DEFAULT false;
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS rejected boolean NOT NULL DEFAULT false;