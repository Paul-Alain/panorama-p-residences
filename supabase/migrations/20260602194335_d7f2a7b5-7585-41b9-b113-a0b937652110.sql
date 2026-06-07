-- ══════════════════════════════════════════════════════
-- MIGRATION 1 — Structure de base (CORRIGÉE)
-- ══════════════════════════════════════════════════════

-- Roles (tous les rôles du système)
CREATE TYPE public.app_role AS ENUM (
  'admin', 'user', 'proprietaire', 'gestionnaire',
  'technicien', 'reception', 'menage', 'comptable'
);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$;

-- Logements
CREATE TABLE public.logements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'studio',
  title_fr text NOT NULL,
  title_de text,
  title_en text,
  description_fr text,
  description_de text,
  description_en text,
  price numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'FCFA',
  price_unit text NOT NULL DEFAULT 'nuit',
  equipments text[] NOT NULL DEFAULT '{}',
  images text[] NOT NULL DEFAULT '{}',
  available boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.logements TO anon, authenticated;
GRANT ALL ON public.logements TO service_role;

ALTER TABLE public.logements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view logements" ON public.logements
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Staff manage logements" ON public.logements
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'proprietaire') OR
    public.has_role(auth.uid(), 'gestionnaire')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'proprietaire') OR
    public.has_role(auth.uid(), 'gestionnaire')
  );

CREATE TRIGGER logements_updated_at BEFORE UPDATE ON public.logements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Testimonials
CREATE TABLE public.testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text,
  rating int NOT NULL DEFAULT 5,
  message_fr text NOT NULL,
  message_de text,
  message_en text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.testimonials TO anon, authenticated;
GRANT ALL ON public.testimonials TO service_role;

ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view testimonials" ON public.testimonials
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Staff manage testimonials" ON public.testimonials
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'proprietaire') OR
    public.has_role(auth.uid(), 'gestionnaire')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'proprietaire') OR
    public.has_role(auth.uid(), 'gestionnaire')
  );

-- Reservations (avec toutes les colonnes nécessaires)
CREATE TABLE public.reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL,
  email text,
  user_id uuid REFERENCES auth.users(id),
  logement_type text,
  logement_unit_id uuid,
  arrival_date date NOT NULL,
  departure_date date NOT NULL,
  arrival_time text NOT NULL DEFAULT '14:00',
  departure_time text NOT NULL DEFAULT '11:00',
  guests int NOT NULL DEFAULT 1,
  channel text NOT NULL DEFAULT 'website',
  status text NOT NULL DEFAULT 'nouvelle',
  payment_status text NOT NULL DEFAULT 'non_paye',
  total_amount numeric NOT NULL DEFAULT 0,
  advance_amount numeric NOT NULL DEFAULT 0,
  message text,
  notes text,
  checkin_at timestamptz,
  checkout_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.reservations TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.reservations TO authenticated;
GRANT ALL ON public.reservations TO service_role;

ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut créer une réservation
CREATE POLICY "Anyone can create reservation" ON public.reservations
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Staff peut tout lire
CREATE POLICY "Staff read reservations" ON public.reservations
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'proprietaire') OR
    public.has_role(auth.uid(), 'gestionnaire') OR
    auth.uid() = user_id
  );

-- Staff peut modifier
CREATE POLICY "Staff update reservations" ON public.reservations
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'proprietaire') OR
    public.has_role(auth.uid(), 'gestionnaire')
  );

-- Seul propriétaire/admin peut supprimer
CREATE POLICY "Owner delete reservations" ON public.reservations
  FOR DELETE TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'proprietaire')
  );

CREATE TRIGGER reservations_updated_at BEFORE UPDATE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Messages contact
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  name text NOT NULL,
  phone text,
  email text,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'nouveau',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.messages TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut envoyer un message
CREATE POLICY "Anyone can create message" ON public.messages
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Staff peut lire tous les messages
CREATE POLICY "Staff read messages" ON public.messages
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'proprietaire') OR
    public.has_role(auth.uid(), 'gestionnaire') OR
    auth.uid() = user_id
  );

-- Staff peut modifier les messages
CREATE POLICY "Staff update messages" ON public.messages
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'proprietaire') OR
    public.has_role(auth.uid(), 'gestionnaire')
  );

-- Seul admin/propriétaire peut supprimer
CREATE POLICY "Owner delete messages" ON public.messages
  FOR DELETE TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'proprietaire')
  );