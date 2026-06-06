-- 1. review_tokens: remove public read/update policies (PII + token exposure)
DROP POLICY IF EXISTS "Anyone can read review tokens" ON public.review_tokens;
DROP POLICY IF EXISTS "Anyone can update review tokens" ON public.review_tokens;

-- 2. reservations: align staff access with is_staff() instead of admin-only
DROP POLICY IF EXISTS "Admins read reservations" ON public.reservations;
DROP POLICY IF EXISTS "Admins update reservations" ON public.reservations;
DROP POLICY IF EXISTS "Admins delete reservations" ON public.reservations;

CREATE POLICY "Staff read reservations"
  ON public.reservations FOR SELECT
  TO authenticated
  USING (is_staff(auth.uid()));

CREATE POLICY "Staff update reservations"
  ON public.reservations FOR UPDATE
  TO authenticated
  USING (is_staff(auth.uid()))
  WITH CHECK (is_staff(auth.uid()));

CREATE POLICY "Staff delete reservations"
  ON public.reservations FOR DELETE
  TO authenticated
  USING (is_staff(auth.uid()));