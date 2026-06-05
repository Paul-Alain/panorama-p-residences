-- ══════════════════════════════════════════════════════
-- PANORAMA P — Table review_tokens
-- Liens de notation envoyés aux clients après séjour
-- ══════════════════════════════════════════════════════

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

-- Index pour lookup rapide par token
CREATE INDEX IF NOT EXISTS review_tokens_token_idx ON public.review_tokens(token);
CREATE INDEX IF NOT EXISTS review_tokens_reservation_idx ON public.review_tokens(reservation_id);

-- RLS : lecture publique par token uniquement
ALTER TABLE public.review_tokens ENABLE ROW LEVEL SECURITY;

-- Politique : n'importe qui peut lire un token (pour la page publique)
CREATE POLICY "public_read_token" ON public.review_tokens
  FOR SELECT USING (true);

-- Politique : seul le staff peut créer/modifier
CREATE POLICY "staff_insert_token" ON public.review_tokens
  FOR INSERT WITH CHECK (true);

CREATE POLICY "staff_update_token" ON public.review_tokens
  FOR UPDATE USING (true);

-- Ajouter colonne review_token_id sur reviews pour lier avis ↔ token
ALTER TABLE public.reviews 
  ADD COLUMN IF NOT EXISTS review_token_id uuid REFERENCES public.review_tokens(id);
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS reservation_id uuid REFERENCES public.reservations(id);
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS published boolean NOT NULL DEFAULT false;
