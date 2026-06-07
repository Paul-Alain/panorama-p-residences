-- ══════════════════════════════════════════════════════
-- MIGRATION 20 — Tokens notation et avis (CORRIGÉE)
-- ══════════════════════════════════════════════════════

-- Table review_tokens
CREATE TABLE IF NOT EXISTS public.review_tokens (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  token          text NOT NULL UNIQUE,
  guest_name     text NOT NULL,
  guest_email    text,
  guest_phone    text,
  used           boolean NOT NULL DEFAULT false,
  used_at        timestamptz,
  expires_at     timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  created_at     timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.review_tokens TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.review_tokens TO authenticated;
GRANT ALL ON public.review_tokens TO service_role;

ALTER TABLE public.review_tokens ENABLE ROW LEVEL SECURITY;

-- Lecture publique par token (page de notation)
CREATE POLICY "Anyone can read review tokens"
  ON public.review_tokens FOR SELECT
  TO anon, authenticated
  USING (true);

-- Seul le client peut marquer son token comme utilisé
-- (via service_role uniquement côté serveur)
CREATE POLICY "Service role updates tokens"
  ON public.review_tokens FOR UPDATE
  TO authenticated
  USING (is_staff(auth.uid()))
  WITH CHECK (is_staff(auth.uid()));

-- Staff peut gérer tous les tokens
CREATE POLICY "Staff manage review tokens"
  ON public.review_tokens FOR ALL
  TO authenticated
  USING (is_staff(auth.uid()))
  WITH CHECK (is_staff(auth.uid()));

-- Table reviews
CREATE TABLE IF NOT EXISTS public.reviews (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id  uuid REFERENCES public.reservations(id),
  review_token_id uuid REFERENCES public.review_tokens(id),
  guest_name      text NOT NULL,
  rating          integer NOT NULL DEFAULT 5,
  comment         text,
  published       boolean NOT NULL DEFAULT false,
  rejected        boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Colonnes IF NOT EXISTS pour idempotence
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS review_token_id uuid REFERENCES public.review_tokens(id);
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS reservation_id uuid REFERENCES public.reservations(id);
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS published boolean NOT NULL DEFAULT false;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS rejected boolean NOT NULL DEFAULT false;

GRANT SELECT, INSERT ON public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- N'importe qui peut soumettre un avis (via lien token)
CREATE POLICY "Anyone can create review"
  ON public.reviews FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Avis publiés visibles par tous
CREATE POLICY "Anyone can read published reviews"
  ON public.reviews FOR SELECT
  TO anon, authenticated
  USING (published = true);

-- Staff lit tous les avis (publiés ou non)
CREATE POLICY "Staff read all reviews"
  ON public.reviews FOR SELECT
  TO authenticated
  USING (is_staff(auth.uid()));

-- Staff publie ou refuse un avis
CREATE POLICY "Staff update reviews"
  ON public.reviews FOR UPDATE
  TO authenticated
  USING (is_staff(auth.uid()))
  WITH CHECK (is_staff(auth.uid()));

-- Seul propriétaire peut supprimer un avis
CREATE POLICY "Owner delete reviews"
  ON public.reviews FOR DELETE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'proprietaire'::app_role)
  );

-- Trigger updated_at
CREATE TRIGGER set_reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();