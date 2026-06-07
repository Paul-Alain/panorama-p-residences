-- ══════════════════════════════════════════════════════
-- MIGRATION 9 — Unités physiques (CORRIGÉE)
-- ══════════════════════════════════════════════════════

-- Table des unités physiques
CREATE TABLE public.logement_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  logement_id uuid NOT NULL REFERENCES public.logements(id) ON DELETE CASCADE,
  label text NOT NULL,
  unit_number integer NOT NULL DEFAULT 1,
  available boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  op_status text NOT NULL DEFAULT 'actif',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.logement_units TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.logement_units TO authenticated;
GRANT ALL ON public.logement_units TO service_role;

ALTER TABLE public.logement_units ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut voir les unités
CREATE POLICY "Anyone can view logement units"
  ON public.logement_units FOR SELECT
  TO anon, authenticated USING (true);

-- Staff peut gérer les unités
CREATE POLICY "Staff manage logement units"
  ON public.logement_units FOR ALL TO authenticated
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

CREATE TRIGGER set_logement_units_updated_at
  BEFORE UPDATE ON public.logement_units
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- NB: logement_unit_id déjà ajouté sur reservations en Migration 1