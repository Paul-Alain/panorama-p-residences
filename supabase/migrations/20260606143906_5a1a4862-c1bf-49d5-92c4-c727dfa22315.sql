-- ══════════════════════════════════════════════════════
-- MIGRATION 23 — Correction policies sécurité (CORRIGÉE)
-- ══════════════════════════════════════════════════════

-- 1. Supprimer policies permissives review_tokens
DROP POLICY IF EXISTS "Anyone can read review tokens" ON public.review_tokens;
DROP POLICY IF EXISTS "Anyone can update review tokens" ON public.review_tokens;

-- 2. Corriger policies réservations
DROP POLICY IF EXISTS "Admins read reservations" ON public.reservations;
DROP POLICY IF EXISTS "Admins update reservations" ON public.reservations;
DROP POLICY IF EXISTS "Admins delete reservations" ON public.reservations;
DROP POLICY IF EXISTS "Staff read reservations" ON public.reservations;
DROP POLICY IF EXISTS "Staff update reservations" ON public.reservations;
DROP POLICY IF EXISTS "Staff delete reservations" ON public.reservations;
DROP POLICY IF EXISTS "Users can view own reservations" ON public.reservations;

-- Staff ET client voient les réservations concernées
CREATE POLICY "Staff read reservations"
  ON public.reservations FOR SELECT
  TO authenticated
  USING (
    is_staff(auth.uid()) OR
    auth.uid() = user_id
  );

-- Staff peut modifier les réservations
CREATE POLICY "Staff update reservations"
  ON public.reservations FOR UPDATE
  TO authenticated
  USING (is_staff(auth.uid()))
  WITH CHECK (is_staff(auth.uid()));

-- Seul propriétaire peut supprimer définitivement
CREATE POLICY "Owner delete reservations"
  ON public.reservations FOR DELETE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'proprietaire'::app_role)
  );