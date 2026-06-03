-- Step 1: physical units table (child of logements categories)
CREATE TABLE public.logement_units (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  logement_id uuid NOT NULL REFERENCES public.logements(id) ON DELETE CASCADE,
  label text NOT NULL,
  unit_number integer NOT NULL DEFAULT 1,
  available boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.logement_units TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.logement_units TO authenticated;
GRANT ALL ON public.logement_units TO service_role;

ALTER TABLE public.logement_units ENABLE ROW LEVEL SECURITY;

-- Mirror existing logements policies
CREATE POLICY "Anyone can view logement units"
  ON public.logement_units FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins manage logement units"
  ON public.logement_units FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Reuse the existing set_updated_at() function for the timestamp trigger
CREATE TRIGGER set_logement_units_updated_at
  BEFORE UPDATE ON public.logement_units
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Step 2: link reservations to a specific physical unit (nullable, additive)
ALTER TABLE public.reservations
  ADD COLUMN logement_unit_id uuid NULL REFERENCES public.logement_units(id) ON DELETE SET NULL;