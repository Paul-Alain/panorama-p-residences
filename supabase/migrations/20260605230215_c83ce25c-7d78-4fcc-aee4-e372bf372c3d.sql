-- review_tokens table
CREATE TABLE IF NOT EXISTS public.review_tokens (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id  uuid NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  token           text NOT NULL UNIQUE,
  guest_name      text NOT NULL,
  guest_email     text,
  guest_phone     text,
  used            boolean NOT NULL DEFAULT false,
  used_at         timestamptz,
  expires_at      timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  created_at      timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.review_tokens TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.review_tokens TO anon;
GRANT ALL ON public.review_tokens TO service_role;

ALTER TABLE public.review_tokens ENABLE ROW LEVEL SECURITY;

-- Guests need to look up their token by value, so allow public read
CREATE POLICY "Anyone can read review tokens"
  ON public.review_tokens FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow marking a token as used when submitting a review (guest flow)
CREATE POLICY "Anyone can update review tokens"
  ON public.review_tokens FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Staff manage review tokens"
  ON public.review_tokens FOR ALL
  TO authenticated
  USING (is_staff(auth.uid()))
  WITH CHECK (is_staff(auth.uid()));

-- reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id  uuid REFERENCES public.reservations(id),
  review_token_id uuid REFERENCES public.review_tokens(id),
  guest_name      text NOT NULL,
  rating          integer NOT NULL DEFAULT 5,
  comment         text,
  published       boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- In case the table already existed, ensure the columns from the request exist
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS review_token_id uuid REFERENCES public.review_tokens(id);
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS reservation_id uuid REFERENCES public.reservations(id);
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS published boolean NOT NULL DEFAULT false;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT SELECT, INSERT ON public.reviews TO anon;
GRANT ALL ON public.reviews TO service_role;

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Guests can submit a review
CREATE POLICY "Anyone can create review"
  ON public.reviews FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Everyone can read published reviews
CREATE POLICY "Anyone can read published reviews"
  ON public.reviews FOR SELECT
  TO anon, authenticated
  USING (published = true);

-- Staff can read everything
CREATE POLICY "Staff read all reviews"
  ON public.reviews FOR SELECT
  TO authenticated
  USING (is_staff(auth.uid()));

-- Staff manage reviews (update/delete/publish)
CREATE POLICY "Staff update reviews"
  ON public.reviews FOR UPDATE
  TO authenticated
  USING (is_staff(auth.uid()))
  WITH CHECK (is_staff(auth.uid()));

CREATE POLICY "Staff delete reviews"
  ON public.reviews FOR DELETE
  TO authenticated
  USING (is_staff(auth.uid()));

-- keep updated_at fresh on reviews
CREATE TRIGGER set_reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();