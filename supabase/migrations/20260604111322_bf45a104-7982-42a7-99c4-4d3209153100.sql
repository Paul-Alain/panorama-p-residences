-- ══════════════════════════════════════════════════════
-- MIGRATION 12 — Dashboard opérationnel (CORRIGÉE)
-- ══════════════════════════════════════════════════════

-- 1. Rôles (uniquement ceux utilisés)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'proprietaire';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'gestionnaire';
-- Les rôles reception, menage, comptable existent en base
-- mais ne sont jamais assignés ni affichés dans l'interface
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'reception';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'menage';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'comptable';

-- 2. Colonnes réservations (IF NOT EXISTS = sans risque de doublon)
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'non_paye',
  ADD COLUMN IF NOT EXISTS total_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS checkin_at timestamptz,
  ADD COLUMN IF NOT EXISTS checkout_at timestamptz;

-- 3. Statut opérationnel des unités
ALTER TABLE public.logement_units
  ADD COLUMN IF NOT EXISTS op_status text NOT NULL DEFAULT 'actif';

-- 4. Fonction is_staff (uniquement les 2 rôles actifs)
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text = ANY (ARRAY[
        'admin', 'proprietaire', 'gestionnaire'
      ])
  )
$$;

-- Sécuriser la fonction
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated, service_role;


ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'proprietaire';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'gestionnaire';