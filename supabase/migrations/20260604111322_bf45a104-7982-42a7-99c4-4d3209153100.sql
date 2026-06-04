-- ============ Phase 1: Operational dashboard foundations ============

-- 1. Team roles (extend app_role enum) ------------------------------------
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'proprietaire';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'gestionnaire';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'reception';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'menage';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'comptable';

-- 2. reservations: payment + total + notes ---------------------------------
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'non_paye',
  ADD COLUMN IF NOT EXISTS total_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS checkin_at timestamptz,
  ADD COLUMN IF NOT EXISTS checkout_at timestamptz;

-- 3. logement_units: operational status ------------------------------------
ALTER TABLE public.logement_units
  ADD COLUMN IF NOT EXISTS op_status text NOT NULL DEFAULT 'actif';

-- Staff check (text comparison avoids using freshly added enum values) ------
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text = ANY (ARRAY['admin','proprietaire','gestionnaire','reception','menage','comptable'])
  )
$$;
