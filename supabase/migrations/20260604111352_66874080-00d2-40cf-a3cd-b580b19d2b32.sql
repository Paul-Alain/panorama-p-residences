-- ══════════════════════════════════════════════════════
-- MIGRATION 13 — Tables opérationnelles (CORRIGÉE)
-- ══════════════════════════════════════════════════════

-- Paiements (enregistrés manuellement)
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  method text NOT NULL DEFAULT 'especes',
  recorded_by uuid,
  recorded_by_name text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Propriétaire et gestionnaire peuvent tout faire sur les paiements
CREATE POLICY "Staff manage payments" ON public.payments
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'proprietaire'::app_role) OR
    has_role(auth.uid(), 'gestionnaire'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'proprietaire'::app_role) OR
    has_role(auth.uid(), 'gestionnaire'::app_role)
  );

-- Journal d'activité
CREATE TABLE IF NOT EXISTS public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  user_name text,
  action text NOT NULL,
  object_type text,
  object_id text,
  summary text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.activity_log TO authenticated;
GRANT ALL ON public.activity_log TO service_role;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read activity" ON public.activity_log
  FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff insert activity" ON public.activity_log
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

-- Paramètres de la résidence (singleton)
CREATE TABLE IF NOT EXISTS public.residence_settings (
  id boolean PRIMARY KEY DEFAULT true,
  name text NOT NULL DEFAULT 'Résidence Panorama P',
  logo_url text,
  currency text NOT NULL DEFAULT 'FCFA',
  checkin_time text NOT NULL DEFAULT '14:00',
  checkout_time text NOT NULL DEFAULT '11:00',
  deposit_percent integer NOT NULL DEFAULT 30,
  cancellation_policy text,
  taxes text,
  email_notifications boolean NOT NULL DEFAULT true,
  language text NOT NULL DEFAULT 'fr',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT residence_settings_singleton CHECK (id = true)
);

GRANT SELECT, INSERT, UPDATE ON public.residence_settings TO authenticated;
GRANT ALL ON public.residence_settings TO service_role;
ALTER TABLE public.residence_settings ENABLE ROW LEVEL SECURITY;

-- Tout le staff peut lire les paramètres
CREATE POLICY "Staff read settings" ON public.residence_settings
  FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

-- Seul le propriétaire peut modifier les paramètres
CREATE POLICY "Owner update settings" ON public.residence_settings
  FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'proprietaire'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'proprietaire'::app_role)
  );

-- Seul le propriétaire peut insérer les paramètres initiaux
CREATE POLICY "Owner insert settings" ON public.residence_settings
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'proprietaire'::app_role)
  );

INSERT INTO public.residence_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;